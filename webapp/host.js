// Quizmaster page: create a room, load a quiz file or folder playlist and
// watch players join. The host browser is the room authority — it answers
// join requests and broadcasts the public room state (see room-protocol.js).

const QUIZ_EXTENSIONS = ['.topicquiz', '.pairquiz', '.sortquiz', '.imagequiz', '.imagemutationquiz', '.title'];
const HOST_SESSION_KEY = 'pubquiz-host-room';
// Quiz types the web app can already play.
const PLAYABLE_EXTENSIONS = ['.topicquiz'];

class HostController {
  constructor() {
    this.client = RoomProtocol.createSupabaseClient();
    this.clientId = RoomProtocol.generateClientId();
    this.channel = null;
    this.roomCode = null;
    // name (lowercased) -> { name, playerId, connected }
    this.players = new Map();
    this.playlist = [];
    // Active topic quiz: { quizIndex, phase: 'topics'|'question'|'revealed',
    //                      topicIndex: number|null, playedTopics: Set(index),
    //                      answers: Map(nameLower -> { name, answer }) }
    this.game = null;

    this.createView = document.getElementById('create-view');
    this.roomView = document.getElementById('room-view');
    this.createButton = document.getElementById('create-button');
    this.createError = document.getElementById('create-error');
    this.loadError = document.getElementById('load-error');
    this.statusLine = document.getElementById('status-line');
    this.fileInput = document.getElementById('file-input');
    this.folderInput = document.getElementById('folder-input');

    this.createButton.addEventListener('click', () => this.createRoom());
    document.getElementById('open-file-button').addEventListener('click', () => this.fileInput.click());
    document.getElementById('open-folder-button').addEventListener('click', () => this.folderInput.click());
    document.getElementById('close-button').addEventListener('click', () => this.closeRoom());
    document.getElementById('reveal-button').addEventListener('click', () => this.revealAnswer());
    document.getElementById('end-question-button').addEventListener('click', () => this.backToTopics());
    document.getElementById('end-quiz-button').addEventListener('click', () => this.endQuiz());
    this.fileInput.addEventListener('change', () => this.loadFiles(this.fileInput.files));
    this.folderInput.addEventListener('change', () => this.loadFiles(this.folderInput.files));

    this.restoreSession();
  }

  // Reopens the room after a page reload (players stay in the channel).
  async restoreSession() {
    const stored = sessionStorage.getItem(HOST_SESSION_KEY);
    if (!stored) return;
    try {
      const session = JSON.parse(stored);
      this.playlist = session.playlist || [];
      if (session.game) {
        this.game = {
          quizIndex: session.game.quizIndex,
          phase: session.game.phase,
          topicIndex: session.game.topicIndex ?? null,
          playedTopics: new Set(session.game.playedTopics || []),
          answers: new Map((session.game.answers || []).map((a) => [a.name.toLowerCase(), a]))
        };
      }
      this.setStatus('Raum wird wiederhergestellt …');
      await this.openRoom(session.code, { allowExistingPlayers: true });
      this.showRoomView();
      this.broadcastRoomState();
    } catch (err) {
      sessionStorage.removeItem(HOST_SESSION_KEY);
      this.setStatus('bereit');
    }
  }

  async createRoom() {
    this.createError.textContent = '';
    this.createButton.disabled = true;
    try {
      // Retry on the (unlikely) case that the generated code is already in use.
      for (let attempt = 0; attempt < 5; attempt++) {
        const code = RoomProtocol.generateRoomCode();
        try {
          await this.openRoom(code, { allowExistingPlayers: false });
          this.showRoomView();
          return;
        } catch (err) {
          if (err.message !== 'code-in-use') throw err;
        }
      }
      throw new Error('Kein freier Raum-Code gefunden.');
    } catch (err) {
      this.createError.textContent = err.message === 'code-in-use'
        ? 'Raum konnte nicht erstellt werden, bitte erneut versuchen.'
        : `Raum konnte nicht erstellt werden: ${err.message}`;
    } finally {
      this.createButton.disabled = false;
    }
  }

  async openRoom(code, { allowExistingPlayers }) {
    const channel = this.client.channel(RoomProtocol.channelName(code), {
      config: {
        presence: { key: this.clientId },
        broadcast: { self: false }
      }
    });

    channel.on('broadcast', { event: 'join-request' }, ({ payload }) => this.handleJoinRequest(payload));
    channel.on('broadcast', { event: 'answer-submit' }, ({ payload }) => this.handleAnswerSubmit(payload));
    channel.on('presence', { event: 'sync' }, () => this.syncPresence());
    channel.on('presence', { event: 'leave' }, () => this.syncPresence());
    channel.on('presence', { event: 'join' }, () => this.syncPresence());

    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Zeitüberschreitung bei der Verbindung.')), 10000);
      channel.subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(timer);
          resolve();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          clearTimeout(timer);
          reject(new Error(err ? err.message : 'Verbindung fehlgeschlagen.'));
        }
      });
    });

    // Wait for the first presence sync to see who is already in the channel.
    await new Promise((resolve) => setTimeout(resolve, 800));

    const existingHost = RoomProtocol.findHost(channel);
    if (existingHost) {
      await this.client.removeChannel(channel);
      throw new Error('code-in-use');
    }

    this.channel = channel;
    this.roomCode = RoomProtocol.normalizeCode(code);

    // After a reload, rebuild the player list from presence.
    if (allowExistingPlayers) {
      for (const meta of RoomProtocol.presenceMetas(channel)) {
        if (meta.role === 'player' && meta.name) {
          this.players.set(meta.name.toLowerCase(), {
            name: meta.name,
            playerId: meta.playerId,
            connected: true
          });
        }
      }
    }

    await channel.track({ role: 'host' });
    this.persistSession();
  }

  handleJoinRequest(payload) {
    if (!payload || !payload.playerId) return;
    const name = typeof payload.name === 'string' ? payload.name.trim() : '';

    let response;
    if (!name) {
      response = { ok: false, error: 'Bitte einen Namen angeben.' };
    } else if (name.length > RoomProtocol.MAX_NAME_LENGTH) {
      response = { ok: false, error: `Name darf höchstens ${RoomProtocol.MAX_NAME_LENGTH} Zeichen lang sein.` };
    } else {
      const existing = this.players.get(name.toLowerCase());
      if (existing && existing.connected && existing.playerId !== payload.playerId) {
        response = { ok: false, error: 'Dieser Name ist in dem Raum schon vergeben.' };
      } else {
        // New player, or a rejoin under the same name after a disconnect.
        this.players.set(name.toLowerCase(), {
          name,
          playerId: payload.playerId,
          connected: true
        });
        response = { ok: true, name };
      }
    }

    // A rejoining player gets their already-typed answer back.
    if (response.ok && this.game) {
      const ownAnswer = this.game.answers.get(response.name.toLowerCase());
      if (ownAnswer) {
        response.yourAnswer = ownAnswer.answer;
      }
    }

    this.channel.send({
      type: 'broadcast',
      event: 'join-response',
      payload: { ...response, playerId: payload.playerId, room: this.publicRoomState() }
    });

    if (response.ok) {
      this.renderRoom();
      this.broadcastRoomState();
    }
  }

  syncPresence() {
    if (!this.channel) return;
    const metas = RoomProtocol.presenceMetas(this.channel);
    const onlineIds = new Set(metas.filter((m) => m.role === 'player').map((m) => m.playerId));
    let changed = false;
    for (const player of this.players.values()) {
      const connected = onlineIds.has(player.playerId);
      if (player.connected !== connected) {
        player.connected = connected;
        changed = true;
      }
    }
    if (changed) {
      this.renderRoom();
      this.broadcastRoomState();
    }
  }

  publicRoomState() {
    return {
      code: this.roomCode,
      players: [...this.players.values()].map((p) => ({ name: p.name, connected: p.connected })),
      playlist: this.playlist.map((q) => ({ fileName: q.fileName, typeName: q.typeName, played: !!q.played })),
      game: this.publicGameState()
    };
  }

  currentTopic() {
    if (!this.game || this.game.topicIndex === null) return null;
    return this.playlist[this.game.quizIndex].quizData[this.game.topicIndex];
  }

  publicGameState() {
    if (!this.game) return null;
    const quiz = this.playlist[this.game.quizIndex];
    const state = {
      phase: this.game.phase,
      quizName: quiz.fileName,
      topics: quiz.quizData.map((topic, index) => ({
        name: topic.name,
        played: this.game.playedTopics.has(index)
      }))
    };
    if (this.game.phase === 'question' || this.game.phase === 'revealed') {
      const topic = this.currentTopic();
      state.topicName = topic.name;
      state.question = topic.question;
      state.answered = [...this.game.answers.values()].map((a) => a.name);
    }
    if (this.game.phase === 'revealed') {
      state.answer = this.currentTopic().answer;
      state.results = this.buildResults();
    }
    return state;
  }

  buildResults() {
    const topic = this.currentTopic();
    return [...this.players.values()].map((player) => {
      const given = this.game.answers.get(player.name.toLowerCase());
      return {
        name: player.name,
        answer: given ? given.answer : null,
        correct: given ? RoomProtocol.answersMatch(given.answer, topic.answer) : false
      };
    });
  }

  allConnectedAnswered() {
    if (!this.game || this.game.phase !== 'question') return false;
    const connected = [...this.players.values()].filter((p) => p.connected);
    return connected.length > 0 &&
      connected.every((p) => this.game.answers.has(p.name.toLowerCase()));
  }

  handleAnswerSubmit(payload) {
    if (!this.game || this.game.phase !== 'question') return;
    if (!payload || !payload.playerId) return;
    const player = [...this.players.values()].find((p) => p.playerId === payload.playerId);
    if (!player) return;
    const answer = typeof payload.answer === 'string' ? payload.answer.trim() : '';
    if (!answer) return;

    this.game.answers.set(player.name.toLowerCase(), { name: player.name, answer });
    this.persistSession();
    this.renderRoom();
    this.broadcastRoomState();
  }

  startQuiz(quizIndex) {
    const quiz = this.playlist[quizIndex];
    if (!quiz || !PLAYABLE_EXTENSIONS.includes(quiz.extension) || this.game) return;
    this.game = {
      quizIndex,
      phase: 'topics',
      topicIndex: null,
      playedTopics: new Set(),
      answers: new Map()
    };
    this.persistSession();
    this.renderRoom();
    this.broadcastRoomState();
  }

  selectTopic(topicIndex) {
    if (!this.game || this.game.phase !== 'topics' || this.game.playedTopics.has(topicIndex)) return;
    this.game.phase = 'question';
    this.game.topicIndex = topicIndex;
    this.game.answers = new Map();
    this.persistSession();
    this.renderRoom();
    this.broadcastRoomState();
  }

  revealAnswer() {
    if (!this.game || this.game.phase !== 'question' || !this.allConnectedAnswered()) return;
    this.game.phase = 'revealed';
    this.persistSession();
    this.renderRoom();
    this.broadcastRoomState();
  }

  backToTopics() {
    if (!this.game || this.game.topicIndex === null) return;
    this.game.playedTopics.add(this.game.topicIndex);
    this.game.topicIndex = null;
    this.game.answers = new Map();

    const totalTopics = this.playlist[this.game.quizIndex].quizData.length;
    if (this.game.playedTopics.size >= totalTopics) {
      this.endQuiz();
      return;
    }
    this.game.phase = 'topics';
    this.persistSession();
    this.renderRoom();
    this.broadcastRoomState();
  }

  endQuiz() {
    if (!this.game) return;
    this.playlist[this.game.quizIndex].played = true;
    this.game = null;
    this.persistSession();
    this.renderRoom();
    this.broadcastRoomState();
  }

  broadcastRoomState() {
    if (!this.channel) return;
    this.channel.send({ type: 'broadcast', event: 'room:update', payload: this.publicRoomState() });
  }

  persistSession() {
    sessionStorage.setItem(HOST_SESSION_KEY, JSON.stringify({
      code: this.roomCode,
      playlist: this.playlist,
      game: this.game
        ? {
            quizIndex: this.game.quizIndex,
            phase: this.game.phase,
            topicIndex: this.game.topicIndex,
            playedTopics: [...this.game.playedTopics],
            answers: [...this.game.answers.values()]
          }
        : null
    }));
  }

  async loadFiles(fileList) {
    this.loadError.textContent = '';
    if (this.game) {
      this.loadError.textContent = 'Bitte zuerst die aktive Frage beenden.';
      return;
    }
    const files = [...fileList].filter((file) => QuizValidation.isKnownQuizExtension(file.name));

    if (files.length === 0) {
      this.loadError.textContent = `Keine Quiz-Dateien gefunden (${QUIZ_EXTENSIONS.join(', ')}).`;
      return;
    }

    // Same behavior as folder playlists in the Electron app: alphabetical order.
    files.sort((a, b) => a.name.localeCompare(b.name));

    const playlist = [];
    const errors = [];
    for (const file of files) {
      const result = QuizValidation.validateQuizFile(file.name, await file.text());
      if (result.isValid) {
        playlist.push(result.quiz);
      } else {
        errors.push(`${file.name}: ${result.errors.join(', ')}`);
      }
    }

    if (playlist.length === 0) {
      this.loadError.textContent = `Keine gültigen Quiz-Dateien gefunden. ${errors.join(' — ')}`;
    } else {
      this.playlist = playlist;
      if (errors.length > 0) {
        this.loadError.textContent = `Einige Dateien wurden übersprungen: ${errors.join(' — ')}`;
      }
      this.persistSession();
      this.renderRoom();
      this.broadcastRoomState();
    }

    // Allow re-selecting the same file/folder.
    this.fileInput.value = '';
    this.folderInput.value = '';
  }

  async closeRoom() {
    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'room:closed',
        payload: { reason: 'Der Quizmaster hat den Raum geschlossen.' }
      });
      await this.client.removeChannel(this.channel);
      this.channel = null;
    }
    sessionStorage.removeItem(HOST_SESSION_KEY);
    this.roomCode = null;
    this.players.clear();
    this.playlist = [];
    this.game = null;
    this.roomView.classList.add('hidden');
    this.createView.classList.remove('hidden');
  }

  showRoomView() {
    document.getElementById('room-code').textContent = this.roomCode;
    const joinUrl = `${window.location.origin}${window.location.pathname.replace(/host(\.html)?$/, '')}?code=${this.roomCode}`;
    document.getElementById('join-urls').textContent = joinUrl;
    this.createView.classList.add('hidden');
    this.roomView.classList.remove('hidden');
    this.setStatus('bereit');
    this.renderRoom();
  }

  renderRoom() {
    const state = this.publicRoomState();

    const playlistEl = document.getElementById('playlist');
    playlistEl.innerHTML = '';
    state.playlist.forEach((quiz, index) => {
      const li = document.createElement('li');
      if (quiz.played) li.classList.add('disconnected');

      const playable = this.playlist[index] &&
        PLAYABLE_EXTENSIONS.includes(this.playlist[index].extension);
      if (playable) {
        const play = document.createElement('button');
        play.type = 'button';
        play.className = 'play-button';
        play.textContent = '▶';
        play.disabled = !!this.game;
        play.addEventListener('click', () => this.startQuiz(index));
        li.appendChild(play);
      }

      li.appendChild(document.createTextNode(quiz.fileName));
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = quiz.played ? `${quiz.typeName} · gespielt` : quiz.typeName;
      li.appendChild(tag);
      playlistEl.appendChild(li);
    });
    document.getElementById('playlist-empty').classList.toggle('hidden', state.playlist.length > 0);

    this.renderGame(state);

    const playerListEl = document.getElementById('player-list');
    playerListEl.innerHTML = '';
    for (const player of state.players) {
      const li = document.createElement('li');
      li.textContent = player.name;
      if (!player.connected) {
        li.classList.add('disconnected');
        const tag = document.createElement('span');
        tag.className = 'tag';
        tag.textContent = 'offline';
        li.appendChild(tag);
      }
      playerListEl.appendChild(li);
    }
    document.getElementById('player-count').textContent = state.players.length;
    document.getElementById('players-empty').classList.toggle('hidden', state.players.length > 0);
  }

  renderGame(state) {
    const gameView = document.getElementById('game-view');
    if (!state.game) {
      gameView.classList.add('hidden');
      return;
    }
    gameView.classList.remove('hidden');
    document.getElementById('game-title').textContent = state.game.quizName;

    const topicSelect = document.getElementById('topic-select');
    const questionPanel = document.getElementById('question-panel');

    if (state.game.phase === 'topics') {
      topicSelect.classList.remove('hidden');
      questionPanel.classList.add('hidden');
      const grid = document.getElementById('topic-grid');
      grid.innerHTML = '';
      state.game.topics.forEach((topic, index) => {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'topic-cell';
        cell.textContent = topic.name;
        cell.disabled = topic.played;
        cell.addEventListener('click', () => this.selectTopic(index));
        grid.appendChild(cell);
      });
      return;
    }

    topicSelect.classList.add('hidden');
    questionPanel.classList.remove('hidden');
    document.getElementById('game-topic').textContent = `Thema: ${state.game.topicName}`;
    document.getElementById('game-question').textContent = state.game.question;

    const connected = state.players.filter((p) => p.connected);
    const answeredSet = new Set(state.game.answered.map((n) => n.toLowerCase()));
    document.getElementById('game-progress').textContent =
      `${state.game.answered.length} von ${connected.length} verbundenen Spielern haben getippt`;

    // Before the reveal only WHO answered is shown, never the answers —
    // the host screen may be projected.
    const statusEl = document.getElementById('answer-status');
    statusEl.innerHTML = '';
    for (const player of state.players) {
      const li = document.createElement('li');
      li.textContent = player.name;
      if (!player.connected) li.classList.add('disconnected');
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = answeredSet.has(player.name.toLowerCase())
        ? 'getippt'
        : (player.connected ? 'tippt …' : 'offline');
      li.appendChild(tag);
      statusEl.appendChild(li);
    }

    const revealButton = document.getElementById('reveal-button');
    const resultsView = document.getElementById('game-results');
    if (state.game.phase === 'revealed') {
      revealButton.classList.add('hidden');
      resultsView.classList.remove('hidden');
      document.getElementById('game-answer').textContent = state.game.answer;
      const resultsEl = document.getElementById('results-list');
      resultsEl.innerHTML = '';
      for (const result of state.game.results) {
        const li = document.createElement('li');
        li.textContent = `${result.name}: ${result.answer !== null ? result.answer : '– keine Antwort –'}`;
        const tag = document.createElement('span');
        tag.className = `tag ${result.correct ? 'tag-correct' : 'tag-wrong'}`;
        tag.textContent = result.correct ? '✓ richtig' : '✗ falsch';
        li.appendChild(tag);
        resultsEl.appendChild(li);
      }
    } else {
      revealButton.classList.remove('hidden');
      revealButton.disabled = !this.allConnectedAnswered();
      resultsView.classList.add('hidden');
    }
  }

  setStatus(text) {
    this.statusLine.textContent = text;
  }
}

document.addEventListener('DOMContentLoaded', () => new HostController());

// Quizmaster page: create a room, load a quiz file or folder playlist and
// run quizzes. The host browser is the room authority — it answers join
// requests, runs the game state machines and broadcasts the public room
// state; player phones mirror the board (see room-protocol.js).

const QUIZ_EXTENSIONS = ['.topicquiz', '.pairquiz', '.sortquiz', '.imagequiz', '.imagemutationquiz', '.title'];
const HOST_SESSION_KEY = 'pubquiz-host-room';
// Quiz types the web app can play.
const PLAYABLE_EXTENSIONS = ['.topicquiz', '.pairquiz', '.sortquiz', '.imagequiz', '.imagemutationquiz', '.title'];
const GAME_TYPES = {
  '.topicquiz': 'topic',
  '.pairquiz': 'pair',
  '.sortquiz': 'sort',
  '.imagequiz': 'image',
  '.imagemutationquiz': 'imagemutation',
  '.title': 'title'
};
// Keep broadcast payloads well below the Realtime message size limit.
const MAX_IMAGE_DATA_URL = 190000;

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

class HostController {
  constructor() {
    this.client = RoomProtocol.createSupabaseClient();
    this.clientId = RoomProtocol.generateClientId();
    this.channel = null;
    this.roomCode = null;
    // name (lowercased) -> { name, playerId, connected }
    this.players = new Map();
    this.playlist = [];
    // Active game; shape depends on type, see the start*Game methods.
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
    document.getElementById('image-next-button').addEventListener('click', () => this.imageNext());
    this.fileInput.addEventListener('change', () => this.loadFiles(this.fileInput.files));
    this.folderInput.addEventListener('change', () => this.loadFiles(this.folderInput.files));

    this.restoreSession();
  }

  // ---------------------------------------------------------------- room ---

  // Reopens the room after a page reload (players stay in the channel).
  async restoreSession() {
    const stored = sessionStorage.getItem(HOST_SESSION_KEY);
    if (!stored) return;
    try {
      const session = JSON.parse(stored);
      this.playlist = session.playlist || [];
      if (session.game) {
        this.game = this.deserializeGame(session.game);
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
    if (response.ok && this.game && this.game.type === 'topic') {
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

  broadcastRoomState() {
    if (!this.channel) return;
    this.channel.send({ type: 'broadcast', event: 'room:update', payload: this.publicRoomState() });
  }

  publicRoomState() {
    return {
      code: this.roomCode,
      players: [...this.players.values()].map((p) => ({ name: p.name, connected: p.connected })),
      playlist: this.playlist.map((q) => ({ fileName: q.fileName, typeName: q.typeName, played: !!q.played })),
      game: this.publicGameState()
    };
  }

  persistSession() {
    try {
      sessionStorage.setItem(HOST_SESSION_KEY, JSON.stringify({
        code: this.roomCode,
        playlist: this.playlist,
        game: this.serializeGame()
      }));
    } catch (err) {
      // Best effort — image-heavy playlists can exceed the storage quota.
      // The room still works, it just cannot be fully restored after reload.
      try {
        sessionStorage.setItem(HOST_SESSION_KEY, JSON.stringify({ code: this.roomCode, playlist: [], game: null }));
      } catch (err2) { /* give up */ }
    }
  }

  serializeGame() {
    if (!this.game) return null;
    if (this.game.type === 'topic') {
      return {
        ...this.game,
        playedTopics: [...this.game.playedTopics],
        answers: [...this.game.answers.values()]
      };
    }
    return this.game;
  }

  deserializeGame(stored) {
    if (!stored) return null;
    if (stored.type === 'topic') {
      return {
        ...stored,
        playedTopics: new Set(stored.playedTopics || []),
        answers: new Map((stored.answers || []).map((a) => [a.name.toLowerCase(), a]))
      };
    }
    return stored;
  }

  // ------------------------------------------------------------- loading ---

  async loadFiles(fileList) {
    this.loadError.textContent = '';
    if (this.game) {
      this.loadError.textContent = 'Bitte zuerst das aktive Quiz beenden.';
      return;
    }
    const allFiles = [...fileList];
    const files = allFiles.filter((file) => QuizValidation.isKnownQuizExtension(file.name));

    if (files.length === 0) {
      this.loadError.textContent = `Keine Quiz-Dateien gefunden (${QUIZ_EXTENSIONS.join(', ')}).`;
      return;
    }

    // Same behavior as folder playlists in the Electron app: alphabetical order.
    files.sort((a, b) => a.name.localeCompare(b.name));
    this.setStatus(`${files.length} Datei(en) werden geladen …`);

    const playlist = [];
    const errors = [];
    for (const file of files) {
      const result = QuizValidation.validateQuizFile(file.name, await file.text());
      if (!result.isValid) {
        errors.push(`${file.name}: ${result.errors.join(', ')}`);
        continue;
      }
      try {
        await this.attachImages(result.quiz, file, allFiles);
        playlist.push(result.quiz);
      } catch (err) {
        errors.push(`${file.name}: ${err.message}`);
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

    this.setStatus('bereit');
    // Allow re-selecting the same file/folder.
    this.fileInput.value = '';
    this.folderInput.value = '';
  }

  // Resolves and embeds the images referenced by image(-mutation) quizzes as
  // downscaled data URLs, so they can be broadcast to the players.
  async attachImages(quiz, quizFile, allFiles) {
    const wanted = [];
    if (quiz.extension === '.imagequiz') {
      for (const item of quiz.quizData) wanted.push([item, 'image', 'imageData']);
    } else if (quiz.extension === '.imagemutationquiz') {
      for (const item of quiz.quizData) {
        wanted.push([item, 'mutatedImage', 'mutatedImageData']);
        wanted.push([item, 'originalImage', 'originalImageData']);
      }
    } else {
      return;
    }

    for (const [item, field, target] of wanted) {
      const imageFile = this.findImageFile(quizFile, item[field], allFiles);
      if (!imageFile) {
        throw new Error(`Bild "${item[field]}" nicht gefunden (Ordner statt Einzeldatei laden)`);
      }
      item[target] = await this.imageFileToDataUrl(imageFile);
    }
  }

  findImageFile(quizFile, imageName, allFiles) {
    const quizRel = quizFile.webkitRelativePath || '';
    if (quizRel) {
      // Folder upload: resolve relative to the quiz file's directory.
      const dirParts = quizRel.split('/').slice(0, -1);
      const parts = [...dirParts, ...imageName.split('/')];
      const resolved = [];
      for (const part of parts) {
        if (part === '.' || part === '') continue;
        if (part === '..') resolved.pop();
        else resolved.push(part);
      }
      const targetPath = resolved.join('/');
      const match = allFiles.find((f) => f.webkitRelativePath === targetPath);
      if (match) return match;
    }
    // Fallback (multi-file selection): match by file name.
    const baseName = imageName.split('/').pop();
    return allFiles.find((f) => f.name === baseName) || null;
  }

  async imageFileToDataUrl(file) {
    const bitmap = await createImageBitmap(file);
    let maxDim = 800;
    let quality = 0.72;
    let dataUrl = '';
    for (let attempt = 0; attempt < 5; attempt++) {
      const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      dataUrl = canvas.toDataURL('image/jpeg', quality);
      if (dataUrl.length <= MAX_IMAGE_DATA_URL) break;
      maxDim = Math.round(maxDim * 0.7);
      quality = Math.max(0.4, quality - 0.1);
    }
    bitmap.close();
    return dataUrl;
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

  // ---------------------------------------------------------- game logic ---

  startQuiz(quizIndex) {
    const quiz = this.playlist[quizIndex];
    if (!quiz || !PLAYABLE_EXTENSIONS.includes(quiz.extension) || this.game) return;

    switch (GAME_TYPES[quiz.extension]) {
      case 'topic':
        this.game = { quizIndex, type: 'topic', phase: 'topics', topicIndex: null, playedTopics: new Set(), answers: new Map() };
        break;
      case 'title':
        this.game = { quizIndex, type: 'title' };
        break;
      case 'pair':
        this.game = this.initPairGame(quizIndex);
        break;
      case 'sort':
        this.game = this.initSortGame(quizIndex);
        break;
      case 'image':
        this.game = { quizIndex, type: 'image', phase: 'question', index: 0 };
        break;
      case 'imagemutation':
        this.game = { quizIndex, type: 'imagemutation', phase: 'question', index: 0 };
        break;
      default:
        return;
    }
    this.afterGameChange();
  }

  afterGameChange() {
    this.persistSession();
    this.renderRoom();
    this.broadcastRoomState();
  }

  endQuiz() {
    if (!this.game) return;
    this.playlist[this.game.quizIndex].played = true;
    this.game = null;
    this.afterGameChange();
  }

  // --- topic quiz (typed answers) ---

  currentTopic() {
    if (!this.game || this.game.type !== 'topic' || this.game.topicIndex === null) return null;
    return this.playlist[this.game.quizIndex].quizData[this.game.topicIndex];
  }

  selectTopic(topicIndex) {
    if (!this.game || this.game.type !== 'topic' || this.game.phase !== 'topics' ||
        this.game.playedTopics.has(topicIndex)) return;
    this.game.phase = 'question';
    this.game.topicIndex = topicIndex;
    this.game.answers = new Map();
    this.afterGameChange();
  }

  revealAnswer() {
    if (!this.game || this.game.type !== 'topic' || this.game.phase !== 'question' ||
        !this.allConnectedAnswered()) return;
    this.game.phase = 'revealed';
    this.afterGameChange();
  }

  backToTopics() {
    if (!this.game || this.game.type !== 'topic' || this.game.topicIndex === null) return;
    this.game.playedTopics.add(this.game.topicIndex);
    this.game.topicIndex = null;
    this.game.answers = new Map();

    const totalTopics = this.playlist[this.game.quizIndex].quizData.length;
    if (this.game.playedTopics.size >= totalTopics) {
      this.endQuiz();
      return;
    }
    this.game.phase = 'topics';
    this.afterGameChange();
  }

  allConnectedAnswered() {
    if (!this.game || this.game.type !== 'topic' || this.game.phase !== 'question') return false;
    const connected = [...this.players.values()].filter((p) => p.connected);
    return connected.length > 0 &&
      connected.every((p) => this.game.answers.has(p.name.toLowerCase()));
  }

  handleAnswerSubmit(payload) {
    if (!this.game || this.game.type !== 'topic' || this.game.phase !== 'question') return;
    if (!payload || !payload.playerId) return;
    const player = [...this.players.values()].find((p) => p.playerId === payload.playerId);
    if (!player) return;
    const answer = typeof payload.answer === 'string' ? payload.answer.trim() : '';
    if (!answer) return;

    this.game.answers.set(player.name.toLowerCase(), { name: player.name, answer });
    this.afterGameChange();
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

  // --- pair quiz (host matches, like the Electron app) ---

  initPairGame(quizIndex) {
    const data = this.playlist[quizIndex].quizData;
    const validPairs = data.filter((item) => item.left && item.right);
    const extraItems = data.filter((item) => !item.left && item.right);
    const left = shuffleArray(validPairs.map((p) => p.left)).map((text) => ({ text, matched: false }));
    const right = shuffleArray([
      ...validPairs.map((p) => p.right),
      ...extraItems.map((item) => item.right)
    ]).map((text) => ({ text, matched: false }));
    return {
      quizIndex, type: 'pair', phase: 'playing',
      left, right, matched: [], selectedLeft: null, success: null, failed: null
    };
  }

  pairSelectLeft(index) {
    const g = this.game;
    if (!g || g.type !== 'pair' || g.phase !== 'playing' || g.left[index].matched) return;
    g.selectedLeft = index;
    this.afterGameChange();
  }

  pairSelectRight(index) {
    const g = this.game;
    if (!g || g.type !== 'pair' || g.phase !== 'playing' || g.selectedLeft === null ||
        g.right[index].matched) return;

    const leftText = g.left[g.selectedLeft].text;
    const rightText = g.right[index].text;
    const validPairs = this.playlist[g.quizIndex].quizData.filter((item) => item.left && item.right);
    const isCorrect = validPairs.some((pair) => pair.left === leftText && pair.right === rightText);

    if (isCorrect) {
      g.left[g.selectedLeft].matched = true;
      g.right[index].matched = true;
      g.matched.push({ left: leftText, right: rightText });
      g.selectedLeft = null;
      if (g.matched.length === validPairs.length) {
        g.phase = 'result';
        g.success = true;
      }
    } else {
      // Wrong pair (or the extra item) ends the game, like in the Electron app.
      g.phase = 'result';
      g.success = false;
      g.failed = { left: leftText, right: rightText };
    }
    this.afterGameChange();
  }

  // --- sort quiz (host places items, like the Electron app) ---

  initSortGame(quizIndex) {
    const data = this.playlist[quizIndex].quizData;
    const items = data.items;
    const shuffled = shuffleArray([...items]);

    let starterText;
    if (data.starterItemIndex !== undefined &&
        data.starterItemIndex >= 0 && data.starterItemIndex < items.length) {
      starterText = items[data.starterItemIndex];
    } else {
      starterText = shuffled[Math.floor(Math.random() * shuffled.length)];
    }
    shuffled.splice(shuffled.indexOf(starterText), 1);

    return {
      quizIndex, type: 'sort', phase: 'playing',
      left: shuffled.slice(0, 5).map((text) => ({ text, used: false })),
      right: shuffled.slice(5).map((text) => ({ text, used: false })),
      // Alternating spots (null) and placed items, like the Electron graph.
      sorted: [null, { text: starterText, originalIndex: items.indexOf(starterText) }, null],
      selected: null, // { column: 'left'|'right', index }
      success: null, failed: null
    };
  }

  sortSelectItem(column, index) {
    const g = this.game;
    if (!g || g.type !== 'sort' || g.phase !== 'playing' || g[column][index].used) return;
    g.selected = { column, index };
    this.afterGameChange();
  }

  sortPlaceItem(spotIndex) {
    const g = this.game;
    if (!g || g.type !== 'sort' || g.phase !== 'playing' || !g.selected ||
        g.sorted[spotIndex] !== null) return;

    const items = this.playlist[g.quizIndex].quizData.items;
    const entry = g[g.selected.column][g.selected.index];
    const originalIndex = items.indexOf(entry.text);

    // Correct iff all placed items (including this one) are in ascending
    // original order by position — same rule as the Electron app.
    const temp = [...g.sorted];
    temp[spotIndex] = { originalIndex };
    const placed = temp
      .map((item, position) => (item ? { position, originalIndex: item.originalIndex } : null))
      .filter(Boolean)
      .sort((a, b) => a.position - b.position);
    const isCorrect = placed.every((item, i) => i === 0 || item.originalIndex > placed[i - 1].originalIndex);

    if (isCorrect) {
      entry.used = true;
      g.sorted[spotIndex] = { text: entry.text, originalIndex };
      // Rebuild: spot, item, spot, item, …, spot (sorted by original index).
      const placedItems = g.sorted.filter(Boolean).sort((a, b) => a.originalIndex - b.originalIndex);
      g.sorted = [null];
      for (const item of placedItems) {
        g.sorted.push(item, null);
      }
      g.selected = null;

      const remaining = [...g.left, ...g.right].filter((e) => !e.used).length;
      if (remaining === 0) {
        g.phase = 'result';
        g.success = true;
      }
    } else {
      g.phase = 'result';
      g.success = false;
      g.failed = { text: entry.text };
    }
    this.afterGameChange();
  }

  // --- image quizzes (host steps through, like the Electron app) ---

  imageNext() {
    const g = this.game;
    if (!g || (g.type !== 'image' && g.type !== 'imagemutation')) return;
    const total = this.playlist[g.quizIndex].quizData.length;

    g.index++;
    if (g.index >= total) {
      if (g.phase === 'question') {
        g.phase = 'results';
        g.index = 0;
      } else {
        this.endQuiz();
        return;
      }
    }
    this.afterGameChange();
  }

  // ------------------------------------------------------- public state ---

  publicGameState() {
    if (!this.game) return null;
    const g = this.game;
    const quiz = this.playlist[g.quizIndex];
    const base = { type: g.type, quizName: quiz.fileName };

    switch (g.type) {
      case 'topic': {
        const state = {
          ...base,
          phase: g.phase,
          topics: quiz.quizData.map((topic, index) => ({
            name: topic.name,
            played: g.playedTopics.has(index)
          }))
        };
        if (g.phase === 'question' || g.phase === 'revealed') {
          const topic = this.currentTopic();
          state.topicName = topic.name;
          state.question = topic.question;
          state.answered = [...g.answers.values()].map((a) => a.name);
        }
        if (g.phase === 'revealed') {
          state.answer = this.currentTopic().answer;
          state.results = this.buildResults();
        }
        return state;
      }
      case 'title':
        return { ...base, title: quiz.quizData.title, subtitle: quiz.quizData.subtitle || null };
      case 'pair': {
        const state = {
          ...base,
          phase: g.phase,
          left: g.left.map((e) => ({ ...e })),
          right: g.right.map((e) => ({ ...e })),
          matched: [...g.matched],
          selectedLeft: g.selectedLeft
        };
        if (g.phase === 'result') {
          state.success = g.success;
          state.failed = g.failed;
          state.pairs = quiz.quizData
            .filter((item) => item.left && item.right)
            .map((item) => ({ left: item.left, right: item.right }));
          state.extra = quiz.quizData
            .filter((item) => !item.left && item.right)
            .map((item) => item.right);
        }
        return state;
      }
      case 'sort': {
        const state = {
          ...base,
          phase: g.phase,
          upperLabel: quiz.quizData.upperLabel,
          lowerLabel: quiz.quizData.lowerLabel,
          placed: g.sorted.filter(Boolean).map((item) => item.text),
          left: g.left.map((e) => ({ ...e })),
          right: g.right.map((e) => ({ ...e })),
          selectedText: g.selected ? g[g.selected.column][g.selected.index].text : null
        };
        if (g.phase === 'result') {
          state.success = g.success;
          state.failed = g.failed;
          state.order = [...quiz.quizData.items];
        }
        return state;
      }
      case 'image': {
        const item = quiz.quizData[g.index];
        return {
          ...base,
          phase: g.phase,
          index: g.index,
          total: quiz.quizData.length,
          image: item.imageData,
          answer: g.phase === 'results' ? item.answer : null
        };
      }
      case 'imagemutation': {
        const item = quiz.quizData[g.index];
        return {
          ...base,
          phase: g.phase,
          index: g.index,
          total: quiz.quizData.length,
          image: item.mutatedImageData,
          original: g.phase === 'results' ? item.originalImageData : null
        };
      }
      default:
        return null;
    }
  }

  // ----------------------------------------------------------- rendering ---

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
    const panels = ['topic-select', 'question-panel', 'title-panel', 'pair-panel', 'sort-panel', 'image-panel'];
    for (const id of panels) {
      document.getElementById(id).classList.add('hidden');
    }
    if (!state.game) {
      gameView.classList.add('hidden');
      return;
    }
    gameView.classList.remove('hidden');
    document.getElementById('game-title').textContent = state.game.quizName;

    switch (state.game.type) {
      case 'topic': return this.renderTopicGame(state);
      case 'title': return this.renderTitleGame(state);
      case 'pair': return this.renderPairGame(state);
      case 'sort': return this.renderSortGame(state);
      case 'image':
      case 'imagemutation': return this.renderImageGame(state);
    }
  }

  renderTopicGame(state) {
    if (state.game.phase === 'topics') {
      const topicSelect = document.getElementById('topic-select');
      topicSelect.classList.remove('hidden');
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

    const questionPanel = document.getElementById('question-panel');
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

  renderTitleGame(state) {
    document.getElementById('title-panel').classList.remove('hidden');
    document.getElementById('title-subtitle-display').textContent = state.game.subtitle || '';
    document.getElementById('title-display').textContent = state.game.title;
  }

  renderPairGame(state) {
    document.getElementById('pair-panel').classList.remove('hidden');
    const board = document.getElementById('pair-board');
    const resultEl = document.getElementById('pair-result');

    if (state.game.phase === 'playing') {
      board.classList.remove('hidden');
      resultEl.classList.add('hidden');

      const leftCol = document.getElementById('pair-left');
      leftCol.innerHTML = '';
      state.game.left.forEach((entry, index) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'board-item';
        btn.textContent = entry.text;
        if (entry.matched) btn.classList.add('board-item-hidden');
        if (state.game.selectedLeft === index) btn.classList.add('board-item-selected');
        btn.addEventListener('click', () => this.pairSelectLeft(index));
        leftCol.appendChild(btn);
      });

      const centerCol = document.getElementById('pair-center');
      centerCol.innerHTML = '';
      for (const pair of state.game.matched) {
        const div = document.createElement('div');
        div.className = 'matched-pair-row';
        div.textContent = `${pair.left} — ${pair.right}`;
        centerCol.appendChild(div);
      }

      const rightCol = document.getElementById('pair-right');
      rightCol.innerHTML = '';
      state.game.right.forEach((entry, index) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'board-item';
        btn.textContent = entry.text;
        if (entry.matched) btn.classList.add('board-item-hidden');
        btn.disabled = state.game.selectedLeft === null;
        btn.addEventListener('click', () => this.pairSelectRight(index));
        rightCol.appendChild(btn);
      });
      return;
    }

    board.classList.add('hidden');
    resultEl.classList.remove('hidden');
    document.getElementById('pair-result-verdict').textContent = state.game.success
      ? '✓ Alle Paare gefunden!'
      : `✗ Falsches Paar: ${state.game.failed.left} — ${state.game.failed.right}`;
    document.getElementById('pair-result-verdict').className =
      `own-result ${state.game.success ? 'result-correct' : 'result-wrong'}`;
    const list = document.getElementById('pair-result-list');
    list.innerHTML = '';
    for (const pair of state.game.pairs) {
      const li = document.createElement('li');
      li.textContent = `${pair.left} — ${pair.right}`;
      list.appendChild(li);
    }
    for (const extra of state.game.extra) {
      const li = document.createElement('li');
      li.textContent = extra;
      li.classList.add('extra-item-row');
      const tag = document.createElement('span');
      tag.className = 'tag tag-wrong';
      tag.textContent = 'übrig';
      li.appendChild(tag);
      list.appendChild(li);
    }
  }

  renderSortGame(state) {
    document.getElementById('sort-panel').classList.remove('hidden');
    const board = document.getElementById('sort-board');
    const resultEl = document.getElementById('sort-result');

    if (state.game.phase === 'playing') {
      board.classList.remove('hidden');
      resultEl.classList.add('hidden');

      const renderSide = (elId, column) => {
        const col = document.getElementById(elId);
        col.innerHTML = '';
        this.game[column].forEach((entry, index) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'board-item';
          btn.textContent = entry.text;
          if (entry.used) btn.classList.add('board-item-hidden');
          if (this.game.selected && this.game.selected.column === column &&
              this.game.selected.index === index) {
            btn.classList.add('board-item-selected');
          }
          btn.addEventListener('click', () => this.sortSelectItem(column, index));
          col.appendChild(btn);
        });
      };
      renderSide('sort-left', 'left');
      renderSide('sort-right', 'right');

      const center = document.getElementById('sort-center');
      center.innerHTML = '';
      const upper = document.createElement('div');
      upper.className = 'graph-label';
      upper.textContent = `▲ ${state.game.upperLabel}`;
      center.appendChild(upper);
      this.game.sorted.forEach((item, index) => {
        if (item === null) {
          const spot = document.createElement('button');
          spot.type = 'button';
          spot.className = 'sort-spot';
          spot.textContent = '· hier einsortieren ·';
          spot.disabled = !this.game.selected;
          spot.addEventListener('click', () => this.sortPlaceItem(index));
          center.appendChild(spot);
        } else {
          const div = document.createElement('div');
          div.className = 'placed-item';
          div.textContent = item.text;
          center.appendChild(div);
        }
      });
      const lower = document.createElement('div');
      lower.className = 'graph-label';
      lower.textContent = `▼ ${state.game.lowerLabel}`;
      center.appendChild(lower);
      return;
    }

    board.classList.add('hidden');
    resultEl.classList.remove('hidden');
    document.getElementById('sort-result-verdict').textContent = state.game.success
      ? '✓ Alles richtig einsortiert!'
      : `✗ Falsch platziert: ${state.game.failed.text}`;
    document.getElementById('sort-result-verdict').className =
      `own-result ${state.game.success ? 'result-correct' : 'result-wrong'}`;
    const list = document.getElementById('sort-result-list');
    list.innerHTML = '';
    const upperLi = document.createElement('li');
    upperLi.textContent = `▲ ${state.game.upperLabel}`;
    list.appendChild(upperLi);
    for (const text of state.game.order) {
      const li = document.createElement('li');
      li.textContent = text;
      list.appendChild(li);
    }
    const lowerLi = document.createElement('li');
    lowerLi.textContent = `▼ ${state.game.lowerLabel}`;
    list.appendChild(lowerLi);
  }

  renderImageGame(state) {
    document.getElementById('image-panel').classList.remove('hidden');
    const g = state.game;
    document.getElementById('image-progress').textContent =
      `${g.phase === 'question' ? 'Bild' : 'Auflösung'} ${g.index + 1} von ${g.total}`;

    const display = document.getElementById('image-display');
    display.innerHTML = '';
    const img = document.createElement('img');
    img.src = g.image;
    img.alt = 'Quiz-Bild';
    display.appendChild(img);
    if (g.type === 'imagemutation' && g.original) {
      const img2 = document.createElement('img');
      img2.src = g.original;
      img2.alt = 'Original';
      display.appendChild(img2);
    }

    const answerEl = document.getElementById('image-answer');
    answerEl.textContent = g.type === 'image' && g.answer ? g.answer : '';
    answerEl.classList.toggle('hidden', !(g.type === 'image' && g.answer));

    const isLastResult = g.phase === 'results' && g.index === g.total - 1;
    document.getElementById('image-next-button').textContent =
      isLastResult ? 'Quiz abschließen' : 'Weiter';
  }

  setStatus(text) {
    this.statusLine.textContent = text;
  }
}

document.addEventListener('DOMContentLoaded', () => new HostController());

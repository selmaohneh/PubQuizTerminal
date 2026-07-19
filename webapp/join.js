// Player join page: enter room code + name, then wait for the quizmaster.
// Talks directly to the room's Supabase Realtime channel (see room-protocol.js).

const PLAYER_SESSION_KEY = 'pubquiz-player';

class JoinController {
  constructor() {
    this.client = RoomProtocol.createSupabaseClient();
    this.clientId = RoomProtocol.generateClientId();
    this.channel = null;
    this.joined = false;
    this.code = null;
    this.name = null;

    this.form = document.getElementById('join-form');
    this.codeInput = document.getElementById('code');
    this.nameInput = document.getElementById('name');
    this.joinButton = document.getElementById('join-button');
    this.errorEl = document.getElementById('join-error');
    this.waitingEl = document.getElementById('waiting');
    this.playerListEl = document.getElementById('player-list');
    this.statusLine = document.getElementById('status-line');
    this.lobbyView = document.getElementById('lobby-view');
    this.topicsView = document.getElementById('topics-view');
    this.questionView = document.getElementById('question-view');
    this.answerForm = document.getElementById('answer-form');
    this.answerInput = document.getElementById('answer');
    this.answerButton = document.getElementById('answer-button');
    this.answerStatusLine = document.getElementById('answer-status-line');
    this.resultView = document.getElementById('result-view');
    this.currentGame = null;
    this.prefilledAnswer = null;

    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.join(this.codeInput.value, this.nameInput.value);
    });

    this.answerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitAnswer();
    });

    // Allow pre-filling the code via /?code=XXXX (e.g. from the host page URL).
    const params = new URLSearchParams(window.location.search);
    if (params.get('code')) {
      this.codeInput.value = RoomProtocol.normalizeCode(params.get('code'));
      this.nameInput.focus();
    } else {
      this.codeInput.focus();
    }

    this.restoreSession();
  }

  // After a page reload, rejoin the previous room under the same name.
  async restoreSession() {
    const stored = sessionStorage.getItem(PLAYER_SESSION_KEY);
    if (!stored) return;
    try {
      const session = JSON.parse(stored);
      this.codeInput.value = session.code;
      this.nameInput.value = session.name;
      await this.join(session.code, session.name);
    } catch (err) {
      sessionStorage.removeItem(PLAYER_SESSION_KEY);
    }
  }

  async join(rawCode, rawName) {
    const code = RoomProtocol.normalizeCode(rawCode);
    const name = (rawName || '').trim();
    this.errorEl.textContent = '';

    if (!RoomProtocol.isValidCode(code)) {
      this.errorEl.textContent = 'Raum nicht gefunden. Code prüfen!';
      return;
    }
    if (!name) {
      this.errorEl.textContent = 'Bitte einen Namen angeben.';
      return;
    }

    this.joinButton.disabled = true;
    this.setStatus('verbinde …');
    try {
      await this.connect(code, name);
    } catch (err) {
      this.showJoinForm(err.message);
    } finally {
      this.joinButton.disabled = false;
    }
  }

  async connect(code, name) {
    await this.leaveChannel();

    const channel = this.client.channel(RoomProtocol.channelName(code), {
      config: {
        presence: { key: this.clientId },
        broadcast: { self: false }
      }
    });

    let joinResolve = null;
    channel.on('broadcast', { event: 'join-response' }, ({ payload }) => {
      if (payload && payload.playerId === this.clientId && joinResolve) {
        joinResolve(payload);
      }
    });
    channel.on('broadcast', { event: 'room:update' }, ({ payload }) => this.renderRoom(payload));
    channel.on('broadcast', { event: 'room:closed' }, ({ payload }) => {
      this.onRoomClosed(payload);
    });
    channel.on('presence', { event: 'sync' }, () => this.updateHostStatus());
    channel.on('presence', { event: 'leave' }, () => this.updateHostStatus());
    channel.on('presence', { event: 'join' }, () => this.updateHostStatus());

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
    this.channel = channel;

    // Wait for the first presence sync to see whether a quizmaster is here.
    await new Promise((resolve) => setTimeout(resolve, 800));
    if (!RoomProtocol.findHost(channel)) {
      await this.leaveChannel();
      throw new Error('Raum nicht gefunden. Code prüfen!');
    }

    // Ask the quizmaster to let us in.
    const response = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Der Quizmaster antwortet nicht.')), 8000);
      joinResolve = (payload) => {
        clearTimeout(timer);
        resolve(payload);
      };
      channel.send({ type: 'broadcast', event: 'join-request', payload: { playerId: this.clientId, name } });
    });
    joinResolve = null;

    if (!response.ok) {
      await this.leaveChannel();
      throw new Error(response.error || 'Beitritt abgelehnt.');
    }

    await channel.track({ role: 'player', playerId: this.clientId, name: response.name });

    this.joined = true;
    this.code = code;
    this.name = response.name;
    sessionStorage.setItem(PLAYER_SESSION_KEY, JSON.stringify({ code, name: this.name }));

    document.getElementById('joined-code').textContent = code;
    document.getElementById('joined-name').textContent = this.name;
    this.form.classList.add('hidden');
    this.waitingEl.classList.remove('hidden');
    this.setStatus('verbunden');
    this.prefilledAnswer = response.yourAnswer || null;
    this.renderRoom(response.room);
  }

  submitAnswer() {
    if (!this.joined || !this.channel) return;
    if (!this.currentGame || this.currentGame.phase !== 'question') return;
    const answer = this.answerInput.value.trim();
    if (!answer) {
      this.answerStatusLine.textContent = 'Bitte eine Antwort eingeben.';
      return;
    }
    this.channel.send({
      type: 'broadcast',
      event: 'answer-submit',
      payload: { playerId: this.clientId, answer }
    });
    this.answerStatusLine.textContent = 'Antwort wird gespeichert …';
  }

  async leaveChannel() {
    if (this.channel) {
      const channel = this.channel;
      this.channel = null;
      await this.client.removeChannel(channel);
    }
  }

  renderRoom(state) {
    if (!state || !Array.isArray(state.players)) return;
    this.playerListEl.innerHTML = '';
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
      this.playerListEl.appendChild(li);
    }
    this.renderGame(state.game || null);
  }

  renderGame(game) {
    const inQuestion = !!game && (game.phase === 'question' || game.phase === 'revealed');
    const isNewQuestion = inQuestion &&
      (!this.currentGame || this.currentGame.question !== game.question);
    const previousGame = this.currentGame;
    this.currentGame = game;

    if (!game) {
      this.lobbyView.classList.remove('hidden');
      this.topicsView.classList.add('hidden');
      this.questionView.classList.add('hidden');
      if (previousGame) {
        this.answerInput.value = '';
        this.answerStatusLine.textContent = '';
      }
      return;
    }

    this.lobbyView.classList.add('hidden');

    if (game.phase === 'topics') {
      this.topicsView.classList.remove('hidden');
      this.questionView.classList.add('hidden');
      this.answerInput.value = '';
      this.answerStatusLine.textContent = '';
      document.getElementById('topics-quiz-name').textContent = game.quizName;
      const topicsEl = document.getElementById('topics-list');
      topicsEl.innerHTML = '';
      for (const topic of game.topics || []) {
        const li = document.createElement('li');
        li.textContent = topic.name;
        if (topic.played) {
          li.classList.add('disconnected');
          const tag = document.createElement('span');
          tag.className = 'tag';
          tag.textContent = 'gespielt';
          li.appendChild(tag);
        }
        topicsEl.appendChild(li);
      }
      return;
    }

    this.topicsView.classList.add('hidden');
    this.questionView.classList.remove('hidden');
    document.getElementById('question-topic').textContent = game.topicName || 'Frage';
    document.getElementById('question-text').textContent = game.question;

    if (isNewQuestion) {
      // After a rejoin the host sends the already-typed answer back.
      this.answerInput.value = this.prefilledAnswer || '';
      this.prefilledAnswer = null;
      this.answerStatusLine.textContent = '';
    }

    if (game.phase === 'revealed') {
      this.answerForm.classList.add('hidden');
      this.answerStatusLine.textContent = '';
      this.resultView.classList.remove('hidden');
      this.renderResults(game);
      return;
    }

    this.resultView.classList.add('hidden');
    this.answerForm.classList.remove('hidden');
    const hasAnswered = game.answered
      .some((n) => n.toLowerCase() === (this.name || '').toLowerCase());
    if (hasAnswered) {
      this.answerButton.textContent = 'Antwort ändern';
      this.answerStatusLine.textContent = 'Antwort gespeichert – warte auf die anderen Spieler …';
    } else {
      this.answerButton.textContent = 'Antwort tippen';
    }
  }

  renderResults(game) {
    const own = (game.results || [])
      .find((r) => r.name.toLowerCase() === (this.name || '').toLowerCase());
    const ownResultEl = document.getElementById('own-result');
    if (own && own.answer !== null) {
      ownResultEl.textContent = own.correct ? '✓ RICHTIG!' : '✗ FALSCH';
      ownResultEl.className = `own-result ${own.correct ? 'result-correct' : 'result-wrong'}`;
    } else {
      ownResultEl.textContent = 'Keine Antwort abgegeben';
      ownResultEl.className = 'own-result';
    }
    document.getElementById('correct-answer').textContent = `Richtige Antwort: ${game.answer}`;

    const resultsEl = document.getElementById('results-list');
    resultsEl.innerHTML = '';
    for (const result of game.results || []) {
      const li = document.createElement('li');
      li.textContent = `${result.name}: ${result.answer !== null ? result.answer : '– keine Antwort –'}`;
      const tag = document.createElement('span');
      tag.className = `tag ${result.correct ? 'tag-correct' : 'tag-wrong'}`;
      tag.textContent = result.correct ? '✓' : '✗';
      li.appendChild(tag);
      resultsEl.appendChild(li);
    }
  }

  updateHostStatus() {
    if (!this.joined || !this.channel) return;
    if (RoomProtocol.findHost(this.channel)) {
      this.setStatus('verbunden');
    } else {
      this.setStatus('Quizmaster offline … bitte warten');
    }
  }

  async onRoomClosed(info) {
    sessionStorage.removeItem(PLAYER_SESSION_KEY);
    await this.leaveChannel();
    this.showJoinForm(info && info.reason ? info.reason : 'Der Raum wurde geschlossen.');
  }

  showJoinForm(message) {
    this.joined = false;
    this.waitingEl.classList.add('hidden');
    this.form.classList.remove('hidden');
    this.errorEl.textContent = message || '';
    this.setStatus('bereit');
  }

  setStatus(text) {
    this.statusLine.textContent = text;
  }
}

document.addEventListener('DOMContentLoaded', () => new JoinController());

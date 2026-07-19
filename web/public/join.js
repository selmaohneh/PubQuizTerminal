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
    if (!this.currentGame || this.currentGame.type !== 'topic' || this.currentGame.phase !== 'question') return;
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
    const previousGame = this.currentGame;
    this.currentGame = game;

    const views = ['lobby-view', 'topics-view', 'question-view', 'title-view', 'pair-view', 'sort-view', 'image-view'];
    for (const id of views) {
      document.getElementById(id).classList.add('hidden');
    }

    if (!game) {
      this.lobbyView.classList.remove('hidden');
      if (previousGame) {
        this.answerInput.value = '';
        this.answerStatusLine.textContent = '';
      }
      return;
    }

    switch (game.type) {
      case 'topic': return this.renderTopicGame(game, previousGame);
      case 'title': return this.renderTitleGame(game);
      case 'pair': return this.renderPairGame(game);
      case 'sort': return this.renderSortGame(game);
      case 'image':
      case 'imagemutation': return this.renderImageGame(game);
      default:
        this.lobbyView.classList.remove('hidden');
    }
  }

  renderTopicGame(game, previousGame) {
    if (game.phase === 'topics') {
      this.topicsView.classList.remove('hidden');
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

    const isNewQuestion = !previousGame || previousGame.type !== 'topic' ||
      previousGame.question !== game.question;
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

  renderTitleGame(game) {
    document.getElementById('title-view').classList.remove('hidden');
    document.getElementById('title-subtitle').textContent = game.subtitle || '';
    document.getElementById('title-main').textContent = game.title;
  }

  renderPairGame(game) {
    document.getElementById('pair-view').classList.remove('hidden');
    document.getElementById('pair-quiz-name').textContent = game.quizName;
    const mirror = document.getElementById('pair-mirror');
    const result = document.getElementById('pair-mirror-result');

    if (game.phase === 'playing') {
      mirror.classList.remove('hidden');
      result.classList.add('hidden');

      const matchedEl = document.getElementById('pair-matched-list');
      matchedEl.innerHTML = '';
      for (const pair of game.matched) {
        const li = document.createElement('li');
        li.textContent = `${pair.left} — ${pair.right}`;
        matchedEl.appendChild(li);
      }

      const renderSide = (elId, entries, selectedIndex) => {
        const col = document.getElementById(elId);
        col.innerHTML = '';
        entries.forEach((entry, index) => {
          if (entry.matched) return;
          const div = document.createElement('div');
          div.className = 'board-item board-item-static';
          if (index === selectedIndex) div.classList.add('board-item-selected');
          div.textContent = entry.text;
          col.appendChild(div);
        });
      };
      renderSide('pair-mirror-left', game.left, game.selectedLeft);
      renderSide('pair-mirror-right', game.right, -1);
      return;
    }

    mirror.classList.add('hidden');
    result.classList.remove('hidden');
    const verdict = document.getElementById('pair-mirror-verdict');
    verdict.textContent = game.success
      ? '✓ Alle Paare gefunden!'
      : `✗ Falsches Paar: ${game.failed.left} — ${game.failed.right}`;
    verdict.className = `own-result ${game.success ? 'result-correct' : 'result-wrong'}`;
    const list = document.getElementById('pair-mirror-pairs');
    list.innerHTML = '';
    for (const pair of game.pairs) {
      const li = document.createElement('li');
      li.textContent = `${pair.left} — ${pair.right}`;
      list.appendChild(li);
    }
    for (const extra of game.extra) {
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

  renderSortGame(game) {
    document.getElementById('sort-view').classList.remove('hidden');
    document.getElementById('sort-quiz-name').textContent = game.quizName;
    const mirror = document.getElementById('sort-mirror');
    const result = document.getElementById('sort-mirror-result');

    if (game.phase === 'playing') {
      mirror.classList.remove('hidden');
      result.classList.add('hidden');

      const graph = document.getElementById('sort-mirror-graph');
      graph.innerHTML = '';
      const upper = document.createElement('div');
      upper.className = 'graph-label';
      upper.textContent = `▲ ${game.upperLabel}`;
      graph.appendChild(upper);
      for (const text of game.placed) {
        const div = document.createElement('div');
        div.className = 'placed-item';
        div.textContent = text;
        graph.appendChild(div);
      }
      const lower = document.createElement('div');
      lower.className = 'graph-label';
      lower.textContent = `▼ ${game.lowerLabel}`;
      graph.appendChild(lower);

      const remainingEl = document.getElementById('sort-remaining-list');
      remainingEl.innerHTML = '';
      for (const entry of [...game.left, ...game.right]) {
        if (entry.used) continue;
        const li = document.createElement('li');
        li.textContent = entry.text;
        if (game.selectedText === entry.text) {
          const tag = document.createElement('span');
          tag.className = 'tag';
          tag.textContent = 'ausgewählt';
          li.appendChild(tag);
        }
        remainingEl.appendChild(li);
      }
      return;
    }

    mirror.classList.add('hidden');
    result.classList.remove('hidden');
    const verdict = document.getElementById('sort-mirror-verdict');
    verdict.textContent = game.success
      ? '✓ Alles richtig einsortiert!'
      : `✗ Falsch platziert: ${game.failed.text}`;
    verdict.className = `own-result ${game.success ? 'result-correct' : 'result-wrong'}`;
    const list = document.getElementById('sort-mirror-order');
    list.innerHTML = '';
    const upperLi = document.createElement('li');
    upperLi.textContent = `▲ ${game.upperLabel}`;
    list.appendChild(upperLi);
    for (const text of game.order) {
      const li = document.createElement('li');
      li.textContent = text;
      list.appendChild(li);
    }
    const lowerLi = document.createElement('li');
    lowerLi.textContent = `▼ ${game.lowerLabel}`;
    list.appendChild(lowerLi);
  }

  renderImageGame(game) {
    document.getElementById('image-view').classList.remove('hidden');
    document.getElementById('image-quiz-name').textContent = game.quizName;
    document.getElementById('image-mirror-progress').textContent =
      `${game.phase === 'question' ? 'Bild' : 'Auflösung'} ${game.index + 1} von ${game.total}`;

    const display = document.getElementById('image-mirror-display');
    display.innerHTML = '';
    const img = document.createElement('img');
    img.src = game.image;
    img.alt = 'Quiz-Bild';
    display.appendChild(img);
    if (game.type === 'imagemutation' && game.original) {
      const img2 = document.createElement('img');
      img2.src = game.original;
      img2.alt = 'Original';
      display.appendChild(img2);
    }

    const answerEl = document.getElementById('image-mirror-answer');
    const showAnswer = game.type === 'image' && game.answer;
    answerEl.textContent = showAnswer ? game.answer : '';
    answerEl.classList.toggle('hidden', !showAnswer);
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

// Instantiated by the Next.js page via ControllerBoot.
window.JoinController = JoinController;

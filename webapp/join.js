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

    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.join(this.codeInput.value, this.nameInput.value);
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
    this.renderRoom(response.room);
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

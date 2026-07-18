// Player join page: enter room code + name, then wait for the quizmaster.

class JoinController {
  constructor() {
    this.socket = io();
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
      this.join();
    });

    this.socket.on('room:update', (state) => this.renderRoom(state));
    this.socket.on('room:closed', (info) => this.onRoomClosed(info));
    this.socket.on('disconnect', () => this.setStatus('Verbindung getrennt … versuche erneut'));
    this.socket.on('connect', () => {
      if (this.joined) {
        // Socket.IO reconnected with a new session — rejoin under the same name.
        this.socket.emit('player:join', { code: this.code, name: this.name }, (res) => {
          if (res.ok) {
            this.setStatus('verbunden');
            this.renderRoom(res.room);
          } else {
            this.showJoinForm(res.error);
          }
        });
      }
    });

    // Allow pre-filling the code via /?code=XXXX (e.g. from a QR link).
    const params = new URLSearchParams(window.location.search);
    if (params.get('code')) {
      this.codeInput.value = params.get('code').toUpperCase();
      this.nameInput.focus();
    } else {
      this.codeInput.focus();
    }
  }

  join() {
    const code = this.codeInput.value.trim().toUpperCase();
    const name = this.nameInput.value.trim();
    this.errorEl.textContent = '';
    this.joinButton.disabled = true;

    this.socket.emit('player:join', { code, name }, (res) => {
      this.joinButton.disabled = false;
      if (!res.ok) {
        this.errorEl.textContent = res.error;
        return;
      }
      this.joined = true;
      this.code = res.room.code;
      this.name = res.playerName;

      document.getElementById('joined-code').textContent = this.code;
      document.getElementById('joined-name').textContent = this.name;
      this.form.classList.add('hidden');
      this.waitingEl.classList.remove('hidden');
      this.setStatus('verbunden');
      this.renderRoom(res.room);
    });
  }

  renderRoom(state) {
    if (!this.joined) return;
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
    if (!state.hostConnected) {
      this.setStatus('Quizmaster offline … Raum bleibt kurz bestehen');
    } else {
      this.setStatus('verbunden');
    }
  }

  onRoomClosed(info) {
    this.showJoinForm(info && info.reason ? info.reason : 'Der Raum wurde geschlossen.');
  }

  showJoinForm(message) {
    this.joined = false;
    this.waitingEl.classList.add('hidden');
    this.form.classList.remove('hidden');
    this.errorEl.textContent = message || '';
  }

  setStatus(text) {
    this.statusLine.textContent = text;
  }
}

document.addEventListener('DOMContentLoaded', () => new JoinController());

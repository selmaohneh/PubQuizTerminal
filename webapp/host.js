// Quizmaster page: create a room, load a quiz file or folder playlist and
// watch players join.

const QUIZ_EXTENSIONS = ['.topicquiz', '.pairquiz', '.sortquiz', '.imagequiz', '.imagemutationquiz', '.title'];

class HostController {
  constructor() {
    this.socket = io();
    this.roomCode = null;

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
    this.fileInput.addEventListener('change', () => this.sendFiles(this.fileInput.files));
    this.folderInput.addEventListener('change', () => this.sendFiles(this.folderInput.files));

    this.socket.on('room:update', (state) => this.renderRoom(state));
    this.socket.on('disconnect', () => this.setStatus('Verbindung getrennt … versuche erneut'));
    this.socket.on('connect', () => {
      if (this.roomCode) {
        this.socket.emit('host:reclaim-room', { code: this.roomCode }, (res) => {
          if (res.ok) {
            this.setStatus('bereit');
            this.renderRoom(res.room);
          } else {
            this.setStatus(res.error);
          }
        });
      }
    });
  }

  createRoom() {
    this.createError.textContent = '';
    this.createButton.disabled = true;
    this.socket.emit('host:create-room', (res) => {
      this.createButton.disabled = false;
      if (!res.ok) {
        this.createError.textContent = res.error || 'Raum konnte nicht erstellt werden.';
        return;
      }
      this.roomCode = res.room.code;
      document.getElementById('room-code').textContent = this.roomCode;
      document.getElementById('join-urls').textContent = res.joinUrls
        .map((url) => `${url}/?code=${this.roomCode}`)
        .join('  |  ');
      this.createView.classList.add('hidden');
      this.roomView.classList.remove('hidden');
      this.setStatus('bereit');
      this.renderRoom(res.room);
    });
  }

  async sendFiles(fileList) {
    this.loadError.textContent = '';
    const files = [...fileList].filter((file) =>
      QUIZ_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))
    );

    if (files.length === 0) {
      this.loadError.textContent = 'Keine Quiz-Dateien gefunden (.topicquiz, .pairquiz, .sortquiz, .imagequiz, .imagemutationquiz, .title).';
      return;
    }

    this.setStatus(`${files.length} Datei(en) werden geladen …`);
    const payload = [];
    for (const file of files) {
      payload.push({ name: file.name, content: await file.text() });
    }

    this.socket.emit('host:load-quizzes', { files: payload }, (res) => {
      if (!res.ok) {
        this.loadError.textContent = this.formatErrors(res.error, res.errors);
        this.setStatus('bereit');
        return;
      }
      if (res.errors && res.errors.length > 0) {
        this.loadError.textContent = this.formatErrors('Einige Dateien wurden übersprungen:', res.errors);
      }
      this.setStatus('bereit');
      this.renderRoom(res.room);
    });

    // Allow re-selecting the same file/folder.
    this.fileInput.value = '';
    this.folderInput.value = '';
  }

  formatErrors(message, errors) {
    const details = (errors || [])
      .map((e) => `${e.file}: ${e.errors.join(', ')}`)
      .join(' — ');
    return details ? `${message} ${details}` : message;
  }

  closeRoom() {
    this.socket.emit('host:close-room', () => {
      this.roomCode = null;
      this.roomView.classList.add('hidden');
      this.createView.classList.remove('hidden');
    });
  }

  renderRoom(state) {
    const playlistEl = document.getElementById('playlist');
    playlistEl.innerHTML = '';
    for (const quiz of state.playlist) {
      const li = document.createElement('li');
      li.textContent = quiz.fileName;
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = quiz.typeName;
      li.appendChild(tag);
      playlistEl.appendChild(li);
    }
    document.getElementById('playlist-empty').classList.toggle('hidden', state.playlist.length > 0);

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

  setStatus(text) {
    this.statusLine.textContent = text;
  }
}

document.addEventListener('DOMContentLoaded', () => new HostController());

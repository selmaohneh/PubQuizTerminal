// In-memory room management for quiz sessions.
//
// A room is created by a quizmaster (host) and identified by a short random
// code. Players join with that code and a display name. Rooms only live in
// memory — a server restart clears everything.

// No easily confused characters (0/O, 1/I/L).
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 4;
const HOST_RECONNECT_GRACE_MS = 60 * 1000;

const MAX_NAME_LENGTH = 20;

class Room {
  constructor(code, hostSocketId) {
    this.code = code;
    this.hostSocketId = hostSocketId;
    this.hostConnected = true;
    this.players = []; // { name, socketId, connected }
    this.playlist = []; // { fileName, extension, typeName, quizData }
    this.createdAt = Date.now();
    this.closeTimer = null;
  }

  findPlayerByName(name) {
    const lower = name.toLowerCase();
    return this.players.find((p) => p.name.toLowerCase() === lower);
  }

  findPlayerBySocketId(socketId) {
    return this.players.find((p) => p.socketId === socketId);
  }

  toPublicState() {
    return {
      code: this.code,
      hostConnected: this.hostConnected,
      players: this.players.map((p) => ({ name: p.name, connected: p.connected })),
      playlist: this.playlist.map((q) => ({ fileName: q.fileName, typeName: q.typeName }))
    };
  }
}

class RoomManager {
  constructor() {
    this.rooms = new Map(); // code -> Room
  }

  generateCode() {
    for (let attempt = 0; attempt < 100; attempt++) {
      let code = '';
      for (let i = 0; i < CODE_LENGTH; i++) {
        code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
      }
      if (!this.rooms.has(code)) {
        return code;
      }
    }
    throw new Error('Could not generate a unique room code');
  }

  createRoom(hostSocketId) {
    const code = this.generateCode();
    const room = new Room(code, hostSocketId);
    this.rooms.set(code, room);
    return room;
  }

  getRoom(code) {
    return code ? this.rooms.get(code.toUpperCase().trim()) : undefined;
  }

  findRoomByHostSocketId(socketId) {
    for (const room of this.rooms.values()) {
      if (room.hostSocketId === socketId) {
        return room;
      }
    }
    return undefined;
  }

  findRoomByPlayerSocketId(socketId) {
    for (const room of this.rooms.values()) {
      if (room.findPlayerBySocketId(socketId)) {
        return room;
      }
    }
    return undefined;
  }

  // Returns { ok, error?, room?, player?, rejoined? }
  joinRoom(code, rawName, socketId) {
    const room = this.getRoom(code);
    if (!room) {
      return { ok: false, error: 'Raum nicht gefunden. Code prüfen!' };
    }

    const name = typeof rawName === 'string' ? rawName.trim() : '';
    if (!name) {
      return { ok: false, error: 'Bitte einen Namen angeben.' };
    }
    if (name.length > MAX_NAME_LENGTH) {
      return { ok: false, error: `Name darf höchstens ${MAX_NAME_LENGTH} Zeichen lang sein.` };
    }

    const existing = room.findPlayerByName(name);
    if (existing) {
      if (existing.connected) {
        return { ok: false, error: 'Dieser Name ist in dem Raum schon vergeben.' };
      }
      // Player lost connection earlier and rejoins under the same name.
      existing.socketId = socketId;
      existing.connected = true;
      return { ok: true, room, player: existing, rejoined: true };
    }

    const player = { name, socketId, connected: true };
    room.players.push(player);
    return { ok: true, room, player, rejoined: false };
  }

  closeRoom(code) {
    const room = this.rooms.get(code);
    if (room) {
      if (room.closeTimer) {
        clearTimeout(room.closeTimer);
        room.closeTimer = null;
      }
      this.rooms.delete(code);
    }
    return room;
  }

  // Marks the host as disconnected and schedules the room for closing unless
  // the host reclaims it within the grace period. onClose(room) fires when the
  // room actually closes.
  handleHostDisconnect(socketId, onClose) {
    const room = this.findRoomByHostSocketId(socketId);
    if (!room) {
      return undefined;
    }
    room.hostConnected = false;
    room.closeTimer = setTimeout(() => {
      this.rooms.delete(room.code);
      onClose(room);
    }, HOST_RECONNECT_GRACE_MS);
    return room;
  }

  // Host reopens their room after a page reload / connection drop.
  reclaimRoom(code, socketId) {
    const room = this.getRoom(code);
    if (!room) {
      return { ok: false, error: 'Raum existiert nicht mehr.' };
    }
    if (room.hostConnected) {
      return { ok: false, error: 'Raum hat bereits einen aktiven Quizmaster.' };
    }
    if (room.closeTimer) {
      clearTimeout(room.closeTimer);
      room.closeTimer = null;
    }
    room.hostSocketId = socketId;
    room.hostConnected = true;
    return { ok: true, room };
  }

  handlePlayerDisconnect(socketId) {
    const room = this.findRoomByPlayerSocketId(socketId);
    if (!room) {
      return undefined;
    }
    const player = room.findPlayerBySocketId(socketId);
    player.connected = false;
    return room;
  }
}

module.exports = { RoomManager, HOST_RECONNECT_GRACE_MS, MAX_NAME_LENGTH };

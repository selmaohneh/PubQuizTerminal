// PubQuizTerminal web server.
//
// The quizmaster starts this server, opens /host in a browser and creates a
// room with a random code. Players open the join page on their smartphones,
// enter the code and a name — their phone becomes a quiz terminal.

const http = require('http');
const os = require('os');
const path = require('path');
const express = require('express');
const { Server } = require('socket.io');

const { RoomManager } = require('./room-manager');
const { validateQuizFile, isKnownQuizExtension } = require('./quiz-validation');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const MAX_UPLOAD_FILES = 200;
const MAX_FILE_SIZE = 2 * 1024 * 1024; // per quiz file, quiz files are small JSON

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  maxHttpBufferSize: 10 * 1024 * 1024
});

const rooms = new RoomManager();

app.use(express.static(path.join(__dirname, '..', 'webapp')));

app.get('/host', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'webapp', 'host.html'));
});

function getLanUrls() {
  const urls = [];
  const interfaces = os.networkInterfaces();
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries || []) {
      if (entry.family === 'IPv4' && !entry.internal) {
        urls.push(`http://${entry.address}:${PORT}`);
      }
    }
  }
  if (urls.length === 0) {
    urls.push(`http://localhost:${PORT}`);
  }
  return urls;
}

function broadcastRoomState(room) {
  io.to(room.code).emit('room:update', room.toPublicState());
}

io.on('connection', (socket) => {
  socket.on('host:create-room', (callback) => {
    if (typeof callback !== 'function') return;

    // One room per host connection — close a previous one if it exists.
    const previous = rooms.findRoomByHostSocketId(socket.id);
    if (previous) {
      rooms.closeRoom(previous.code);
      io.to(previous.code).emit('room:closed', { reason: 'Der Quizmaster hat den Raum geschlossen.' });
      socket.leave(previous.code);
    }

    const room = rooms.createRoom(socket.id);
    socket.join(room.code);
    callback({ ok: true, room: room.toPublicState(), joinUrls: getLanUrls() });
  });

  socket.on('host:reclaim-room', (payload, callback) => {
    if (typeof callback !== 'function') return;
    const result = rooms.reclaimRoom(payload && payload.code, socket.id);
    if (!result.ok) {
      callback({ ok: false, error: result.error });
      return;
    }
    socket.join(result.room.code);
    callback({ ok: true, room: result.room.toPublicState(), joinUrls: getLanUrls() });
    broadcastRoomState(result.room);
  });

  socket.on('host:load-quizzes', (payload, callback) => {
    if (typeof callback !== 'function') return;
    const room = rooms.findRoomByHostSocketId(socket.id);
    if (!room) {
      callback({ ok: false, error: 'Kein aktiver Raum. Bitte zuerst einen Raum erstellen.' });
      return;
    }

    const files = payload && Array.isArray(payload.files) ? payload.files : [];
    if (files.length === 0) {
      callback({ ok: false, error: 'Keine Quiz-Dateien übergeben.' });
      return;
    }
    if (files.length > MAX_UPLOAD_FILES) {
      callback({ ok: false, error: `Zu viele Dateien (max. ${MAX_UPLOAD_FILES}).` });
      return;
    }

    // Same behavior as folder playlists in the Electron app: alphabetical order.
    const sorted = [...files].sort((a, b) => String(a.name).localeCompare(String(b.name)));

    const playlist = [];
    const errors = [];
    for (const file of sorted) {
      const name = typeof file.name === 'string' ? path.basename(file.name) : '';
      const content = typeof file.content === 'string' ? file.content : '';
      if (!name) {
        errors.push({ file: '(unbenannt)', errors: ['Dateiname fehlt'] });
        continue;
      }
      if (content.length > MAX_FILE_SIZE) {
        errors.push({ file: name, errors: ['Datei ist zu groß'] });
        continue;
      }
      const result = validateQuizFile(name, content);
      if (result.isValid) {
        playlist.push(result.quiz);
      } else {
        errors.push({ file: name, errors: result.errors });
      }
    }

    if (playlist.length === 0) {
      callback({ ok: false, error: 'Keine gültigen Quiz-Dateien gefunden.', errors });
      return;
    }

    room.playlist = playlist;
    callback({ ok: true, room: room.toPublicState(), errors });
    broadcastRoomState(room);
  });

  socket.on('host:close-room', (callback) => {
    const room = rooms.findRoomByHostSocketId(socket.id);
    if (room) {
      rooms.closeRoom(room.code);
      io.to(room.code).emit('room:closed', { reason: 'Der Quizmaster hat den Raum geschlossen.' });
      socket.leave(room.code);
    }
    if (typeof callback === 'function') {
      callback({ ok: true });
    }
  });

  socket.on('player:join', (payload, callback) => {
    if (typeof callback !== 'function') return;
    const code = payload && payload.code;
    const name = payload && payload.name;

    const result = rooms.joinRoom(code, name, socket.id);
    if (!result.ok) {
      callback({ ok: false, error: result.error });
      return;
    }

    socket.join(result.room.code);
    callback({
      ok: true,
      room: result.room.toPublicState(),
      playerName: result.player.name,
      rejoined: result.rejoined
    });
    broadcastRoomState(result.room);
  });

  socket.on('disconnect', () => {
    const hostRoom = rooms.handleHostDisconnect(socket.id, (closedRoom) => {
      io.to(closedRoom.code).emit('room:closed', {
        reason: 'Der Quizmaster hat die Verbindung verloren.'
      });
    });
    if (hostRoom) {
      broadcastRoomState(hostRoom);
      return;
    }

    const playerRoom = rooms.handlePlayerDisconnect(socket.id);
    if (playerRoom) {
      broadcastRoomState(playerRoom);
    }
  });
});

server.listen(PORT, () => {
  console.log('PubQuizTerminal Server läuft:');
  console.log(`  Quizmaster: http://localhost:${PORT}/host`);
  for (const url of getLanUrls()) {
    console.log(`  Spieler:    ${url}`);
  }
});

module.exports = { app, server, io, rooms, isKnownQuizExtension };

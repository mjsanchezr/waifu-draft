'use strict';

const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const { Room } = require('./room');

const PORT = process.env.PORT || 3000;
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I ambiguity
const ROOM_TTL_MS = 6 * 60 * 60 * 1000; // clean up abandoned rooms after 6h idle

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, '..', 'public')));
app.get('/healthz', (_req, res) => res.status(200).send('ok'));

/** @type {Map<string, Room>} */
const rooms = new Map();

function generateRoomCode() {
  let code;
  do {
    code = Array.from({ length: 4 }, () =>
      ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)]
    ).join('');
  } while (rooms.has(code));
  return code;
}

function broadcast(room) {
  io.to(room.code).emit('state', room.toJSON());
}

function createRoom() {
  const code = generateRoomCode();
  const room = new Room(code, broadcast);
  rooms.set(code, room);
  return room;
}

// Periodic sweep for rooms nobody has touched in a long while.
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.lastActivity > ROOM_TTL_MS) {
      room.destroy();
      rooms.delete(code);
    }
  }
}, 30 * 60 * 1000);

io.on('connection', (socket) => {
  socket.data.roomCode = null;
  socket.data.playerId = null;

  function joinSocketToRoom(room, player) {
    socket.data.roomCode = room.code;
    socket.data.playerId = player.id;
    socket.join(room.code);
  }

  socket.on('createRoom', ({ name } = {}, ack) => {
    const room = createRoom();
    const player = room.addPlayer(name, socket.id);
    joinSocketToRoom(room, player);
    ack && ack({ ok: true, roomCode: room.code, playerId: player.id });
    broadcast(room);
  });

  socket.on('joinRoom', ({ code, name } = {}, ack) => {
    const room = rooms.get(String(code || '').toUpperCase());
    if (!room) return ack && ack({ ok: false, error: 'room_not_found' });
    if (room.phase !== 'lobby') return ack && ack({ ok: false, error: 'game_in_progress' });
    if (room.players.size >= 4) return ack && ack({ ok: false, error: 'room_full' });

    const player = room.addPlayer(name, socket.id);
    joinSocketToRoom(room, player);
    ack && ack({ ok: true, roomCode: room.code, playerId: player.id });
    broadcast(room);
  });

  socket.on('rejoin', ({ code, playerId } = {}, ack) => {
    const room = rooms.get(String(code || '').toUpperCase());
    if (!room) return ack && ack({ ok: false, error: 'room_not_found' });
    const player = room.reconnect(playerId, socket.id);
    if (!player) return ack && ack({ ok: false, error: 'player_not_found' });
    joinSocketToRoom(room, player);
    ack && ack({ ok: true, roomCode: room.code, playerId: player.id });
    broadcast(room);
  });

  function currentRoom() {
    return socket.data.roomCode ? rooms.get(socket.data.roomCode) : null;
  }

  socket.on('updateSettings', (patch, ack) => {
    const room = currentRoom();
    if (!room) return ack && ack({ ok: false, error: 'no_room' });
    const result = room.updateSettings(socket.data.playerId, patch);
    ack && ack(result);
  });

  socket.on('startGame', (_payload, ack) => {
    const room = currentRoom();
    if (!room) return ack && ack({ ok: false, error: 'no_room' });
    if (room.hostId !== socket.data.playerId) return ack && ack({ ok: false, error: 'not_host' });
    const started = room.startAuction();
    ack && ack({ ok: started });
    if (started) broadcast(room);
  });

  socket.on('nominate', ({ characterId } = {}, ack) => {
    const room = currentRoom();
    if (!room) return ack && ack({ ok: false, error: 'no_room' });
    const result = room.nominate(socket.data.playerId, characterId);
    ack && ack(result);
  });

  socket.on('placeBid', ({ amount } = {}, ack) => {
    const room = currentRoom();
    if (!room) return ack && ack({ ok: false, error: 'no_room' });
    const result = room.placeBid(socket.data.playerId, amount);
    ack && ack(result);
  });

  socket.on('skipBid', (_payload, ack) => {
    const room = currentRoom();
    if (!room) return ack && ack({ ok: false, error: 'no_room' });
    const result = room.skip(socket.data.playerId);
    ack && ack(result);
  });

  socket.on('leaveRoom', (_payload, ack) => {
    const room = currentRoom();
    if (!room) return ack && ack({ ok: false, error: 'no_room' });
    const result = room.leaveRoom(socket.data.playerId);
    if (result.ok) {
      socket.leave(room.code);
      socket.data.roomCode = null;
      socket.data.playerId = null;
      if (result.empty) {
        room.destroy();
        rooms.delete(room.code);
      }
    }
    ack && ack(result);
  });

  socket.on('castVote', ({ candidatePlayerId } = {}, ack) => {
    const room = currentRoom();
    if (!room) return ack && ack({ ok: false, error: 'no_room' });
    const result = room.castVote(socket.data.playerId, candidatePlayerId);
    ack && ack(result);
  });

  socket.on('playAgain', (_payload, ack) => {
    const room = currentRoom();
    if (!room) return ack && ack({ ok: false, error: 'no_room' });
    if (room.hostId !== socket.data.playerId) return ack && ack({ ok: false, error: 'not_host' });
    if (room.phase !== 'results') return ack && ack({ ok: false, error: 'not_finished' });
    room.resetToLobby();
    ack && ack({ ok: true });
  });

  socket.on('disconnect', () => {
    const room = currentRoom();
    if (!room) return;
    room.disconnectSocket(socket.id);
    broadcast(room);
  });
});

server.listen(PORT, () => {
  console.log(`Waifu Draft listening on port ${PORT}`);
});

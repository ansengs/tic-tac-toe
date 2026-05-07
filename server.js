import express from 'express';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const ROOM_ID_LENGTH = 5;
const rooms = new Map();

const emptyBoard = () => Array(9).fill(0);
const createGame = (hostId, restriction) => ({
  players: [hostId],
  playerTurn: { mark: 'x', socketId: hostId },
  board: emptyBoard(),
  spacesLeft: 9,
  inSession: false,
  restriction,
  newGameVotes: [],
});

function isRoomId(value) {
  return typeof value === 'string' && /^[A-Za-z0-9]{5}$/.test(value);
}

function emitRoom(roomId) {
  const game = rooms.get(roomId);
  if (game) io.to(roomId).emit('game-state', { roomId, game });
}

function winner(board, spacesLeft) {
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (const [a,b,c] of lines) {
    const total = board[a] + board[b] + board[c];
    if (total === 3) return 'x';
    if (total === -3) return 'o';
  }
  return spacesLeft === 0 ? 'cat' : null;
}

function endGame(roomId, result) {
  const game = rooms.get(roomId);
  if (!game) return;
  game.inSession = false;
  game.result = result;
  game.newGameVotes = [];
  io.to(roomId).emit('game-ended', { roomId, game, result });
  emitRoom(roomId);
}

io.on('connection', (socket) => {
  socket.on('host-room', ({ roomId, restriction }) => {
    if (!isRoomId(roomId) || rooms.has(roomId)) {
      socket.emit('host-result', { ok: false, reason: 'room-unavailable' });
      return;
    }
    rooms.set(roomId, createGame(socket.id, restriction === 'private' ? 'private' : 'public'));
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.emit('host-result', { ok: true, roomId });
    emitRoom(roomId);
  });

  socket.on('join-room', ({ roomId }) => {
    const game = rooms.get(roomId);
    if (!isRoomId(roomId) || !game || game.players.length >= 2) {
      socket.emit('join-result', { ok: false, roomId });
      return;
    }
    game.players.push(socket.id);
    game.board = emptyBoard();
    game.spacesLeft = 9;
    game.playerTurn = { mark: 'x', socketId: game.players[0] };
    game.inSession = true;
    game.result = null;
    game.newGameVotes = [];
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.emit('join-result', { ok: true, roomId });
    io.to(roomId).emit('player-joined', { roomId, playerId: socket.id });
    emitRoom(roomId);
  });

  socket.on('random-match', () => {
    const available = [...rooms.entries()].find(([, game]) => game.restriction === 'public' && game.players.length === 1);
    if (available) {
      socket.emit('random-room-found', { roomId: available[0] });
    } else {
      socket.emit('random-room-found', { roomId: null });
    }
  });

  socket.on('make-move', ({ roomId, index }) => {
    const game = rooms.get(roomId);
    if (!game || !game.inSession || game.playerTurn.socketId !== socket.id) return;
    if (!Number.isInteger(index) || index < 0 || index > 8 || game.board[index] !== 0) return;

    game.board[index] = game.playerTurn.mark === 'x' ? 1 : -1;
    game.spacesLeft -= 1;
    const result = winner(game.board, game.spacesLeft);
    if (result) {
      endGame(roomId, result);
      return;
    }

    const nextMark = game.playerTurn.mark === 'x' ? 'o' : 'x';
    const nextPlayer = nextMark === 'x' ? game.players[0] : game.players[1];
    game.playerTurn = { mark: nextMark, socketId: nextPlayer };
    emitRoom(roomId);
  });

  socket.on('new-game-vote', ({ roomId }) => {
    const game = rooms.get(roomId);
    if (!game || !game.players.includes(socket.id)) return;
    if (!game.newGameVotes.includes(socket.id)) game.newGameVotes.push(socket.id);

    if (game.players.length === 2 && game.newGameVotes.length === 2) {
      game.board = emptyBoard();
      game.spacesLeft = 9;
      game.playerTurn = { mark: 'x', socketId: game.players[0] };
      game.inSession = true;
      game.result = null;
      game.newGameVotes = [];
    }
    emitRoom(roomId);
  });

  socket.on('leave-room', ({ roomId }) => {
    leaveRoom(socket, roomId);
  });

  socket.on('disconnect', () => {
    if (socket.data.roomId) leaveRoom(socket, socket.data.roomId, true);
  });
});

function leaveRoom(socket, roomId, disconnected = false) {
  const game = rooms.get(roomId);
  if (!game) return;
  const wasPlayer = game.players.includes(socket.id);
  game.players = game.players.filter((id) => id !== socket.id);
  game.newGameVotes = game.newGameVotes.filter((id) => id !== socket.id);
  socket.leave(roomId);
  if (socket.data.roomId === roomId) socket.data.roomId = null;

  if (game.players.length === 0) {
    rooms.delete(roomId);
    return;
  }

  if (wasPlayer) {
    game.inSession = false;
    game.playerTurn = { mark: 'x', socketId: game.players[0] };
    game.result = disconnected ? 'opponent-disconnected' : 'opponent-left';
    io.to(roomId).emit('opponent-left', { roomId, disconnected });
  }
  emitRoom(roomId);
}

app.use(express.static(join(__dirname, 'dist')));
app.get('/healthz', (_req, res) => res.status(200).send('ok'));
app.get(/.*/, (_req, res) => res.sendFile(join(__dirname, 'dist', 'index.html')));

server.listen(PORT, HOST, () => {
  console.log(`Tic-Tac-Toe React multiplayer running on http://localhost:${PORT}`);
});

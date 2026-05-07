// server.js — Tic-Tac-Toe multiplayer server
'use strict';

const express = require('express');
const { createServer } = require('node:http');
const { join } = require('node:path');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);
const io = new Server(server);

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC_DIR = join(__dirname, 'public');
const ROOM_ID_LENGTH = 5;

// Static files
app.use(express.static(PUBLIC_DIR));

app.get('/', (_req, res) => {
    res.sendFile(join(PUBLIC_DIR, 'index.html'));
});

// Health check (useful when deployed behind a load balancer)
app.get('/healthz', (_req, res) => res.status(200).send('ok'));

/**
 * Return true if the given room id is a game room (not an auto-joined per-socket room).
 * Socket.IO auto-joins each socket to a room named by its own socket id; we exclude those.
 */
function isGameRoomId(roomId) {
    return (
        typeof roomId === 'string' &&
        roomId.length === ROOM_ID_LENGTH &&
        !io.sockets.sockets.has(roomId)
    );
}

io.on('connection', (socket) => {
    console.log(`[connect] ${socket.id}`);

    let currentRoomId = null;
    let availableRooms = [];

    socket.on('search-rooms', (availableRoom, userId, isRandomMatch, roomCount, numOfGameRooms) => {
        // Initial search: find all game rooms that currently hold exactly one player
        if (availableRoom == null) {
            availableRooms = [];
            const newRooms = [];

            for (const [roomId, sockets] of io.sockets.adapter.rooms) {
                if (isGameRoomId(roomId) && sockets.size === 1) {
                    newRooms.push(roomId);
                }
            }

            numOfGameRooms = newRooms.length;
            for (const searchRoom of newRooms) {
                roomCount++;
                // Ask the host of each room whether it's joinable under current restriction
                io.to(searchRoom).emit(
                    'search-rooms-restriction',
                    searchRoom,
                    userId,
                    isRandomMatch,
                    roomCount,
                    numOfGameRooms,
                );
            }

            if (newRooms.length === 0) {
                io.to(userId).emit('room-available', null, isRandomMatch);
            }
            return;
        }

        // Response phase: host replied with either a room id (joinable) or 'checked' (skip)
        if (availableRoom !== 'checked') {
            availableRooms.push(availableRoom);
        }

        if (roomCount === numOfGameRooms) {
            const room = availableRooms.length > 0
                ? availableRooms[Math.floor(Math.random() * availableRooms.length)]
                : null;
            io.to(userId).emit('room-available', room, isRandomMatch);
            if (room) currentRoomId = room;
        }
    });

    socket.on('data-update', ([data, roomId]) => {
        io.to(roomId).emit('data-update', [data, roomId]);
    });

    socket.on('new-game', (roomId, userId) => {
        io.to(roomId).emit('new-game', roomId, userId);
    });

    socket.on('host', ([restriction, roomId]) => {
        if (!isGameRoomId(roomId)) {
            console.warn(`[host] rejected invalid room id: ${roomId}`);
            return;
        }
        const gameData = {
            players: [socket.id],
            player_turn: { x: socket.id },
            result: { null: null },
            board: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 },
            spaces_left: 9,
            in_session: false,
            restriction,
        };
        socket.join(roomId);
        currentRoomId = roomId;
        io.to(roomId).emit('data-update', [gameData, roomId]);
        console.log(`[host]  ${socket.id} created room ${roomId} (${restriction})`);
    });

    socket.on('join-room', (roomId, userId) => {
        // Verify the room exists server-side (don't trust client state)
        const roomSockets = io.sockets.adapter.rooms.get(roomId);
        const exists = isGameRoomId(roomId) && roomSockets && roomSockets.size >= 1;
        if (exists) {
            socket.join(roomId);
            currentRoomId = roomId;
            // Tell joiner first, then broadcast to the room so handler ordering is deterministic
            socket.emit('join-room-result', { ok: true, roomId });
            io.to(roomId).emit('player-joined', userId);
            console.log(`[join]  ${userId} joined room ${roomId}`);
        } else {
            socket.emit('join-room-result', { ok: false, roomId, reason: 'not-found' });
            console.log(`[join]  room ${roomId} does not exist`);
        }
    });

    socket.on('disconnecting', () => {
        if (currentRoomId) {
            io.to(currentRoomId).emit('disconnected', socket.id);
        }
    });

    socket.on('disconnect', (reason) => {
        console.log(`[disconnect] ${socket.id} (${reason})`);
    });
});

// Graceful shutdown so Ctrl+C in the terminal exits cleanly
function shutdown(signal) {
    console.log(`\n${signal} received. Shutting down...`);
    io.close(() => {
        server.close(() => process.exit(0));
    });
    // Force-exit after 5s if something hangs
    setTimeout(() => process.exit(1), 5000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

server.listen(PORT, HOST, () => {
    console.log(`Tic-Tac-Toe server listening on http://localhost:${PORT}`);
});

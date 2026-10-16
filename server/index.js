import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const PORT = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*';

const MAX_ROOM_LEN = 32;
const MAX_NAME_LEN = 64;
const MAX_ID_LEN = 128;
const MAX_ROOM_PEERS = 12;
const SIGNAL_RATE_PER_SEC = 40;
const SIGNAL_BURST = 80;

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.get('/health', (_req, res) => res.json({ ok: true, service: 'vuga-signal' }));

const http = createServer(app);
const io = new Server(http, {
  cors: { origin: CLIENT_ORIGIN, methods: ['GET', 'POST'] },
  maxHttpBufferSize: 1e5,
  pingInterval: 25000,
  pingTimeout: 20000
});

const rooms = new Map();

function roomUsers(room) {
  return [...(rooms.get(room)?.values() || [])];
}

function cleanRoom(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, MAX_ROOM_LEN);
}

function cleanStr(value, max) {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

function validSignalData(data) {
  if (!data || typeof data !== 'object') return false;
  if (data.sdp && typeof data.sdp === 'object') return true;
  if (data.candidate && typeof data.candidate === 'object') return true;
  return false;
}

io.on('connection', (socket) => {
  let joinedRoom = null;
  let me = null;
  let tokens = SIGNAL_BURST;
  let lastRefill = Date.now();

  const allowSignal = () => {
    const now = Date.now();
    tokens = Math.min(SIGNAL_BURST, tokens + ((now - lastRefill) / 1000) * SIGNAL_RATE_PER_SEC);
    lastRefill = now;
    if (tokens < 1) return false;
    tokens -= 1;
    return true;
  };

  const leaveCurrentRoom = () => {
    if (!joinedRoom || !me) return;
    socket.to(joinedRoom).emit('peer-left', { socketId: socket.id, userId: me.userId });
    const set = rooms.get(joinedRoom);
    if (set) {
      set.delete(socket.id);
      if (set.size === 0) rooms.delete(joinedRoom);
    }
    socket.leave(joinedRoom);
    joinedRoom = null;
    me = null;
  };

  socket.on('join-room', (payload, ack) => {
    if (!payload || typeof payload !== 'object') return;
    const room = cleanRoom(payload.room);
    if (!room) return;

    leaveCurrentRoom();

    if (roomUsers(room).length >= MAX_ROOM_PEERS) {
      if (typeof ack === 'function') ack({ ok: false, error: 'room-full' });
      return;
    }

    joinedRoom = room;
    me = {
      socketId: socket.id,
      userId: cleanStr(payload.userId, MAX_ID_LEN) || 'guest',
      name: cleanStr(payload.name, MAX_NAME_LEN) || 'Guest'
    };

    const existing = roomUsers(room);
    if (!rooms.has(room)) rooms.set(room, new Map());
    rooms.get(room).set(socket.id, me);
    socket.join(room);
    socket.emit('room-peers', existing);
    socket.to(room).emit('peer-joined', me);
    if (typeof ack === 'function') ack({ ok: true });
  });

  socket.on('signal', (payload) => {
    if (!me || !joinedRoom) return;
    if (!payload || typeof payload !== 'object') return;
    const { to, data } = payload;
    if (typeof to !== 'string' || !validSignalData(data)) return;
    if (!allowSignal()) return;
    const target = rooms.get(joinedRoom)?.get(to);
    if (!target) return;
    io.to(target.socketId).emit('signal', { from: socket.id, data });
  });

  socket.on('leave-room', leaveCurrentRoom);
  socket.on('disconnecting', leaveCurrentRoom);
});

http.listen(PORT, () => console.log(`Vuga signal server on :${PORT}`));

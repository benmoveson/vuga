import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import {
  MAX_ROOM_PEERS,
  MAX_NAME_LEN,
  MAX_ID_LEN,
  SIGNAL_RATE_PER_SEC,
  SIGNAL_BURST,
  cleanRoom,
  cleanStr,
  validSignalData,
  pickNextHost
} from './signalLib.js';

const PORT = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*';

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

function getRoom(room) {
  return rooms.get(room);
}

function roomUsers(room) {
  return [...(getRoom(room)?.peers.values() || [])];
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
    const roomState = getRoom(joinedRoom);
    if (roomState) {
      roomState.peers.delete(socket.id);
      if (roomState.peers.size === 0) {
        rooms.delete(joinedRoom);
      } else {
        const nextHostId = pickNextHost([...roomState.peers.keys()], socket.id, roomState.hostId);
        if (nextHostId && nextHostId !== roomState.hostId) {
          roomState.hostId = nextHostId;
          io.to(joinedRoom).emit('host-changed', { hostId: nextHostId });
        }
      }
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
    if (!rooms.has(room)) rooms.set(room, { peers: new Map(), hostId: null });
    const roomState = rooms.get(room);
    roomState.peers.set(socket.id, me);
    if (!roomState.hostId) roomState.hostId = socket.id;

    socket.join(room);
    socket.emit('room-peers', { peers: existing, hostId: roomState.hostId });
    socket.to(room).emit('peer-joined', me);
    if (typeof ack === 'function') ack({ ok: true });
  });

  socket.on('signal', (payload) => {
    if (!me || !joinedRoom) return;
    if (!payload || typeof payload !== 'object') return;
    const { to, data } = payload;
    if (typeof to !== 'string' || !validSignalData(data)) return;
    if (!allowSignal()) return;
    const target = getRoom(joinedRoom)?.peers.get(to);
    if (!target) return;
    io.to(target.socketId).emit('signal', { from: socket.id, data });
  });

  socket.on('leave-room', leaveCurrentRoom);
  socket.on('disconnecting', leaveCurrentRoom);
});

http.listen(PORT, () => console.log(`Vuga signal server on :${PORT}`));

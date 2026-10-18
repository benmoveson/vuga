import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

function buildIceServers() {
  const stun = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ];

  const turnUrl = import.meta.env.VITE_TURN_URL;
  if (turnUrl) {
    return [
      ...stun,
      {
        urls: turnUrl.split(',').map((s) => s.trim()).filter(Boolean),
        username: import.meta.env.VITE_TURN_USERNAME || '',
        credential: import.meta.env.VITE_TURN_CREDENTIAL || ''
      }
    ];
  }

  return [
    ...stun,
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp'
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ];
}

const ICE = buildIceServers();

export default function useWebRTC(roomCode, user, localStream) {
  const socketRef = useRef(null);
  const peersRef = useRef(new Map());
  const pendingIceRef = useRef(new Map());
  const hadConnectedRef = useRef(false);
  const [peers, setPeers] = useState([]);
  const [joinError, setJoinError] = useState(null);

  const userKey = user?.uid || user?.name || 'guest';

  useEffect(() => {
    if (!roomCode || !localStream) return;

    const socket = io(SERVER_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    const peersMap = peersRef.current;
    const pendingIce = pendingIceRef.current;

    function publishPeers() {
      setPeers(
        [...peersMap.entries()].map(([socketId, e]) => ({
          socketId,
          stream: e.stream
        }))
      );
    }

    const flushPendingIce = async (socketId, pc) => {
      const queued = pendingIce.get(socketId);
      if (!queued) return;
      pendingIce.delete(socketId);
      for (const candidate of queued) {
        try {
          await pc.addIceCandidate(candidate);
        } catch {
          /* peer connection already closed */
        }
      }
    };

    const createPeer = (socketId, initiator) => {
      const existing = peersMap.get(socketId);
      if (existing) return existing.pc;

      const pc = new RTCPeerConnection({ iceServers: ICE });

      localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));

      pc.onicecandidate = (e) => {
        if (e.candidate) socket.emit('signal', { to: socketId, data: { candidate: e.candidate } });
      };

      pc.ontrack = (e) => {
        const entry = peersMap.get(socketId);
        if (!entry) return;
        entry.stream = e.streams[0];
        publishPeers();
      };

      pc.onconnectionstatechange = () => {
        if (['failed', 'closed'].includes(pc.connectionState)) removePeer(socketId);
      };

      if (initiator) {
        pc.onnegotiationneeded = async () => {
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit('signal', { to: socketId, data: { sdp: pc.localDescription } });
          } catch (err) {
            console.error('negotiation error', err);
          }
        };
      }

      peersMap.set(socketId, { pc, stream: null });
      return pc;
    };

    const removePeer = (socketId) => {
      const entry = peersMap.get(socketId);
      if (entry) {
        entry.pc.close();
        peersMap.delete(socketId);
      }
      pendingIce.delete(socketId);
      publishPeers();
    };

    socket.on('connect', () => {
      if (hadConnectedRef.current) {
        peersMap.forEach((e) => e.pc.close());
        peersMap.clear();
        pendingIce.clear();
        publishPeers();
      }
      hadConnectedRef.current = true;

      socket.emit(
        'join-room',
        {
          room: roomCode,
          userId: userKey,
          name: user?.displayName || user?.name || 'Guest'
        },
        (res) => {
          if (res && res.ok === false) {
            setJoinError(res.error || 'join-failed');
          }
        }
      );
    });

    socket.on('room-peers', (existing) => {
      existing.forEach((peer) => createPeer(peer.socketId, true));
    });

    socket.on('peer-joined', (peer) => {
      createPeer(peer.socketId, false);
    });

    socket.on('signal', async ({ from, data }) => {
      if (!peersMap.has(from)) createPeer(from, false);
      const pc = peersMap.get(from)?.pc;
      if (!pc) return;

      try {
        if (data.sdp) {
          const offerCollision = data.sdp.type === 'offer' && pc.signalingState !== 'stable';
          if (offerCollision) {
            await Promise.all([
              pc.setLocalDescription({ type: 'rollback' }),
              pc.setRemoteDescription(data.sdp)
            ]);
          } else {
            await pc.setRemoteDescription(data.sdp);
          }

          await flushPendingIce(from, pc);

          if (data.sdp.type === 'offer') {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socketRef.current.emit('signal', { to: from, data: { sdp: pc.localDescription } });
          }
        } else if (data.candidate) {
          if (pc.remoteDescription) {
            await pc.addIceCandidate(data.candidate).catch(() => {});
          } else {
            let queue = pendingIce.get(from);
            if (!queue) {
              queue = [];
              pendingIce.set(from, queue);
            }
            queue.push(data.candidate);
          }
        }
      } catch (err) {
        console.error('signal error', err);
      }
    });

    socket.on('peer-left', ({ socketId }) => removePeer(socketId));

    return () => {
      peersMap.forEach((e) => e.pc.close());
      peersMap.clear();
      pendingIce.clear();
      hadConnectedRef.current = false;
      socket.emit('leave-room');
      socket.disconnect();
      setPeers([]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode, localStream, userKey]);

  function replaceVideoTrack(track) {
    peersRef.current.forEach(({ pc }) => {
      const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
      if (sender) sender.replaceTrack(track).catch((err) => console.error('replaceTrack', err));
    });
  }

  function replaceAudioTrack(track) {
    peersRef.current.forEach(({ pc }) => {
      const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'audio');
      if (sender) sender.replaceTrack(track).catch((err) => console.error('replaceTrack', err));
    });
  }

  return { peers, joinError, replaceVideoTrack, replaceAudioTrack };
}

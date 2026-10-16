import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
const ICE = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }];

export default function useWebRTC(roomCode, user, localStream) {
  const socketRef = useRef(null);
  const peersRef = useRef(new Map());
  const [peers, setPeers] = useState([]);
  const [joinError, setJoinError] = useState(null);

  const userKey = user?.uid || user?.name || 'guest';

  useEffect(() => {
    if (!roomCode || !localStream) return;

    const socket = io(SERVER_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    const createPeer = (socketId, initiator) => {
      const pc = new RTCPeerConnection({ iceServers: ICE });

      localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));

      pc.onicecandidate = (e) => {
        if (e.candidate) socket.emit('signal', { to: socketId, data: { candidate: e.candidate } });
      };

      pc.ontrack = (e) => {
        const entry = peersRef.current.get(socketId);
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

      peersRef.current.set(socketId, { pc, stream: null });
      return pc;
    };

    const removePeer = (socketId) => {
      const entry = peersRef.current.get(socketId);
      if (entry) {
        entry.pc.close();
        peersRef.current.delete(socketId);
      }
      publishPeers();
    };

    function publishPeers() {
      setPeers(
        [...peersRef.current.entries()].map(([socketId, e]) => ({
          socketId,
          stream: e.stream
        }))
      );
    }

    socket.on('connect', () => {
      socket.emit(
        'join-room',
        {
          room: roomCode,
          userId: userKey,
          name: user?.displayName || user?.name || 'Guest'
        },
        (res) => {
          if (res && res.ok === false) {
            console.warn('join-room rejected', res.error);
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
      let entry = peersRef.current.get(from);
      let pc = entry?.pc;
      if (!pc) pc = createPeer(from, false);
      entry = peersRef.current.get(from);

      try {
        if (data.sdp) {
          const offerCollision = data.sdp.type === 'offer' && pc.signalingState !== 'stable';
          if (offerCollision) {
            await Promise.all([pc.setLocalDescription({ type: 'rollback' }), pc.setRemoteDescription(data.sdp)]);
          } else {
            await pc.setRemoteDescription(data.sdp);
          }
          if (data.sdp.type === 'offer') {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socketRef.current.emit('signal', { to: from, data: { sdp: pc.localDescription } });
          }
        } else if (data.candidate) {
          await pc.addIceCandidate(data.candidate).catch(() => {});
        }
      } catch (err) {
        console.error('signal error', err);
      }
    });

    socket.on('peer-left', ({ socketId }) => removePeer(socketId));

    return () => {
      peersRef.current.forEach((e) => e.pc.close());
      peersRef.current.clear();
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

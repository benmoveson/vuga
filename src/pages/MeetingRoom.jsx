import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import useWebRTC from '../hooks/useWebRTC.js';
import useRecording from '../hooks/useRecording.js';

function GuestGate({ code, onJoin }) {
  const [name, setName] = useState('');
  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 style={{ marginBottom: 8 }}>Join meeting {code}</h2>
        <p style={{ color: 'var(--text-light)', marginBottom: 20, fontSize: '0.9rem' }}>Enter your name to continue.</p>
        <div className="form-group">
          <label>Display name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        </div>
        <button className="btn btn-primary btn-block" onClick={() => name.trim() && onJoin(name.trim())}>
          Join Meeting
        </button>
      </div>
    </div>
  );
}

export default function MeetingRoom() {
  const { code } = useParams();
  const navigate = useNavigate();
  const showToast = useToast();
  const { user } = useAuth();

  const [guestName, setGuestName] = useState('');
  const [guestId, setGuestId] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');

  const camRef = useRef(null);
  const screenRef = useRef(null);
  const screenAudioCtxRef = useRef(null);

  const identity = useMemo(() => {
    if (user) return { uid: user.uid, name: user.displayName || user.email || 'Host' };
    if (guestName && guestId) return { uid: guestId, name: guestName };
    return null;
  }, [user, guestName, guestId]);

  function joinAsGuest(name) {
    setGuestId(`guest-${Math.random().toString(36).slice(2, 10)}`);
    setGuestName(name);
  }

  const { peers, joinError, replaceVideoTrack, replaceAudioTrack } = useWebRTC(
    identity ? code : null,
    identity,
    localStream
  );
  const { isRecording, seconds, start, stop, uploadProgress, uploadingName } = useRecording();

  useEffect(() => {
    let stream;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: true
        });
        setLocalStream(stream);
      } catch (err) {
        showToast('Camera/microphone permission needed for meetings');
        console.error(err);
      }
    })();
    return () => stream?.getTracks().forEach((t) => t.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (camRef.current) camRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (screenRef.current) screenRef.current.srcObject = screenStream;
  }, [screenStream]);

  useEffect(() => {
    if (!identity) return;
    const q = query(collection(db, 'meetings', code, 'messages'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [code, identity]);

  useEffect(() => {
    if (joinError) showToast('This meeting is full — try again later');
  }, [joinError, showToast]);

  function toggleMic() {
    const track = localStream?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
    showToast(track.enabled ? 'Microphone on' : 'Microphone muted');
  }

  function toggleCam() {
    const track = localStream?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCamOn(track.enabled);
  }

  function stopScreenShare() {
    screenStream?.getTracks().forEach((t) => t.stop());
    setScreenStream(null);
    const camTrack = localStream?.getVideoTracks()[0];
    if (camTrack) replaceVideoTrack(camTrack);
    const micTrack = localStream?.getAudioTracks()[0];
    if (micTrack) replaceAudioTrack(micTrack);
    if (screenAudioCtxRef.current) {
      screenAudioCtxRef.current.close?.().catch(() => {});
      screenAudioCtxRef.current = null;
    }
  }

  async function toggleShare() {
    if (screenStream) {
      stopScreenShare();
      showToast('Screen sharing stopped');
      return;
    }
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      const videoTrack = display.getVideoTracks()[0];
      videoTrack.onended = () => {
        stopScreenShare();
      };
      setScreenStream(display);
      replaceVideoTrack(videoTrack);

      if (display.getAudioTracks().length > 0 && localStream?.getAudioTracks().length) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioCtx();
        const dest = ctx.createMediaStreamDestination();
        ctx.createMediaStreamSource(localStream).connect(dest);
        ctx.createMediaStreamSource(display).connect(dest);
        ctx.resume?.().catch(() => {});
        screenAudioCtxRef.current = ctx;
        replaceAudioTrack(dest.stream.getAudioTracks()[0]);
      }

      showToast('Screen sharing started');
    } catch {
      showToast('Screen share cancelled');
    }
  }

  function toggleRecording() {
    if (isRecording) {
      stop();
      showToast(user ? 'Recording saved — uploading to your library' : 'Recording saved to your device');
      return;
    }
    start({
      screenEl: screenStream ? screenRef.current : null,
      camEl: camRef.current,
      localStream,
      remoteStreams: peers.map((p) => p.stream).filter(Boolean),
      screenStream,
      meetingCode: code
    });
    showToast('Recording started');
  }

  async function sendChat(e) {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text || !identity) return;
    setChatInput('');
    await addDoc(collection(db, 'meetings', code, 'messages'), {
      uid: identity.uid,
      name: identity.name,
      text,
      createdAt: serverTimestamp()
    });
  }

  function leave() {
    if (isRecording) stop();
    localStream?.getTracks().forEach((t) => t.stop());
    screenStream?.getTracks().forEach((t) => t.stop());
    if (screenAudioCtxRef.current) {
      screenAudioCtxRef.current.close?.().catch(() => {});
      screenAudioCtxRef.current = null;
    }
    showToast('Left the meeting');
    navigate(user ? '/dashboard' : '/');
  }

  if (!identity) return <GuestGate code={code} onJoin={joinAsGuest} />;

  const activePeers = peers.filter((p) => p.stream);
  const mainIsScreen = !!screenStream;

  return (
    <section className="meeting-page">
      <div className="meeting-header">
        <div className="meeting-title">
          <i className={`fas fa-circle recording-indicator ${isRecording ? '' : 'hidden'}`}></i>
          <span>Vuga Meeting</span>
          <span className="meeting-id">{code}</span>
        </div>
        <div className="participants-count">
          <i className="fas fa-users"></i> <span>{activePeers.length + 1}</span>
        </div>
      </div>

      <div className="video-area">
        <div className="main-video">
          {mainIsScreen ? (
            <RawVideo stream={screenStream} muted />
          ) : activePeers.length > 0 ? (
            <PeerVideo stream={activePeers[0].stream} />
          ) : camOn ? (
            <RawVideo stream={localStream} muted mirror />
          ) : (
            <div className="video-placeholder">
              <i className="fas fa-video-slash"></i>
              <p>Camera off</p>
            </div>
          )}
        </div>

        <div className="video-sidebar">
          <div className="small-video">
            {camOn && <RawVideo stream={localStream} muted mirror />}
            <span className="video-label">You</span>
          </div>
          {activePeers.map((p) => (
            <div className="small-video" key={p.socketId}>
              <PeerVideo stream={p.stream} />
              <span className="video-label">Peer</span>
            </div>
          ))}
        </div>
      </div>

      {/* Hidden source elements used for canvas compositing during recording */}
      <video ref={camRef} autoPlay playsInline muted style={{ display: 'none' }} />
      <video ref={screenRef} autoPlay playsInline muted style={{ display: 'none' }} />

      <div className="controls">
        <button className={`control-btn ${micOn ? '' : 'active'}`} onClick={toggleMic} title="Mute/Unmute">
          <i className={`fas ${micOn ? 'fa-microphone' : 'fa-microphone-slash'}`}></i>
        </button>
        <button className={`control-btn ${camOn ? '' : 'active'}`} onClick={toggleCam} title="Camera">
          <i className={`fas ${camOn ? 'fa-video' : 'fa-video-slash'}`}></i>
        </button>
        <button className={`control-btn ${screenStream ? 'active' : ''}`} onClick={toggleShare} title="Share Screen">
          <i className="fas fa-desktop"></i>
        </button>
        <button className={`control-btn record-btn ${isRecording ? 'active' : ''}`} onClick={toggleRecording} title="Record">
          <i className="fas fa-circle"></i>
        </button>
        <button className={`control-btn ${chatOpen ? 'active' : ''}`} onClick={() => setChatOpen((v) => !v)} title="Chat">
          <i className="fas fa-comment"></i>
        </button>
        <button className="control-btn leave-btn" onClick={leave} title="Leave">
          <i className="fas fa-phone-slash"></i>
        </button>
      </div>

      {isRecording && (
        <div className="recording-status">
          <span className="rec-dot"></span> Recording...{' '}
          {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
          <button className="btn btn-sm btn-danger" onClick={toggleRecording}>Stop & Save</button>
        </div>
      )}

      {uploadProgress !== null && user && (
        <div className="recording-status" style={{ top: 130 }}>
          <i className="fas fa-cloud-arrow-up"></i> Uploading {uploadingName}… {uploadProgress}%
        </div>
      )}

      {chatOpen && (
        <div className="chat-panel">
          <div className="chat-header">
            Chat
            <button className="btn btn-sm btn-secondary" onClick={() => setChatOpen(false)}>
              <i className="fas fa-xmark"></i>
            </button>
          </div>
          <div className="chat-messages">
            <p className="system-msg">Welcome to the meeting!</p>
            {messages.map((m) => (
              <p key={m.id}>
                <strong>{m.uid === identity.uid ? 'You' : m.name}:</strong> {m.text}
              </p>
            ))}
          </div>
          <form className="chat-input" onSubmit={sendChat}>
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type a message..."
              maxLength={2000}
            />
            <button type="submit"><i className="fas fa-paper-plane"></i></button>
          </form>
        </div>
      )}
    </section>
  );
}

function PeerVideo({ stream }) {
  const ref = useCallback((el) => { if (el) el.srcObject = stream; }, [stream]);
  return <video ref={ref} autoPlay playsInline />;
}

function RawVideo({ stream, muted = false, mirror = false }) {
  const ref = useCallback((el) => { if (el) el.srcObject = stream; }, [stream]);
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={muted}
      style={mirror ? { transform: 'scaleX(-1)' } : undefined}
    />
  );
}

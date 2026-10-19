import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import useWebRTC from '../hooks/useWebRTC.js';
import useRecording from '../hooks/useRecording.js';
import Wordmark from '../components/Wordmark.jsx';

const COLORS = ['#6b4bd8', '#0ca678', '#d6336c', '#1c7ed6', '#f59e0b', '#e8590c'];

function colorFor(seed) {
  let h = 0;
  for (let i = 0; i < (seed || '').length; i += 1) h = (h * 31 + seed.charCodeAt(i)) % COLORS.length;
  return COLORS[Math.abs(h) % COLORS.length];
}

function initialsOf(name) {
  return (name || 'Guest')
    .split(' ')
    .map((p) => p.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

const fmt = (s) => `${('0' + Math.floor(s / 60)).slice(-2)}:${('0' + (s % 60)).slice(-2)}`;

function SelfVideo({ stream, muted }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream || null;
  }, [stream]);
  return <video ref={ref} autoPlay playsInline muted={muted} />;
}

function PeerVideo({ stream }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream || null;
  }, [stream]);
  return <video ref={ref} autoPlay playsInline />;
}

export default function MeetingRoom() {
  const navigate = useNavigate();
  const { code } = useParams();
  const { user } = useAuth();
  const showToast = useToast();

  const [localStream, setLocalStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [guestId] = useState(() => `guest-${Math.random().toString(36).slice(2, 8)}`);
  const camRef = useRef(null);
  const screenRef = useRef(null);

  const identity = useMemo(
    () => ({
      name: user?.displayName || user?.email?.split('@')[0] || 'Guest',
      uid: user?.uid || guestId
    }),
    [user, guestId]
  );

  const { peers, joinError } = useWebRTC(code, identity, localStream);
  const { isRecording, seconds, start, stop } = useRecording();

  useEffect(() => {
    let stream;
    navigator.mediaDevices
      ?.getUserMedia({ video: true, audio: true })
      .then((s) => {
        stream = s;
        setLocalStream(s);
      })
      .catch(() => showToast('Camera and microphone access is needed to join'));
    return () => stream?.getTracks().forEach((t) => t.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (joinError) showToast('This meeting is full — try again later');
  }, [joinError, showToast]);

  useEffect(() => {
    if (camRef.current) camRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (screenRef.current) screenRef.current.srcObject = screenStream;
  }, [screenStream]);

  const activePeers = peers.filter((p) => p.stream);
  const sharing = !!screenStream;

  function toggleMic() {
    const track = localStream?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
  }

  function toggleCam() {
    const track = localStream?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCamOn(track.enabled);
  }

  async function toggleShare() {
    if (sharing) {
      screenStream.getTracks().forEach((t) => t.stop());
      setScreenStream(null);
      return;
    }
    try {
      const s = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      s.getVideoTracks()[0].addEventListener('ended', () => setScreenStream(null));
      setScreenStream(s);
    } catch {
      showToast('Screen share cancelled');
    }
  }

  function toggleRecord() {
    if (isRecording) {
      stop();
      showToast('Recording saved to your device');
      return;
    }
    if (!screenStream) {
      showToast('Share your screen first to record');
      return;
    }
    start({
      screenEl: screenRef.current,
      camEl: camRef.current,
      localStream,
      remoteStreams: peers.map((p) => p.stream).filter(Boolean),
      screenStream,
      meetingCode: code
    });
    showToast('Recording started');
  }

  function copyLink() {
    try {
      navigator.clipboard.writeText(`${window.location.origin}/join/${code}`);
    } catch {
      /* clipboard unavailable */
    }
    showToast('Link copied');
  }

  function leave() {
    if (isRecording) stop();
    localStream?.getTracks().forEach((t) => t.stop());
    screenStream?.getTracks().forEach((t) => t.stop());
    navigate(user ? '/dashboard' : '/');
  }

  return (
    <div className="lm-app">
      <header className="lm-top">
        <a className="logo" href="#top" aria-label="Vuga" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
          <Wordmark />
        </a>
        <span className="pill2">{code}</span>
        <div className="lm-grow" />
        <div className="lm-right">
          <span className="lm-avatar" title={identity.name}>{initialsOf(identity.name)}</span>
        </div>
      </header>

      <div className="lm-stage">
        <div className="lm-tiles">
          {screenStream && (
            <div className="t scr">
              <SelfVideo stream={screenStream} />
              <small>Your screen</small>
            </div>
          )}
          <div className="t sp">
            {camOn && localStream ? (
              <SelfVideo stream={localStream} muted />
            ) : (
              <div className="av" style={{ background: '#e8590c' }}>{initialsOf(identity.name)}</div>
            )}
            <small>You</small>
          </div>
          {activePeers.map((p) => (
            <div className="t" key={p.socketId}>
              {p.stream ? (
                <PeerVideo stream={p.stream} />
              ) : (
                <div className="av" style={{ background: colorFor(p.socketId) }}>{initialsOf(p.name)}</div>
              )}
              <small>{p.name || 'Guest'}</small>
            </div>
          ))}
        </div>
      </div>

      <div className="lm-bar">
        <button type="button" className={`lm-ctrl${micOn ? '' : ' off'}`} onClick={toggleMic} title="Microphone">{micOn ? '🎤' : '🔇'}</button>
        <button type="button" className={`lm-ctrl${camOn ? '' : ' off'}`} onClick={toggleCam} title="Camera">📷</button>
        <button type="button" className={`lm-ctrl${sharing ? ' rec' : ''}`} onClick={toggleShare} title="Share screen">🖥️</button>
        <button type="button" className={`lm-ctrl${isRecording ? ' rec' : ''}`} onClick={toggleRecord} title="Record">{isRecording ? '⏹️' : '⏺️'}</button>
        {isRecording && <span className="lm-timer">{fmt(seconds)}</span>}
        <span className="lm-sep" />
        <button type="button" className="lm-ctrl" onClick={copyLink} title="Copy link">🔗</button>
        <button type="button" className="lm-ctrl leave" onClick={leave}>Leave</button>
      </div>

      <video ref={camRef} autoPlay playsInline muted style={{ position: 'fixed', left: -10000, top: 0, width: 640, height: 480, pointerEvents: 'none' }} />
      <video ref={screenRef} autoPlay playsInline muted style={{ position: 'fixed', left: -10000, top: 0, width: 1280, height: 720, pointerEvents: 'none' }} />
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import useWebRTC from '../hooks/useWebRTC.js';
import useRecording from '../hooks/useRecording.js';
import Wordmark from '../components/Wordmark.jsx';

const COLORS = ['#6b4bd8', '#0ca678', '#d6336c', '#1c7ed6', '#f59f00', '#e8590c'];
const colorFor = (key = '') => {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h + key.charCodeAt(i)) % COLORS.length;
  return COLORS[h];
};
const initialsOf = (name = '') =>
  name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'G';

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
  const { code } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const showToast = useToast();

  const [guest] = useState(() => ({
    uid: `guest-${Math.random().toString(36).slice(2, 9)}`,
    name: 'Guest'
  }));

  const identity = useMemo(
    () =>
      user
        ? { uid: user.uid, name: user.displayName || user.email || 'Host' }
        : guest,
    [user, guest]
  );

  const [localStream, setLocalStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  const camRef = useRef(null);
  const screenRef = useRef(null);

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
      remoteStreams: activePeers.map((p) => p.stream),
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
    <div id="app" className="on">
      <header className="ah">
        <a className="logo" href="#top" aria-label="Vuga" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
          <Wordmark />
        </a>
        <div className="ar2">
          <span>Hi, <b>{identity.name}</b></span>
          <div className="ua">{initialsOf(identity.name)}</div>
          <a className="btn g sm" href="#top" onClick={(e) => { e.preventDefault(); leave(); }}>Log out</a>
        </div>
      </header>

      <main className="rm on" id="room">
        <div className="rt">
          <a className="more" href="#/app" onClick={(e) => { e.preventDefault(); leave(); }}>← Dashboard</a>
          <span className={`rec${isRecording ? ' on' : ''}`} id="rrec">REC <span id="rtm">{fmt(seconds)}</span></span>
          <span className="pill2" id="rcode">{code}</span>
        </div>

        <div className={`rs${sharing ? ' sh' : ''}`} id="rs">
          <div className="t scr">
            {screenStream ? (
              <SelfVideo stream={screenStream} />
            ) : (
              <div style={{ width: '70%', background: '#0a110d', borderRadius: 10, padding: 14 }}>
                <i style={{ display: 'block', height: 8, borderRadius: 4, background: '#33433b', margin: '8px 0', width: '40%' }} />
                <i style={{ display: 'block', height: 8, borderRadius: 4, background: '#33433b', margin: '8px 0' }} />
                <i style={{ display: 'block', height: 8, borderRadius: 4, background: '#33433b', margin: '8px 0', width: '70%' }} />
              </div>
            )}
            <small>Your screen</small>
          </div>

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

        <video ref={camRef} autoPlay playsInline muted style={{ display: 'none' }} />
        <video ref={screenRef} autoPlay playsInline muted style={{ display: 'none' }} />

        <div className="ctl rcl">
          <button type="button" className={micOn ? '' : 'on'} onClick={toggleMic}>{micOn ? '🎤 Mute' : '🔇 Unmute'}</button>
          <button type="button" className={camOn ? '' : 'on'} onClick={toggleCam}>📷 Camera</button>
          <button type="button" className={sharing ? 'on' : ''} onClick={toggleShare}>{sharing ? '🛑 Stop sharing' : '🖥️ Share screen'}</button>
          <button type="button" className={isRecording ? 'on' : ''} onClick={toggleRecord}>{isRecording ? '⏹️ Stop' : '⏺️ Record'}</button>
          <button type="button" onClick={copyLink}>🔗 Copy link</button>
          <button type="button" className="x" onClick={leave}>✕ Leave</button>
        </div>
      </main>
    </div>
  );
}

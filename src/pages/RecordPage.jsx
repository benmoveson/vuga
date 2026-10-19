import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Wordmark from '../components/Wordmark.jsx';
import useRecording from '../hooks/useRecording.js';
import { useToast } from '../context/ToastContext.jsx';

const fmt = (s) => `${('0' + Math.floor(s / 60)).slice(-2)}:${('0' + (s % 60)).slice(-2)}`;

function whenReady(video) {
  if (!video) return Promise.resolve();
  if (video.readyState >= 2 && video.videoWidth) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      video.removeEventListener('loadeddata', done);
      resolve();
    };
    video.addEventListener('loadeddata', done);
    setTimeout(done, 2500);
  });
}

export default function RecordPage() {
  const navigate = useNavigate();
  const showToast = useToast();
  const { isRecording, seconds, start, stop } = useRecording();

  const [screenStream, setScreenStream] = useState(null);
  const [camStream, setCamStream] = useState(null);
  const [starting, setStarting] = useState(false);
  const screenRef = useRef(null);
  const camRef = useRef(null);
  const pendingRef = useRef(false);

  function releaseStreams() {
    screenStream?.getTracks().forEach((t) => t.stop());
    camStream?.getTracks().forEach((t) => t.stop());
    setScreenStream(null);
    setCamStream(null);
  }

  useEffect(() => {
    if (!screenStream) return;
    if (screenRef.current) screenRef.current.srcObject = screenStream;
    if (camRef.current && camStream) camRef.current.srcObject = camStream;
    if (!pendingRef.current) return;
    pendingRef.current = false;

    const screenEl = screenRef.current;
    const camEl = camStream ? camRef.current : null;
    (async () => {
      await Promise.all([whenReady(screenEl), whenReady(camEl)]);
      start({
        screenEl,
        camEl,
        localStream: camStream,
        screenStream,
        meetingCode: null
      });
      setStarting(false);
    })();
  }, [screenStream, camStream, start]);

  async function toggle() {
    if (isRecording) {
      stop();
      releaseStreams();
      showToast('Recording saved to your device');
      return;
    }
    setStarting(true);
    let screen;
    try {
      screen = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: true
      });
    } catch {
      setStarting(false);
      showToast('Screen share cancelled');
      return;
    }

    let cam = null;
    try {
      cam = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: true
      });
    } catch {
      showToast('Camera unavailable — recording your screen only');
    }

    screen.getVideoTracks()[0].addEventListener('ended', () => {
      stop();
      releaseStreams();
    });

    pendingRef.current = true;
    setCamStream(cam);
    setScreenStream(screen);
  }

  return (
    <div id="app" className="on">
      <header className="ah">
        <a className="logo" href="#top" aria-label="Vuga" onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }}>
          <Wordmark />
        </a>
        <div className="ar2">
          <a className="btn g sm" href="#top" onClick={(e) => { e.preventDefault(); navigate(-1); }}>Back</a>
        </div>
      </header>

      <main className="am on" id="dash">
        <div className="dh">
          <div>
            <h2>Record your screen</h2>
            <p>Capture your screen and save it straight to your device.</p>
          </div>
          <div>
            <span className={`rec${isRecording ? ' on' : ''}`} id="rrec">REC <span>{fmt(seconds)}</span></span>
          </div>
        </div>
        <div className="cd">
          <div className={`rs${screenStream ? ' sh' : ''}`}>
            <div className="t scr">
              {screenStream ? (
                <video ref={screenRef} autoPlay playsInline muted />
              ) : (
                <div style={{ width: '70%', background: '#0a110d', borderRadius: 10, padding: 14 }}>
                  <i style={{ display: 'block', height: 8, borderRadius: 4, background: '#33433b', margin: '8px 0', width: '40%' }} />
                  <i style={{ display: 'block', height: 8, borderRadius: 4, background: '#33433b', margin: '8px 0' }} />
                  <i style={{ display: 'block', height: 8, borderRadius: 4, background: '#33433b', margin: '8px 0', width: '70%' }} />
                </div>
              )}
              {camStream && (
                <div className="selfie">
                  <video ref={camRef} autoPlay playsInline muted />
                </div>
              )}
              <small>Your screen</small>
            </div>
          </div>
          <div className="ctl rcl">
            <button type="button" className={isRecording ? 'on' : ''} onClick={toggle} disabled={starting}>
              {starting ? '⏳ Starting…' : isRecording ? '⏹️ Stop' : '⏺️ Record'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

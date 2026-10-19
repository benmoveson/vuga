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
  const [pipOpen, setPipOpen] = useState(false);
  const [wantCamera, setWantCamera] = useState(true);
  const [wantMic, setWantMic] = useState(true);
  const screenRef = useRef(null);
  const camRef = useRef(null);
  const selfieRef = useRef(null);
  const pipRef = useRef(null);
  const pendingRef = useRef(false);
  const floatingRef = useRef(false);

  function closePiP() {
    try {
      pipRef.current?.close();
    } catch {
      /* already closed */
    }
    pipRef.current = null;
    setPipOpen(false);
  }

  function releaseStreams() {
    closePiP();
    screenStream?.getTracks().forEach((t) => t.stop());
    camStream?.getTracks().forEach((t) => t.stop());
    setScreenStream(null);
    setCamStream(null);
  }

  useEffect(() => {
    if (!screenStream) return;
    if (screenRef.current) screenRef.current.srcObject = screenStream;
    if (camRef.current && camStream) camRef.current.srcObject = camStream;
    if (selfieRef.current && camStream) selfieRef.current.srcObject = camStream;
    if (!pendingRef.current) return;
    pendingRef.current = false;

    const screenEl = screenRef.current;
    const camEl = camStream && !floatingRef.current ? camRef.current : null;
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
  }, [screenStream, camStream, start, pipOpen]);

  async function openCameraBubble() {
    const dpip = window.documentPictureInPicture;
    if (!dpip) return null;
    try {
      return dpip.requestWindow({ width: 220, height: 220, disallowReturnToOpener: true });
    } catch {
      return null;
    }
  }

  function fillBubble(pip, cam) {
    const doc = pip.document;
    const style = doc.createElement('style');
    style.textContent =
      ':root,body{margin:0;height:100%;background:transparent;overflow:hidden}' +
      '.bub{position:fixed;inset:0;display:grid;place-items:center}' +
      'video{width:calc(100% - 14px);height:calc(100% - 14px);object-fit:cover;border-radius:50%;' +
      'transform:scaleX(-1);border:3px solid #e8590c;box-sizing:border-box;background:#000}';
    doc.head.appendChild(style);
    const wrap = doc.createElement('div');
    wrap.className = 'bub';
    const v = doc.createElement('video');
    v.autoplay = true;
    v.playsInline = true;
    v.muted = true;
    v.srcObject = cam;
    wrap.appendChild(v);
    doc.body.appendChild(wrap);
    pip.addEventListener('pagehide', () => {
      pipRef.current = null;
      setPipOpen(false);
    });
  }

  async function toggle() {
    if (isRecording) {
      stop();
      releaseStreams();
      showToast('Recording saved to your device');
      return;
    }

    setStarting(true);

    let pip = null;
    if (wantCamera) {
      try {
        pip = await openCameraBubble();
      } catch {
        pip = null;
      }
    }
    pipRef.current = pip;

    let screen;
    try {
      screen = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: true
      });
    } catch {
      closePiP();
      setStarting(false);
      showToast('Screen share cancelled');
      return;
    }

    let cam = null;
    if (wantCamera || wantMic) {
      try {
        cam = await navigator.mediaDevices.getUserMedia({
          video: wantCamera ? { width: 640, height: 480, facingMode: 'user' } : false,
          audio: wantMic
        });
      } catch {
        showToast('Camera/mic unavailable — recording your screen only');
      }
    }

    const bubble = Boolean(pip && cam && wantCamera);
    if (bubble) {
      fillBubble(pip, cam);
      setPipOpen(true);
    } else if (pip) {
      closePiP();
    }

    const surface = screen.getVideoTracks()[0].getSettings?.().displaySurface;
    floatingRef.current = bubble && surface === 'monitor';

    screen.getVideoTracks()[0].addEventListener('ended', () => {
      stop();
      releaseStreams();
    });

    pendingRef.current = true;
    setCamStream(cam);
    setScreenStream(screen);
  }

  return (
    <div className="lm-app">
      <header className="lm-top">
        <a className="logo" href="#top" aria-label="Vuga" onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }}>
          <Wordmark />
        </a>
        <div className="lm-grow" />
        <div className="lm-right">
          <button className="btn g sm" type="button" onClick={() => { releaseStreams(); navigate(-1); }}>Close</button>
        </div>
      </header>

      <div className="lm-stage-rec">
        <div className="lm-preview">
          {screenStream ? (
            <video ref={screenRef} autoPlay playsInline muted />
          ) : (
            <div className="lm-placeholder">
              <div className="lm-big">⏺</div>
              <span>Click Record to capture your screen and camera bubble.</span>
            </div>
          )}
          {wantCamera && camStream && !pipOpen && (
            <div className="lm-selfie">
              <video ref={selfieRef} autoPlay playsInline muted />
            </div>
          )}
        </div>
      </div>

      <div className="lm-bar">
        <span className="lm-pill on">🖥️ Screen</span>
        <button
          type="button"
          className={`lm-pill${wantCamera ? ' on' : ''}`}
          onClick={() => setWantCamera((v) => !v)}
          disabled={isRecording || starting}
        >
          📷 Camera
        </button>
        <button
          type="button"
          className={`lm-recbtn${isRecording ? ' stop' : ''}`}
          onClick={toggle}
          disabled={starting}
          title={isRecording ? 'Stop recording' : 'Start recording'}
        >
          {starting ? '…' : isRecording ? <span className="lm-sq" /> : 'REC'}
        </button>
        <button
          type="button"
          className={`lm-pill${wantMic ? ' on' : ''}`}
          onClick={() => setWantMic((v) => !v)}
          disabled={isRecording || starting}
        >
          {wantMic ? '🎤 Mic' : '🔇 Mic'}
        </button>
        {isRecording && <span className="lm-timer">{fmt(seconds)}</span>}
      </div>

      <video
        ref={camRef}
        autoPlay
        playsInline
        muted
        style={{ position: 'fixed', left: -10000, top: 0, width: 640, height: 480, pointerEvents: 'none' }}
      />
    </div>
  );
}

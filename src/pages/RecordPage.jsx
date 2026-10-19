import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Wordmark from '../components/Wordmark.jsx';
import useRecording from '../hooks/useRecording.js';
import { useToast } from '../context/ToastContext.jsx';

const fmt = (s) => `${('0' + Math.floor(s / 60)).slice(-2)}:${('0' + (s % 60)).slice(-2)}`;

export default function RecordPage() {
  const navigate = useNavigate();
  const showToast = useToast();
  const { isRecording, seconds, start, stop } = useRecording();

  const [screenStream, setScreenStream] = useState(null);
  const previewRef = useRef(null);

  function end() {
    if (isRecording) stop();
    screenStream?.getTracks().forEach((t) => t.stop());
    setScreenStream(null);
  }

  async function toggle() {
    if (isRecording) {
      stop();
      showToast('Recording saved to your device');
      return;
    }
    try {
      const s = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      setScreenStream(s);
      if (previewRef.current) previewRef.current.srcObject = s;
      s.getVideoTracks()[0].addEventListener('ended', end);
      start({ screenEl: previewRef.current, localStream: s, screenStream: s });
      showToast('Recording started');
    } catch {
      showToast('Screen share cancelled');
    }
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
                <video ref={previewRef} autoPlay playsInline muted />
              ) : (
                <div style={{ width: '70%', background: '#0a110d', borderRadius: 10, padding: 14 }}>
                  <i style={{ display: 'block', height: 8, borderRadius: 4, background: '#33433b', margin: '8px 0', width: '40%' }} />
                  <i style={{ display: 'block', height: 8, borderRadius: 4, background: '#33433b', margin: '8px 0' }} />
                  <i style={{ display: 'block', height: 8, borderRadius: 4, background: '#33433b', margin: '8px 0', width: '70%' }} />
                </div>
              )}
              <small>Your screen</small>
            </div>
          </div>
          <div className="ctl rcl">
            <button type="button" className={isRecording ? 'on' : ''} onClick={toggle}>{isRecording ? '⏹️ Stop' : '⏺️ Record'}</button>
          </div>
        </div>
      </main>
    </div>
  );
}

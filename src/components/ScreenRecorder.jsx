import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '../context/ToastContext.jsx';
import { pickMime, recordingFileName, saveRecording } from '../lib/recording.js';

function fmt(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export default function ScreenRecorder({ meetingCode = null, big = false }) {
  const showToast = useToast();

  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadingName, setUploadingName] = useState(null);
  const [hasCam, setHasCam] = useState(false);
  const [camOn, setCamOn] = useState(true);

  const displayStreamRef = useRef(null);
  const camStreamRef = useRef(null);
  const canvasRef = useRef(null);
  const screenVideoRef = useRef(null);
  const camVideoRef = useRef(null);
  const previewRef = useRef(null);
  const audioCtxRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const rafRef = useRef(null);
  const secondsRef = useRef(0);
  const intervalRef = useRef(null);
  const camOnRef = useRef(true);
  const stopRef = useRef(null);

  useEffect(() => {
    camOnRef.current = camOn;
  }, [camOn]);

  const cleanupStreams = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    clearInterval(intervalRef.current);
    displayStreamRef.current?.getTracks().forEach((t) => t.stop());
    camStreamRef.current?.getTracks().forEach((t) => t.stop());
    displayStreamRef.current = null;
    camStreamRef.current = null;
    audioCtxRef.current?.close?.().catch(() => {});
    audioCtxRef.current = null;
    if (screenVideoRef.current) screenVideoRef.current.srcObject = null;
    if (camVideoRef.current) camVideoRef.current.srcObject = null;
    if (previewRef.current) previewRef.current.srcObject = null;
  }, []);

  const finalize = useCallback(
    async ({ blob, duration, fileName }) => {
      const result = await saveRecording({
        blob,
        fileName,
        duration,
        meetingCode: meetingCode || null,
        onProgress: (p) => {
          if (p === null) {
            setUploadProgress(null);
            setUploadingName(null);
          } else {
            setUploadingName(fileName);
            setUploadProgress(p);
          }
        }
      });
      if (!result.saved) return;
      if (result.uploaded) showToast('Recording saved to your library & device');
      else if (result.reason === 'signed-out') showToast('Recording saved to your device');
      else showToast('Saved to your device (cloud upload unavailable)');
    },
    [meetingCode, showToast]
  );

  const stop = useCallback(() => {
    setIsRecording(false);
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try {
        recorderRef.current.stop();
      } catch {
        /* noop */
      }
    }
    cleanupStreams();
  }, [cleanupStreams]);

  useEffect(() => {
    stopRef.current = stop;
  }, [stop]);

  const start = useCallback(async () => {
    if (isRecording) return;

    let display;
    try {
      display = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 30, max: 60 } },
        audio: true
      });
    } catch (err) {
      if (err?.name !== 'NotAllowedError' && err?.name !== 'AbortError') {
        showToast('Screen capture was blocked');
      }
      return;
    }

    displayStreamRef.current = display;

    let cam;
    try {
      cam = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 640 }, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true }
      });
    } catch {
      cam = null;
    }
    camStreamRef.current = cam;
    setHasCam(!!cam);
    setCamOn(!!cam);

    const screenVid = screenVideoRef.current;
    screenVid.srcObject = display;
    screenVid.play().catch(() => {});

    const camVid = camVideoRef.current;
    if (cam && camVid) {
      camVid.srcObject = cam;
      camVid.play().catch(() => {});
    }
    if (cam && previewRef.current) {
      previewRef.current.srcObject = cam;
      previewRef.current.play().catch(() => {});
    }

    const settings = display.getVideoTracks()[0]?.getSettings() || {};
    let W = settings.width || screenVid.videoWidth || 1280;
    let H = settings.height || screenVid.videoHeight || 720;
    const maxW = 1920;
    if (W > maxW) {
      H = Math.round(H * (maxW / W));
      W = maxW;
    }
    const canvas = canvasRef.current;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d', { alpha: false });

    const draw = () => {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
      if (screenVid.readyState >= 2 && screenVid.videoWidth) {
        ctx.drawImage(screenVid, 0, 0, W, H);
      }
      const cv = camVideoRef.current;
      if (camOnRef.current && cv && cv.readyState >= 2 && cv.videoWidth) {
        const d = Math.round(H * 0.26);
        const margin = Math.round(H * 0.045);
        const x = margin;
        const y = H - d - margin;
        const r = d / 2;
        const cx = x + r;
        const cy = y + r;

        const vw = cv.videoWidth;
        const vh = cv.videoHeight;
        const scale = Math.max(d / vw, d / vh);
        const sw = d / scale;
        const sh = d / scale;
        const sx = (vw - sw) / 2;
        const sy = (vh - sh) / 2;

        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(cv, sx, sy, sw, sh, x, y, d, d);
        ctx.restore();

        ctx.beginPath();
        ctx.arc(cx, cy, r - 1, 0, Math.PI * 2);
        ctx.lineWidth = Math.max(4, H * 0.008);
        ctx.strokeStyle = 'rgba(255,255,255,0.92)';
        ctx.stroke();
      }
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();

    let audioTracks = [];
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      const actx = new AC();
      audioCtxRef.current = actx;
      const dest = actx.createMediaStreamDestination();
      if (display.getAudioTracks().length) {
        actx.createMediaStreamSource(new MediaStream(display.getAudioTracks())).connect(dest);
      }
      if (cam && cam.getAudioTracks().length) {
        actx.createMediaStreamSource(new MediaStream(cam.getAudioTracks())).connect(dest);
      }
      audioTracks = dest.stream.getAudioTracks();
    } catch (err) {
      console.warn('audio mix failed', err);
    }

    const canvasStream = canvas.captureStream(30);
    const mixed = new MediaStream([...canvasStream.getVideoTracks(), ...audioTracks]);

    const mimeType = pickMime();
    let recorder;
    try {
      recorder = new MediaRecorder(mixed, {
        ...(mimeType ? { mimeType } : {}),
        videoBitsPerSecond: 3_000_000
      });
    } catch (err) {
      console.error(err);
      showToast('Recording is not supported in this browser');
      cleanupStreams();
      return;
    }

    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const duration = secondsRef.current;
      const fileName = recordingFileName('Vuga', duration);
      finalize({ blob, duration, fileName });
    };

    recorder.start(1000);
    recorderRef.current = recorder;

    secondsRef.current = 0;
    setSeconds(0);
    setIsRecording(true);
    intervalRef.current = setInterval(() => {
      secondsRef.current += 1;
      setSeconds(secondsRef.current);
    }, 1000);

    display.getVideoTracks()[0].addEventListener('ended', () => stopRef.current?.());
  }, [cleanupStreams, finalize, isRecording, showToast]);

  useEffect(
    () => () => {
      cleanupStreams();
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        try {
          recorderRef.current.stop();
        } catch {
          /* noop */
        }
      }
    },
    [cleanupStreams]
  );

  function toggleCam() {
    setCamOn((v) => {
      const next = !v;
      camOnRef.current = next;
      return next;
    });
  }

  return (
    <>
      {!isRecording && (
        <button
          className={big ? 'btn btn-primary loom-start big' : 'btn btn-secondary btn-sm loom-start'}
          onClick={start}
        >
          <i className="fas fa-circle loom-rec-dot" />
          {big ? 'Start recording' : 'Record Screen'}
        </button>
      )}

      {isRecording && (
        <div className="loom-dock">
          <div className={`loom-bubble ${camOn ? '' : 'off'}`}>
            <video ref={previewRef} muted playsInline autoPlay />
            {!camOn && (
              <div className="loom-bubble-off">
                <i className="fas fa-video-slash" />
              </div>
            )}
          </div>
          <div className="loom-controls">
            <span className="loom-timer">
              <i className="fas fa-circle loom-dot" />
              {fmt(seconds)}
            </span>
            {hasCam && (
              <button className="loom-ic" onClick={toggleCam} title="Toggle camera">
                <i className={camOn ? 'fas fa-video' : 'fas fa-video-slash'} />
              </button>
            )}
            <button className="loom-ic loom-stop" onClick={stop} title="Stop recording">
              <i className="fas fa-stop" />
            </button>
          </div>
        </div>
      )}

      <video ref={screenVideoRef} className="loom-hidden" muted playsInline />
      <video ref={camVideoRef} className="loom-hidden" muted playsInline />
      <canvas ref={canvasRef} className="loom-hidden" />

      {uploadProgress !== null && (
        <div className="recording-status">
          <i className="fas fa-cloud-arrow-up" />
          Uploading {uploadingName}… {uploadProgress}%
        </div>
      )}
    </>
  );
}

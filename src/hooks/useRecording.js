import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '../context/ToastContext.jsx';
import { pickMime, recordingFileName, saveRecording } from '../lib/recording.js';

function mixAudio(streams) {
  const withAudio = streams.filter((s) => s && s.getAudioTracks().length > 0);
  if (withAudio.length === 0) return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioCtx();
  const dest = ctx.createMediaStreamDestination();
  withAudio.forEach((s) => {
    ctx.createMediaStreamSource(s).connect(dest);
  });
  ctx.resume?.().catch(() => {});
  return { ctx, track: dest.stream.getAudioTracks()[0] };
}

export default function useRecording() {
  const showToast = useToast();
  const canvasRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const rafRef = useRef(null);
  const audioCtxRef = useRef(null);
  const secondsRef = useRef(0);
  const intervalRef = useRef(null);

  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadingName, setUploadingName] = useState(null);

  const drawComposite = useCallback((screen, cam) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = (canvas.width = 1280);
    const H = (canvas.height = 720);

    const draw = () => {
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, 0, W, H);

      const main = screen || cam;
      if (main && main.videoWidth) {
        const scale = Math.min(W / main.videoWidth, H / main.videoHeight);
        const w = main.videoWidth * scale;
        const h = main.videoHeight * scale;
        ctx.drawImage(main, (W - w) / 2, (H - h) / 2, w, h);
      }

      if (screen && cam && cam.videoWidth) {
        const size = 240;
        const cx = W - size / 2 - 32;
        const cy = H - size / 2 - 32;
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
        ctx.fillStyle = '#e8590c';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx, cy, size / 2 - 6, 0, Math.PI * 2);
        ctx.clip();
        const cscale = Math.max(size / cam.videoWidth, size / cam.videoHeight);
        const cw = cam.videoWidth * cscale;
        const ch = cam.videoHeight * cscale;
        ctx.drawImage(cam, cx - cw / 2, cy - ch / 2, cw, ch);
        ctx.restore();
      }
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();
  }, []);

  const persist = useCallback(
    async (blob, meetingCode) => {
      const duration = secondsRef.current;
      const fileName = recordingFileName('Recording', duration);

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
    [showToast]
  );

  const start = useCallback(
    ({ screenEl, camEl, localStream, remoteStreams = [], screenStream, meetingCode }) => {
      if (isRecording) return;
      if (!canvasRef.current) {
        const c = document.createElement('canvas');
        c.width = 1280;
        c.height = 720;
        c.style.cssText =
          'position:fixed;left:-10000px;top:0;width:1280px;height:720px;pointer-events:none;';
        document.body.appendChild(c);
        canvasRef.current = c;
      }

      drawComposite(screenEl, camEl);

      const canvasStream = canvasRef.current.captureStream(30);
      const mixed = mixAudio([localStream, ...remoteStreams, screenStream]);
      audioCtxRef.current = mixed?.ctx || null;
      const tracks = [...canvasStream.getVideoTracks()];
      if (mixed?.track) tracks.push(mixed.track);

      const mimeType = pickMime();

      const recorder = new MediaRecorder(new MediaStream(tracks), {
        ...(mimeType ? { mimeType } : {}),
        videoBitsPerSecond: 2_500_000
      });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        persist(blob, meetingCode);
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
    },
    [isRecording, drawComposite, persist]
  );

  const stop = useCallback(() => {
    if (!isRecording) return;
    setIsRecording(false);
    clearInterval(intervalRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (recorderRef.current?.state !== 'inactive') recorderRef.current.stop();
    if (audioCtxRef.current) {
      audioCtxRef.current.close?.().catch(() => {});
      audioCtxRef.current = null;
    }
  }, [isRecording]);

  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (recorderRef.current?.state !== 'inactive') recorderRef.current?.stop();
      if (audioCtxRef.current) audioCtxRef.current.close?.().catch(() => {});
      if (canvasRef.current?.parentNode) {
        canvasRef.current.parentNode.removeChild(canvasRef.current);
        canvasRef.current = null;
      }
    };
  }, []);

  return { isRecording, seconds, start, stop, uploadProgress, uploadingName };
}

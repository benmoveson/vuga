import { useCallback, useEffect, useRef, useState } from 'react';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, storage, auth } from '../firebase.js';

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

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
        const pw = 320;
        const ph = (cam.videoHeight / cam.videoWidth) * pw;
        const x = W - pw - 32;
        const y = H - ph - 32;
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x - 4, y - 4, pw + 8, ph + 8, 12);
        ctx.fillStyle = '#00C2FF';
        ctx.fill();
        ctx.clip();
        ctx.drawImage(cam, x, y, pw, ph);
        ctx.restore();
      }
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();
  }, []);

  const saveRecording = useCallback(async (blob, meetingCode) => {
    const duration = secondsRef.current;
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `Recording_${stamp}_${duration}s.webm`;

    const user = auth.currentUser;
    if (!user) {
      downloadBlob(blob, fileName);
      return;
    }

    const uid = user.uid;
    const path = `recordings/${uid}/${Date.now()}_${fileName}`;
    const storageRef = ref(storage, path);

    const task = uploadBytesResumable(storageRef, blob, { contentType: 'video/webm' });
    setUploadingName(fileName);
    setUploadProgress(0);

    task.on(
      'state_changed',
      (snap) => setUploadProgress(Math.round((snap.bytesTransferred / snap.bytesTotal) * 100)),
      (err) => {
        console.error('upload failed', err);
        setUploadProgress(null);
        setUploadingName(null);
      },
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          await addDoc(collection(db, 'users', uid, 'recordings'), {
            name: fileName,
            duration,
            meetingCode: meetingCode || null,
            size: blob.size,
            url,
            createdAt: serverTimestamp()
          });
        } catch (err) {
          console.error('recording metadata failed', err);
        } finally {
          setUploadProgress(null);
          setUploadingName(null);
        }
      }
    );
  }, []);

  const start = useCallback(
    ({ screenEl, camEl, localStream, remoteStreams = [], screenStream, meetingCode }) => {
      if (isRecording) return;
      if (!canvasRef.current) {
        const c = document.createElement('canvas');
        c.style.display = 'none';
        document.body.appendChild(c);
        canvasRef.current = c;
      }

      drawComposite(screenEl, camEl);

      const canvasStream = canvasRef.current.captureStream(30);
      const mixed = mixAudio([localStream, ...remoteStreams, screenStream]);
      audioCtxRef.current = mixed?.ctx || null;
      const tracks = [...canvasStream.getVideoTracks()];
      if (mixed?.track) tracks.push(mixed.track);

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : 'video/webm';

      const recorder = new MediaRecorder(new MediaStream(tracks), {
        mimeType,
        videoBitsPerSecond: 2_500_000
      });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        saveRecording(blob, meetingCode);
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
    [isRecording, drawComposite, saveRecording]
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

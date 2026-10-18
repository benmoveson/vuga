import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, storage, auth } from '../firebase.js';

export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export function pickMime() {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm'
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) || '';
}

export function recordingFileName(prefix, duration) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${prefix}_${stamp}_${duration}s.webm`;
}

export async function saveRecording({ blob, fileName, duration, meetingCode = null, onProgress }) {
  if (!blob || !blob.size) return { saved: false, uploaded: false, reason: 'empty' };

  downloadBlob(blob, fileName);

  const user = auth.currentUser;
  if (!user) return { saved: true, uploaded: false, reason: 'signed-out' };

  try {
    const path = `recordings/${user.uid}/${Date.now()}_${fileName}`;
    const storageRef = ref(storage, path);
    const task = uploadBytesResumable(storageRef, blob, { contentType: 'video/webm' });

    await new Promise((resolve, reject) => {
      task.on(
        'state_changed',
        (snap) => onProgress?.(Math.round((snap.bytesTransferred / snap.bytesTotal) * 100)),
        reject,
        resolve
      );
    });

    const url = await getDownloadURL(task.snapshot.ref);
    await addDoc(collection(db, 'users', user.uid, 'recordings'), {
      name: fileName,
      duration,
      meetingCode,
      size: blob.size,
      url,
      createdAt: serverTimestamp()
    });

    return { saved: true, uploaded: true, url };
  } catch (err) {
    console.warn('cloud upload unavailable, recording saved locally:', err);
    return { saved: true, uploaded: false, reason: 'upload-failed', error: err };
  } finally {
    onProgress?.(null);
  }
}

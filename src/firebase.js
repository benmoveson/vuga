import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAURDifhF3QHCZmirNRL7ziIa124Cr-9_Q',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'vuga-464e5.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'vuga-464e5',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'vuga-464e5.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '214729776051',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:214729776051:web:013c96e9a39c17585ec9c6'
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;

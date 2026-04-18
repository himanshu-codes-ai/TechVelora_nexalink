import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyChhVfaQsawkSJrbLKoDmkEWufOTpYBiyQ",
  authDomain: "hirex-d80c6.firebaseapp.com",
  projectId: "hirex-d80c6",
  storageBucket: "hirex-d80c6.firebasestorage.app",
  messagingSenderId: "576607768381",
  appId: "1:576607768381:web:35abdb38a27f6f18487f54",
  databaseURL: "https://hirex-d80c6-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);
export const rtdb = getDatabase(app);

export { doc, getDoc, setDoc };
export default app;

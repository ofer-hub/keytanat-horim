import { initializeApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app: FirebaseApp;
let db: Firestore;

// Guard so the app doesn't crash if Firebase is not yet configured
const isFirebaseConfigured = !!firebaseConfig.projectId;

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} else {
  console.warn('Firebase לא מוגדר. נא למלא את קובץ .env.local');
}

export { db, isFirebaseConfigured };

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const cfg = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            as string,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        as string,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         as string,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             as string,
};

if (import.meta.env.DEV) {
  const required: Array<keyof typeof cfg> = ['apiKey', 'authDomain', 'projectId', 'appId'];
  for (const key of required) {
    if (!cfg[key]) console.error(`[firebase] Missing env var for: ${key}`);
  }
}

export const firebaseApp     = initializeApp(cfg);
export const firebaseAuth    = getAuth(firebaseApp);
export const firestoreDb     = getFirestore(firebaseApp);
export const firebaseStorage = getStorage(firebaseApp);

import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

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

// Local-development-only emulator gate. Off by default (undefined !== 'true'),
// so it never silently applies to a real dev build, staging, or Vercel
// production — it only activates when explicitly opted into. Guarded against
// double-connection across Vite HMR reloads, which would otherwise throw.
if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  const emulatorGuard = globalThis as unknown as { __communityEmulatorConnected?: boolean };
  if (!emulatorGuard.__communityEmulatorConnected) {
    connectFirestoreEmulator(firestoreDb, '127.0.0.1', 8080);
    connectStorageEmulator(firebaseStorage, '127.0.0.1', 9199);
    connectAuthEmulator(firebaseAuth, 'http://127.0.0.1:9099', { disableWarnings: true });
    emulatorGuard.__communityEmulatorConnected = true;
  }
}

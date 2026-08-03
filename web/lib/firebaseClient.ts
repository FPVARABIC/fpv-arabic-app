'use client';

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';

/**
 * The Firebase CLIENT SDK — the browser half, and the only Firebase the browser
 * ever sees.
 *
 * WHY THESE VALUES ARE PUBLIC AND THAT IS CORRECT
 * ----------------------------------------------
 * A Firebase web config is not a secret. It identifies the project; it does not
 * authorise anything. Access is controlled by Firestore and Storage rules and
 * by the server-side session check — not by hiding these strings, which is
 * impossible anyway since they must reach the browser to work.
 *
 * The values that ARE secret (the service account) live only in
 * `lib/server/firebaseAdmin.ts`, which is `server-only` and cannot be imported
 * from here.
 *
 * SAME PROJECT AS THE PHONE APP
 * -----------------------------
 * Deliberately the same `NEXT_PUBLIC_FIREBASE_*` values as the phone's
 * `VITE_FIREBASE_*`. One project means one account, one community, one set of
 * posts — signing in on the web shows a user their existing history rather than
 * an empty profile, which is the whole premise of "one platform, two surfaces".
 *
 * LAZY, NOT EAGER
 * ---------------
 * Initialised on first use rather than at module load, so importing this file
 * from a component that never signs anyone in does not construct an app or open
 * a connection.
 *
 * THE EMULATOR SWITCH
 * -------------------
 * When `NEXT_PUBLIC_FIREBASE_EMULATOR_HOST` is set, Auth and Firestore are
 * pointed at the local emulator suite instead of Google's servers. That is what
 * makes a genuine end-to-end test possible — a real browser, a real session
 * cookie, real `firestore.rules` evaluation — rather than asserting about
 * source text and hoping. In any environment that does not set the variable
 * (which is every deployed one) these branches are dead code: the emulator is
 * opt-in and can never be reached by accident from a production build.
 */

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

/** `host:port` of the local emulator suite, or null in every real environment. */
function emulatorHost(): string | null {
  return process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST || null;
}

function firebaseApp(): FirebaseApp {
  if (app) return app;
  const existing = getApps();
  if (existing.length > 0) { app = existing[0]; return app; }

  app = initializeApp({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  });
  return app;
}

export function clientAuth(): Auth {
  const auth = getAuth(firebaseApp());
  const host = emulatorHost();
  // `connectAuthEmulator` is idempotent-safe to call again with the same URL,
  // and `clientAuth()` is called from several components.
  if (host) connectAuthEmulator(auth, `http://${host.split(':')[0]}:9099`, { disableWarnings: true });
  return auth;
}

/**
 * Firestore for the browser.
 *
 * Centralised here rather than each caller doing `getFirestore(getApp())`, so
 * that the emulator switch above applies to EVERY client write. A second entry
 * point would silently talk to production while the rest of the app talked to
 * the emulator — the kind of split-brain that makes a green test meaningless.
 */
export function clientDb(): Firestore {
  if (db) return db;
  const host = emulatorHost();
  db = getFirestore(firebaseApp());
  if (host) {
    const [h, p] = host.split(':');
    connectFirestoreEmulator(db, h, Number(p));
  }
  return db;
}

/**
 * Whether the browser has enough configuration to attempt a sign-in.
 *
 * Lets the form say «تسجيل الدخول غير مهيّأ في هذه البيئة» instead of throwing
 * an opaque Firebase error, which matters because the site must build and run
 * in a development environment with no Firebase project attached.
 */
export function isClientConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY
    && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    && process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  );
}

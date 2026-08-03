'use client';

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

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
 */

let app: FirebaseApp | null = null;

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
  return getAuth(firebaseApp());
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

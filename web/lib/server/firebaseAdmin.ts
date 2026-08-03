import 'server-only';

import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * The Firebase Admin SDK — server only, always.
 *
 * `import 'server-only'` is the load-bearing line. It makes the build FAIL if
 * any client component ever imports this module, directly or transitively.
 * Without it the failure mode is silent and catastrophic: the Admin SDK's
 * service-account credentials get bundled into JavaScript served to browsers,
 * handing every visitor full read/write over the entire project. A code review
 * cannot reliably catch that; the compiler can.
 *
 * CREDENTIALS
 * -----------
 * Read from the environment, never from a file in the repository. The service
 * account is a master key: it bypasses every Firestore and Storage rule by
 * design. `.gitignore` covers `.env*`, and `web/.env.example` documents the
 * variable names with no values.
 *
 * On Google infrastructure the variables can be omitted entirely and
 * Application Default Credentials take over — which is the better production
 * posture, because then no private key exists in any environment variable at
 * all.
 *
 * THE EMULATOR
 * ------------
 * The Admin SDK reads `FIRESTORE_EMULATOR_HOST` and `FIREBASE_AUTH_EMULATOR_HOST`
 * itself and needs no credentials when they are set — a project id is enough.
 * That is why `isAdminConfigured()` accepts `GCLOUD_PROJECT` alone: it is the
 * state an emulator-backed end-to-end run is in, and refusing to serve there
 * would mean the community could only ever be proven by reading source text.
 * No deployed environment sets those variables, so this widens nothing in
 * production.
 */

let cached: App | null = null;

function adminApp(): App {
  if (cached) return cached;

  const existing = getApps();
  if (existing.length > 0) {
    cached = existing[0];
    return cached;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Environment variables cannot carry real newlines, so the key is stored with
  // literal "\n" and restored here. Getting this wrong produces an opaque
  // "invalid PEM" at runtime rather than at startup.
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  cached = (projectId && clientEmail && privateKey)
    ? initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId })
    // Application Default Credentials — the preferred production path.
    : initializeApp();

  return cached;
}

export function adminAuth() {
  return getAuth(adminApp());
}

export function adminDb() {
  return getFirestore(adminApp());
}

/**
 * Whether admin credentials are configured at all.
 *
 * Lets a surface degrade honestly ("الإدارة غير مهيّأة في هذه البيئة") instead
 * of throwing an opaque error, which matters because the site must still build
 * and run in a development environment that has no service account.
 */
export function isAdminConfigured(): boolean {
  return Boolean(
    (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY)
    || process.env.GOOGLE_APPLICATION_CREDENTIALS
    || process.env.GCLOUD_PROJECT,
  );
}

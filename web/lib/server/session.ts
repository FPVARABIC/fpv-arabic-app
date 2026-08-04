import 'server-only';

import { cookies } from 'next/headers';
import { adminAuth, adminDb, isAdminConfigured } from './firebaseAdmin';
import {
  toRole, can, type Capability, type PlatformRole,
} from '@core/data/auth/roles';

/**
 * Who is asking, and what are they actually allowed to do.
 *
 * THE ONE RULE THIS FILE EXISTS TO ENFORCE
 * ----------------------------------------
 * The browser is never believed. Not the role in a React context, not a claim
 * in localStorage, not a header, not a query parameter. Every privileged answer
 * on this site comes from here, and everything here comes from a session cookie
 * that Firebase itself signed and that this server verified.
 *
 * WHY A SESSION COOKIE AND NOT AN ID TOKEN
 * ----------------------------------------
 * An ID token lives in JavaScript, which means it can only reach the server if
 * a client component attaches it — so every server-rendered page would need a
 * client round-trip before it could know who you are, and `/admin` could not be
 * refused before it renders. A Firebase session cookie is httpOnly: unreadable
 * by script (so XSS cannot exfiltrate it), sent automatically, and verifiable
 * during server rendering and in middleware.
 *
 * WHERE THE ROLE COMES FROM
 * -------------------------
 * `users/{uid}.role` — the same field `firestore.rules` reads through
 * `callerProfile()`, and a field with no client write path whatsoever. It is
 * read fresh on every request, so a role revoked a second ago is gone a second
 * ago.
 *
 * The custom claim is NOT used to grant. It is written by `assignRole` so that
 * anything reading a token sees a consistent value, but this function ignores
 * it for the elevated case, and here is why that is the safe direction rather
 * than the lax one:
 *
 *   - The document is already being read on every request, so the claim adds
 *     no freshness and no independence — both come from the same server.
 *   - Taking the LOWER of the two, which this originally did, means an account
 *     with NO claim gets no role at all. Every account provisioned by any route
 *     other than `assignRole` — seeded, migrated, promoted in the console,
 *     restored from a backup — would then be silently powerless on the web
 *     while `firestore.rules` treated it as a full moderator. Two surfaces
 *     disagreeing about who someone is, is precisely the failure this file
 *     exists to prevent, and the end-to-end suite caught it doing exactly that.
 *   - A stale HIGH claim cannot escalate, because the claim is not consulted.
 *
 * What the claim IS still good for is other consumers (a future Cloud Function
 * that only has a token), which is why `assignRole` keeps it in step and
 * revokes tokens so it is reissued promptly.
 *
 * A BANNED ACCOUNT HAS NO ROLE
 * ----------------------------
 * Whatever the document says, `status: 'banned'` collapses the effective role
 * to `user`. So banning a staff account removes its powers in the same write
 * that stops it posting, without a second field to keep in step.
 */

export const SESSION_COOKIE = '__session';

export interface Session {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  role: PlatformRole;
  /** `banned` accounts keep a session but lose every capability. */
  status: 'active' | 'banned';
  displayName: string | null;
  photoURL: string | null;
}

/**
 * The current session, or null.
 *
 * Never throws. Every failure — no cookie, expired cookie, forged cookie,
 * revoked user, unconfigured environment — collapses to "not signed in", which
 * is the safe interpretation of every one of them.
 */
export async function getSession(): Promise<Session | null> {
  if (!isAdminConfigured()) return null;

  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  try {
    // `true` = also check whether the user has been disabled or their tokens
    // revoked since the cookie was minted. It costs a lookup and is the
    // difference between "banned" meaning something and meaning nothing.
    const decoded = await adminAuth().verifySessionCookie(raw, true);

    const snap = await adminDb().collection('users').doc(decoded.uid).get();
    const profile = snap.data() ?? {};
    // The document, and only the document. See the header for why the custom
    // claim is deliberately not consulted here.
    const role: PlatformRole = toRole(profile.role);
    const status = profile.status === 'banned' ? 'banned' : 'active';

    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      emailVerified: decoded.email_verified === true,
      role: status === 'banned' ? 'user' : role,
      status,
      displayName: typeof profile.displayName === 'string' ? profile.displayName : null,
      photoURL: typeof profile.photoURL === 'string' ? profile.photoURL : null,
    };
  } catch {
    return null;
  }
}


/** True only for a signed-in, non-banned account holding the capability. */
export function sessionCan(session: Session | null, capability: Capability): boolean {
  if (!session || session.status === 'banned') return false;
  return can(session.role, capability);
}

/**
 * The guard every privileged server path must call FIRST.
 *
 * Returns the session or throws `ForbiddenError`. It is deliberately a throw
 * rather than a boolean: a boolean can be ignored by forgetting an `if`, and
 * the failure of that mistake is silent and total. A throw cannot be ignored.
 */
export class ForbiddenError extends Error {
  readonly status: number;
  constructor(message: string, status = 403) {
    super(message);
    this.name = 'ForbiddenError';
    this.status = status;
  }
}

export async function requireCapability(capability: Capability): Promise<Session> {
  const session = await getSession();
  if (!session) throw new ForbiddenError('يلزم تسجيل الدخول', 401);
  if (session.status === 'banned') throw new ForbiddenError('الحساب موقوف', 403);
  if (!can(session.role, capability)) throw new ForbiddenError('لا تملك صلاحية هذا الإجراء', 403);
  return session;
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new ForbiddenError('يلزم تسجيل الدخول', 401);
  return session;
}

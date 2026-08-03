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
 * WHERE THE ROLE COMES FROM, AND WHY BOTH
 * ---------------------------------------
 * Two sources, and the more restrictive wins:
 *
 *   the custom claim      — cheap, already inside the verified cookie
 *   users/{uid}.role      — the source Firestore rules themselves read
 *
 * They are read together because they can legitimately disagree for a while: a
 * claim is baked into a cookie at sign-in and does not change until the cookie
 * is reissued, so a role revoked five minutes ago is still in the old cookie.
 * Taking the LOWER of the two makes revocation take effect immediately while
 * still allowing the fast path to grant nothing the database does not agree
 * with. Escalation therefore requires writing to a document that has no client
 * write path at all.
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

    const claimRole = toRole((decoded as Record<string, unknown>).role);

    const snap = await adminDb().collection('users').doc(decoded.uid).get();
    const profile = snap.data() ?? {};
    const docRole = toRole(profile.role);
    const status = profile.status === 'banned' ? 'banned' : 'active';

    // The lower of the two. A claim can only ever confirm what the document
    // already says — it can never grant beyond it.
    const role: PlatformRole = rankOf(claimRole) <= rankOf(docRole) ? claimRole : docRole;

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

function rankOf(r: PlatformRole): number {
  return ['user', 'moderator', 'reviewer', 'editor', 'admin', 'owner'].indexOf(r);
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

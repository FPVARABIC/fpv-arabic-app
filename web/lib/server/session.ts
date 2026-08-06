import 'server-only';

import { serverUser } from '../backend/supabase/server';
import { can, type Capability, type PlatformRole } from '@core/data/auth/roles';

/**
 * Who is asking, and what are they actually allowed to do.
 *
 * THE ONE RULE THIS FILE EXISTS TO ENFORCE — UNCHANGED BY THE MIGRATION
 * ---------------------------------------------------------------------
 * The browser is never believed. Not a role in a React context, not a claim in
 * localStorage, not a header, not a query parameter. Every privileged answer on
 * this site comes from here, and everything here comes from a session token
 * that Supabase Auth signed and this server verified against the Auth server —
 * `getUser()`, not a local decode, so a revoked session is refused the moment
 * it is revoked rather than when it happens to expire.
 *
 * WHY THIS FILE SURVIVED THE MIGRATION WITH ITS API INTACT
 * --------------------------------------------------------
 * Forty files import `getSession` / `requireCapability` / `sessionCan`. They
 * ask «who is this and may they do X», which has nothing to do with which
 * backend answers — so the exports stay, the `Session` shape stays, and the
 * implementation underneath became one call into the backend adapter. The
 * pages did not change, which was the whole point of building the adapter
 * before touching them.
 *
 * WHERE THE ROLE COMES FROM
 * -------------------------
 * `public.profiles.role`, re-read on every request — never a JWT claim. A
 * claim is frozen until the token refreshes, so revoking a moderator would
 * leave them a moderator for up to an hour on the only surface where it
 * matters. The profile row is also what `0002`'s `is_admin()` reads when the
 * DATABASE decides what to permit, so the UI and RLS answer from one field
 * and cannot disagree about who someone is. A role revoked a second ago is
 * gone a second ago.
 *
 * A BANNED ACCOUNT HAS NO ROLE
 * ----------------------------
 * `status: 'banned'` collapses the effective role to `user` — inside the
 * adapter, before the value reaches this file, and independently again inside
 * `is_staff()` in SQL. Banning a staff account removes its powers in the same
 * write that stops it posting.
 */

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
 * Never throws. Every failure — no cookie, expired token, revoked session,
 * unreachable Auth server, unconfigured environment — collapses to «not signed
 * in», which is the safe interpretation of every one of them.
 */
export async function getSession(): Promise<Session | null> {
  const user = await serverUser();
  if (!user) return null;
  return {
    uid: user.id,
    email: user.email,
    emailVerified: user.emailVerified,
    role: user.role,
    status: user.status,
    displayName: user.displayName,
    photoURL: user.photoURL,
  };
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

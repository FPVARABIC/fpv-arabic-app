import { NextResponse, type NextRequest } from 'next/server';
import { safeNextPath } from '@/lib/safeNext';

/**
 * The first gate in front of `/admin`.
 *
 * WHAT IT DOES AND — JUST AS IMPORTANT — WHAT IT DOES NOT
 * ------------------------------------------------------
 * Middleware runs on the edge, before a page is rendered, and it can see
 * whether a session cookie is PRESENT. It cannot verify that cookie, because
 * verification needs the Firebase Admin SDK and the Admin SDK cannot run in the
 * edge runtime.
 *
 * So this is deliberately a cheap first filter, not the security boundary:
 *
 *   no cookie at all        → redirect to sign-in without touching any data
 *   a cookie of some kind   → let the request through to the page
 *
 * The page itself then calls `requireCapability()`, which verifies the cookie's
 * signature against Firebase, re-reads the role from Firestore, and refuses
 * anything short of the required capability. That server check is the real
 * gate, and it runs whether or not this middleware did anything.
 *
 * Writing it this way matters: a middleware that appeared to authorise would
 * invite someone to trust it later and skip the page-level check. Being
 * explicitly "presence only" keeps the real check obviously mandatory.
 */

const SESSION_COOKIE = '__session';

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/');
  const isAdminApi = pathname.startsWith('/api/admin/');
  // `/profile` is account data and stays closed. `/settings` used to be listed
  // here too, written before the page existed — and it was the wrong guess:
  // what that page actually controls is data stored in THIS BROWSER (lesson
  // progress, checklists), which a signed-out reader owns and must be able to
  // clear. The phone app agrees — its profile sheet shows «الإعدادات» to a
  // guest and gates only sign-out and the avatar picker.
  const isPrivate = pathname.startsWith('/profile');

  if (!isAdmin && !isAdminApi && !isPrivate) return NextResponse.next();

  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (!hasSession) {
    // An API caller gets JSON, not an HTML redirect — a redirect to a sign-in
    // page is useless to a fetch() and can be mistaken for success.
    if (isAdminApi) {
      return NextResponse.json({ error: 'يلزم تسجيل الدخول' }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = '/signin';
    // Preserve where they were going so sign-in can return them there. This
    // value comes from the current request's own path, but it is passed through
    // the SAME validator the sign-in page uses on the way back out — the check
    // lives in one place so it cannot be enforced here and forgotten there.
    url.search = `?next=${encodeURIComponent(safeNextPath(pathname + search))}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/profile/:path*'],
};

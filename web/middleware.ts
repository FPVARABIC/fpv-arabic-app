import { NextResponse, type NextRequest } from 'next/server';

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
  const isPrivate = pathname.startsWith('/profile') || pathname.startsWith('/settings');

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
    // Preserve where they were going so sign-in can return them there. The
    // value is a path from this same request, never attacker-supplied input,
    // and `next` is validated as a relative path before use.
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/profile/:path*', '/settings/:path*'],
};

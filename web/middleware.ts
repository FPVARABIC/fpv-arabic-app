import { NextResponse, type NextRequest } from 'next/server';
import { refreshSession } from '@/lib/backend/supabase/middleware';
import { safeNextPath } from '@/lib/safeNext';

/**
 * Two jobs, in one pass.
 *
 * 1 — REFRESH THE SESSION, ON EVERY PAGE. `refreshSession()` renews an
 *     expiring token and writes the new cookies — the one place Next allows
 *     that (see `lib/backend/supabase/middleware.ts`). This must run on EVERY
 *     rendered route, not only the private ones: Supabase rotates the refresh
 *     token on use, so a signed-in reader browsing public pages with the
 *     refresh confined to `/admin` would keep presenting an already-rotated
 *     token — and rotation reuse is treated as theft, which kills the whole
 *     session. That is the «random logout» bug, and the matcher below is the
 *     fix as much as the refresh itself.
 *
 * 2 — GATE THE PRIVATE PREFIXES. Still deliberately a FIRST filter, not the
 *     security boundary: the page itself calls `requireCapability()`, which
 *     re-reads the role from `public.profiles` and refuses anything short of
 *     the required capability. That server check is the real gate and runs
 *     whether or not this middleware did anything. This one answers «is
 *     anybody signed in», never «may they» — a middleware that appeared to
 *     authorise would invite someone to trust it later and skip the page
 *     check.
 *
 * `/profile` is account data and stays closed. `/settings` stays OPEN: what
 * that page controls is data stored in this browser (lesson progress,
 * checklists), which a signed-out reader owns and must be able to clear.
 *
 * A visitor with NO session cookies at all skips the refresh entirely — an
 * anonymous reader of a static page should cost zero Auth-server round trips.
 */

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/');
  const isAdminApi = pathname.startsWith('/api/admin/');
  const isPrivate = pathname.startsWith('/profile');
  const gated = isAdmin || isAdminApi || isPrivate;

  // Supabase's cookies are `sb-<project-ref>-auth-token` (possibly chunked).
  // No such cookie and no gate to enforce → nothing to refresh, nothing to do.
  const hasAuthCookie = request.cookies.getAll()
    .some(c => c.name.startsWith('sb-') && c.name.includes('-auth-token'));
  if (!gated && !hasAuthCookie) return NextResponse.next();

  const { response, signedIn } = await refreshSession(request);

  if (gated && !signedIn) {
    // An API caller gets JSON, not an HTML redirect — a redirect to a sign-in
    // page is useless to a fetch() and can be mistaken for success.
    if (isAdminApi) {
      return NextResponse.json({ error: 'يلزم تسجيل الدخول' }, { status: 401 });
    }
    const redirect = request.nextUrl.clone();
    redirect.pathname = '/signin';
    // Preserve where they were going so sign-in can return them there —
    // through the SAME validator the sign-in page uses on the way back out.
    redirect.search = `?next=${encodeURIComponent(safeNextPath(pathname + search))}`;
    return NextResponse.redirect(redirect);
  }

  return response;
}

export const config = {
  // Everything that renders, nothing that is a file: session refresh must see
  // every page a signed-in user can be on (see the header), and must not run
  // for static assets that could not use it.
  matcher: [
    '/((?!_next/static|_next/image|assets/|favicon\\.ico|icon\\.svg|robots\\.txt|sitemap\\.xml|manifest\\.webmanifest).*)',
  ],
};

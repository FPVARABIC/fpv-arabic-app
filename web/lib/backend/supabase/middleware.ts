import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, isSupabaseConfigured } from './env';

/**
 * The middleware half of the session — the ONE place cookies can be written.
 *
 * Supabase's server client cannot always write cookies: a Server Component
 * render is not allowed to set them, so `server.ts` swallows those writes on
 * purpose. Next's middleware IS allowed, which makes this the only spot where
 * an expiring token can be renewed. Skipping it does not break sign-in — it
 * breaks sign-in TOMORROW, when the first access token expires and nothing is
 * allowed to write the refreshed one.
 *
 * This lives here rather than in `middleware.ts` itself so that the SDK import
 * stays confined to `lib/backend/supabase/` — the same boundary every page and
 * component observes, held by `scripts/testBackendAdapter.ts`. The middleware
 * consumes a result, not a client.
 *
 * `getUser()` is what triggers the refresh, and it verifies against the Auth
 * server rather than trusting the cookie's contents — so `signedIn` reports a
 * VERIFIED session, stronger than the presence-only check the Firebase
 * middleware could manage (its Admin SDK could not run on the edge; this
 * client can, because it is fetch-based).
 */
export async function refreshSession(
  request: NextRequest,
): Promise<{ response: NextResponse; signedIn: boolean }> {
  // No Supabase attached → no sessions exist. Reported as signed OUT so the
  // caller fails CLOSED; the sign-in page is where «unconfigured» is explained.
  if (!isSupabaseConfigured()) {
    return { response: NextResponse.next({ request }), signedIn: false };
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Write to BOTH sides: the request copy so anything downstream in this
        // same pass sees the refreshed token, and the response so the browser
        // stores it. Writing only one is the classic random-logout bug the
        // Supabase SSR guide warns about.
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  return { response, signedIn: Boolean(data.user) };
}

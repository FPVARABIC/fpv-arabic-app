import 'server-only';

import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, isSupabaseConfigured } from './env';
import { makeAuth } from './auth';
import { makeRead, makeWrite } from './client';
import { makeRealtime } from './realtime';
import { makeStorage } from './storage';
import type { Backend, SessionUser } from '../ports';

/**
 * The SERVER adapter — the same publishable key, carrying the request's session.
 *
 * WHY THIS IS NOT THE ADMIN ADAPTER
 * =================================
 * It is easy to read «server» as «privileged». It is the opposite. This file
 * builds a client with the PUBLISHABLE key and the visitor's own cookies, so
 * every query it makes is subject to exactly the row-level security a browser
 * would face. A server-rendered page therefore shows what the signed-in visitor
 * is allowed to see — no more, and no `where` clause standing in for a policy.
 *
 * `admin.ts` is the privileged one, it holds a different key, and it is
 * `server-only` for that reason. Two files, because one file holding both keys
 * is one careless line away from using the wrong one.
 *
 * WHY THIS EXISTS AT ALL RATHER THAN RENDERING FROM THE BROWSER
 * ============================================================
 * Server rendering is what makes a post page real HTML — shareable, indexable,
 * and fast on a cold visit — which is the same reason `lib/server/community.ts`
 * reads server-side today. The difference is what enforces the rules:
 *
 *   BEFORE  the Admin SDK bypassed Firestore rules, so every query had to
 *           restate `status == 'active'` by hand and a forgotten restatement
 *           published hidden posts. A test existed solely to check the
 *           restatements were present.
 *
 *   NOW     the policies apply to this client like any other, so there is
 *           nothing to restate and nothing to forget. That test's whole
 *           category of bug is gone.
 *
 * A NEW CLIENT PER REQUEST, ALWAYS
 * ================================
 * Never memoised at module scope. A module-level client in a server runtime is
 * shared by every concurrent request, and this one carries a SESSION — sharing
 * it means serving one visitor's data to another. `browserSupabase()` memoises
 * precisely because a browser has exactly one user; a server has as many as it
 * has open sockets.
 *
 * COOKIE WRITES AND WHY THEY ARE SWALLOWED
 * ========================================
 * Supabase refreshes an expiring token by writing new cookies. Next allows that
 * in a Route Handler or a Server Action and FORBIDS it while rendering a Server
 * Component — where it throws. Letting that throw escape would take down a page
 * for the incidental reason that a token was due for renewal.
 *
 * So `setAll` is wrapped. This is safe only because `middleware.ts` runs the
 * refresh where cookies CAN be written, which is what the Supabase SSR guide
 * means by «middleware must handle session updates». The migration of
 * `middleware.ts` is part of the web batch that follows this one; until then a
 * session refresh during render is silently skipped, which logs the visitor out
 * at token expiry instead of renewing them. That is a degradation, not a leak.
 */

export async function serverSupabase(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured()) return null;

  const jar = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return jar.getAll().map(c => ({ name: c.name, value: c.value }));
      },
      setAll(list) {
        try {
          for (const { name, value, options } of list) jar.set(name, value, options);
        } catch {
          // Rendering a Server Component. See the header: middleware owns the
          // refresh, and failing loudly here would trade a renewed token for a
          // broken page.
        }
      },
    },
  });
}

/**
 * The `Backend` a server component or route handler is handed.
 *
 * Same type as `browserBackend()` returns, and same absence: no `admin` key.
 * A route that needs `setUserRole` imports `admin.ts` explicitly and says so.
 */
export async function serverBackend(): Promise<Backend> {
  const sb = await serverSupabase();
  return {
    auth: makeAuth(sb),
    read: makeRead(sb),
    write: makeWrite(sb),
    storage: makeStorage(sb),
    // Present so the shape is identical on both sides; a server render has
    // nothing to subscribe to and `makeRealtime` returns no-op unsubscribers
    // for a null client. A component that subscribes does so in an effect,
    // which only ever runs in the browser.
    realtime: makeRealtime(sb),
  };
}

/**
 * Who is asking — the server-side entry point every privileged path calls FIRST.
 *
 * The direct replacement for `getSession()` in `lib/server/session.ts`, and it
 * keeps that file's two rules exactly: the browser is never believed, and the
 * role is read from `public.profiles` on every request rather than from a
 * token claim, so a role revoked a second ago is gone a second ago.
 */
export async function serverUser(): Promise<SessionUser | null> {
  const sb = await serverSupabase();
  return makeAuth(sb).currentUser();
}

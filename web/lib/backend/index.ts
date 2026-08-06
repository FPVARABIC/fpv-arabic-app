/**
 * The backend, as the rest of the application sees it.
 *
 * WHAT A PAGE IMPORTS
 * ===================
 *
 *     import { serverBackend } from '@/lib/backend/supabase/server';   // RSC, routes
 *     import { browserBackend } from '@/lib/backend/supabase/client';  // client components
 *     import type { PostSummary } from '@/lib/backend';                // everywhere
 *
 * WHY THE TYPES COME FROM HERE AND THE IMPLEMENTATIONS DO NOT
 * ===========================================================
 * This module re-exports `ports.ts` and NOTHING ELSE. It is the vocabulary —
 * `PostSummary`, `OrderSummary`, `Backend` — and it is free of any provider, so
 * importing it costs nothing and drags nothing in.
 *
 * A barrel that also re-exported the implementations would be actively
 * harmful here, and specifically:
 *
 *   • `supabase/admin.ts` is `server-only` and holds the secret key. Any client
 *     component importing a barrel that touched it would fail to build — and
 *     the failure would name the barrel, not the mistake, so the natural fix
 *     would be to delete the `server-only` guard. A barrel that makes the
 *     wrong fix the obvious one is worse than no barrel.
 *   • `supabase/server.ts` imports `next/headers`, which throws outside a
 *     request scope. A test importing a type would inherit that.
 *   • The choice between the browser client and the cookie-bound server one is
 *     not a detail to be hidden. A page that does not know which side of the
 *     wire it is on is a page that will eventually read another visitor's
 *     session.
 *
 * So: types from here, implementation from the file whose name says where it
 * runs. `scripts/testBackendAdapter.ts` asserts this file imports nothing else.
 *
 * THE RULE THIS LAYER EXISTS TO ENFORCE
 * =====================================
 * «لا تستدعِ Supabase SDK مباشرة داخل المكونات أو الصفحات». Not one file under
 * `app/` or `components/` may import `@supabase/*`; they import a port and call
 * a method. The same test asserts it, so the rule is a failing suite rather
 * than a convention — and the next migration, whenever it comes, costs one
 * folder instead of the 63 files this one cost.
 */

export * from './ports';

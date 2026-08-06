/**
 * The two PUBLIC Supabase values, and nothing else.
 *
 * WHAT IS DELIBERATELY ABSENT
 * ===========================
 * `SUPABASE_SECRET_KEY`. It is not read here, not re-exported here, and not
 * mentioned here except in this sentence. It lives in `admin.ts`, which opens
 * with `import 'server-only'` and therefore cannot be pulled into a browser
 * bundle even by accident.
 *
 * That split is the whole point of having this file at all. Every module that
 * runs in a browser needs the URL and the publishable key; if they were read
 * from the same module that reads the secret, then one careless import would
 * put the secret's module in the client graph, and the only thing standing
 * between it and the bundle would be tree-shaking — an optimisation, not a
 * guarantee. `scripts/testBackendAdapter.ts` asserts the absence mechanically.
 *
 * WHY THE PUBLISHABLE KEY IS PUBLIC AND THAT IS CORRECT
 * =====================================================
 * The same reasoning the Firebase web config carried: it identifies the
 * project, it does not authorise anything. What a holder of this key may do is
 * decided entirely by the policies in `supabase/migrations/0002_rls_policies.sql`
 * and `0003_storage.sql` — which were written on the assumption that a stranger
 * has the key, because a stranger does. Hiding it is impossible anyway: it must
 * reach the browser to work.
 *
 * WHY THE LITERAL `process.env.NEXT_PUBLIC_…` SPELLING MATTERS
 * ============================================================
 * Next replaces these expressions at BUILD time by matching the source text.
 * `process.env[name]` with a computed name is not matched and evaluates to
 * `undefined` in the browser, which produces a client that silently cannot
 * reach anything. So the two reads below are written out in full, once, and
 * every other module imports the result.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

/**
 * Enough configuration to attempt a call?
 *
 * Answers «are the variables present», which is NOT the same question as «does
 * the project answer». A URL that is present but wrong still gets past this and
 * then fails at the network — which is why every adapter method returns an
 * empty result or an `{ ok: false }` rather than throwing. The guard exists so
 * a development checkout with no Supabase project attached renders the «غير
 * متصل» state instead of an error page.
 */
export function isSupabaseConfigured(): boolean {
  return SUPABASE_URL.length > 0 && SUPABASE_PUBLISHABLE_KEY.length > 0;
}

/**
 * The Arabic sentence a user sees when the platform has no backend attached.
 *
 * One string, in one place, because «حدث خطأ» is what a product says when
 * nobody thought about what could go wrong — and because a message repeated at
 * nine call sites is a message that will be worded nine ways.
 */
export const NOT_CONFIGURED_AR = 'الخدمة غير مهيّأة في هذه البيئة. حاول لاحقاً.';

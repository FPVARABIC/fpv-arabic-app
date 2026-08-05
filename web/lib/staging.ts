// RELATIVE, NOT `@core/data/brand`, AND THAT IS DELIBERATE.
//
// `next.config.ts` imports this module so the noindex header and the badge are
// decided by ONE function rather than two that drift. Next loads its config
// outside webpack and does not apply the tsconfig path aliases, so an aliased
// import here fails the build with a bare "Cannot find module '@core/...'".
// The two specifiers resolve to the same file — `@core/*` maps to `../src/*`
// from the web root, which from `web/lib/` is exactly this path.
import { BRAND_ORIGIN } from '../../src/data/brand';

/**
 * Is this deployment a staging copy?
 *
 * WHY IT DEFAULTS TO «YES»
 * ------------------------
 * Because of what each mistake costs. A production site wrongly marked staging
 * shows a badge and refuses a live payment key — embarrassing, visible within
 * a minute, fixed by setting one variable. A staging site wrongly treated as
 * production accepts a live key, takes real money from whoever is clicking
 * through a test, and gets indexed by Google. The first failure announces
 * itself; the second does not.
 *
 * So production is the state that must be DECLARED, by naming the canonical
 * origin in `NEXT_PUBLIC_SITE_URL`. Anything else — a preview URL, a laptop, a
 * branch deploy, an unset variable — is staging.
 *
 * This is the same fail-safe shape as `isCanonicalOrigin()`, and for the same
 * reason: the first version of that function fell back to the brand origin and
 * cheerfully served `index, follow` from localhost.
 */
export function isStagingEnvironment(): boolean {
  return isStagingFromEnv(process.env);
}

/**
 * The same decision, over an explicit environment.
 *
 * Separated so `next.config.ts` can call it and so the suite can drive the
 * whole truth table without mutating the real `process.env`.
 *
 * WHY THE FLAG IS PARSED AND NOT COMPARED
 * ---------------------------------------
 * It used to be two equality checks against the literals `'true'` and
 * `'false'`. `apphosting.staging.yaml` set `STAGING: "1"` — a perfectly
 * ordinary way to write a boolean in YAML — which matched neither, fell
 * through to the origin check, and did nothing at all. It was invisible
 * because the origin check happened to answer «staging» anyway; point the
 * same deployment at the canonical origin and the badge disappears while the
 * variable that was supposed to force it sits there looking correct.
 *
 * So a value that was WRITTEN is now a value that COUNTS. Only the explicit
 * negatives turn staging off; anything else deliberate — `1`, `true`, or a
 * typo somebody meant as one — is staging, which is the safe direction.
 */
export function isStagingFromEnv(env: Record<string, string | undefined>): boolean {
  const flag = env.STAGING?.trim().toLowerCase();
  if (flag) return !FLAG_OFF.has(flag);

  const explicit = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!explicit) return true;
  return explicit.replace(/\/$/, '') !== BRAND_ORIGIN;
}

/**
 * The only spellings that turn staging OFF.
 *
 * An allow-list of negatives rather than of positives: an unrecognised value
 * must read as staging, never as production. See the note above.
 */
const FLAG_OFF = new Set(['false', '0', 'no', 'off']);

/**
 * What the badge says.
 *
 * Names the environment AND what is not real about it, because «TEST» alone
 * leaves somebody wondering whether their order was placed. The two facts that
 * matter to a person clicking around are: nothing is charged, and nothing is
 * shipped.
 */
export const STAGING_BADGE_AR = 'نسخة تجريبية — لا تُخصم أموال ولا تُشحن طلبات';

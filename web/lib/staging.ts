import { BRAND_ORIGIN } from '@core/data/brand';

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
  // An explicit opt-out, for the case where somebody genuinely needs to run a
  // production-shaped deployment on another origin.
  if (process.env.STAGING === 'false') return false;
  if (process.env.STAGING === 'true') return true;

  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!explicit) return true;
  return explicit.replace(/\/$/, '') !== BRAND_ORIGIN;
}

/**
 * What the badge says.
 *
 * Names the environment AND what is not real about it, because «TEST» alone
 * leaves somebody wondering whether their order was placed. The two facts that
 * matter to a person clicking around are: nothing is charged, and nothing is
 * shipped.
 */
export const STAGING_BADGE_AR = 'نسخة تجريبية — لا تُخصم أموال ولا تُشحن طلبات';

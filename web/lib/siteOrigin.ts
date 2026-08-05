import { BRAND_ORIGIN } from '@core/data/brand';
import { isStagingFromEnv } from './staging';

/**
 * Where this deployment thinks it lives.
 *
 * WHY THIS IS NOT JUST A CONSTANT
 * -------------------------------
 * The same code runs on the official site, on a preview build, and on a
 * developer's laptop. Canonical URLs, Open Graph cards and the sitemap all
 * have to name the origin they are actually being served from — otherwise a
 * preview publishes cards pointing at production, and a search engine is
 * invited to index the preview's pages under the live site's addresses. That
 * is not a cosmetic bug: it is how a staging copy ends up outranking the real
 * thing.
 *
 * THE ORDER, AND WHY
 * ------------------
 * 1. `NEXT_PUBLIC_SITE_URL` — an explicit answer always wins.
 * 2. The host's own injected origin. Every managed host provides one:
 *    Vercel sets `VERCEL_URL`, Firebase App Hosting and Cloud Run resolve
 *    through their service URL. Reading it means a preview is correct with no
 *    configuration at all, which is the point.
 * 3. The canonical origin, as the last resort.
 *
 * Step 2 is what makes deployment zero-configuration: nobody has to remember
 * to set a variable for a preview to describe itself honestly.
 */
export function siteOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return stripTrailingSlash(explicit);

  // Vercel injects the deployment's own host, without a scheme.
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${stripTrailingSlash(vercel)}`;

  // Cloud Run / Firebase App Hosting expose the resolved service URL.
  const cloudRun = process.env.SERVICE_URL?.trim();
  if (cloudRun) return stripTrailingSlash(cloudRun);

  return BRAND_ORIGIN;
}

/**
 * Whether this deployment IS the official site, and may be indexed.
 *
 * FAIL-SAFE, NOT FAIL-OPEN — AND THIS IS THE WHOLE POINT
 * ------------------------------------------------------
 * This deliberately does NOT ask «does `siteOrigin()` equal the brand origin».
 * It cannot: `siteOrigin()` FALLS BACK to the brand origin when nothing is
 * configured, so every unconfigured build — a laptop, a preview, a branch
 * deploy on a host that injects no origin — would answer «yes, I am the
 * official site» and serve `index, follow`. That is how a staging copy gets
 * crawled and ends up outranking the real thing, and it is not hypothetical:
 * the first run of this code did exactly that on localhost.
 *
 * So indexing is an EXPLICIT act. `NEXT_PUBLIC_SITE_URL` must be set, and must
 * name the canonical origin. Anything else — unset, a preview URL, a typo —
 * is `noindex`. The cost of being wrong in this direction is a page that takes
 * a day longer to appear in search; in the other direction it is the official
 * site competing with a copy of itself, which takes weeks to undo.
 */
export function isCanonicalOrigin(): boolean {
  // A deployment that declares itself staging is never the official site, no
  // matter what origin it was handed.
  //
  // THIS IS NOT BELT AND BRACES — IT CLOSES A REAL HOLE
  // ---------------------------------------------------
  // App Hosting MERGES `apphosting.staging.yaml` over `apphosting.yaml` key by
  // key (`firebase-tools`' own `AppHostingYamlConfig.merge` is a spread), so a
  // variable the staging file does not mention is INHERITED from production —
  // including `NEXT_PUBLIC_SITE_URL`. Without this line the staging copy would
  // read the canonical origin out of the production config, answer «yes, I am
  // the official site», and serve `robots.txt: allow` and `<meta robots:
  // index, follow>` from a URL nobody meant to publish.
  //
  // The staging flag is the one signal that cannot be inherited by accident:
  // it is set deliberately, in the staging file, and it means exactly this.
  if (isStagingFromEnv(process.env)) return false;

  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!explicit) return false;
  return stripTrailingSlash(explicit) === BRAND_ORIGIN;
}

function stripTrailingSlash(v: string): string {
  return v.endsWith('/') ? v.slice(0, -1) : v;
}

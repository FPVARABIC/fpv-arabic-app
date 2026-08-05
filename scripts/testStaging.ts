/**
 * What makes a staging deployment safe to hand somebody a link to.
 *
 * WHY THIS SUITE EXISTS
 * ---------------------
 * Every assertion below is a defect that was already in the repository,
 * written into `apphosting.staging.yaml` from the SHAPE of the code rather
 * than from running it. All three read as correct:
 *
 *   STAGING: "1"             the parser compared against the literal strings
 *                            `'true'` and `'false'`, so `"1"` matched neither
 *                            and did nothing. It was invisible because the
 *                            origin fallback answered «staging» anyway — the
 *                            variable meant to force it was decoration.
 *
 *   PAYMENT_PROVIDER: fake   `paymentProvider()` builds Mollie or throws.
 *                            There is no `fake` branch: `FakeProvider` is a
 *                            test double this repository's own suite builds
 *                            directly. The value threw on every payment path.
 *
 *   MOLLIE_API_KEY           named a secret that does not exist. App Hosting
 *                            resolves secrets BEFORE it builds, so the rollout
 *                            fails with nothing deployed.
 *
 * The lesson each one teaches is the same: a configuration value is only
 * correct if the function that consumes it says so. So nothing here matches a
 * string in a YAML file — the declared values are handed to the real parser,
 * the real provider factory, and the real Next config.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isStagingFromEnv, STAGING_BADGE_AR } from '../web/lib/staging';
import { paymentProvider, resetPaymentProviderCache, PaymentProviderError } from '../web/lib/server/payments';
import { BRAND_ORIGIN } from '../src/data/brand';
import { isCanonicalOrigin } from '../web/lib/siteOrigin';
import robots from '../web/app/robots';
import nextConfig from '../web/next.config';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p: string) => readFileSync(path.join(ROOT, p), 'utf8');

let passed = 0;
let failed = 0;

function ok(label: string, cond: boolean): void {
  if (cond) { passed++; console.log(`  ok — ${label}`); }
  else { failed++; console.log(`  FAIL — ${label}`); }
}

/** Run `fn` against a temporary environment, then put the real one back. */
function withEnv<T>(patch: Record<string, string | undefined>, fn: () => T): T {
  const saved: Record<string, string | undefined> = {};
  for (const k of Object.keys(patch)) { saved[k] = process.env[k]; }
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) delete process.env[k]; else process.env[k] = v;
  }
  try { return fn(); } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k]; else process.env[k] = v;
    }
  }
}

console.log('\n[1] The staging flag counts every value somebody would actually write');
{
  // The regression itself. `"1"` is how a boolean is normally written in YAML,
  // and on the canonical origin the old code answered «production» for it —
  // meaning no badge, no noindex, and a live payment key accepted.
  ok('STAGING="1" forces staging even on the canonical origin',
    isStagingFromEnv({ STAGING: '1', NEXT_PUBLIC_SITE_URL: BRAND_ORIGIN }));
  ok('STAGING="true" forces staging on the canonical origin',
    isStagingFromEnv({ STAGING: 'true', NEXT_PUBLIC_SITE_URL: BRAND_ORIGIN }));
  ok('STAGING="yes" forces staging',
    isStagingFromEnv({ STAGING: 'yes', NEXT_PUBLIC_SITE_URL: BRAND_ORIGIN }));
  ok('STAGING="on" forces staging',
    isStagingFromEnv({ STAGING: 'on', NEXT_PUBLIC_SITE_URL: BRAND_ORIGIN }));
  ok('STAGING=" TRUE " survives whitespace and case',
    isStagingFromEnv({ STAGING: ' TRUE ', NEXT_PUBLIC_SITE_URL: BRAND_ORIGIN }));

  // The opt-out must still work, or nothing could ever be production.
  ok('STAGING="false" turns staging off', !isStagingFromEnv({ STAGING: 'false' }));
  ok('STAGING="0" turns staging off', !isStagingFromEnv({ STAGING: '0' }));
  ok('STAGING="no" turns staging off', !isStagingFromEnv({ STAGING: 'no' }));
  ok('STAGING="off" turns staging off', !isStagingFromEnv({ STAGING: 'off' }));

  // An unparseable value must not read as production. Somebody typing
  // `STAGING: flase` meant staging, and the safe reading is the one that
  // shows a badge rather than the one that accepts a live card.
  ok('a typo reads as staging, not as production',
    isStagingFromEnv({ STAGING: 'flase', NEXT_PUBLIC_SITE_URL: BRAND_ORIGIN }));

  // With no flag at all, the origin decides — and only the canonical one wins.
  ok('unset flag + canonical origin is production',
    !isStagingFromEnv({ NEXT_PUBLIC_SITE_URL: BRAND_ORIGIN }));
  ok('unset flag + canonical origin with a trailing slash is still production',
    !isStagingFromEnv({ NEXT_PUBLIC_SITE_URL: `${BRAND_ORIGIN}/` }));
  ok('unset flag + a preview origin is staging',
    isStagingFromEnv({ NEXT_PUBLIC_SITE_URL: 'https://x--y.us-central1.hosted.app' }));
  ok('nothing set at all is staging',
    isStagingFromEnv({}));
  ok('an empty flag falls through to the origin rather than forcing staging',
    !isStagingFromEnv({ STAGING: '', NEXT_PUBLIC_SITE_URL: BRAND_ORIGIN }));
}

console.log('\n[2] A staging deployment says noindex on every path, not just /admin');
{
  type HeaderRule = { source: string; headers: Array<{ key: string; value: string }> };

  // `headers()` reads the environment when it is CALLED, so the two shapes can
  // be compared in one process without rebuilding.
  const headersFor = async (env: Record<string, string | undefined>) =>
    await withEnv(env, () => nextConfig.headers!()) as HeaderRule[];

  const robotsSources = (rules: HeaderRule[]) => rules
    .filter(r => r.headers.some(h => h.key.toLowerCase() === 'x-robots-tag'))
    .map(r => r.source);

  const staging = await headersFor({ STAGING: 'true', NEXT_PUBLIC_SITE_URL: undefined });
  const production = await headersFor({ STAGING: 'false', NEXT_PUBLIC_SITE_URL: BRAND_ORIGIN });

  const stagingSources = robotsSources(staging);
  const productionSources = robotsSources(production);

  ok('staging carries a site-wide X-Robots-Tag', stagingSources.includes('/:path*'));
  ok('staging still carries the /admin one', stagingSources.includes('/admin/:path*'));

  // THE CONTROL. Without this the assertion above passes for a header that is
  // simply always on — which would silently noindex the real site, and the
  // suite would call it a success.
  ok('production carries NO site-wide X-Robots-Tag', !productionSources.includes('/:path*'));
  ok('production still carries the /admin one', productionSources.includes('/admin/:path*'));

  const wide = staging.find(r => r.source === '/:path*'
    && r.headers.some(h => h.key.toLowerCase() === 'x-robots-tag'));
  const value = wide?.headers.find(h => h.key.toLowerCase() === 'x-robots-tag')?.value ?? '';
  ok('the header refuses indexing, following AND archiving',
    /noindex/.test(value) && /nofollow/.test(value) && /noarchive/.test(value));
}

console.log('\n[3] Payment is off by ABSENCE, and a live key is refused outright');
{
  const build = (env: Record<string, string | undefined>) => withEnv(env, () => {
    resetPaymentProviderCache();
    try { return { provider: paymentProvider(), error: null as Error | null }; }
    catch (e) { return { provider: null, error: e as Error }; }
    finally { resetPaymentProviderCache(); }
  });

  const noKey = build({ PAYMENT_PROVIDER: 'mollie', MOLLIE_API_KEY: undefined, STAGING: 'true' });
  ok('no key means no provider, not a crash', noKey.provider === null && noKey.error === null);

  const unknown = build({ PAYMENT_PROVIDER: 'fake', MOLLIE_API_KEY: 'test_x', STAGING: 'true' });
  ok('an unknown provider name throws rather than falling back to a default',
    unknown.error instanceof PaymentProviderError && /unknown PAYMENT_PROVIDER/.test(unknown.error.message));

  const live = build({ PAYMENT_PROVIDER: 'mollie', MOLLIE_API_KEY: 'live_realkey', STAGING: 'true' });
  ok('a live_ key on staging is refused, not warned about',
    live.error instanceof PaymentProviderError && /live/.test(live.error.message));

  const test = build({ PAYMENT_PROVIDER: 'mollie', MOLLIE_API_KEY: 'test_ok', STAGING: 'true' });
  ok('a test_ key on staging builds a provider that reports itself as not live',
    test.provider !== null && test.provider.live === false);
}

console.log('\n[3b] A staging copy that INHERITED the canonical origin is still not canonical');
{
  // The hazard, stated exactly: App Hosting merges the environment file over
  // the base one key by key, so `NEXT_PUBLIC_SITE_URL` set for production is
  // inherited by any environment that does not override it. Every noindex
  // layer except the header keys off `isCanonicalOrigin()`.
  const canonicalWhileStaging = withEnv(
    { STAGING: 'true', NEXT_PUBLIC_SITE_URL: BRAND_ORIGIN },
    () => isCanonicalOrigin(),
  );
  ok('the staging flag beats an inherited canonical origin', !canonicalWhileStaging);

  const robotsWhileStaging = withEnv(
    { STAGING: 'true', NEXT_PUBLIC_SITE_URL: BRAND_ORIGIN },
    () => robots(),
  );
  ok('robots.txt disallows everything on that inherited-origin staging copy',
    robotsWhileStaging.rules !== undefined
    && JSON.stringify(robotsWhileStaging.rules).includes('"disallow":"/"'));

  // THE CONTROL: production on the canonical origin must still be indexable,
  // or the assertions above would pass for a site that is never indexed.
  const realProduction = withEnv(
    { STAGING: undefined, NEXT_PUBLIC_SITE_URL: BRAND_ORIGIN },
    () => ({ canonical: isCanonicalOrigin(), robots: robots() }),
  );
  ok('production on the canonical origin IS canonical', realProduction.canonical);
  ok('production robots.txt allows crawling',
    JSON.stringify(realProduction.robots.rules).includes('"allow":"/"'));

  // And the base config must not be able to hand that origin out by accident.
  const prodYaml = read('web/apphosting.yaml').split('\n')
    .filter(l => !/^\s*#/.test(l)).join('\n');
  ok('web/apphosting.yaml does not declare NEXT_PUBLIC_SITE_URL while the domain is unconnected',
    !/^\s*- variable: NEXT_PUBLIC_SITE_URL\s*$/m.test(prodYaml));
}

console.log('\n[4] The committed staging config matches all of the above');
{
  const yaml = read('web/apphosting.staging.yaml');
  // Comments explain the rules; they must not be able to satisfy them.
  const live = yaml.split('\n').filter(l => !/^\s*#/.test(l)).join('\n');

  ok('staging declares no MOLLIE_API_KEY at all',
    !/^\s*- variable: MOLLIE_API_KEY\s*$/m.test(live));
  ok('staging names no Mollie secret',
    !/^\s*secret:\s*\S*mollie\S*\s*$/mi.test(live));
  ok('staging does not set PAYMENT_PROVIDER to anything the runtime rejects',
    !/value:\s*fake\s*$/m.test(live));

  const flag = /^\s*- variable: STAGING\s*\n\s*value:\s*"?([^"\n]+)"?/m.exec(live)?.[1]?.trim();
  ok('staging declares a STAGING value', !!flag);
  ok(`the declared STAGING value (${flag}) reads as staging`,
    !!flag && isStagingFromEnv({ STAGING: flag, NEXT_PUBLIC_SITE_URL: BRAND_ORIGIN }));

  // The placeholder domain: naming an origin nobody owns points every canonical
  // tag and OG card at a host that does not resolve.
  ok('staging does not name a domain that does not exist yet',
    !/value:\s*https:\/\/staging\.fpvarabic\.com/.test(live));

  // Production must NOT be able to drift into the same state.
  const prod = read('web/apphosting.yaml').split('\n').filter(l => !/^\s*#/.test(l)).join('\n');
  ok('production sets no STAGING flag', !/^\s*- variable: STAGING\s*$/m.test(prod));
  ok('production does not set PAYMENT_PROVIDER to anything the runtime rejects',
    !/value:\s*fake\s*$/m.test(prod));
}

console.log('\n[4b] The BASE config on its own already deploys a safe staging site');
{
  /*
   * This is the path the runbook tells the owner to take, so it is asserted
   * rather than assumed.
   *
   * A first App Hosting backend reads `apphosting.yaml`. Whether the
   * environment overlay is applied depends on a backend setting made in the
   * Console, and a deployment must not be unsafe because somebody skipped a
   * click. With the canonical origin no longer declared in the base file, the
   * base file alone yields: badge on, noindex everywhere, payment off.
   *
   * The day `NEXT_PUBLIC_SITE_URL` is uncommented, this flips to production —
   * which is the whole design: indexing is one deliberate line.
   */
  const baseYaml = read('web/apphosting.yaml').split('\n')
    .filter(l => !/^\s*#/.test(l)).join('\n');

  const declared: Record<string, string | undefined> = {};
  for (const m of baseYaml.matchAll(/- variable: (\w+)\s*\n\s*value:\s*"?([^"\n]*)"?/g)) {
    declared[m[1]] = m[2].trim();
  }
  // A `secret:` entry has a value at runtime; none of them is read below.
  const env = {
    STAGING: declared.STAGING,
    NEXT_PUBLIC_SITE_URL: declared.NEXT_PUBLIC_SITE_URL,
    PAYMENT_PROVIDER: declared.PAYMENT_PROVIDER,
    MOLLIE_API_KEY: undefined,
  };

  ok('the base config alone reads as staging (so the badge appears)',
    isStagingFromEnv(env));
  ok('the base config alone is not canonical (so nothing is indexed)',
    !withEnv(env, () => isCanonicalOrigin()));
  ok('the base config alone disallows every crawler',
    JSON.stringify(withEnv(env, () => robots()).rules).includes('"disallow":"/"'));
  ok('the base config alone leaves payment off without throwing',
    withEnv(env, () => {
      resetPaymentProviderCache();
      try { return paymentProvider() === null; } catch { return false; }
      finally { resetPaymentProviderCache(); }
    }));
}

console.log('\n[5] The badge names the environment AND what is not real about it');
{
  ok('the badge says it is a trial copy', STAGING_BADGE_AR.includes('نسخة تجريبية'));
  // «TEST» alone leaves somebody wondering whether their order went through.
  ok('the badge says no money moves', /لا تُخصم/.test(STAGING_BADGE_AR));
  ok('the badge says nothing ships', /لا تُشحن/.test(STAGING_BADGE_AR));

  const layout = read('web/app/layout.tsx');
  ok('the badge is rendered in the ROOT layout, so no page can be deep-linked past it',
    /isStagingEnvironment\(\)\s*&&/.test(layout) && layout.includes('STAGING_BADGE_AR'));
  ok('the badge is not dismissible — the person most likely to close it is the one about to forget',
    !/staging-badge[\s\S]{0,400}onClick/.test(layout));
}

console.log(`\n${'─'.repeat(66)}`);
console.log(`staging: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;

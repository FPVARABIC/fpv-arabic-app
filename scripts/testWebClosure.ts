/**
 * The pre-launch closure contract — what the flags in `web/lib/launchFlags.ts`
 * promise, asserted so flipping either one is a DECISION and not an accident.
 *
 * Three claims, each the user-facing face of a flag or of the closure pass:
 *
 *   1. AUTH IS INVISIBLE — no sign-in button, row or call-to-action anywhere
 *      a visitor looks, and /signin folds home.
 *   2. THE STORE SAYS «قريباً» BEFORE MONEY MOVES — full browsing, an honest
 *      banner, no reachable checkout.
 *   3. NOTHING CLICKABLE LEADS TO «غير متاح» — uncovered programs are
 *      unclickable coming-soon cards, and search only returns what a tap can
 *      open. (The crawler, `testWebLinks.ts`, proves the same claim over the
 *      rendered site; this suite pins the source-level decisions.)
 *
 * Run: npx tsx --tsconfig web/tsconfig.json scripts/testWebClosure.ts
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let passed = 0;
function ok(label: string, cond: boolean) {
  assert.ok(cond, `FAILED: ${label}`);
  console.log(`  ok — ${label}`);
  passed++;
}
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8');
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

console.log('\n[1] The flags exist, and both currently hold');
{
  const flags = read('web/lib/launchFlags.ts');
  ok('AUTH_UI_HIDDEN is on', /export const AUTH_UI_HIDDEN = true;/.test(flags));
  ok('STORE_OPENING_SOON is on', /export const STORE_OPENING_SOON = true;/.test(flags));
}

console.log('\n[2] Sign-in is invisible while the flag holds');
{
  ok('the header renders NO sign-in button for a signed-out visitor',
    /if \(AUTH_UI_HIDDEN\) return null;/.test(read('web/components/auth/HeaderSession.tsx')));
  ok('the account rail hides its sign-in row',
    /AUTH_UI_HIDDEN \? null :/.test(read('web/components/AccountRail.tsx')));
  ok('…and its guest sub-line stops inviting sign-in',
    read('web/components/AccountRail.tsx').includes("AUTH_UI_HIDDEN ? 'كل المحتوى مفتوح لك'"));
  ok('the settings page carries no sign-in call-to-action',
    !stripComments(read('web/app/settings/page.tsx')).includes('/signin'));
  ok('/signin redirects home in the routing layer',
    /source: '\/signin',\s*destination: '\/'/.test(read('web/next.config.ts')));

  // No LIVE surface may link to /signin. The dormant community module, the
  // auth module itself and server-side redirect logic are the exemptions —
  // none of them is a door a visitor is shown.
  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const e of readdirSync(path.join(ROOT, dir))) {
      const rel = `${dir}/${e}`;
      if (e === 'node_modules' || e === '.next' || e === '.open-next') continue;
      if (statSync(path.join(ROOT, rel)).isDirectory()) { walk(rel); continue; }
      if (!/\.tsx$/.test(e)) continue;
      if (/community|signin|auth\//.test(rel)) continue;
      // The rail KEEPS its sign-in row in source — inside the flag's null
      // branch, asserted unreachable in section [2]. Deleting the row would
      // make re-enabling auth a rewrite instead of a flag flip.
      if (rel.endsWith('AccountRail.tsx')) continue;
      const src = stripComments(readFileSync(path.join(ROOT, rel), 'utf8'));
      if (/href=\{?[`"']\/signin/.test(src)) offenders.push(rel);
    }
  };
  walk('web/app'); walk('web/components');
  ok(`no live surface links to /signin (${offenders.join(', ') || 'none'})`, offenders.length === 0);
}

console.log('\n[3] The store browses fully and says «قريباً» honestly');
{
  const store = read('web/app/store/page.tsx');
  ok('the storefront carries the opening-soon banner',
    store.includes('store-opening-soon') && store.includes('المتجر يفتتح قريباً'));
  ok('…with the browsing-allowed sentence',
    store.includes('يمكنك تصفح المنتجات والمعلومات الآن'));
  const cart = read('web/components/store/CartControls.tsx');
  ok('the cart replaces «أكمل الطلب» with the same sentence while the flag holds',
    /STORE_OPENING_SOON \? \(/.test(cart) && cart.includes('cart-opening-soon'));
  ok('the checkout routes fold back to the cart',
    /source: '\/store\/cart\/checkout',\s*destination: '\/store\/cart'/.test(read('web/next.config.ts')));
  ok('the shared store data never imports the launch flags — presentation only',
    !read('src/data/store/pricing.ts').includes('launchFlags')
    && !read('src/data/store/catalogue.ts').includes('launchFlags'));
}

console.log('\n[4] Nothing clickable leads to «غير متاح»');
{
  const hub = stripComments(read('web/app/programming/page.tsx'));
  ok('an uncovered program renders as an UNCLICKABLE card',
    /s\.coverage === 'none'\s*\?\s*null/.test(hub));
  ok('…badged «قريباً», before the tap instead of after it',
    hub.includes("s.coverage === 'none' ? 'قريباً'"));
  ok('…and the hub no longer links the scope pages', !hub.includes('SECTION_ROUTES.scope'));

  const search = stripComments(read('web/app/search/page.tsx'));
  ok('search queries only web-reachable types — counts and results agree',
    search.includes('SEARCHABLE_TYPES') && /filters: \{ types: searchableIn\(groupFilter\) \}/.test(search));
  ok('…derived from the index, not hand-listed',
    search.includes('getSearchIndex()'));
  ok('scope pages are excluded from search by name',
    search.includes("['software-scope']"));
  ok('a per-document belt drops any stray unreachable result before render',
    search.includes('resultHref(r).href !== null'));
}

console.log(`\n✅ testWebClosure: ${passed} assertions passed`);

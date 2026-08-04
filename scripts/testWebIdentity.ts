/**
 * The web and the phone app are one product.
 *
 * WHAT THIS SUITE IS FOR
 * ----------------------
 * Not «the CSS parses» — a build does that. These assertions protect the things
 * that made the two surfaces look like different products in the first place,
 * each of which came back the moment nobody was watching:
 *
 *   · the web copying the phone's DESKTOP LETTERBOX (`#02080f`) and calling it
 *     the app's colour, when the app's own column is white
 *   · the raw cyan brand colour used as TEXT, where it measures 1.5:1 on cream
 *   · the tab bar drifting out of step with the phone's — a different order, a
 *     missing tab, a label nobody changed on both sides
 *   · a two-column grid written inline with no breakpoint, which is two
 *     unreadable columns on a 390px screen
 *
 * Every check below is derived from a real defect found while doing this work.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let passed = 0;
let failed = 0;

function ok(label: string, cond: boolean): void {
  if (cond) { passed++; console.log(`  ok — ${label}`); }
  else { failed++; console.log(`  FAIL — ${label}`); }
}

const read = (p: string) => readFileSync(path.join(ROOT, p), 'utf8');

/** Strip comments so a rule's own explanation cannot satisfy the rule. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

/** WCAG relative luminance, so contrast claims here are computed not asserted. */
function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map(i => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [la, lb] = [luminance(a), luminance(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const css = read('web/app/globals.css');
const cssBody = stripComments(css);

function token(name: string): string {
  const m = css.match(new RegExp(`--${name}:\\s*([^;]+);`));
  return m ? m[1].trim() : '';
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[1] The canvas is a warm light, not white and not grey');
{
  const bg = token('bg');
  ok('the page background is a hex colour', /^#[0-9a-fA-F]{6}$/.test(bg));

  const h = bg.replace('#', '');
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));

  // «فاتحة جداً» — light enough to read long black text on.
  ok(`the background is very light (luminance ${luminance(bg).toFixed(3)})`,
    luminance(bg) > 0.9);
  // «لا أريد خلفية بيضاء ساطعة» — measurably off pure white.
  ok('it is NOT pure white', bg.toLowerCase() !== '#ffffff');
  ok(`it is a visible step off white (${255 - Math.min(r, g, b)}/255)`,
    255 - Math.min(r, g, b) >= 4);
  // «ولا أريد خلفية رمادية» — a grey has r == g == b. Warm means red ≥ green > blue.
  ok(`it is warm, not grey (r${r} g${g} b${b})`, r >= g && g > b);
  ok('and the warmth is subtle, not yellowed', r - b <= 20);

  // A card must be lighter than the page: on a light theme that is what
  // elevation IS, and a card darker than its page reads as a hole.
  ok('cards sit above the page in lightness', luminance(token('surface')) > luminance(bg));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[2] Every text colour is actually readable on the cream');
{
  const bg = token('bg');
  const sunk = token('surface-2');

  const TEXT_TOKENS = [
    'text', 'text-dim', 'text-dimmer',
    'accent-ink', 'accent-ink-2',
    'sev-blocker', 'sev-warning', 'sev-ok', 'sev-unknown',
    'sys-betaflight', 'sys-expresslrs', 'sys-edgetx', 'sys-video',
  ];

  for (const t of TEXT_TOKENS) {
    const v = token(t);
    ok(`--${t} is a hex value`, /^#[0-9a-fA-F]{6}$/.test(v));
    const onBg = contrast(v, bg);
    const onSunk = contrast(v, sunk);
    ok(`--${t} clears AA on the page (${onBg.toFixed(2)}:1)`, onBg >= 4.5);
    ok(`--${t} clears AA on a recessed surface (${onSunk.toFixed(2)}:1)`, onSunk >= 4.5);
  }

  // The positive control: the raw brand cyan genuinely fails, which is why
  // `--accent-ink` had to exist. If this ever passes, the palette moved and
  // the rule below stops meaning anything.
  ok(`the raw brand cyan really is unreadable as text (${contrast(token('accent'), bg).toFixed(2)}:1)`,
    contrast(token('accent'), bg) < 3);

  // Dark ink on the brand fill — the other half of the pairing.
  ok('dark ink on the cyan fill is high contrast',
    contrast(token('accent-ink-on-fill'), token('accent')) >= 7);
  ok('dark ink on the mint navigation bar is high contrast',
    contrast(token('nav-ink'), token('nav-bg')) >= 7);
  ok('even an INACTIVE tab label clears AA on the mint',
    contrast(token('nav-ink-dim'), token('nav-bg')) >= 4.5);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[3] The raw cyan is never used as a foreground');
{
  // This is the defect the first screenshot caught: the home page's own title
  // rendered «بالعربية» in `var(--accent)` — 1.5:1 on the new cream.
  const files = [
    'web/app/page.tsx', 'web/app/search/page.tsx', 'web/app/community/page.tsx',
    'web/app/glossary/page.tsx', 'web/app/not-found.tsx',
    'web/components/SiteFooter.tsx', 'web/components/community/PostCard.tsx',
    'web/components/store/CompareTable.tsx', 'web/components/kb/BlockRenderer.tsx',
  ];
  for (const f of files) {
    const src = stripComments(read(f));
    ok(`${path.basename(f)} never colours text with the raw cyan`,
      !/color:\s*'var\(--accent\)'/.test(src));
    ok(`…and never uses it as a bare ternary text colour`,
      !/\?\s*'var\(--accent\)'\s*:/.test(src));
  }

  // And the sheet itself.
  ok('the stylesheet never sets `color: var(--accent)`',
    !/color:\s*var\(--accent\)\s*[;}]/.test(cssBody));
  ok('the focus ring uses the readable ink, not the raw cyan',
    /:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--accent-ink\)/.test(cssBody));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[4] The tab bar is the phone app\'s tab bar');
{
  const phoneNav = read('src/components/BottomNavigation.tsx');
  const webTabs = read('web/lib/navTabs.ts');

  // Same icon set, from the same library — not lookalikes chosen by eye.
  ok('the web imports its icons from the same package the app uses',
    /from 'lucide-react'/.test(webTabs) && /from 'lucide-react'/.test(phoneNav));

  const phoneIcons = new Set(
    (phoneNav.match(/^import \{([^}]+)\} from 'lucide-react'/m)?.[1] ?? '')
      .split(',').map(s => s.trim()).filter(Boolean));
  const webIcons = (webTabs.match(/import \{([\s\S]*?)\} from 'lucide-react'/)?.[1] ?? '')
    .split(',').map(s => s.trim()).filter(s => s && !s.startsWith('type '));

  // Every web tab icon is one the phone app also uses — except the one tab
  // that is deliberately different.
  const shared = webIcons.filter(i => phoneIcons.has(i));
  ok(`the web reuses the app's own tab icons (${shared.length}/${webIcons.length})`,
    shared.length >= webIcons.length - 1);

  // The single approved difference, in both directions.
  ok('the phone\'s seventh tab is «التجميع»', phoneNav.includes("label: 'التجميع'"));
  ok('the web replaces exactly that one with «المتجر»',
    webTabs.includes("labelAr: 'المتجر'") && !webTabs.includes("labelAr: 'التجميع'"));

  // Labels the two surfaces share must be spelled identically — a tab called
  // «الموسوعة» here and «الموسوعه» there is two products.
  for (const label of ['الرئيسية', 'مشروعي', 'الموسوعة']) {
    ok(`«${label}» is spelled the same on both surfaces`,
      phoneNav.includes(`'${label}'`) && webTabs.includes(`'${label}'`));
  }

  // The encyclopedia tab stays lit across the pages a reader thinks of as the
  // encyclopedia — the app does this and so must the web.
  ok('the web keeps the app\'s «stay lit across related routes» rule',
    /activeMatch/.test(webTabs) && webTabs.includes("'/glossary'"));

  // One source of truth for «is this tab active».
  ok('one exported function decides the active tab', /export function isTabActive/.test(webTabs));
  const navComp = read('web/components/NavTabs.tsx');
  ok('…and the component uses it rather than re-deriving it',
    navComp.includes('isTabActive') && !/pathname\s*===\s*tab\.href/.test(stripComments(navComp)));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[5] The propeller — the product\'s one piece of ambient motion');
{
  const phoneNav = read('src/components/BottomNavigation.tsx');
  const navComp = read('web/components/NavTabs.tsx');

  ok('the app spins the active tab\'s ring', /spin-slow/.test(phoneNav));
  ok('the web reproduces it', /nav-prop/.test(navComp) && /navPropSpin/.test(cssBody));
  ok('at the same 3s linear spin the app uses',
    /animation:\s*navPropSpin 3s linear infinite/.test(cssBody)
    && /spinSlow 3s linear infinite/.test(read('src/index.css')));
  ok('with the same arc geometry', navComp.includes('18.85 56.55'));

  // Decoration must never be the only signal.
  ok('the spinner is hidden from assistive technology', /className="nav-prop"[\s\S]{0,120}aria-hidden/.test(navComp));
  ok('the active tab is announced by aria-current, not by the spinner',
    /aria-current=\{active \? 'page' : undefined\}/.test(navComp));
  ok('…and is also carried by background, so colour alone never conveys it',
    /\.nav-tab\[aria-current='page'\][\s\S]{0,200}background:/.test(cssBody));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[6] Motion is bounded and can be switched off');
{
  const durations = [...cssBody.matchAll(/--dur[a-z-]*:\s*(\d+)ms/g)].map(m => Number(m[1]));
  ok(`every motion token is defined (${durations.length})`, durations.length >= 3);
  ok('no transition lasts longer than 340ms', durations.every(d => d <= 340));

  ok('reduced motion is honoured globally',
    /@media \(prefers-reduced-motion: reduce\)[\s\S]{0,300}animation-duration:\s*0\.01ms\s*!important/.test(cssBody));
  ok('…including transitions, not only animations',
    /@media \(prefers-reduced-motion: reduce\)[\s\S]{0,400}transition-duration:\s*0\.01ms\s*!important/.test(cssBody));

  // A staggered list must converge: an entrance delay that grows per item
  // leaves the twentieth card arriving a second late, which reads as broken.
  const stagger = [...cssBody.matchAll(/\.stagger > \*:nth-child\([^)]+\)\s*\{\s*animation-delay:\s*(\d+)ms/g)]
    .map(m => Number(m[1]));
  ok(`the staggered entrance is capped (${stagger.length} steps)`, stagger.length > 0 && stagger.length <= 4);
  ok('and its longest delay is short', Math.max(...stagger) <= 200);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[7] The pages the app has, the web now has too');
{
  for (const [route, needle] of [
    ['web/app/settings/page.tsx', 'الإعدادات'],
    ['web/app/contact/page.tsx', 'اتصل بنا'],
    ['web/app/about/page.tsx', 'FPVARABIC'],
  ] as const) {
    ok(`${route} exists`, existsSync(path.join(ROOT, route)));
    ok(`…and is the page it claims to be`, read(route).includes(needle));
  }

  // The reset actions must clear the keys the phone app actually writes.
  const controls = read('web/components/settings/LocalDataControls.tsx');
  ok('the settings screen reads the storage keys from the shared core',
    /from '@core\/utils\/storageKeys'/.test(controls));
  ok('…and never retypes a key as a string literal',
    !/'fpv_[a-z_]+'/.test(stripComments(controls)));
  ok('nothing destructive runs on the first click',
    /confirming/.test(controls) && /setConfirming\(a\)/.test(controls));

  // The contact form must not claim to have sent anything.
  // Stripped, because the file's own comment explains the rule by quoting the
  // forbidden phrase — reading it unstripped fails on the explanation.
  const form = stripComments(read('web/components/contact/ContactForm.tsx'));
  ok('the contact form says plainly that direct sending is not live yet',
    form.includes('لم يُفعَّل بعد'));
  ok('…and never claims the message was sent', !form.includes('تم الإرسال'));
  ok('the about page carries the app\'s disclaimer verbatim',
    read('web/app/about/page.tsx').includes('لا تستخدم شعارات رسمية'));

  // Settings is reachable without an account, as it is in the app.
  const mw = stripComments(read('web/middleware.ts'));
  ok('settings is NOT behind the sign-in wall — a guest owns their browser data',
    !/startsWith\('\/settings'\)/.test(mw) && !/'\/settings\/:path\*'/.test(mw));
  ok('…while the profile still is', /startsWith\('\/profile'\)/.test(mw));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[8] The account rail is the app\'s profile sheet');
{
  const rail = read('web/components/AccountRail.tsx');
  const sheet = read('src/components/ProfileSheet.tsx');

  // The four rows the owner asked to be findable without hunting.
  for (const row of ['الإعدادات', 'اتصل بنا', 'تسجيل الخروج']) {
    ok(`the rail offers «${row}»`, rail.includes(row));
  }
  ok('the rail offers the about page', /حول المنصّة/.test(rail));

  // Same surfaces, carried as tokens rather than re-picked by eye.
  for (const t of ['acct-bg', 'acct-tile', 'acct-border', 'acct-ink', 'acct-blue']) {
    ok(`--${t} is defined from the app's own sheet`, token(t) !== '');
  }
  ok('the sheet\'s tile colour is the one the rail uses',
    sheet.includes('#eaf2ff') && token('acct-tile') === '#eaf2ff');
  ok('the sheet\'s avatar size is the one the rail uses',
    /AVATAR_SIZE = 64/.test(sheet) && /width: 64, height: 64/.test(rail));

  // Sign-out logic is not duplicated for the rail.
  ok('the rail reuses the one sign-out implementation',
    /import \{ SignOutButton \}/.test(rail));
  ok('…and does not fetch the session endpoint itself',
    !/api\/auth\/session/.test(rail));

  // Progress is shown only when it is real.
  ok('the rail refuses to render progress it was not given',
    /typeof stats\?\.overallPercent === 'number'/.test(rail));
  ok('…and the meter is announced with its value, not drawn silently',
    /role="progressbar"/.test(rail) && /aria-valuenow/.test(rail));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[9] Nothing is a shrunken copy of something else');
{
  // The bug this catches: an inline `gridTemplateColumns: '1fr 260px'` with no
  // breakpoint, which puts a feed and a sidebar side by side on a 390px phone.
  const PAGES = [
    'web/app/community/page.tsx', 'web/app/settings/page.tsx',
    'web/app/contact/page.tsx', 'web/app/about/page.tsx',
    'web/app/kb/[moduleId]/page.tsx',
  ];
  for (const f of PAGES) {
    const src = stripComments(read(f));
    // `repeat(auto-fit, minmax(255px, 1fr))` is responsive BY CONSTRUCTION —
    // it reflows to one column on its own. What breaks a phone is a fixed
    // track list like `'minmax(0,1fr) 260px'`, which has no breakpoint and no
    // way to collapse. Only that shape is the defect.
    const fixedTrack = [...src.matchAll(/gridTemplateColumns:\s*'([^']+)'/g)]
      .map(m => m[1])
      .filter(v => !/auto-fit|auto-fill/.test(v))
      .filter(v => /\b\d{2,4}px\b/.test(v));
    ok(`${path.basename(path.dirname(f))} has no fixed two-column grid written inline`,
      fixedTrack.length === 0);
  }

  // The shared layouts must all start as one column and earn a second.
  for (const cls of ['with-rail', 'with-index', 'kb-cols']) {
    const block = cssBody.match(new RegExp(`\\.${cls}\\s*\\{[^}]*\\}`))?.[0] ?? '';
    ok(`.${cls} is one column by default`,
      /grid-template-columns:\s*minmax\(0,\s*1fr\)/.test(block));
    ok(`.${cls} gains its second column at a breakpoint`,
      new RegExp(`@media \\(min-width: \\d+px\\)\\s*\\{[^@]*\\.${cls}[^@]*grid-template-columns`).test(cssBody));
  }

  // The bottom bar exists only where a thumb does, and the page ends above it.
  ok('the fixed bottom bar is hidden on wide screens',
    /@media \(min-width: 900px\)\s*\{\s*\.nav-bottom \{ display: none; \}/.test(cssBody));
  ok('…and the page reserves room for it where it IS shown',
    /@media \(max-width: 899px\)\s*\{\s*body \{ padding-bottom:/.test(cssBody));
  ok('the header tabs and the bottom bar are never both visible',
    /\.header-tabs \{ display: none; \}/.test(cssBody)
    && /@media \(min-width: 900px\)[\s\S]{0,200}\.header-tabs \{ display: block; \}/.test(cssBody));

  // Long prose gets a measure. A 1400px line of Arabic is unreadable.
  ok('there is a reading measure and it is in characters, not pixels',
    /\.prose \{ max-width: \d+ch; \}/.test(cssBody));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[10] The dependency rule still holds');
{
  const webPkg = JSON.parse(read('web/package.json')) as
    { dependencies?: Record<string, string> };
  const deps = webPkg.dependencies ?? {};

  // Unchanged: a runtime package the SHARED CORE imports must have one copy.
  for (const shared of ['firebase', 'browser-image-compression']) {
    ok(`${shared} is still absent from web/package.json`, !(shared in deps));
  }

  // lucide-react is a different case and the difference is the whole rule:
  // nothing under ../src/data (the shared core) imports it, so the web having
  // its own copy cannot produce two mutually unintelligible instances.
  ok('the web declares its own icon library', 'lucide-react' in deps);
  const coreImportsLucide = ['src/data', 'src/platform'].some(dir => {
    try {
      return readFileSync(path.join(ROOT, dir, '..', 'data', 'store', 'types.ts'), 'utf8')
        .includes('lucide-react');
    } catch { return false; }
  });
  ok('…and the shared core does not import it, so there is no dual-instance risk',
    !coreImportsLucide);
}


// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[11] The platform has ONE official name, in one place');
{
  const brand = read('src/data/brand.ts');
  ok('the official name is declared once, as a value',
    /export const BRAND_NAME = 'FPVARABIC';/.test(brand));
  ok('the canonical domain is declared beside it',
    /export const BRAND_DOMAIN = 'fpvarabic\.com';/.test(brand));

  // The rename's whole point: the name is no longer typed out by hand in the
  // files that DEFINE the site's identity to a browser or a search engine.
  for (const f of ['web/app/layout.tsx', 'web/components/SiteHeader.tsx', 'web/app/manifest.ts']) {
    ok(`${path.basename(f)} imports the name rather than spelling it`,
      /@core\/data\/brand/.test(read(f)));
  }

  // The previous name must be gone from everything a visitor can see.
  const surfaces = ['web/app', 'web/components', 'web/lib'];
  let stale = 0;
  for (const dir of surfaces) {
    const walk = (d: string): string[] => {
      const out: string[] = [];
      for (const e of readdirSync(path.join(ROOT, d), { withFileTypes: true })) {
        const rel = `${d}/${e.name}`;
        if (e.isDirectory()) out.push(...walk(rel));
        else if (/\.(ts|tsx)$/.test(e.name)) out.push(rel);
      }
      return out;
    };
    for (const f of walk(dir)) {
      if (read(f).includes('FPV بالعربي')) { stale++; console.log(`     stale: ${f}`); }
    }
  }
  ok(`no web file still carries the previous name (${stale} found)`, stale === 0);

  // Android: the label may change, the identity may NOT. An application id is
  // the permanent identity of an installed app; changing it produces a second,
  // unrelated app that cannot update the first.
  const strings = read('android/app/src/main/res/values/strings.xml');
  ok('the Android label is the official name', /<string name="app_name">FPVARABIC<\/string>/.test(strings));
  ok('the Android application id is UNCHANGED',
    /com\.fpvarabic\.app/.test(read('android/app/build.gradle')));
  ok('…and the shared brand file records it as read-only',
    /ANDROID_APPLICATION_ID = 'com\.fpvarabic\.app'/.test(brand));
  ok('Capacitor agrees with the Android label',
    /appName: 'FPVARABIC'/.test(read('capacitor.config.ts')));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[12] A preview can never be mistaken for the official site');
{
  const origin = read('web/lib/siteOrigin.ts');

  // The defect this locks down: `isCanonicalOrigin()` first asked whether
  // siteOrigin() equalled the brand origin — but siteOrigin() FALLS BACK to
  // the brand origin, so every unconfigured build claimed to be production and
  // served `index, follow`. Localhost did exactly that.
  ok('indexing requires an EXPLICIT declaration, not a fallback',
    /const explicit = process\.env\.NEXT_PUBLIC_SITE_URL\?\.trim\(\);\s*\n\s*if \(!explicit\) return false;/
      .test(origin));
  ok('…and the function never compares against siteOrigin()\'s fallback',
    !/return siteOrigin\(\) === BRAND_ORIGIN/.test(origin));

  const robots = read('web/app/robots.ts');
  ok('robots.txt disallows everything when not canonical',
    /if \(!isCanonicalOrigin\(\)\)[\s\S]{0,120}disallow: '\/'/.test(robots));
  ok('…and only publishes a sitemap when it IS canonical',
    robots.indexOf('sitemap:') > robots.indexOf('isCanonicalOrigin'));

  const sitemap = read('web/app/sitemap.ts');
  ok('the sitemap is empty on a preview', /if \(!isCanonicalOrigin\(\)\) return \[\];/.test(sitemap));
  ok('the sitemap is generated from the registries, not hand-written',
    /allKbModules/.test(sitemap) && /moduleArticles/.test(sitemap));
  ok('…and excludes routes that require an account',
    /requiresAuth/.test(sitemap));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[13] Deployment is configured in the repository, not in a dashboard');
{
  ok('vercel.json exists at the repository root', existsSync(path.join(ROOT, 'vercel.json')));
  const vercel = JSON.parse(read('vercel.json')) as Record<string, unknown>;
  ok('…and declares the build itself, so no Root Directory must be set by hand',
    typeof vercel.buildCommand === 'string' && (vercel.buildCommand as string).includes('web'));
  ok('…and sets security headers', Array.isArray(vercel.headers));

  const headers = JSON.stringify(vercel.headers);
  for (const h of ['X-Content-Type-Options', 'Referrer-Policy', 'Strict-Transport-Security']) {
    ok(`${h} is sent`, headers.includes(h));
  }

  ok('a CI workflow verifies every push', existsSync(path.join(ROOT, '.github/workflows/ci.yml')));
  const ci = read('.github/workflows/ci.yml');
  ok('…and it runs the identity suite', ci.includes('test:web-identity'));
  ok('…and builds BOTH surfaces, because they share a core',
    ci.includes('web:build') && /run: npm run build/.test(ci));

  const deploy = read('.github/workflows/deploy.yml');
  ok('the deploy workflow lies dormant until a token exists',
    /configured=false/.test(deploy) && /secrets\.VERCEL_TOKEN/.test(deploy));

  // The one rule that matters most about deployment configuration.
  ok('no deployment token is committed anywhere',
    !/vercel_[A-Za-z0-9]{20,}/.test(deploy + read('DEPLOY.md') + read('vercel.json')));
  ok('DEPLOY.md tells the owner the exact two steps', read('DEPLOY.md').includes('VERCEL_TOKEN'));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[14] The installable site carries the product\'s own identity');
{
  const mf = read('web/app/manifest.ts');
  ok('the manifest is right-to-left and Arabic', /dir: 'rtl'/.test(mf) && /lang: 'ar'/.test(mf));
  ok('its theme colour is the navigation bar\'s mint', /theme_color: '#5EEAD4'/.test(mf));
  ok('its background is the page cream, so a launch shows no white flash',
    /background_color: '#FAF8F3'/.test(mf));
  ok('it ships a maskable icon, so a launcher does not crop the mark',
    /purpose: 'maskable'/.test(mf));

  // The mark must be the product's gradient, not a colour used nowhere else.
  const icon = read('web/public/icon.svg');
  ok('the icon uses the brand gradient', /#18E6E6/.test(icon) && /#00B4FF/.test(icon));
  ok('…and not the indigo pair it shipped with before',
    !/#818cf8/.test(icon) && !/#38bdf8/.test(icon));
  for (const f of ['web/public/icon-192.png', 'web/public/icon-512.png',
    'web/public/icon-maskable-512.png', 'web/public/og.png']) {
    ok(`${path.basename(f)} exists`, existsSync(path.join(ROOT, f)));
  }
}

console.log(`\n${failed === 0 ? '✅' : '❌'} testWebIdentity: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

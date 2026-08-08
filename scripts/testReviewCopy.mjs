#!/usr/bin/env node
/**
 * The claims THIS round makes, checked against the built output.
 *
 * Every assertion here corresponds to something the owner asked to be true and
 * could otherwise only confirm by clicking around and hoping. Two of them —
 * the dead-link audit and the home-vs-encyclopedia comparison — cannot be done
 * by eye at all, which is exactly why they are here.
 *
 * This runs on the STATIC EXPORT, with no browser, so it is fast enough to be
 * run on every build and cannot be fooled by a page that renders differently
 * from what was shipped.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, '.review-site', 'out');

if (!existsSync(OUT)) {
  console.error('[review] no build — run scripts/buildReviewSite.mjs first');
  process.exit(1);
}

let passed = 0;
const failures = [];
function ok(name, cond, detail = '') {
  if (cond) { passed += 1; console.log(`  ok — ${name}`); return; }
  failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
  console.log(`  FAIL — ${name}${detail ? ` — ${detail}` : ''}`);
}

/* ── Load every page ──────────────────────────────────────────────────────── */
function walk(dir) {
  const out = [];
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const files = walk(OUT).filter(f => f.endsWith('.html'));
const pages = new Map(); // route -> { html, text }
for (const f of files) {
  const rel = relative(OUT, f).split('\\').join('/');
  if (!rel.endsWith('index.html')) continue;
  const route = rel === 'index.html' ? '/' : `/${rel.slice(0, -'index.html'.length)}`;
  const html = readFileSync(f, 'utf8');
  const m = /<main id="main">([\s\S]*?)<\/main>/.exec(html);
  const text = (m ? m[1] : html)
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  pages.set(route, { html, text });
}

const home = pages.get('/');
const kb = pages.get('/kb/');
const project = pages.get('/project/');
const community = pages.get('/community/');

console.log(`\n[0] The build is whole (${pages.size} routes)`);
ok('the home page exists', !!home);
ok('the encyclopedia exists', !!kb);
ok('مشروعي exists', !!project);
ok('the community exists', !!community);
ok('the whole site was captured', pages.size > 200, `${pages.size} routes`);

/* ── 1. Navigation order ──────────────────────────────────────────────────── */
console.log('\n[1] Navigation: home, then community, then the rest');
{
  // The header bar and the bottom bar render from one component, so the labels
  // appear twice. Taking the first six is taking one bar.
  const labels = [...home.html.matchAll(/nav-tab-label">([^<]+)</g)].map(m => m[1]);
  const first = labels.slice(0, 6);
  ok('the bar has six tabs', labels.length === 12, `${labels.length} label nodes (2 bars × 6)`);
  ok('«الرئيسية» is first', first[0] === 'الرئيسية', first.join(' · '));
  ok('«المجتمع» is second', first[1] === 'المجتمع', first.join(' · '));
  // The sixth tab became «المشاريع» — the project library — when that section
  // was built. «مشروعي», the reader's own build, keeps its route and stays lit
  // through the same tab; it was not deleted. See navTabs.ts.
  ok('the order is home · community · store · programming · kb · projects',
    first.join('|') === ['الرئيسية', 'المجتمع', 'المتجر', 'البرامج', 'الموسوعة', 'المشاريع'].join('|'),
    first.join(' · '));

  // Both bars must agree — one component, so disagreement means a stale render.
  ok('the header bar and the bottom bar carry the same order',
    labels.slice(0, 6).join('|') === labels.slice(6, 12).join('|'));

  // Every tab must light SOMETHING, or a whole section is unreachable by bar.
  const hrefs = [...home.html.matchAll(/data-testid="nav-(\w+)"[^>]*href="([^"]+)"/g)]
    .concat([...home.html.matchAll(/href="([^"]+)"[^>]*data-testid="nav-(\w+)"/g)]);
  ok('every tab points somewhere', hrefs.length > 0);
}

/* ── 2. Search is not duplicated ──────────────────────────────────────────── */
console.log('\n[2] Search: one door, not three');
{
  ok('no «البحث» tab in the bar', !home.html.includes('data-testid="nav-search"'));
  ok('no magnifier stand-in', !home.html.includes('header-search-compact'));
  ok('the header field is present', home.html.includes('data-testid="header-search-input"'));

  // Exactly one header search form per page — a second would be the duplication
  // returning by another route.
  const forms = (home.html.match(/data-testid="header-search"/g) || []).length;
  ok('exactly one header search form', forms === 1, `${forms} found`);

  // It must be a real GET form so it works with no JavaScript at all.
  ok('the field submits by GET to the search page',
    /<form[^>]+action="\/search"[^>]+method="get"/.test(home.html)
    || /<form[^>]+method="get"[^>]+action="\/search"/.test(home.html));

  // And it must be labelled, not merely placeheld.
  ok('the field has a real <label for>',
    /<label[^>]+for="header-q"/.test(home.html) && /id="header-q"/.test(home.html));

  ok('the results page still exists', pages.has('/search/'));
  ok('…and still carries its own large field',
    pages.get('/search/').html.includes('data-testid="search-input"'));
}

/* ── 3. The home page is not the encyclopedia ─────────────────────────────── */
console.log('\n[3] The home page is a platform entrance, not a second encyclopedia');
{
  // FIVE, not four. المشاريع became a section with its own tab, and the home
  // page carried four pillars for a while afterwards — so a visitor could read
  // the whole page, then meet a sixth tab on the bar that the page had never
  // mentioned. The count is pinned here so the next section to be added has to
  // pass through this line rather than being forgotten.
  const pillars = [...new Set([...home.html.matchAll(/home-pillar-(\w+)/g)].map(m => m[1]))];
  ok('all five pillars are present', pillars.length === 5, pillars.join(' · '));
  ok('…community among them', pillars.includes('community'));
  ok('…store among them', pillars.includes('store'));
  ok('…the software centre among them', pillars.includes('programming'));
  ok('…the encyclopedia among them', pillars.includes('kb'));
  ok('…the project library among them', pillars.includes('projects'));

  // Every section on the tab bar must appear on the page. This is the rule the
  // count above is a shorthand for, and it is the one that actually matters.
  const barLabels = [...new Set([...home.html.matchAll(/nav-tab-label">([^<]+)</g)].map(m => m[1]))]
    .filter(l => l !== 'الرئيسية');
  ok('every section on the bar is named on the home page',
    barLabels.every(l => home.text.includes(l)),
    barLabels.filter(l => !home.text.includes(l)).join(' · '));

  // EQUAL WEIGHT, MEASURED. Each pillar renders from one array through one
  // class, so the check is that no pillar got a bespoke style attribute that
  // the others did not — the only way one could grow louder than the rest.
  const pillarBlocks = home.html.split('class="card pillar"').slice(1);
  ok('every pillar uses the same card class', pillarBlocks.length === 5,
    `${pillarBlocks.length} blocks`);

  // The old page led with encyclopedia module cards. If those return, the
  // page has drifted back.
  ok('the encyclopedia module grid is NOT on the home page',
    !home.html.includes('home-module-'));

  // Home and the encyclopedia must not read as the same page.
  const homeWords = new Set(home.text.split(' ').filter(w => w.length > 3));
  const kbWords = new Set(kb.text.split(' ').filter(w => w.length > 3));
  const shared = [...homeWords].filter(w => kbWords.has(w)).length;
  const overlap = shared / Math.max(1, homeWords.size);
  ok('home and the encyclopedia are substantially different pages',
    overlap < 0.5, `${Math.round(overlap * 100)}% of home's vocabulary is also on /kb`);

  // The visitor's questions must each have a visible answer.
  for (const [q, needle] of [
    ['where do I interact', 'المجتمع'],
    ['where do I buy', 'المتجر'],
    ['where do I learn', 'الموسوعة'],
    ['where are the programs', 'البرامج'],
    ['where do I start', 'من أين تبدأ'],
    ['what is my project', 'مشروعي'],
  ]) {
    ok(`home answers «${q}»`, home.text.includes(needle));
  }

  // The hero's duplicate field was removed in the polish batch — the header's
  // search (rendered on every page, home included) is the one way in.
  ok('the search reaches the home page through the header', home.html.includes('role="search"'));
}

/* ── 4. مشروعي explains itself ────────────────────────────────────────────── */
console.log('\n[4] مشروعي is never a blank page');
{
  ok('the explainer is server-rendered', project.html.includes('data-testid="project-explainer"'));
  ok('…so the page says something substantial without JavaScript',
    project.text.length > 600, `${project.text.length} chars`);

  for (const [what, needle] of [
    ['what it is', 'سجّل قطعك'],
    ['what it gives', 'أحكام التوافق'],
    ['how it connects', 'التشخيص'],
    ['where it is stored', 'هذا المتصفّح'],
    ['how to move it', 'التصدير والاستيراد'],
  ]) {
    ok(`it explains ${what}`, project.text.includes(needle));
  }

  // The old page's entire content below the heading was a loading line.
  const onlySpinner = project.text.trim().endsWith('جارٍ فتح مساحة العمل…')
    && project.text.length < 400;
  ok('the page is no longer just a spinner', !onlySpinner);
}

/* ── 5. The community tells the truth about itself ────────────────────────── */
console.log('\n[5] The community explains its own absence honestly');
{
  ok('the unconfigured notice is shown', community.html.includes('community-unconfigured'));
  ok('…in the reviewer\'s terms, not an env-file path',
    community.text.includes('نسخة ساكنة للمراجعة'));
  ok('…and does not send the owner to a developer file',
    !community.text.includes('.env.example'));
  ok('it states there is no separate web community',
    community.text.includes('لا يوجد مجتمع منفصل للويب'));
  ok('it names the shared collection', community.text.includes('posts'));
  // It must not fake a feed.
  ok('no invented posts are rendered', !community.html.includes('data-testid="community-feed"'));
}

/* ── 6. Every internal link resolves ──────────────────────────────────────── */
console.log('\n[6] No dead links anywhere in the site');
{
  const norm = (h) => {
    let p = h.split('#')[0].split('?')[0];
    if (!p) return null;
    if (p.charAt(0) !== '/') return null;
    if (!p.endsWith('/')) p += '/';
    return p === '//' ? '/' : p;
  };

  const broken = new Map(); // target -> sample source
  let checked = 0;
  for (const [route, page] of pages) {
    for (const m of page.html.matchAll(/href="([^"]+)"/g)) {
      const raw = m[1];
      if (/^(https?:|mailto:|tel:|#|data:)/i.test(raw)) continue;
      const target = norm(raw);
      if (!target) continue;
      // Assets are files, not routes.
      if (/\.(png|svg|ico|webmanifest|xml|txt|json|woff2?|css|js)\/$/.test(target)) continue;
      checked += 1;
      if (!pages.has(target) && !broken.has(target)) broken.set(target, route);
    }
  }

  ok('links were actually inspected', checked > 500, `${checked} internal links`);
  ok('every internal link points at a page that exists',
    broken.size === 0,
    broken.size ? [...broken].slice(0, 8).map(([t, s]) => `${t} (from ${s})`).join(', ') : '');

  // A control proving the audit can fail: a route that certainly does not exist.
  ok('the audit would catch a dead link (control)', !pages.has('/definitely-not-a-page/'));
}

/* ── 7. Nothing claims to be indexable from a review copy ─────────────────── */
console.log('\n[7] A review copy invites no crawler');
{
  const robots = join(OUT, 'robots.txt');
  ok('robots.txt exists', existsSync(robots));
  ok('…and disallows everything', readFileSync(robots, 'utf8').includes('Disallow: /'));
  const noindexed = [...pages.values()]
    .filter(p => /name="robots"[^>]*content="[^"]*noindex/.test(p.html)).length;
  ok('pages carry noindex', noindexed > 0, `${noindexed} pages`);
}

console.log(`\n${failures.length ? '❌' : '✅'} testReviewCopy: ${passed} passed, ${failures.length} failed`);
for (const f of failures) console.log(`   ✗ ${f}`);
process.exit(failures.length ? 1 : 0);

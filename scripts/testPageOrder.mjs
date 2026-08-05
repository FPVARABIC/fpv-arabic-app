#!/usr/bin/env node
/**
 * The reading order of every page, checked against the HTML that shipped.
 *
 * WHY THE OUTPUT AND NOT THE SOURCE
 * ---------------------------------
 * Source order is not reading order. A component defined at the bottom of a
 * file can render at the top of a page, a conditional can hide the block that
 * looked first, and a shared layout injects markup no page file mentions.
 * Reading the built HTML is reading what a person actually meets.
 *
 * THE RULE BEING ENFORCED
 * -----------------------
 *   1. a clear title
 *   2. a very short line saying what the page is for
 *   3. the primary action, or the primary content
 *   4. what a reader needs in order to decide
 *   5. the advanced material
 *   6. sources, licences, review dates, coverage limits — at the END
 *
 * With exactly one exception, and it is not negotiable: a BLOCKING SAFETY
 * WARNING comes before the dangerous action, wherever that action is.
 *
 * WHY THE THRESHOLDS ARE FRACTIONS OF THE PAGE
 * --------------------------------------------
 * «At the end» cannot be a character count — a glossary page and a project page
 * differ by a factor of thirty. Position as a fraction of the page's own text
 * is the only measure that means the same thing on both.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, '.review-site', 'out');

if (!existsSync(OUT)) {
  console.error('[order] no build — run scripts/buildReviewSite.mjs first');
  process.exit(1);
}

let passed = 0;
const failures = [];
function ok(name, cond, detail = '') {
  if (cond) { passed += 1; return; }
  failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
  console.log(`  FAIL — ${name}${detail ? ` — ${detail}` : ''}`);
}

/* ── Load the main content of every page ──────────────────────────────────── */
function walk(dir) {
  const out = [];
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

/**
 * The main content, with NAVIGATION removed before anything is measured.
 *
 * A side index that lists «المصادر» as one of a project's sections is not the
 * sources appearing at 3% of the page — it is a table of contents doing its
 * job. Measuring the text with the nav still in it flagged all ten project
 * pages and both ExpressLRS flows for a fault none of them has.
 *
 * Breadcrumbs go too, for the same reason: «الرئيسية / المتجر / …» is not
 * content and its words should not count as content appearing early.
 */
function parse(html) {
  const m = /<main id="main">([\s\S]*?)<\/main>/.exec(html);
  const main = m ? m[1] : html;
  const clean = main.replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<nav[\s\S]*?<\/nav>/g, ' ')
    // A <footer> IS the end of whatever contains it. The software centre's
    // per-step source block is one — each step cites the source it came from,
    // right under that step — and counting its words as «content appearing at
    // 3% of the page» measures the wrong thing. What this rule is about is a
    // page's own provenance sitting in front of its own content.
    .replace(/<footer[\s\S]*?<\/footer>/g, ' ');
  const text = clean.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return { main: clean, text };
}

const pages = new Map();
for (const f of walk(OUT).filter(f => f.endsWith('index.html'))) {
  const rel = relative(OUT, f).split('\\').join('/');
  const route = rel === 'index.html' ? '/' : `/${rel.slice(0, -'index.html'.length)}`;
  pages.set(route, parse(readFileSync(f, 'utf8')));
}

/** Where a phrase sits, as a fraction of the page's text. -1 when absent. */
const at = (text, needle) => {
  const i = text.indexOf(needle);
  return i < 0 ? -1 : i / Math.max(1, text.length);
};

console.log(`\n[1] Every page opens with a title, not with detail (${pages.size} pages)`);
{
  let checked = 0;
  for (const [route, p] of pages) {
    // The heading structure. Exactly one <h1>, and it comes before every <h2>.
    const h1s = [...p.main.matchAll(/<h1[\s>]/g)];
    ok(`${route}: has exactly one <h1>`, h1s.length === 1, `${h1s.length}`);
    const firstH1 = p.main.search(/<h1[\s>]/);
    const firstH2 = p.main.search(/<h2[\s>]/);
    if (firstH1 >= 0 && firstH2 >= 0) {
      ok(`${route}: the <h1> comes before the first <h2>`, firstH1 < firstH2);
    }
    checked += 1;
  }
  ok('pages were actually inspected', checked > 100, `${checked}`);
}

console.log('\n[2] Sources, licences and review dates are at the END');
{
  /*
   * Measured on HEADINGS and provenance blocks, not on words.
   *
   * The first version matched the bare string «المصادر» anywhere in the text,
   * and flagged the Betaflight hub for a sentence that says «المصادر غير
   * الرسمية وضرورة أخذ نسخة احتياطية» — prose ABOUT sources, in the middle of
   * a paragraph explaining why unofficial presets are risky. A rule that fires
   * on a page discussing its subject is a rule that gets switched off.
   *
   * What is actually being checked is a provenance BLOCK: a heading called
   * «المصادر»/«المراجع», or a review-date line. Those are structural, and they
   * are what a reader meets as a block rather than as a sentence.
   */
  const HEAD_MARKERS = [/<h2[^>]*>\s*المصادر\s*</, /<h2[^>]*>\s*المراجع\s*</];
  const TEXT_MARKERS = ['روجعت الصفحة', 'روجع ', 'الرخصة:'];

  for (const [route, p] of pages) {
    if (p.text.length < 900) continue;

    for (const re of HEAD_MARKERS) {
      const i = p.main.search(re);
      if (i < 0) continue;
      const pos = i / Math.max(1, p.main.length);
      ok(`${route}: its sources heading is not in the first half`, pos >= 0.5,
        `at ${Math.round(pos * 100)}%`);
    }
    for (const marker of TEXT_MARKERS) {
      const pos = at(p.text, marker);
      if (pos < 0) continue;
      ok(`${route}: «${marker.trim()}» is not in the first half`, pos >= 0.5,
        `at ${Math.round(pos * 100)}%`);
    }
  }
}

console.log('\n[3] No coverage notice stands in front of the content');
{
  // «نطاق الموسوعة» / «ما لا نغطّيه» are honest and belong at the end. A reader
  // who opened an article came for the article.
  const SCOPE_MARKERS = ['نطاق الموسوعة', 'ما لا تغطّيه', 'ما لا نغطّيه', 'حدود التغطية'];
  for (const [route, p] of pages) {
    if (!route.startsWith('/kb/')) continue;
    if (p.text.length < 900) continue;
    for (const marker of SCOPE_MARKERS) {
      const pos = at(p.text, marker);
      if (pos < 0) continue;
      ok(`${route}: «${marker}» is not before the article`, pos >= 0.4,
        `at ${Math.round(pos * 100)}%`);
    }
  }
}

console.log('\n[4] A blocking safety warning comes BEFORE the action it guards');
{
  /*
   * Narrow on purpose.
   *
   * The first version of this check looked for safety PHRASES and action
   * PHRASES anywhere on a page and compared their offsets. It flagged the
   * glossary — where «انزع المراوح» is part of a definition and «سلّح» is a
   * different entry entirely — and the failsafe article, where both appear as
   * subject matter rather than as instructions. A check that fires on prose
   * about safety is a check people learn to ignore.
   *
   * What is actually load-bearing is the diagnostic trees: they are the pages
   * that tell somebody to spin a motor, and their safety line is a declared
   * field rather than a sentence. That is what is checked here, on the markup
   * that carries it.
   */
  let seen = 0;
  for (const [route, p] of pages) {
    if (!route.startsWith('/diagnose/')) continue;
    // The tree's own safety section, by its heading id, and the first step.
    const safety = p.main.search(/id="safety-h"/);
    const steps = p.main.search(/id="nodes-h"/);
    if (safety < 0 || steps < 0) continue;
    seen += 1;
    ok(`${route}: the safety block precedes the first step`, safety < steps);
    // …and it must actually say the thing that prevents the injury.
    ok(`${route}: the safety block says to remove the propellers`,
      p.text.includes('انزع المراوح') || p.text.includes('المراوح منزوعة'));
  }
  ok('diagnostic trees carrying both were found', seen > 0, `${seen}`);
}

console.log('\n[5] Nothing developer-facing or administrative is on a public page');
{
  // Strings that belong in a code comment, an admin screen, or nowhere.
  const LEAKS = [
    'TODO', 'FIXME', 'localhost', 'undefined', 'NaN',
    'firebase-admin', 'process.env', 'webhook', 'Webhook',
    'مزوّد الدفع Mollie', 'Firestore', 'API key',
    // NOT «المورد» or «الهامش». Both are ordinary Arabic that appears in real
    // content — «هامش الأمان» is a safety margin, and an article about ports
    // legitimately discusses a supplier. The protection against a real supply
    // leak is `testSearchSources`, which checks the store's INDEXED TOKENS
    // rather than hunting for two common words in prose.
    'سعر التكلفة', 'هامش الربح', 'رابط المورد',
  ];
  for (const [route, p] of pages) {
    if (route.startsWith('/admin')) continue;
    for (const bad of LEAKS) {
      ok(`${route}: does not show «${bad}» to a visitor`, !p.text.includes(bad));
    }
  }
}

console.log('\n[6] No page repeats its own opening line');
{
  for (const [route, p] of pages) {
    if (p.text.length < 600) continue;
    // The first sentence of the page, as a phrase. If it appears twice, the
    // lede is duplicated in a card below it — which is the commonest way a page
    // grows a second introduction.
    const first = p.text.slice(0, 90).trim();
    if (first.length < 60) continue;
    const occurrences = p.text.split(first).length - 1;
    ok(`${route}: its opening line appears once`, occurrences <= 1, `${occurrences}×`);
  }
}

console.log('\n[7] Every page that can be empty says what to do next');
{
  // An empty state with no action is a dead end. Each of these is a page whose
  // empty form ships today, so the check is real rather than hypothetical.
  const EMPTY_MARKERS = ['لا نتائج', 'لا توجد', 'لا شيء بعد', 'فارغة', 'لا منشورات'];
  for (const [route, p] of pages) {
    const hasEmpty = EMPTY_MARKERS.some(m => p.text.includes(m));
    if (!hasEmpty) continue;
    // …and it must offer somewhere to go. A link inside the main content.
    const links = (p.main.match(/<a\s[^>]*href="\//g) || []).length;
    ok(`${route}: its empty state offers a next step`, links > 0);
  }
}

console.log('\n[8] One search, and none inside the shop');
{
  for (const [route, p] of pages) {
    const fields = (p.main.match(/type="search"/g) || []).length;
    if (route.startsWith('/store')) {
      ok(`${route}: the shop has no search field of its own`, fields === 0, `${fields}`);
    }
    // The header field lives outside <main>, so any field found here is a
    // page's own. At most one is allowed, and only on the pages that own one.
    ok(`${route}: at most one search field in the content`, fields <= 1, `${fields}`);
  }
}

console.log('\n[9] A scrollable table cannot push the page');
{
  /*
   * The bug this locks out, found by driving /kb/esc/esc-ratings/ at 390px:
   * the page scrolled sideways to 486px. `.scroll-x` was working — the table
   * scrolled inside it — but the `<figure>` wrapping it had no width
   * constraint, grew to the table's intrinsic width, and pushed the document.
   * The overflow was one element outside the only element anybody had
   * constrained.
   *
   * Checked in the stylesheet rather than the browser because the browser run
   * covers twenty pages and every article with a table has this shape. A rule
   * that holds for the wrapper holds for all of them.
   */
  const css = readFileSync(join(ROOT, 'web/app/globals.css'), 'utf8');
  const rule = (sel) => {
    const i = css.indexOf(sel);
    return i < 0 ? '' : css.slice(i, css.indexOf('}', i));
  };
  const scrollX = rule('.scroll-x {');
  ok('.scroll-x may shrink below its content', scrollX.includes('min-width: 0'));
  ok('.scroll-x scrolls its own content', scrollX.includes('overflow-x: auto'));
  const fig = rule('\nfigure {');
  ok('a <figure> cannot exceed its column', fig.includes('max-width: 100%'));
  ok('…and may shrink inside a flex or grid track', fig.includes('min-width: 0'));
  ok('an image in a figure is bounded too', rule('figure img {').includes('max-width: 100%'));
}

console.log(`\n${failures.length ? '❌' : '✅'} testPageOrder: ${passed} passed, ${failures.length} failed`);
for (const f of failures.slice(0, 40)) console.log(`   ✗ ${f}`);
if (failures.length > 40) console.log(`   … and ${failures.length - 40} more`);
process.exit(failures.length ? 1 : 0);

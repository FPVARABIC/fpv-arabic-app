/**
 * The lessons section on the web — the structural facts a build cannot check.
 *
 *   - the two routes exist, and the resolver hands out live hrefs for every
 *     lesson (and null for a lesson that does not exist);
 *   - `lesson` is no longer declared phone-only;
 *   - the tab bar, the site map and the home page name the section;
 *   - every utility class the shared diagrams use is defined in the scoped
 *     stylesheet, so a diagram cannot render half-styled on the web;
 *   - the web writes progress under the shared storage keys and the settings
 *     page knows how to clear it;
 *   - no web lessons component builds a `/lessons/` path by hand.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lessonsData } from '../src/data/lessonsData';
import { href, PHONE_ONLY_KINDS, SECTION_ROUTES } from '../web/lib/webRoutes';
import { NAV_ITEMS } from '../web/lib/siteNav';
import { NAV_TABS } from '../web/lib/navTabs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p: string) => readFileSync(path.join(ROOT, p), 'utf8');

let passed = 0;
function ok(label: string, cond: boolean) {
  assert.ok(cond, `FAILED: ${label}`);
  console.log(`  ok — ${label}`);
  passed++;
}

console.log('\n[1] Routes and resolver');
{
  ok('/lessons page exists', existsSync(path.join(ROOT, 'web/app/lessons/page.tsx')));
  ok('/lessons/[lessonId] page exists', existsSync(path.join(ROOT, 'web/app/lessons/[lessonId]/page.tsx')));
  ok('the section route is declared', SECTION_ROUTES.lessons === '/lessons');
  ok('`lesson` is no longer phone-only', !('lesson' in PHONE_ONLY_KINDS));
  ok('assembly, roadmap and checklist deep links are still declared phone-only',
    'assembly' in PHONE_ONLY_KINDS && 'roadmap' in PHONE_ONLY_KINDS && 'checklist' in PHONE_ONLY_KINDS);
  for (const l of lessonsData) {
    ok(`href resolves ${l.id}`, href({ kind: 'lesson', id: l.id }) === `/lessons/${l.id}`);
  }
  ok('a lesson that does not exist resolves to null', href({ kind: 'lesson', id: 'lesson-does-not-exist' }) === null);
}

console.log('\n[2] Navigation names the section');
{
  const nav = NAV_ITEMS.find(i => i.id === 'lessons');
  ok('siteNav has الدروس in the learn group', !!nav && nav.href === '/lessons' && nav.group === 'learn' && !nav.requiresAuth);
  ok('الدروس is the first learn item', NAV_ITEMS.filter(i => i.group === 'learn')[0]?.id === 'lessons');
  // The bar's full membership and its exact order are pinned in
  // `scripts/testNavOrder.ts`, which owns that question. What THIS suite cares
  // about is the one thing the lessons rebuild bought and must not lose: the
  // lessons tab is on the bar, and it is the first section after home.
  ok('الدروس is the second tab, right after home', NAV_TABS[0]?.id === 'home' && NAV_TABS[1]?.id === 'lessons' && NAV_TABS[1]?.href === '/lessons');
  ok('the home page has a lessons pillar', /id: 'lessons'/.test(read('web/app/page.tsx')));
  ok('the sitemap lists lesson pages through the resolver', /kind: 'lesson'/.test(read('web/app/sitemap.ts')));

  // Projects was on the bar before the lessons tab was added and must survive
  // every later reshuffle: a tab that quietly disappears is a section a reader
  // can no longer reach at all.
  ok('المشاريع is still a tab', NAV_TABS.some(t => t.id === 'projects' && t.href === '/projects'));
  // Adding the lessons tab must never cost the reader the sections that were
  // already there. These are checked here for the same reason «المشاريع» is:
  // this suite ships with the lessons work, so it is the suite that would
  // otherwise be the one to drop them.
  for (const id of ['build', 'kb', 'programming', 'store']) {
    ok(`${id} is still a tab`, NAV_TABS.some(t => t.id === id));
  }
  ok('every tab has a distinct id and a real path',
    new Set(NAV_TABS.map(t => t.id)).size === NAV_TABS.length && NAV_TABS.every(t => t.href.startsWith('/')));

  // The bar renders from ONE array at both widths — the phone bar and the
  // header are the same component — so «الدروس» cannot be present on a desktop
  // header and dropped from a phone bar without this list changing. That is the
  // property worth asserting; a second list is what would let them diverge.
  const navTabsSrc = read('web/components/NavTabs.tsx');
  ok('one component renders both the header bar and the phone bar',
    /variant: 'header' \| 'bottom'/.test(navTabsSrc) && /NAV_TABS\.map/.test(navTabsSrc));
  ok('no width-conditional filtering hides a tab from the phone bar',
    !/slice\(|filter\(/.test(navTabsSrc.split('NAV_TABS.map')[0].split('export const NavTabs')[1] ?? ''));
}

console.log('\n[2b] The home page leads with the learning path');
{
  const home = read('web/app/page.tsx');

  // A first-time visitor on a phone met a headline, a paragraph and a second
  // search field before any section appeared. Search answers «I have a specific
  // question»; it cannot answer «I do not know enough to have one».
  ok('the hero carries a lessons call to action', /data-testid="home-hero-lessons"/.test(home));
  ok('…and it is a link to the lessons index, resolved through the site map',
    /<Link\s+href=\{sectionHref\('lessons'\)\}[\s\S]{0,120}home-hero-lessons/.test(home));
  ok('…and it sits before the search form', home.indexOf('home-hero-lessons') < home.indexOf('home-search-input'));

  // The count is read from the data, so it cannot drift from the curriculum.
  ok('the lesson count comes from lessonsData, not a typed number',
    /\{lessonsData\.length\}/.test(home) && !/\b20 درس/.test(home));

  // The two learning surfaces must not read as the same offer.
  ok('the lessons blurb says it is an ordered path', /مسار مرتّب خطوة بخطوة/.test(home));
  ok('the encyclopedia blurb says it is a reference, not a path', /مرجع ترجع إليه[\s\S]{0,40}لا مسارًا/.test(home));

  // Visually primary, and by one attribute rather than a second card component.
  ok('the lessons pillar is marked primary', /data-primary=\{p\.id === 'lessons'/.test(home));
  ok('the primary marker is styled', /\.pillar\[data-primary\]/.test(read('web/app/globals.css')));

  // No claim the curriculum does not make.
  ok('the home page promises no expertise', !/محترف|خبير|Expert|احترافي/.test(home));
}

console.log('\n[3] Every diagram utility class is styled on the web');
{
  const css = read('web/app/lessons/lessons.css');
  // A selector like `.hover\:border-cyan-400\/30:hover` — escaped characters are
  // part of the class name; an unescaped `:` starts a pseudo-class.
  const defined = new Set(
    [...css.matchAll(/\.lesson-diagram \.((?:\\.|[^\s{,:])+)/g)].map(m => m[1].replace(/\\/g, '')),
  );
  const dir = path.join(ROOT, 'src/components/diagrams');
  const used = new Set<string>();
  const CLASS_TOKEN = /^[a-z][a-z0-9:/.\-[\]]*$/;
  const addTokens = (text: string) => {
    for (const tok of text.split(/\s+/)) if (tok && CLASS_TOKEN.test(tok)) used.add(tok);
  };
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.tsx')) continue;
    const src = readFileSync(path.join(dir, f), 'utf8');
    // className="…" | className={`…${cond ? 'a b' : 'c'}…`} | className={cond ? 'a' : 'b'}
    for (const m of src.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\}|\{([^}`]*)\})/g)) {
      const raw = m[1] ?? m[2] ?? m[3] ?? '';
      for (const t of raw.matchAll(/\?\s*'([^']*)'\s*:\s*'([^']*)'/g)) { addTokens(t[1]); addTokens(t[2]); }
      addTokens(raw.replace(/\$\{[^}]*\}/g, ' '));
    }
  }
  // Classes that are no-ops in the phone app too (never defined in src/index.css).
  const NOOP = /-anim$|^k$|^n\.id$|^danger$/;
  const missing = [...used].filter(c => !NOOP.test(c) && !defined.has(c));
  if (missing.length) console.error('  MISSING:', missing.join(' '));
  ok(`all ${used.size - [...used].filter(c => NOOP.test(c)).length} diagram utility classes are defined under .lesson-diagram`, missing.length === 0);
}

console.log('\n[4] Storage keys are the shared ones, and settings can clear them');
{
  const progress = read('web/lib/lessonProgress.ts');
  ok('lessonProgress uses STORAGE_KEYS from the shared core', /STORAGE_KEYS\.PROGRESS_LESSONS/.test(progress) && /STORAGE_KEYS\.LESSON_JOURNEY_PROGRESS/.test(progress) && /STORAGE_KEYS\.LAST_OPENED/.test(progress));
  ok('lessonProgress never spells a storage key by hand', !/'fpv_/.test(progress));
  const settings = read('web/components/settings/LocalDataControls.tsx');
  ok('the settings reset covers journey progress', /LESSON_JOURNEY_PROGRESS/.test(settings));
}

console.log('\n[5] No hand-written lesson paths in the web lessons code');
{
  const dir = path.join(ROOT, 'web/components/lessons');
  const files = readdirSync(dir).filter(f => /\.tsx?$/.test(f));
  const offenders = files.filter(f => /["'`]\/lessons\//.test(readFileSync(path.join(dir, f), 'utf8')));
  ok(`none of ${files.length} components writes "/lessons/" by hand (${offenders.join(', ') || 'clean'})`, offenders.length === 0);
  const pages = ['web/app/lessons/page.tsx', 'web/app/lessons/[lessonId]/page.tsx'].map(read).join('\n');
  ok('the pages resolve lesson hrefs through href()', /href\(\{ kind: 'lesson'/.test(pages) && !/["'`]\/lessons\/\$\{/.test(pages));
}

console.log(`\nAll ${passed} assertions passed.`);

/**
 * The primary navigation's ORDER, its membership, and what it must never lose.
 *
 * WHY THIS SUITE EXISTS
 * ---------------------
 * The tab bar has been reordered four times, and every reordering was a change
 * to one array with nothing watching it. Twice a section came off the bar and
 * nobody noticed until a reader reported it — «البناء» spent an entire release
 * with no door on the web at all, because its content lived inside a private
 * page that renders nothing until you own a project.
 *
 * So the order is pinned here id by id, as data rather than as prose in a
 * comment, and pinned TWICE over: once in the source (section [1]) and once in
 * the rendered DOM at both widths (`testWebLessonsE2E` [0] and [10]). A future
 * reshuffle has to come through this file, which is exactly the friction that
 * was missing.
 *
 * THE ORDER, AS THE OWNER WROTE IT
 * --------------------------------
 *   الرئيسية · الدروس · البناء · الموسوعة · البرامج · المشاريع · المتجر
 *
 * The home page's cards are that list minus «الرئيسية», and section [4] derives
 * one from the other so a half-done reorder cannot ship.
 *
 * WHAT IT DELIBERATELY DOES NOT ASSERT
 * ------------------------------------
 * That «المجتمع» is gone. It is not gone — it is off the BAR. Section [2]
 * asserts the opposite: its route, its pages and its site-map entry must all
 * still be there, so that putting it back stays a one-line change and never a
 * rebuild. «البرامج» is checked the same way for the same reason: it spent one
 * revision off the bar and came back without a single change to `/programming`,
 * which is only true because nothing about the section was ever deleted.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NAV_TABS, isTabActive } from '../web/lib/navTabs';
import { navItem } from '../web/lib/siteNav';
import { SECTION_ROUTES } from '../web/lib/webRoutes';
import { PART_CATEGORY_MAP } from '../src/data/project/store';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p: string) => readFileSync(path.join(ROOT, p), 'utf8');

let passed = 0;
function ok(label: string, cond: boolean, detail?: string) {
  assert.ok(cond, `FAILED: ${label}${detail ? ` — ${detail}` : ''}`);
  console.log(`  ok — ${label}`);
  passed++;
}

/**
 * The order the owner fixed. Change here first, or not at all.
 *
 * Written out as three parallel literals rather than derived from `NAV_TABS`,
 * because a test that reads its expectation from the thing it is testing
 * asserts nothing. These are transcribed from the instruction:
 *
 *   الرئيسية · الدروس · البناء · الموسوعة · البرامج · المشاريع · المتجر
 */
const ORDER = ['home', 'lessons', 'build', 'kb', 'programming', 'projects', 'store'] as const;

const LABELS: Record<string, string> = {
  home: 'الرئيسية',
  lessons: 'الدروس',
  build: 'البناء',
  kb: 'الموسوعة',
  programming: 'البرامج',
  projects: 'المشاريع',
  store: 'المتجر',
};

const HREFS: Record<string, string> = {
  home: '/',
  lessons: '/lessons',
  build: '/build',
  kb: '/kb',
  programming: '/programming',
  projects: '/projects',
  store: '/store',
};

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[1] The bar is exactly the seven sections, in the fixed order');
{
  const ids = NAV_TABS.map(t => t.id);
  ok('seven tabs, no more and no fewer', NAV_TABS.length === ORDER.length, `${NAV_TABS.length}`);
  ok(`the order is ${ORDER.join(' → ')}`,
    ids.join(' → ') === ORDER.join(' → '), ids.join(' → '));

  // Position by position, so a failure names the slot that moved rather than
  // handing back two long strings to diff by eye.
  ORDER.forEach((id, i) => {
    ok(`slot ${i + 1} is «${LABELS[id]}»`, ids[i] === id, ids[i]);
  });

  for (const id of ORDER) {
    const tab = NAV_TABS.find(t => t.id === id);
    ok(`«${LABELS[id]}» carries its label`, tab?.labelAr === LABELS[id], tab?.labelAr);
    ok(`«${LABELS[id]}» points at ${HREFS[id]}`, tab?.href === HREFS[id], tab?.href);
    ok(`«${LABELS[id]}» has an icon`, typeof tab?.Icon === 'function' || typeof tab?.Icon === 'object');
  }

  // The three membership rules the owner stated in their own words, as three
  // assertions rather than as a consequence of the order literal above — so a
  // future reorder that also drops one of them fails twice, and legibly.
  ok('«البرامج» stays visible', NAV_TABS.some(t => t.id === 'programming'));
  ok('«المشاريع» stays visible', NAV_TABS.some(t => t.id === 'projects'));
  ok('«المتجر» is the LAST tab', NAV_TABS[NAV_TABS.length - 1]?.id === 'store');
  ok('«المجتمع» is not on the bar', !NAV_TABS.some(t => t.id === 'community'));

  ok('every id is distinct', new Set(ids).size === ids.length);
  ok('every href is an absolute path', NAV_TABS.every(t => t.href.startsWith('/')));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[2] «المجتمع» was un-tabbed, not deleted');
{
  // The instruction was explicit: «لا تحذف كود المجتمع أو بياناته أو Routes
  // الخاصة به. فقط أخفِه من التنقل الرئيسي». This section is that instruction,
  // written as a test, so a later cleanup cannot quietly finish the job.
  //
  // «البرامج» is checked here too even though it is back ON the bar: it spent a
  // revision off it, and the reason that was cheap to undo is that its route
  // and its site-map entry never moved. Keeping the assertions is what keeps
  // that true the next time the bar is reshuffled.
  ok('/community still has a page', existsSync(path.join(ROOT, 'web/app/community/page.tsx')));
  ok('/programming still has a page', existsSync(path.join(ROOT, 'web/app/programming/page.tsx')));
  ok('the site map still lists المجتمع', navItem('community')?.href === '/community');
  ok('the site map still lists البرامج', navItem('programming')?.href === '/programming');
  ok('the adapter still resolves the community section', SECTION_ROUTES.community === '/community');
  ok('the adapter still resolves the software hub', SECTION_ROUTES.programming === '/programming');

  // The community components and data are untouched. If a later change starts
  // deleting them, this is the line that fails first.
  ok('the community route tree is intact',
    existsSync(path.join(ROOT, 'web/app/community')) && read('web/lib/siteNav.ts').includes("group: 'community'"));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[3] «البناء» is the section that already existed, not a second one');
{
  /*
   * THE ROUTE WAS NOT INVENTED HERE.
   *
   * `/build` and `/build/wizard` — the landing with its three doors, the
   * wizard, the compatibility checks, the safety gates and the report — were
   * already written on `claude/web-platform-foundation`, which is the branch
   * the production deployment builds from. They were never on this line of
   * work, which is the whole reason «البناء» read as missing here.
   *
   * So this section asserts the PORT, not a rewrite: the landing, the wizard
   * and the six `web/lib/build` modules are present and are the ones that
   * carry the path. If somebody later starts a parallel build guide, the
   * «one landing» assertions below are what catches it.
   */
  ok('/build exists', existsSync(path.join(ROOT, 'web/app/build/page.tsx')));
  ok('/build/wizard exists', existsSync(path.join(ROOT, 'web/app/build/wizard/page.tsx')));
  ok('the site map lists البناء', navItem('build')?.href === '/build' && navItem('build')?.labelAr === 'البناء');
  ok('البناء sits in the build group', navItem('build')?.group === 'build');
  ok('البناء needs no account', !navItem('build')?.requiresAuth);

  for (const m of ['path', 'draft', 'checks', 'gates', 'bom', 'labels']) {
    ok(`the ${m} module came across with it`, existsSync(path.join(ROOT, `web/lib/build/${m}.ts`)));
  }
  for (const c of ['BuildWizard', 'BuildResume', 'PartPicker', 'GateStep', 'GuideSteps', 'MyBuildPanel', 'ReportStep']) {
    ok(`${c} came across with it`, existsSync(path.join(ROOT, `web/components/build/${c}.tsx`)));
  }

  // NO DUPLICATE ROUTE. The phone's build routes are `/roadmap` and
  // `/assembly`; neither may be recreated on the web, because the deep links
  // that would point at them are still declared phone-only in the adapter.
  ok('no /roadmap route was created on the web', !existsSync(path.join(ROOT, 'web/app/roadmap')));
  ok('no /assembly route was created on the web', !existsSync(path.join(ROOT, 'web/app/assembly')));

  // The landing reads its path from the shared definition rather than listing
  // steps of its own — the property that keeps one build path, not two.
  const build = read('web/app/build/page.tsx');
  ok('the landing reads the path definition', /from '@\/lib\/build\/path'/.test(build));
  ok('…and hands the interactive part to the wizard route',
    build.includes('/build/wizard') || build.includes("href={`/build/wizard"));

  // «مشروعي» keeps its stages tab: the personal workspace was not stripped to
  // make room for the section, and the `roadmap` deep links still name it.
  ok('«مشروعي» still shows the build stages too',
    read('web/components/project/ProjectWorkspace.tsx').includes("['stages', 'مراحل البناء']"));
  ok('the roadmap deep link still names «مشروعي», which is where those stages are',
    read('web/lib/webRoutes.ts').includes("roadmap: 'مراحل البناء معروضة كاملة في صفحة «مشروعي»"));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[4] The home page names the same sections in the same order');
{
  const home = read('web/app/page.tsx');
  const block = home.slice(home.indexOf('const pillars: Pillar[] = ['), home.indexOf('  ];'));
  const pillarIds = [...block.matchAll(/^\s{6}id: '([a-zA-Z-]+)',$/gm)].map(m => m[1]);

  // Transcribed from the instruction, not derived from NAV_TABS — the
  // derivation is the SEPARATE assertion below, and it only means something
  // while this literal is independent of it.
  const CARD_ORDER = ['lessons', 'build', 'kb', 'programming', 'projects', 'store'];

  ok('six cards', pillarIds.length === CARD_ORDER.length, pillarIds.join(' → '));
  ok('the cards read الدروس → البناء → الموسوعة → البرامج → المشاريع → المتجر',
    pillarIds.join(' → ') === CARD_ORDER.join(' → '), pillarIds.join(' → '));
  CARD_ORDER.forEach((id, i) => {
    ok(`card ${i + 1} is ${id}`, pillarIds[i] === id, pillarIds[i]);
  });
  ok('there is no المجتمع card', !pillarIds.includes('community'));
  ok('«البرامج» has a card', pillarIds.includes('programming'));
  ok('«المشاريع» has a card', pillarIds.includes('projects'));
  ok('«المتجر» is the last card', pillarIds[pillarIds.length - 1] === 'store');

  // The bar and the page must teach ONE shape: the cards are the bar minus
  // home, in the same sequence. This is what makes a half-done reorder — one
  // list changed, the other forgotten — impossible to ship.
  ok('the card order is the bar order without «الرئيسية»',
    pillarIds.join('|') === NAV_TABS.filter(t => t.id !== 'home').map(t => t.id).join('|'),
    NAV_TABS.filter(t => t.id !== 'home').map(t => t.id).join('|'));

  ok('«البناء» is visible on the page, not hidden behind a fold or a details',
    home.includes("id: 'build'") && !/<details[\s\S]{0,400}id: 'build'/.test(home));
  // Counted, never typed: a written figure here would rot into a claim about
  // the size of the parts catalogue the moment a part is added.
  const catalogueSize = Object.values(PART_CATEGORY_MAP).reduce((n, l) => n + l.length, 0);
  ok('the build card counts the parts catalogue from the data',
    block.includes('count: buildPartCount') && !block.includes(`count: ${catalogueSize},`));
  ok('every card resolves its href through the site map',
    [...block.matchAll(/^\s{6}href: (.+),$/gm)].every(m => m[1].startsWith('sectionHref(')));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[5] Active state: one tab lit, and the right one');
{
  const lit = (p: string) => NAV_TABS.filter(t => isTabActive(t, p)).map(t => t.id);

  const cases: [string, string | null][] = [
    ['/', 'home'],
    ['/lessons', 'lessons'],
    ['/lessons/lesson-quadcopter-intro', 'lessons'],
    ['/kb', 'kb'],
    ['/kb/motors', 'kb'],
    ['/kb/motors/motor-kv', 'kb'],
    ['/glossary', 'kb'],
    ['/diagnose', 'kb'],
    ['/diagnose/dx-fc-no-power', 'kb'],
    ['/build', 'build'],
    ['/build/wizard', 'build'],
    ['/programming', 'programming'],
    ['/programming/edgetx', 'programming'],
    ['/programming/expresslrs/setup', 'programming'],
    // Betaflight is a top-level route but reads as part of the software centre,
    // so the bar must not go dark while somebody is plainly still inside one.
    ['/betaflight', 'programming'],
    ['/betaflight/pid-tuning', 'programming'],
    ['/projects', 'projects'],
    ['/projects/esp32-mini-drone', 'projects'],
    ['/project', 'projects'],
    ['/store', 'store'],
    ['/store/motors', 'store'],
    // Deliberately unlit. «المجتمع» belongs to no tab any more, and lighting a
    // neighbour would be worse than lighting nothing; `/search` and `/settings`
    // are tools rather than sections and never belonged to one.
    ['/community', null],
    ['/community/post-anything', null],
    ['/search', null],
    ['/settings', null],
  ];

  for (const [p, expected] of cases) {
    const on = lit(p);
    ok(`${p} lights ${expected ?? 'nothing'}`,
      expected === null ? on.length === 0 : on.length === 1 && on[0] === expected,
      on.join(' '));
  }

  // The invariant behind every row above: two lit tabs is a bar that has to be
  // read rather than glanced at.
  const paths = cases.map(c => c[0]).concat(['/kb/', '/build/', '/profile', '/about']);
  ok('no path ever lights two tabs', paths.every(p => lit(p).length <= 1));
  ok('/build does not light «المشاريع» through its /project prefix', !lit('/build').includes('projects'));
  ok('/programming does not light «المشاريع» — the two are different sections',
    !lit('/programming').includes('projects'));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[6] Desktop and phone render the SAME list');
{
  const navTabsSrc = read('web/components/NavTabs.tsx');
  ok('one component serves both bars',
    /variant: 'header' \| 'bottom'/.test(navTabsSrc) && /NAV_TABS\.map/.test(navTabsSrc));

  // A `slice` or `filter` before the map is the only way the two widths could
  // ever show different tabs or a different order.
  const beforeMap = navTabsSrc.split('NAV_TABS.map')[0].split('export const NavTabs')[1] ?? '';
  ok('the list is not sliced or filtered for either width', !/slice\(|filter\(|reverse\(|sort\(/.test(beforeMap));

  const header = read('web/components/SiteHeader.tsx');
  ok('the header renders the shared component', /<NavTabs variant="header"/.test(header));
  ok('the phone bar renders the shared component', /<NavTabs variant="bottom"/.test(navTabsSrc));

  // Both bars are present in one HTML document and chosen by CSS, so the server
  // never has to guess the width.
  const css = read('web/app/globals.css');
  ok('the header bar is hidden below 900px and shown above it',
    /\.header-tabs\s*\{[^}]*display:\s*none/.test(css)
    && /@media \(min-width: 900px\)[\s\S]{0,400}\.header-tabs\s*\{[^}]*display:\s*block/.test(css));
  ok('the phone bar is hidden from 900px up',
    /@media \(min-width: 900px\)[\s\S]{0,600}\.nav-bottom\s*\{[^}]*display:\s*none/.test(css));
}

console.log(`\n${passed} assertions passed.\n`);

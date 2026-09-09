/**
 * BUILD V2 — THE DOMAIN-TO-UI CONTRACT, WITHOUT A BROWSER
 * =======================================================
 *
 * `testBuildV2E2E.ts` walks the journey and proves what a reader SEES. This
 * suite proves the things a walkthrough structurally cannot:
 *
 *   · that the questions the UI asks are the engine's, not a sequence typed
 *     into React — checked by asking the engine directly and comparing;
 *   · that the preview added NO route, NO navigation entry and NO persistence,
 *     which are absences, and absences have to be searched for;
 *   · that the option lists are derived from the catalogue, so «CRSF» and
 *     «Diversity» cannot come back the moment someone edits an array;
 *   · that the flag is exact, so `/build` stays V1 for everyone who did not
 *     type it.
 *
 * Run: npx tsx --tsconfig web/tsconfig.json scripts/testBuildV2.ts
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { proposeBuild, rcSystemsInCatalogue } from '../src/data/assembly/recommendation/proposeBuild';
import type { ProposedBuild } from '../src/data/assembly/recommendation/types';
import { BUILD_TYPE_AVAILABILITY } from '../web/lib/build/availability';
import { isBuildV2Preview, BUILD_V2_PREVIEW_PARAM } from '../web/lib/build/v2/previewFlag';

let passed = 0;
const failures: string[] = [];
function ok(label: string, condition: boolean) {
  if (condition) { passed++; console.log(`  ok — ${label}`); }
  else { failures.push(label); console.log(`  FAIL — ${label}`); }
}
const section = (t: string) => console.log(`\n── ${t} ${'─'.repeat(Math.max(0, 62 - t.length))}`);

const V2_DIR = 'web/components/build/v2';
const read = (p: string) => readFileSync(p, 'utf8');

/**
 * The file with its comments removed.
 *
 * Every «this layer contains no X» assertion below runs against THIS, not the
 * raw text. These components explain at length why they do not write storage
 * and why they do not re-derive availability, and a grep for `localStorage`
 * that fails on the sentence «no localStorage key» is a test that punishes
 * documentation. The rule is about code; so is the search.
 */
const code = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

const v2Files = readdirSync(V2_DIR).filter(f => /\.tsx?$/.test(f));
const v2Source = Object.fromEntries(v2Files.map(f => [f, read(join(V2_DIR, f))]));
const v2Code = Object.fromEntries(v2Files.map(f => [f, code(read(join(V2_DIR, f)))]));
const allV2 = Object.values(v2Code).join('\n') + code(read('web/lib/build/v2/previewFlag.ts'));

// ═══════════════════════════════════════════════════════════════════════════
section('1 — THE PREVIEW FLAG IS EXACT');
// ═══════════════════════════════════════════════════════════════════════════
/*
 * `/build` is the live build section. Anything looser than an exact match —
 * "truthy", "present", "starts with" — turns a typo into a redirect away from
 * the product for a reader who never asked for a preview.
 */
ok('the parameter is `buildV2`', BUILD_V2_PREVIEW_PARAM === 'buildV2');
ok('`?buildV2=1` opens the preview', isBuildV2Preview('1'));
for (const [v, label] of [
  [null, 'no parameter at all'], ['', '`?buildV2` with no value'], ['0', '`?buildV2=0`'],
  ['true', '`?buildV2=true`'], ['yes', '`?buildV2=yes`'], ['1 ', '`?buildV2=1 ` (trailing space)'],
  ['01', '`?buildV2=01`'], ['V1', 'anything else'],
] as const) {
  ok(`${label} stays on V1`, !isBuildV2Preview(v));
}

// ═══════════════════════════════════════════════════════════════════════════
section('2 — NO NEW ROUTE, NO NEW NAVIGATION');
// ═══════════════════════════════════════════════════════════════════════════
/*
 * The brief's deployment rule in one assertion: the preview lives INSIDE the
 * existing `/build`, and nothing anywhere sends a reader to it.
 */
function routeFiles(dir: string, acc: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) routeFiles(p, acc);
    else if (/^(page|route)\.tsx?$/.test(e)) acc.push(p);
  }
  return acc;
}
const routes = routeFiles('web/app');
ok('no `/build-v2` route exists', !existsSync('web/app/build-v2'));
ok('no route directory mentions v2 at all',
  !routes.some(r => /v2/i.test(r)));

/*
 * The route inventory and the V1 diff are compared against the BRANCH POINT,
 * so a new page cannot slip in unnoticed under a name nobody thought to grep
 * for, and no V1 file can be edited «while I was in there».
 *
 * Both need history. A shallow CI checkout has none, and rather than pretend
 * otherwise the suite says so and runs the assertions that do not need it —
 * `.github/workflows/ci.yml` fetches full history precisely so this does run.
 */
const git = (args: string[]) => execFileSync('git', args, { encoding: 'utf8' });
const base = (() => {
  for (const ref of ['origin/claude/wizardly-noether-xdxg2x', 'claude/wizardly-noether-xdxg2x']) {
    try { return git(['merge-base', 'HEAD', ref]).trim(); } catch { /* not fetched */ }
  }
  return null;
})();
if (!base) {
  console.log('  ·· NO BASE COMMIT REACHABLE (shallow checkout) — '
    + '3 history-dependent assertions did not run');
} else {
  const baseRoutes = git(['ls-tree', '-r', '--name-only', base, 'web/app/'])
    .split('\n').filter(f => /\/(page|route)\.tsx?$/.test(f)).sort();
  ok(`the route inventory is unchanged since ${base.slice(0, 7)} (${baseRoutes.length} routes)`,
    JSON.stringify(routes.slice().sort()) === JSON.stringify(baseRoutes));
}

// Nothing links to the flag: not the nav, not the home page, not a sitemap.
const linkers = execFileSync('bash', ['-c',
  `grep -rln 'buildV2' web/app web/components web/lib src 2>/dev/null || true`],
  { encoding: 'utf8' }).split('\n').filter(Boolean).sort();
ok('only the v2 directory and the flag module know the parameter exists',
  linkers.every(f => f.startsWith('web/components/build/v2/') || f === 'web/lib/build/v2/previewFlag.ts'
    || f === 'web/app/build/page.tsx'));
ok('`/build/page.tsx` names the flag only by importing the gate',
  !/buildV2/.test(code(read('web/app/build/page.tsx'))));
const navSource = execFileSync('bash', ['-c',
  `cat web/components/*Nav*.tsx web/lib/nav*.ts* web/app/page.tsx 2>/dev/null || true`],
  { encoding: 'utf8' });
ok('no navigation entry or home card carries the preview', !/buildV2/.test(navSource));

// ═══════════════════════════════════════════════════════════════════════════
section('3 — NO PERSISTENCE, NO NETWORK, NO PROJECT WRITE');
// ═══════════════════════════════════════════════════════════════════════════
/*
 * Phase 2B is explicitly NOT allowed to commit to a draft schema. The cheapest
 * way for that rule to be broken later is a well-meaning «just remember the
 * answers» patch, so the absence is asserted rather than trusted.
 */
for (const [pattern, what] of [
  [/localStorage/, 'localStorage'],
  [/sessionStorage/, 'sessionStorage'],
  [/indexedDB/i, 'IndexedDB'],
  [/document\.cookie/, 'cookies'],
  [/\bfetch\s*\(/, 'a network call'],
  [/firebase|firestore|setDoc|updateDoc/i, 'Firebase'],
  [/mirrorToProject|saveProject|useProject\b/, 'a project write'],
  [/window\.confirm|window\.alert|window\.prompt/, 'a blocking browser dialog'],
] as const) {
  ok(`the V2 layer contains no ${what}`, !pattern.test(allV2));
}

// ═══════════════════════════════════════════════════════════════════════════
section('4 — THE QUESTION SEQUENCE IS THE ENGINE\'S, NOT THE UI\'S');
// ═══════════════════════════════════════════════════════════════════════════
/*
 * The single most important claim in Phase 2B. The UI must ASK the engine what
 * is still open; if it ever hard-codes «first size, then voltage» the whole
 * premise — «we only ask what we actually need» — becomes a coincidence that
 * the next catalogue change breaks silently.
 */
const preview = v2Code['BuildV2Preview.tsx'];
ok('the preview reads `requiredInputs` from the engine',
  /build\?\.requiredInputs/.test(preview));
ok('the preview calls `proposeBuild` rather than reimplementing it',
  /proposeBuild\(/.test(preview) && !/frameSizeRule|designVoltageRule/.test(allV2));
ok('no V2 file hard-codes a size or voltage list',
  !Object.values(v2Code).some(f => /\[\s*4\s*,\s*6\s*\]|\[\s*5\s*,\s*7\s*\]|'4S'.*'6S'/.test(f)));
ok('the required-input screen renders whatever key it is handed',
  /input\.key|key:\s*'sizeInch'\s*\|\s*'cellCount'/.test(v2Code['BuildRequiredInputQuestion.tsx']));

/*
 * And the same claim from the other side: ask the engine directly and check
 * the UI's three headline behaviours are what it actually reports.
 */
const asked = (id: string, extra: Record<string, unknown> = {}) =>
  (proposeBuild({ droneTypeId: id, owned: {}, ...extra }).requiredInputs ?? []).map(i => i.key);

const freestyleAsks = asked('freestyle');
ok('Freestyle: the engine asks the voltage', freestyleAsks.includes('cellCount'));
ok('Freestyle: the engine never asks the size', !freestyleAsks.includes('sizeInch'));
ok('Freestyle: the size is derived without being asked',
  proposeBuild({ droneTypeId: 'freestyle', owned: {} }).sizeInch === 5);
const fsVoltages = (proposeBuild({ droneTypeId: 'freestyle', owned: {} }).requiredInputs ?? [])
  .find(i => i.key === 'cellCount')?.options ?? [];
ok('Freestyle: both viable voltages are offered, and only those',
  JSON.stringify([...fsVoltages].sort()) === JSON.stringify([4, 6]));

const lrAsks = asked('long-range');
ok('Long-range: the engine asks nothing', lrAsks.length === 0);
const lr = proposeBuild({ droneTypeId: 'long-range', owned: {} });
ok('Long-range: both the size and the voltage are derived',
  lr.sizeInch !== undefined && lr.cellCount !== undefined);

/*
 * NON-VACUITY. If `requiredInputs` were always empty, every assertion above
 * would pass while the UI asked nothing at all. Freestyle proves it is not.
 */
ok('the two goals genuinely differ (so the assertions above are not vacuous)',
  freestyleAsks.length > 0 && lrAsks.length === 0);

// ═══════════════════════════════════════════════════════════════════════════
section('5 — NO ARRAY[0] DEFAULT REACHES THE READER');
// ═══════════════════════════════════════════════════════════════════════════
/*
 * The Phase 2A correction, restated at the UI boundary: an unanswered question
 * must not arrive pre-answered with whatever the catalogue happened to list
 * first. The reader's answers start EMPTY and the option lists are rendered,
 * never sampled.
 */
ok('the preview starts with no answers at all',
  /emptyAnswers\s*=\s*\(\)\s*:\s*Answers\s*=>\s*\(\{\s*owned:\s*\{\}\s*\}\)/.test(preview));
ok('no V2 component seeds a value from `options[0]`',
  !Object.values(v2Code).some(f => /options\s*\[\s*0\s*\]/.test(f)));
ok('no V2 component seeds a value from a `??` fallback into a first element',
  !Object.values(v2Code).some(f => /\?\?\s*[\w.]*\[\s*0\s*\]/.test(f)));
/*
 * And the shape that would sneak one past both: a `selected=` computed with a
 * fallback. `selected={(value ?? options[0]) === opt}` pre-answers the question
 * without ever assigning a default — the reader sees a chosen card they never
 * chose, which is exactly the Array[0] behaviour under another name.
 */
ok('no choice card decides `selected` through a fallback',
  !Object.values(v2Code).some(f => /selected=\{[^}]*(\?\?|\|\|)/.test(f)));
ok('the engine itself still refuses to invent the answer',
  proposeBuild({ droneTypeId: 'freestyle', owned: {} }).cellCount === undefined);

// ═══════════════════════════════════════════════════════════════════════════
section('6 — THE ECOSYSTEM OPTIONS ARE DERIVED FROM REAL PARTS');
// ═══════════════════════════════════════════════════════════════════════════
const rc = rcSystemsInCatalogue();
ok('ExpressLRS is an offered radio system', rc.includes('ExpressLRS'));
ok('Crossfire is an offered radio system', rc.includes('Crossfire'));
ok('«CRSF» is NOT offered as a radio system', !rc.some(s => /^CRSF$/i.test(s)));
ok('«Diversity» is NOT offered as a radio system', !rc.some(s => /diversity/i.test(s)));
ok('the radio list is short enough to be a question, not a catalogue',
  rc.length > 0 && rc.length <= 4);
ok('the owned-gear screen never types the list itself',
  /rcSystemsInCatalogue\(\)/.test(v2Code['BuildOwnedGearQuestion.tsx'])
  && /videoSystemOptions\(\)/.test(v2Code['BuildOwnedGearQuestion.tsx'])
  && !/'ExpressLRS'|"ExpressLRS"/.test(v2Code['BuildOwnedGearQuestion.tsx']));

// ═══════════════════════════════════════════════════════════════════════════
section('7 — OWNED DJI NARROWS THE BUILD AT THE DOMAIN BOUNDARY');
// ═══════════════════════════════════════════════════════════════════════════
/*
 * The reason the owned-gear question exists at all. If the constraint did not
 * reach the engine, the screen would be theatre.
 */
const at = (b: ProposedBuild, c: string) => b.decisions.find(d => d.category === c);
const free = proposeBuild({ droneTypeId: 'freestyle', cellCount: 6, owned: {} });
const dji = proposeBuild({ droneTypeId: 'freestyle', cellCount: 6, owned: { videoSystem: 'DJI' } });
const walksnail = proposeBuild({
  droneTypeId: 'freestyle', cellCount: 6, owned: { videoSystem: 'Walksnail' },
});

ok('unconstrained, the video decision is reached', at(free, 'videoUnits') !== undefined);
ok('owning DJI narrows the video candidates', (() => {
  const before = at(free, 'videoUnits')!.candidateIds;
  const after = at(dji, 'videoUnits')!.candidateIds;
  return after.length < before.length && after.every(id => before.includes(id));
})());
ok('the narrowing is EXPLAINED as a constraint, not as budget ranking',
  at(dji, 'videoUnits')!.reasons.some(r => r.kind === 'filter' && /DJI/.test(r.ar)));
ok('a different owned system narrows to a different set', (() => {
  const d = [...at(dji, 'videoUnits')!.candidateIds].sort();
  const w = [...at(walksnail, 'videoUnits')!.candidateIds].sort();
  return d.length > 0 && w.length > 0 && JSON.stringify(d) !== JSON.stringify(w);
})());
/*
 * The constraint has to travel FURTHER than its own category, or it is a
 * label. Owning DJI goggles narrows the video unit, and the video unit is what
 * the rest of the build has to live with.
 */
ok('an owned video system leaves the build still provable',
  dji.provenPath !== null && walksnail.provenPath !== null);
ok('the owned system is not silently ignored when it decides the category',
  at(walksnail, 'videoUnits')!.status !== 'unavailable');

// ═══════════════════════════════════════════════════════════════════════════
section('8 — AVAILABILITY IS READ, NEVER RE-DERIVED');
// ═══════════════════════════════════════════════════════════════════════════
/*
 * V1 and V2 must disagree about nothing. The goal screen shows availability by
 * READING the one table, so a type that becomes buildable becomes buildable in
 * both surfaces on the same commit.
 */
const goal = v2Code['BuildGoalQuestion.tsx'];
ok('the goal screen imports the availability table',
  /buildTypeAvailability|isBuildTypeAvailable/.test(goal));
ok('the goal screen computes no availability of its own',
  !/parts\.filter|allParts|\bcatalogue\b|eligibleCandidates/.test(goal));
for (const t of ['cinewhoop', 'racing']) {
  ok(`«${t}» is unavailable in the shared table`,
    BUILD_TYPE_AVAILABILITY[t]?.available === false);
}
for (const t of ['freestyle', 'cinematic', 'long-range']) {
  ok(`«${t}» is available in the shared table`,
    BUILD_TYPE_AVAILABILITY[t]?.available === true);
}

// ═══════════════════════════════════════════════════════════════════════════
section('9 — THE ARABIC SAYS ONLY WHAT THE CATALOGUE SUPPORTS');
// ═══════════════════════════════════════════════════════════════════════════
const copy = read(join(V2_DIR, 'copy.ts'));
// The negative claims read the STRINGS, not the file: `copy.ts` documents in a
// comment which phrasing was rejected and why, and that note is the reason the
// rule holds — failing on it would delete the explanation to satisfy the test.
const copyStrings = code(copy);
ok('«الفئة الأعلى» does not claim price is no object',
  !/السعر ليس الأولوية/.test(copyStrings));
ok('«لا تفضيل» is a real budget answer', /لا تفضيل/.test(copy));
ok('no step counting anywhere in the copy', !/الخطوة\s*\d+\s*من\s*\d+/.test(copyStrings));
ok('the preview names itself a preview', /معاينة/.test(copy));
ok('no V2 screen promises a feature Phase 2B did not build',
  !/قريبًا جدًا|في الأسبوع|الإصدار القادم/.test(copyStrings));
/*
 * NO DEAD SENTENCES.
 *
 * `copy.ts` is meant to be read top to bottom as the product's Arabic voice
 * and judged as prose. A key nothing renders makes that reading a lie: it
 * describes a screen the reader will never see. `NAV.restart` was exactly
 * that — a «ابدأ من جديد» button Phase 2B never built — and it was found by
 * this check, not by reading.
 */
const copyKeys = [...copy.matchAll(/^export const ([A-Z_]+) = ([[{])/gm)];
const dead: string[] = [];
for (const [, group, opener] of copyKeys) {
  if (opener === '[') continue;                 // PHASES is mapped whole
  // A group the UI indexes dynamically — `REQUIRED_INPUT[input.key]`, the
  // whole point of letting the engine name the question — cannot be checked
  // key by key, and should not be: its keys are reached by a value, not a
  // literal.
  if (allV2.includes(`${group}[`)) continue;
  const body = copy.slice(copy.indexOf(`export const ${group} = {`));
  const end = body.indexOf('\n} as const;');
  for (const [, key] of body.slice(0, end).matchAll(/^  ([a-zA-Z][\w]*):/gm)) {
    if (!allV2.includes(`${group}.${key}`)) dead.push(`${group}.${key}`);
  }
}
ok(`every sentence in copy.ts is rendered somewhere (dead: ${dead.join(', ') || 'none'})`,
  dead.length === 0);

ok('the copy lives in one file, not scattered across components',
  !Object.entries(v2Code)
    .filter(([f]) => f !== 'copy.ts')
    .some(([, f]) => /'[^']*[؀-ۿ]{12,}/.test(f)));

// ═══════════════════════════════════════════════════════════════════════════
section('10 — V1 IS BYTE-IDENTICAL EXCEPT FOR THE GATE');
// ═══════════════════════════════════════════════════════════════════════════
/*
 * The whole deployment promise. `/build` gained exactly one wrapper; if the
 * diff ever touches anything else, this fails before a reader notices.
 */
if (base) {
  const changed = git(['diff', '--name-only', base, '--']).split('\n').filter(Boolean);
  // Everything the phase is allowed to touch: its own directories, its tests,
  // the scripts that register them, and build hygiene. NOT product code.
  const outsideV2 = changed.filter(f =>
    !f.startsWith('web/components/build/v2/') && !f.startsWith('web/lib/build/v2/')
    && !f.startsWith('scripts/') && !f.startsWith('.github/')
    && f !== 'package.json' && f !== '.gitignore');
  ok(`the only V1 file touched is /build/page.tsx (touched: ${outsideV2.join(', ') || 'none'})`,
    outsideV2.every(f => f === 'web/app/build/page.tsx'));

  /*
   * The strongest form of «V1 is unchanged»: the page's existing lines were
   * not even RE-INDENTED. The gate is opened above the old root and closed
   * below it, so every line V1 had, V1 still has, byte for byte — and the diff
   * is additions only. Anything removed here means V1 lost something, which is
   * the one thing this phase promised not to do.
   */
  const removed = git(['diff', base, '--', 'web/app/build/page.tsx'])
    .split('\n').filter(l => l.startsWith('-') && !l.startsWith('---'));
  ok(`the V1 page lost NOTHING — the diff is additions only (${removed.length} removals)`,
    removed.length === 0);
}
ok('the /build page still renders its V1 content as the gate\'s children',
  /<BuildV2PreviewGate>/.test(read('web/app/build/page.tsx')));

/*
 * The regression that a browser found once already: `useSearchParams` in a
 * statically-prerendered page bails the subtree out to client rendering, and
 * V1's landing was replaced by a Suspense fallback until hydration finished.
 * A blank flash on the live product, in service of a hidden preview.
 */
const gate = v2Code['BuildV2PreviewGate.tsx'];
ok('the gate does NOT use `useSearchParams`', !/useSearchParams/.test(gate));
/*
 * And the property that keeps V1's static HTML intact: what the gate renders
 * on the SERVER, and during hydration, must be the children — never the
 * preview. `useSyncExternalStore`'s third argument is that answer, and it
 * returns false.
 */
ok('the gate\'s server snapshot is «no preview»',
  /useSyncExternalStore\(\s*subscribe,\s*readFlag,\s*noPreview\s*\)/.test(gate)
  && /const noPreview = \(\) => false;/.test(gate));
ok('the gate reads the flag from the browser, not from a prop',
  /window\.location\.search/.test(gate));
ok('the /build page reads no `searchParams` prop (it would go dynamic)',
  !/searchParams/.test(code(read('web/app/build/page.tsx'))));

console.log(`\n[build v2 contract] ${passed} passed, ${failures.length} failed`);
if (failures.length) {
  failures.forEach(f => console.log(`  FAILED: ${f}`));
  process.exit(1);
}

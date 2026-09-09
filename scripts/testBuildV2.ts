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
const v2Code = Object.fromEntries(v2Files.map(f => [f, code(read(join(V2_DIR, f)))]));
const allV2 = Object.values(v2Code).join('\n') + code(read('web/lib/build/v2/previewFlag.ts'));

/*
 * The copy file twice: raw, and with comments stripped.
 *
 * Negative claims read the STRINGS. `copy.ts` documents in comments which
 * phrasings were rejected and why — «السعر ليس الأولوية», «دون ترتيب بالسعر» —
 * and those notes are the reason the rules hold. A grep that failed on them
 * would delete the explanation to satisfy the test.
 */
const copy = read(join(V2_DIR, 'copy.ts'));
const copyStrings = code(copy);

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
 * THE BUILD SURFACE'S ROUTES, PINNED — NOT DIFFED AGAINST A MOVING BASE.
 *
 * An earlier version compared the whole route inventory to
 * `merge-base(HEAD, canonical)`. That is a branch-time check: on canonical the
 * merge-base IS head, the comparison is against itself, and it passes whatever
 * the tree contains. It also failed on any unrelated future route anywhere in
 * the app, which is not this phase's business.
 *
 * Pinned to the build surface instead. Unrelated routes elsewhere are free to
 * come and go; a new one HERE is a deliberate decision that should have to
 * edit this list. Retire it with the flag at cutover.
 */
const V1_BUILD_ROUTES = ['web/app/build/page.tsx', 'web/app/build/wizard/page.tsx'];
const buildRoutes = routes.filter(r => r.startsWith('web/app/build')).sort();
ok(`the build surface still has exactly its two V1 routes (${buildRoutes.join(', ')})`,
  JSON.stringify(buildRoutes) === JSON.stringify(V1_BUILD_ROUTES.slice().sort()));

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
section('6b — «لست متأكدًا» IS AN ANSWER, NOT AN EMPTY FIELD');
// ═══════════════════════════════════════════════════════════════════════════
/*
 * The correction this section exists for.
 *
 * The screen used to read `rcSystem === undefined` as «لست متأكدًا», which
 * collapsed «has not answered» into «answered, and the answer is unsure». It
 * opened pre-selected, and a reader who pressed «التالي» without touching
 * anything was recorded as having chosen it. Three states, three
 * representations, or the summary reports a decision nobody made.
 */
const ownedSrc = v2Code['BuildOwnedGearQuestion.tsx'];
ok('the ecosystem answer has an explicit «unsure» state',
  /kind:\s*'unsure'/.test(ownedSrc));
ok('the ecosystem answer has an explicit «known» state carrying the system',
  /kind:\s*'known';\s*value:\s*string/.test(ownedSrc));
ok('selection is decided by the answer\'s kind, never by an empty value',
  !/selected=\{[^}]*(rcSystem|videoSystem|value)\s*===\s*undefined/.test(ownedSrc)
  && /selected=\{answer\?\.kind === 'unsure'\}/.test(ownedSrc));
ok('«لست متأكدًا» is something the reader clicks, not a default',
  /onSelect=\{\(\) => set\(\{ kind: 'unsure' \}\)\}/.test(ownedSrc));

/*
 * And the state machine's half: a question is open exactly while unanswered,
 * so both ecosystem screens block until the reader says something.
 */
ok('the journey opens the radio screen while its answer is missing',
  /ownedWantsRadio\(answers\.owned\) && answers\.owned\.rc === undefined/.test(preview));
ok('the journey opens the goggle screen while its answer is missing',
  /ownedWantsGoggles\(answers\.owned\) && answers\.owned\.video === undefined/.test(preview));
ok('an unanswered radio screen blocks «التالي», naming «لست متأكدًا»',
  /current\?\.id === 'owned-rc' && answers\.owned\.rc === undefined/.test(preview)
  && /اختر النظام، أو اختر «لست متأكدًا»/.test(preview));
ok('an unanswered goggle screen blocks «التالي» the same way',
  /current\?\.id === 'owned-video' && answers\.owned\.video === undefined/.test(preview));
ok('no question is tracked by «have I asked» rather than «is it answered»',
  !/askedBudget|askedOwned|\basked\b/.test(preview));

/*
 * THE SUMMARY CANNOT LOSE THE ANSWER.
 *
 * «لدي جهاز تحكم، ولست متأكدًا من نظامه» used to disappear from «هذا ما
 * فهمناه» entirely, because the row was rendered only for a truthy system
 * name. The row is now driven by what the reader said they OWN, and «سأبدأ من
 * الصفر» still produces no equipment rows at all.
 */
/*
 * Scoped to the SUMMARY BLOCK, not the whole file.
 *
 * The first version of this assertion searched the component for
 * `ownedWantsRadio(answers.owned) && answers.owned.rc` — which also appears,
 * as a prefix, in the state machine's `… === undefined` test. A probe that
 * broke only the summary row passed it. An assertion that can be satisfied by
 * a line it is not about is not an assertion.
 */
const summaryBlock = preview.slice(
  preview.indexOf('const rows: SummaryRow[] = [];'), preview.indexOf('return ('));
ok('the summary rows region was found', summaryBlock.length > 200);
ok('the radio row follows what the reader OWNS, not a truthy system string',
  /ownedWantsRadio\(answers\.owned\) && answers\.owned\.rc\b(?!\s*===)/.test(summaryBlock));
ok('the goggle row does the same',
  /ownedWantsGoggles\(answers\.owned\) && answers\.owned\.video\b(?!\s*===)/.test(summaryBlock));
ok('neither row is gated on the answer being «known»',
  !/kind === 'known'\s*\)\s*\{/.test(summaryBlock));
ok('the summary has a word for an explicitly unsure answer',
  /SUMMARY\.unsureValue/.test(preview) && /unsureValue:\s*'لست متأكدًا'/.test(copy));

// ═══════════════════════════════════════════════════════════════════════════
section('6c — WHAT «UNSURE» SENDS TO THE ENGINE: NOTHING');
// ═══════════════════════════════════════════════════════════════════════════
/*
 * The whole point of separating the states is that they must reach the domain
 * differently at the UI boundary and IDENTICALLY at the engine's: an unsure
 * reader has given the engine no system to narrow by, so the proposal must be
 * the same as if they had never been asked. Anything else would be the engine
 * inventing a constraint out of «I don't know».
 */
const freestyle6S = { droneTypeId: 'freestyle', cellCount: 6 };
const noConstraint = proposeBuild({ ...freestyle6S, owned: {} });
const unsureRc = proposeBuild({ ...freestyle6S, owned: { rcSystem: undefined } });
const knownRc = proposeBuild({ ...freestyle6S, owned: { rcSystem: 'ExpressLRS' } });
const knownVideo = proposeBuild({ ...freestyle6S, owned: { videoSystem: 'DJI' } });
const rxOf = (b: ProposedBuild) => b.decisions.find(d => d.category === 'receivers');
const vtxOf = (b: ProposedBuild) => b.decisions.find(d => d.category === 'videoUnits');

const crossfireRc = proposeBuild({ ...freestyle6S, owned: { rcSystem: 'Crossfire' } });

ok('«unsure» about the radio proposes exactly what no answer proposes',
  JSON.stringify(rxOf(unsureRc)) === JSON.stringify(rxOf(noConstraint)));
/*
 * A KNOWN system is a REAL constraint — shown with Crossfire, not ExpressLRS.
 *
 * Every receiver this build can use happens to be ExpressLRS, so answering
 * «ExpressLRS» narrows the list by nothing and would prove nothing either.
 * Crossfire is the case where the constraint has to bite: the catalogue has
 * no Crossfire receiver for this build, and the decision must say so rather
 * than quietly propose an ExpressLRS one.
 */
ok('a KNOWN radio system the catalogue cannot satisfy is reported, not ignored',
  rxOf(crossfireRc)!.status === 'unavailable'
  && rxOf(noConstraint)!.status !== 'unavailable');
ok('«unsure» does NOT behave like that constraint',
  rxOf(unsureRc)!.status !== 'unavailable');
ok('a KNOWN radio system the catalogue CAN satisfy still resolves',
  rxOf(knownRc)!.status === rxOf(noConstraint)!.status
  && rxOf(knownRc)!.candidateIds.every(id => rxOf(noConstraint)!.candidateIds.includes(id)));
ok('a KNOWN goggle system still narrows the video unit',
  vtxOf(knownVideo)!.candidateIds.length < vtxOf(noConstraint)!.candidateIds.length);
ok('the UI hands the engine a system only when the answer is «known»',
  /rcSystem: ecosystemValue\(a\.owned\.rc\)/.test(preview)
  && /kind === 'known' \? a\.value : undefined/.test(ownedSrc));

// ═══════════════════════════════════════════════════════════════════════════
section('6d — THE BLOCKED REASON IS REACHABLE BY ASSISTIVE TECH');
// ═══════════════════════════════════════════════════════════════════════════
/*
 * `aria-describedby` named `v2-blocked` while the message carried only a
 * `data-testid`. A screen-reader user got a disabled button describing itself
 * by an element that did not exist — the reason was on screen and nowhere in
 * the accessibility tree.
 *
 * The DOM proof is in the browser suite; this is the source half: one
 * constant, so the two cannot drift again.
 */
ok('the id is a single shared constant', /const BLOCKED_ID = 'v2-blocked';/.test(preview));
ok('the button describes itself by that constant',
  /aria-describedby=\{blocked \? BLOCKED_ID : undefined\}/.test(preview));
ok('the visible message carries that same constant as its id',
  /id=\{BLOCKED_ID\}/.test(preview));
ok('no hard-coded id string is left to drift',
  !/'v2-blocked'/.test(preview.replace(/const BLOCKED_ID = 'v2-blocked';/, '')));

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
ok('«الفئة الأعلى» does not claim price is no object',
  !/السعر ليس الأولوية/.test(copyStrings));
ok('«لا تفضيل» is a real budget answer', /لا تفضيل/.test(copyStrings));
/*
 * TIER IS NOT PRICE.
 *
 * The engine ranks by the catalogue's `tier`, and only when the reader names
 * one. It has never read `priceRangeUSD`. «دون ترتيب بالسعر» promised a
 * feature that does not exist and implied the other three answers DO sort by
 * price — two false claims in six words.
 */
ok('no budget copy claims a price sort', !/بالسعر|حسب السعر|ترتيب السعر/.test(copyStrings));
ok('«لا تفضيل» is described as a tier preference, not a price one',
  /لن نفضّل فئة ميزانية على أخرى/.test(copyStrings));
ok('the engine really has no price ranking to describe',
  !/priceRangeUSD/.test(read('src/data/assembly/recommendation/proposeBuild.ts')));
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
  for (const [, key] of body.slice(0, end).matchAll(/^ {2}([a-zA-Z]\w*):/gm)) {
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
/*
 * THE BASELINE IS PINNED, NOT DERIVED — SO THIS SURVIVES THE MERGE.
 *
 * `scripts/fixtures/buildPageV1.f72571a.txt` is the page exactly as it stood
 * at the branch point, before the preview existed. Every line of it must
 * still appear, in order, inside the live page.
 *
 * That is strictly stronger than the git diff it replaces AND it keeps
 * working where the diff cannot: on canonical after this merges, on a shallow
 * checkout with no history, in a fresh clone. The diff version would have gone
 * green by arithmetic the moment `merge-base(HEAD, canonical) === HEAD`.
 *
 * Subsequence rather than equality, because the gate legitimately ADDS lines:
 * an import, a comment, an opening tag and a closing tag. Anything V1 had that
 * is now missing or reworded breaks the order and fails.
 */
const V1_BASELINE_FILE = 'scripts/fixtures/buildPageV1.f72571a.txt';
const baselineRaw = read(V1_BASELINE_FILE);
const baseline = baselineRaw
  .slice(baselineRaw.indexOf('--- BEGIN BASELINE ---') + '--- BEGIN BASELINE ---'.length,
    baselineRaw.indexOf('--- END BASELINE ---'))
  .split('\n').map(l => l.trim()).filter(Boolean);
const livePage = read('web/app/build/page.tsx').split('\n').map(l => l.trim());

/*
 * NON-VACUITY, GUARDED IN THE SUITE ITSELF.
 *
 * The one way to hollow this out is to regenerate the fixture from the
 * current page — then «the baseline is a subsequence of the page» is a
 * tautology. A baseline that mentions the gate is a baseline that came from
 * after the gate existed, and is not a baseline.
 */
ok('the pinned V1 baseline predates the preview (it names no gate)',
  !/BuildV2PreviewGate|buildV2/.test(baselineRaw.slice(baselineRaw.indexOf('--- BEGIN BASELINE ---'))));
ok(`the pinned V1 baseline is a real page, not a stub (${baseline.length} lines)`,
  baseline.length > 150);

let cursor = 0;
const missing: string[] = [];
for (const line of baseline) {
  const at = livePage.indexOf(line, cursor);
  if (at === -1) missing.push(line);
  else cursor = at + 1;
}
ok(`every line of the V1 page survives inside the gate `
  + `(missing: ${missing.length ? missing.slice(0, 2).join(' | ') : 'none'})`,
  missing.length === 0);
ok('the /build page still renders its V1 content as the gate\'s children',
  /<BuildV2PreviewGate>/.test(read('web/app/build/page.tsx')));

/*
 * And the other half of «V1 untouched»: nothing outside the preview's own
 * directories imports it. Intrinsic, so it too keeps working after the merge.
 */
const importers = execFileSync('bash', ['-c',
  `grep -rln "build/v2" web/app web/components web/lib src 2>/dev/null || true`],
  { encoding: 'utf8' }).split('\n').filter(Boolean)
  .filter(f => !f.startsWith('web/components/build/v2/') && !f.startsWith('web/lib/build/v2/'));
ok(`only /build/page.tsx reaches into the preview (${importers.join(', ') || 'none'})`,
  JSON.stringify(importers) === JSON.stringify(['web/app/build/page.tsx']));

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

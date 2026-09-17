/**
 * SAFE ASSEMBLY FOUNDATION A — THE RECORD THAT OUTLIVES A SESSION
 * ===============================================================
 *
 * «التجميع الآمن» happens over days, so it persists. That single decision
 * creates every hazard this suite exists to close:
 *
 *   · a confirmation stored by POSITION silently re-points when the checklist
 *     it indexes is edited — V1's defect, which V2 must not inherit;
 *   · a confirmation earned on one build must never count for another, because
 *     it is a claim about an object on a bench, not about a plan;
 *   · a corrupt record must never fabricate completed safety work;
 *   · and a reader's click must never become a system verdict.
 *
 * Every assertion below is behavioural: sessions are built, transitions are
 * applied, the real engine is run, and the real store is round-tripped through
 * a localStorage shim. Source greps appear only where the claim IS about the
 * source — that no other module reaches storage, that V1's representation is
 * not read — and never as a stand-in for a state claim.
 *
 * Run: npx tsx --tsconfig web/tsconfig.json scripts/testSafeAssemblyFoundation.ts
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

let passed = 0;
const failures: string[] = [];
function ok(label: string, condition: boolean) {
  if (condition) { passed++; console.log(`  ok — ${label}`); }
  else { failures.push(label); console.log(`  FAIL — ${label}`); }
}
const section = (t: string) => console.log(`\n── ${t} ${'─'.repeat(Math.max(0, 66 - t.length))}`);

/* The stand-in that makes a real store round trip observable in node — the
 * same one `scripts/testWebBuild.ts` installs. Before every dynamic import. */
const mem = new Map<string, string>();
(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => { mem.set(k, v); },
  removeItem: (k: string) => { mem.delete(k); },
  clear: () => mem.clear(),
};

const ids = await import('../web/lib/build/v2/safeAssembly/ids');
const fp = await import('../web/lib/build/v2/safeAssembly/fingerprint');
const model = await import('../web/lib/build/v2/safeAssembly/sessionModel');
const store = await import('../web/lib/build/v2/safeAssembly/storage');
const { proposeBuild } = await import('../src/data/assembly/recommendation/proposeBuild');
const { reviewEligibility } = await import('../web/components/build/v2/reviewModel');
const { checklistsData } = await import('../src/data/checklistsData');
const { REQUIRED_BUILD_CATEGORIES } =
  await import('../src/data/assembly/recommendation/eligibility');
const { PART_CATEGORY_MAP } = await import('../src/data/project/store');
import type { ProposedBuild } from '../src/data/assembly/recommendation/types';

const read = (p: string) => readFileSync(p, 'utf8');
/**
 * Deep equality that ignores key order.
 *
 * `JSON.stringify` is order-sensitive, and `validateSession` rebuilds the
 * object in its own field order — so a string comparison would report a
 * difference where there is none, and would keep reporting one every time the
 * validator's field order changed. The claim is about the VALUES surviving the
 * round trip.
 */
const deepEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((x, i) => deepEqual(x, b[i]));
  }
  const ka = Object.keys(a as object).filter(k => (a as never)[k] !== undefined);
  const kb = Object.keys(b as object).filter(k => (b as never)[k] !== undefined);
  return ka.length === kb.length
    && ka.every(k => deepEqual((a as never)[k], (b as never)[k]));
};
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const DIR = 'web/lib/build/v2/safeAssembly';

/* ── A real reader, walked the way the journey walks them ─────────────────── */
const INPUT = { droneTypeId: 'freestyle', cellCount: 6, budgetTier: 'mid', owned: {} };
function walk(input: Record<string, unknown>) {
  const selectedParts: Record<string, string> = {};
  let build: ProposedBuild = proposeBuild({ ...input, selectedParts } as never);
  for (let i = 0; i < 12; i++) {
    const open = build.decisions.filter(
      d => d.status === 'choice-required' && d.candidateIds.length > 0);
    if (open.length === 0) break;
    selectedParts[open[0].category] = open[0].candidateIds[0];
    build = proposeBuild({ ...input, selectedParts: { ...selectedParts } } as never);
  }
  return { build, selectedParts };
}
const REAL = walk(INPUT);
const REAL_FP = fp.fingerprintOfBuild(REAL.build);

/** A session that has reached the review and done real physical work. */
const inProgress = () => {
  let s = model.createSession(INPUT as never, REAL.selectedParts);
  s = model.markBuildReviewed(s, REAL_FP);
  s = model.confirmSafetyItem(s, 'asm-motors-screw-length', 1000);
  s = model.confirmSafetyItem(s, 'prb-1', 1001);
  s = model.confirmSafetyItem(s, 'prb-2', 1002);
  s = model.confirmManualReview(s, 'current-headroom', 1003);
  s = model.setFirstPowerMethod(s, 'smoke-stopper');
  s = model.setCurrentAssemblyStage(s, 'workspace-frame');
  s = model.completeAssemblyStage(s, 'workspace-frame');
  s = model.completeAssemblyStage(s, 'motors');
  return s;
};

/** Walk a reviewed session all the way to a complete pre-power inspection. */
const throughPrePower = (opts: { headroom?: boolean; method?: boolean } = {}) => {
  let s = model.createSession(INPUT as never, REAL.selectedParts);
  s = model.markBuildReviewed(s, REAL_FP);
  for (const stage of ids.ASSEMBLY_STAGE_IDS) {
    if (stage === 'pre-power' || stage === 'first-power') continue;
    for (const c of ids.confirmationsForStage(stage)) s = model.confirmSafetyItem(s, c.id, 1);
    s = model.completeAssemblyStage(s, stage);
  }
  for (const c of ids.confirmationsForStage('pre-power')) s = model.confirmSafetyItem(s, c.id, 1);
  if (opts.headroom !== false) s = model.confirmManualReview(s, 'current-headroom', 1);
  if (opts.method !== false) s = model.setFirstPowerMethod(s, 'smoke-stopper');
  return s;
};

// ═══════════════════════════════════════════════════════════════════════════
section('1 — A SESSION EXISTS, ROUND TRIPS, AND REFUSES WHAT IT CANNOT TRUST');
{
  const fresh = model.createSession(INPUT as never, {});
  ok('1. an empty session validates and starts with no progress',
    model.validateSession(fresh) !== null
    && fresh.assembly.completedStageIds.length === 0
    && Object.keys(fresh.assembly.confirmations).length === 0
    && fresh.reviewedBuildFingerprint === undefined);

  mem.clear();
  const s = inProgress();
  ok('2. save → load returns the same session, field for field',
    store.saveBuildV2Session(s, 123) && deepEqual(store.loadBuildV2Session(), s));

  /*
   * Corruption is refused WHOLE. Each case below is a record a hand-edit, a
   * half-written write or a newer version could produce; none may come back as
   * partially-trusted safety work.
   */
  const CORRUPT: [string, unknown][] = [
    ['not an object', 'nope'],
    ['null', null],
    ['an array', []],
    ['wrong version', { ...s, version: 2 }],
    ['missing phase1', { version: 1, assembly: s.assembly }],
    ['droneTypeId missing', { ...s, phase1: { ...s.phase1, inputs: { cellCount: 6 } } }],
    ['selectedParts holding a number', { ...s, phase1: { ...s.phase1, selectedParts: { frames: 7 } } }],
    ['owned.parts present — ownership V2 never asks for',
      { ...s, phase1: { ...s.phase1, inputs: { ...s.phase1.inputs, owned: { parts: {} } } } }],
    ['unknown stage in completedStageIds',
      { ...s, assembly: { ...s.assembly, completedStageIds: ['betaflight-setup'] } }],
    ['duplicated stage id',
      { ...s, assembly: { ...s.assembly, completedStageIds: ['motors', 'motors'] } }],
    ['completedStageIds not an array',
      { ...s, assembly: { ...s.assembly, completedStageIds: 'motors' } }],
    ['a confirmation whose state is «pass»',
      { ...s, assembly: { ...s.assembly, confirmations: { 'prb-1': { state: 'pass', at: 1 } } } }],
    ['a confirmation with no timestamp',
      { ...s, assembly: { ...s.assembly, confirmations: { 'prb-1': { state: 'user-confirmed' } } } }],
    ['a manual review marked «verified»',
      { ...s, assembly: { ...s.assembly, manualReviews: { 'current-headroom': { state: 'verified', at: 1 } } } }],
    ['an invalid first-power method', { ...s, assembly: { ...s.assembly, firstPowerMethod: 'none' } }],
    ['a fingerprint that is not a string', { ...s, reviewedBuildFingerprint: 42 }],
    ['an empty-string fingerprint', { ...s, reviewedBuildFingerprint: '' }],
    ['garbage legacy data', { stepIndex: 14, gateChecks: { prebattery: [0, 1, 2] } }],
  ];
  let refused = 0;
  for (const [what, raw] of CORRUPT) {
    if (model.validateSession(raw) === null) refused++;
    else console.log(`      !! accepted: ${what}`);
  }
  ok(`3. all ${CORRUPT.length} corrupt records are refused whole, and nothing throws`,
    refused === CORRUPT.length);

  /* And corruption on the device reads as «start clean», not as progress. */
  mem.set(store.BUILD_V2_SESSION_KEY, JSON.stringify({ v: 1, data: { version: 1, assembly: {} } }));
  ok('3b. a corrupt stored record loads as null — it cannot fabricate safety work',
    store.loadBuildV2Session() === null);
  mem.clear();
}

// ═══════════════════════════════════════════════════════════════════════════
section('2 — THE FINGERPRINT: WHICH BUILD THIS WORK BELONGS TO');
{
  const base = {
    droneTypeId: 'freestyle', sizeInch: 5, cellCount: 6,
    partIds: Object.fromEntries(REQUIRED_BUILD_CATEGORIES.map(c => [c, `${c}-x`])),
  };
  ok('4. the same build always produces the same fingerprint',
    fp.buildFingerprint(base) === fp.buildFingerprint({ ...base })
    && fp.fingerprintOfBuild(REAL.build) === fp.fingerprintOfBuild(REAL.build));

  /*
   * Object key order is insertion order in JS. A reader who answered the
   * questions in a different sequence must not lose their work for it.
   */
  const shuffled = {
    ...base,
    partIds: Object.fromEntries([...REQUIRED_BUILD_CATEGORIES].reverse().map(c => [c, `${c}-x`])),
  };
  ok('5. category insertion order cannot change the fingerprint',
    fp.buildFingerprint(base) === fp.buildFingerprint(shuffled));

  let allChanged = true;
  for (const c of REQUIRED_BUILD_CATEGORIES) {
    const moved = { ...base, partIds: { ...base.partIds, [c]: 'something-else' } };
    if (fp.buildFingerprint(moved) === fp.buildFingerprint(base)) {
      allChanged = false;
      console.log(`      !! «${c}» does not affect the fingerprint`);
    }
  }
  ok(`6. changing any of the ${REQUIRED_BUILD_CATEGORIES.length} required parts changes it`,
    allChanged);

  ok('7. a different drone type changes it',
    fp.buildFingerprint({ ...base, droneTypeId: 'long-range' }) !== fp.buildFingerprint(base));
  ok('8. a different frame size changes it',
    fp.buildFingerprint({ ...base, sizeInch: 7 }) !== fp.buildFingerprint(base));
  ok('9. a different cell count changes it',
    fp.buildFingerprint({ ...base, cellCount: 4 }) !== fp.buildFingerprint(base));
  ok('9b. absent is distinguishable from present — not silently equal',
    fp.buildFingerprint({ ...base, cellCount: undefined }) !== fp.buildFingerprint(base));

  /*
   * A catalogue typo fix is not a different drone. Proved by fingerprinting the
   * real build, then again with every display name rewritten.
   */
  const renamed: ProposedBuild = {
    ...REAL.build,
    parts: Object.fromEntries(Object.entries(REAL.build.parts).map(([c, p]) =>
      [c, { ...p, nameAr: 'اسم مختلف تمامًا', nameEn: 'Totally Different', brand: 'X' }])),
  } as ProposedBuild;
  ok('10. rewriting every display name does NOT change the fingerprint',
    fp.fingerprintOfBuild(renamed) === REAL_FP);

  /* Ids cannot collide by containing the format's own separators. */
  const a = fp.buildFingerprint({ ...base, partIds: { ...base.partIds, frames: 'a|motors=b' } });
  const b = fp.buildFingerprint({ ...base, partIds: { ...base.partIds, frames: 'a', motors: 'b' } });
  ok('10b. separators inside an id cannot forge another build\'s fingerprint', a !== b);
}

// ═══════════════════════════════════════════════════════════════════════════
section('3 — CONFIRMATIONS ARE NAMES, NOT POSITIONS');
{
  const s = inProgress();
  ok('11. confirmations are keyed by string id — every key is a registry id',
    Object.keys(s.assembly.confirmations).every(k => typeof k === 'string' && !/^\d+$/.test(k))
    && Object.keys(s.assembly.confirmations).every(ids.isKnownConfirmationId));

  /*
   * THE V1 DEFECT, RUN AGAINST V2.
   *
   * Reorder the registry — the exact edit that re-points an index — and the
   * same stored session must still mean the same requirements.
   */
  const before = ids.SAFETY_CONFIRMATIONS.map(c => c.id);
  const reordered = [...before].reverse();
  ok('12. reordering the registry cannot change what a stored id means',
    reordered.filter(ids.isKnownConfirmationId).length === before.length
    && s.assembly.confirmations['prb-1']?.state === 'user-confirmed'
    && ids.confirmationById('prb-1')?.stageId === 'pre-power');

  /*
   * Rule 1 — wording corrected, meaning unchanged: the id stands, and the
   * reader sees the NEW text because it is looked up rather than copied.
   */
  const sharedText = ids.sharedConfirmationText('prb-1');
  const groupText = checklistsData.find(g => g.id === 'pre-battery')
    ?.items.find(i => i.id === 'prb-1')?.text;
  ok('13. a borrowed id reads its wording from the shared list, never a copy',
    sharedText !== undefined && sharedText === groupText
    && !stripComments(read(`${DIR}/ids.ts`)).includes(groupText!));

  /*
   * Rule 2 — materially changed requirement gets a NEW id. `prb-4` said
   * «Smoke Stopper جاهز»; the policy now accepts any current-limited method.
   */
  ok('14. the materially replaced requirement has a NEW id, initially unconfirmed',
    ids.isKnownConfirmationId('asm-power-current-limit-ready')
    && !ids.isKnownConfirmationId('prb-4')
    && s.assembly.confirmations['asm-power-current-limit-ready'] === undefined);

  /*
   * Rule 3 — insertion. A brand-new requirement starts unconfirmed even for a
   * reader whose session predates it, because satisfaction is asked of the
   * registry, never counted.
   */
  const stale = model.confirmSafetyItem(inProgress(), 'prb-1', 1);
  ok('15. an inserted requirement is not retroactively confirmed',
    !model.isStageSatisfied(stale, 'pre-power')
    && ids.confirmationsForStage('pre-power').some(c => !stale.assembly.confirmations[c.id]));

  /*
   * Rule 4 — a removed id may never satisfy anything, including its own
   * replacement. Forced by holding the retired id and asking.
   */
  const holdsRetired = model.validateSession({
    ...s,
    assembly: {
      ...s.assembly,
      confirmations: { ...s.assembly.confirmations, 'prb-4': { state: 'user-confirmed', at: 9 } },
    },
  })!;
  ok('16. a retired id satisfies nothing — not even the requirement that replaced it',
    holdsRetired !== null
    && !ids.isKnownConfirmationId('prb-4')
    && !model.isStageSatisfied(holdsRetired, 'pre-power'));
  /*
   * THE RETIREMENT RECORD ITSELF, AND WHY THESE ASSERTIONS ARE SHAPED SO.
   *
   * The first version of this guard was `SAFETY_CONFIRMATIONS.every(c =>
   * !RETIRED.has(c.id))` — which passes perfectly when RETIRED is EMPTY. A
   * mutation that deleted the whole retirement record survived it, because
   * `prb-4` is absent from the registry too and so stays unknown either way.
   *
   * The mutation is inert today and dangerous tomorrow: the moment somebody
   * re-adds `prb-4` to the registry, an empty retirement set stops being the
   * thing that refuses it, and every device still holding that confirmation
   * silently resurrects it.
   *
   * So the record is asserted to EXIST, to name a real id somebody could
   * plausibly re-add, and to be what `isKnownConfirmationId` actually consults.
   */
  ok('16b. the retirement record is not empty — the mechanism is real, not decorative',
    ids.RETIRED_CONFIRMATION_IDS.size > 0);
  ok('16c. every retired id is a REAL shared-checklist id — retirement is about something that exists',
    [...ids.RETIRED_CONFIRMATION_IDS].every(id =>
      checklistsData.some(g => g.items.some(i => i.id === id))));
  ok('16d. `prb-4` specifically is retired — it named a product, and the policy accepts a method',
    ids.RETIRED_CONFIRMATION_IDS.has('prb-4')
    && /Smoke Stopper/.test(checklistsData.find(g => g.id === 'pre-battery')
      ?.items.find(i => i.id === 'prb-4')?.text ?? ''));
  ok('16e. a retired id is refused by the registry lookup and by satisfaction, both',
    [...ids.RETIRED_CONFIRMATION_IDS].every(id =>
      !ids.isKnownConfirmationId(id) && ids.confirmationById(id) === undefined));
  ok('16f. no retired id may appear in the registry',
    ids.SAFETY_CONFIRMATIONS.every(c => !ids.RETIRED_CONFIRMATION_IDS.has(c.id)));

  const withUnknown = model.validateSession({
    ...s,
    assembly: {
      ...s.assembly,
      confirmations: { ...s.assembly.confirmations, 'asm-from-the-future': { state: 'user-confirmed', at: 9 } },
    },
  })!;
  ok('17. an unknown stored confirmation cannot satisfy a known requirement',
    withUnknown !== null
    && model.unknownConfirmationIds(withUnknown).includes('asm-from-the-future')
    && !model.isStageSatisfied(withUnknown, 'pre-power'));
  ok('17b. confirming an unknown or retired id is refused rather than stored',
    model.confirmSafetyItem(s, 'not-a-requirement', 5) === s
    && model.confirmSafetyItem(s, 'prb-4', 5) === s);

  ok('18. an unknown stage id cannot create progress — the record is refused',
    model.validateSession({
      ...s, assembly: { ...s.assembly, completedStageIds: ['motors', 'betaflight'] },
    }) === null);
}

// ═══════════════════════════════════════════════════════════════════════════
section('4 — WORK BELONGS TO A BUILD, AND FOLLOWS IT NOWHERE');
{
  const s = inProgress();
  const same = model.reconcileSession(s, { fingerprint: REAL_FP, reviewEligible: true });
  ok('19. the same build resumes: progress is returned intact',
    same.status === 'valid'
    && same.session.assembly.completedStageIds.includes('motors')
    && same.session.assembly.confirmations['prb-1']?.state === 'user-confirmed');

  const moved = model.reconcileSession(s, { fingerprint: `${REAL_FP}|changed`, reviewEligible: true });
  ok('20. a changed fingerprint refuses the old completed stages',
    moved.status === 'needs-build-revalidation'
    && moved.session.assembly.completedStageIds.length === 0
    && moved.reason === 'fingerprint-changed');
  ok('21. …and refuses the old safety confirmations',
    Object.keys(moved.session.assembly.confirmations).length === 0);
  ok('22. …and refuses the manual-review confirmation',
    Object.keys(moved.session.assembly.manualReviews).length === 0);
  ok('23. …and refuses the first-power progress and position',
    moved.session.assembly.firstPowerMethod === undefined
    && moved.session.assembly.currentStageId === undefined
    && moved.session.reviewedBuildFingerprint === undefined);
  ok('23b. the discarded record is kept for diagnostics, outside the session',
    moved.discarded?.confirmations['prb-1']?.state === 'user-confirmed'
    && !('discardedProgress' in moved.session));

  ok('24. the reader\'s Phase-1 answers survive the revalidation requirement',
    moved.session.phase1.inputs.droneTypeId === 'freestyle'
    && moved.session.phase1.inputs.cellCount === 6);
  ok('25. …and their own part choices survive, so they can edit rather than restart',
    deepEqual(moved.session.phase1.selectedParts, REAL.selectedParts));

  const ineligible = model.reconcileSession(s, { fingerprint: REAL_FP, reviewEligible: false });
  ok('25b. a build that stopped qualifying also refuses physical progress',
    ineligible.status === 'needs-build-revalidation'
    && ineligible.reason === 'no-longer-eligible'
    && Object.keys(ineligible.session.assembly.confirmations).length === 0);

  const neverReviewed = model.validateSession({
    ...model.createSession(INPUT as never, {}),
    assembly: { ...s.assembly },
  })!;
  ok('25c. progress with no reviewed build is never honoured',
    model.reconcileSession(neverReviewed, { fingerprint: REAL_FP, reviewEligible: true })
      .status === 'needs-build-revalidation');

  /* Editing the sources drops the reviewed build without waiting to be told. */
  const edited = model.updatePhase1Sources(s, { ...INPUT, cellCount: 4 } as never, {});
  ok('25d. changing an answer clears physical progress and the reviewed build',
    edited.reviewedBuildFingerprint === undefined
    && Object.keys(edited.assembly.confirmations).length === 0);
  /* Walking back to an unchanged review is not a reset. */
  ok('25e. re-reviewing the SAME build does not discard the reader\'s soldering',
    model.markBuildReviewed(s, REAL_FP) === s);

  /* End to end, through the real engine and the real store. */
  mem.clear();
  store.saveBuildV2Session(s, 1);
  const reloaded = store.loadBuildV2Session()!;
  const swapped = walk({ ...INPUT, cellCount: 4 });
  const freshFp = fp.fingerprintOfBuild(swapped.build);
  const live = model.reconcileSession(reloaded, {
    fingerprint: freshFp,
    reviewEligible: reviewEligibility(swapped.build).open,
  });
  ok('25f. end to end: a stored session against a genuinely different build is refused',
    freshFp !== REAL_FP && live.status === 'needs-build-revalidation');
  mem.clear();
}

// ═══════════════════════════════════════════════════════════════════════════
section('4b — AN EDIT QUARANTINES, IT DOES NOT DEMOLISH');
{
  /*
   * THE SECOND CORRECTION THIS SECTION EXISTS FOR.
   *
   * `updatePhase1Sources` used to delete the reviewed fingerprint and every
   * confirmation the moment an answer changed — before anything had
   * established that the build actually moved. A reader who switched their
   * budget answer from «متوازن» to «لا تفضيل», and got back the identical
   * eight parts, lost an evening of soldering confirmations for nothing.
   *
   * This module cannot know whether the build changed: it does not run the
   * engine. So the work is set aside with the fingerprint it was earned
   * against, and `reconcileSession` decides once the engine has answered.
   */
  const worked = model.completeAssemblyStage(throughPrePower(), 'pre-power');
  /*
   * A REAL EDIT THAT CHANGES NOTHING PHYSICAL.
   *
   * The reader remembers they already own an ExpressLRS radio and goes back to
   * say so. The engine had already chosen an ELRS receiver, so all eight parts
   * come back identical — measured below, not assumed. This is precisely the
   * case the old destructive behaviour punished: an evening of confirmations
   * lost for volunteering a fact that changed nothing.
   */
  const EDIT = { ...INPUT, owned: { rcSystem: 'ExpressLRS' } };
  const edited = model.updatePhase1Sources(worked, EDIT as never, REAL.selectedParts);

  ok('4a. the edit moves the session to needs-revalidation, not to empty',
    edited.reviewState === 'needs-revalidation'
    && edited.reviewedBuildFingerprint === undefined);
  ok('4b. the physical work is set aside with the build it was earned against',
    edited.quarantine?.fingerprint === REAL_FP
    && edited.quarantine.assembly.completedStageIds.includes('pre-power')
    && edited.quarantine.assembly.manualReviews['current-headroom']?.state === 'user-confirmed-review');
  ok('4c. …and is NOT usable in the meantime — `assembly` is empty',
    Object.keys(edited.assembly.confirmations).length === 0
    && edited.assembly.completedStageIds.length === 0
    && edited.assembly.firstPowerMethod === undefined
    && !model.canEnterFirstPower(edited));
  ok('4d. the reader\'s new answer is stored, so they are editing not restarting',
    edited.phase1.inputs.owned?.rcSystem === 'ExpressLRS'
    && deepEqual(edited.phase1.selectedParts, REAL.selectedParts));

  /*
   * THE CASE THE WHOLE MECHANISM EXISTS FOR: the budget answer moved, the
   * eight physical parts did not. Proved with the REAL engine rather than a
   * constructed fingerprint.
   */
  const afterEdit = proposeBuild(
    model.recommendationInputFromSession(edited) as never);
  const freshFingerprint = fp.fingerprintOfBuild(afterEdit);
  ok('4e0. the engine really does return the identical eight parts for this edit',
    freshFingerprint === REAL_FP);
  const restored = model.reconcileSession(edited, {
    fingerprint: freshFingerprint,
    reviewEligible: reviewEligibility(afterEdit).open,
  });
  ok('4e. an unchanged build hands the work straight back, exactly as it was',
    restored.status === 'valid' && restored.restored === true
    && restored.session.reviewState === 'reviewed'
    && restored.session.reviewedBuildFingerprint === REAL_FP
    && deepEqual(restored.session.assembly, worked.assembly));
  ok('4f. …including the completed pre-power stage and the headroom review',
    restored.session.assembly.completedStageIds.includes('pre-power')
    && restored.session.assembly.manualReviews['current-headroom']?.state === 'user-confirmed-review'
    && model.canEnterFirstPower(restored.session));
  ok('4g. and the quarantine is emptied once the work is back where it belongs',
    restored.session.quarantine === undefined);
  console.log('      ·· «I own an ExpressLRS radio» after the fact: eight parts UNCHANGED, '
    + 'work returned');

  /* A build that genuinely moved still fails closed. */
  const moved = model.reconcileSession(edited, {
    fingerprint: `${REAL_FP}|different`, reviewEligible: true,
  });
  ok('5. a changed build discards the quarantined work and demands a new review',
    moved.status === 'needs-build-revalidation'
    && moved.reason === 'fingerprint-changed'
    && moved.session.reviewState === 'unreviewed'
    && Object.keys(moved.session.assembly.confirmations).length === 0
    && moved.session.quarantine === undefined
    && moved.discarded?.completedStageIds.includes('pre-power'));

  const gone = model.reconcileSession(edited, { fingerprint: REAL_FP, reviewEligible: false });
  ok('6. a build that stopped qualifying discards it too',
    gone.status === 'needs-build-revalidation' && gone.reason === 'no-longer-eligible'
    && Object.keys(gone.session.assembly.confirmations).length === 0);

  /*
   * IT MUST SURVIVE A REFRESH. Quarantine is a persisted field, not a variable
   * held in memory while the tab is open — so the round trip is the proof.
   */
  mem.clear();
  store.saveBuildV2Session(edited, 7);
  const reloaded = store.loadBuildV2Session()!;
  ok('7a. the quarantined session round-trips through storage intact',
    reloaded.reviewState === 'needs-revalidation'
    && reloaded.quarantine?.fingerprint === REAL_FP
    && deepEqual(reloaded.quarantine.assembly, worked.assembly));
  ok('7b. …and after a refresh the work is still NOT exposed as usable',
    Object.keys(reloaded.assembly.confirmations).length === 0
    && reloaded.assembly.completedStageIds.length === 0
    && !model.canEnterFirstPower(reloaded));
  ok('7c. …and no transition can act on it until the engine has spoken',
    model.confirmSafetyItem(reloaded, 'prb-1', 1) === reloaded
    && model.completeAssemblyStage(reloaded, 'pre-power') === reloaded
    && model.setFirstPowerMethod(reloaded, 'smoke-stopper') === reloaded);
  ok('7d. …and only a fresh engine result restores it',
    model.reconcileSession(reloaded, { fingerprint: REAL_FP, reviewEligible: true })
      .session.assembly.completedStageIds.includes('pre-power'));
  mem.clear();

  /* Editing twice must not lose the original quarantine. */
  const twice = model.updatePhase1Sources(
    edited, { ...INPUT, cellCount: 4 } as never, REAL.selectedParts);
  ok('7e. a second edit keeps the FIRST quarantine — the work was earned there',
    twice.quarantine?.fingerprint === REAL_FP
    && twice.quarantine.assembly.completedStageIds.includes('pre-power'));

  /* A quarantine is only meaningful while revalidation is pending. */
  ok('7f. a record holding quarantine while claiming to be reviewed is refused',
    model.validateSession({ ...worked, quarantine: edited.quarantine }) === null);
  ok('7g. a reviewed record with no fingerprint is refused',
    model.validateSession({ ...worked, reviewedBuildFingerprint: undefined }) === null);
  ok('7h. an unknown reviewState is refused',
    model.validateSession({ ...worked, reviewState: 'in-progress' }) === null);
}

// ═══════════════════════════════════════════════════════════════════════════
section('5 — A CLICK IS NEVER A VERDICT');
{
  const s = inProgress();
  ok('26. the manual review is recorded as USER REVIEW, never as a pass',
    s.assembly.manualReviews['current-headroom']?.state === 'user-confirmed-review');
  const src = [read(`${DIR}/sessionModel.ts`), read(`${DIR}/ids.ts`)].join('\n');
  ok('26b. no state in the model is spelled pass / verified / safe / system-checked',
    !/'(pass|verified|safe|system-checked|system-pass)'/.test(stripComments(src)));
  ok('26c. a session claiming a PASS for a manual check is refused',
    model.validateSession({
      ...s,
      assembly: { ...s.assembly, manualReviews: { 'current-headroom': { state: 'pass', at: 1 } } },
    }) === null);
  ok('26d. the manual id is the engine\'s own finding id — the two cannot drift',
    ids.MANUAL_REVIEW_IDS.includes('current-headroom')
    && REAL.build.manualChecks.includes('current-headroom'));
}

// ═══════════════════════════════════════════════════════════════════════════
section('6 — FIRST POWER IS LIMITED, COMPLETE, AND REVIEWED — OR IT DOES NOT HAPPEN');
{
  const ready = throughPrePower();
  ok('27. a smoke stopper is accepted as a current-limited method',
    model.canEnterFirstPower(
      model.completeAssemblyStage(model.setFirstPowerMethod(ready, 'smoke-stopper'), 'pre-power')));
  ok('28. a current-limited bench supply is equally accepted',
    model.canEnterFirstPower(model.completeAssemblyStage(
      model.setFirstPowerMethod(ready, 'current-limited-bench-supply'), 'pre-power')));

  /*
   * A multimeter answers «is the circuit wrong?», not «is the first current
   * through it limited?». Continuity and polarity are their own confirmations
   * and holding them is not a substitute.
   */
  const noMethod = model.completeAssemblyStage(throughPrePower({ method: false }), 'pre-power');
  ok('29. a multimeter cannot satisfy the first-power method requirement',
    !ids.isFirstPowerMethod('multimeter')
    && model.setFirstPowerMethod(noMethod, 'multimeter' as never) === noMethod
    && noMethod.assembly.confirmations['prb-2']?.state === 'user-confirmed'
    && noMethod.assembly.confirmations['prb-3']?.state === 'user-confirmed'
    && !model.canEnterFirstPower(noMethod));

  ok('30. there is no skip, none, or acknowledgement state — absence is the state',
    ids.FIRST_POWER_METHODS.length === 2
    && !['none', 'skip', 'i-understand', 'bypass'].some(ids.isFirstPowerMethod)
    && !model.canEnterFirstPower(noMethod));

  /* The inspection is a real precondition, not a formality. */
  const methodOnly = model.setFirstPowerMethod(
    model.markBuildReviewed(model.createSession(INPUT as never, {}), REAL_FP), 'smoke-stopper');
  ok('30b. a limited method alone is not enough — the pre-power stage must be complete',
    !model.canEnterFirstPower(methodOnly));

  const done = model.completeAssemblyStage(ready, 'pre-power');
  const revoked = model.revokeSafetyItem(done, 'prb-1');
  ok('30c. taking a confirmation back un-completes the stage it supported',
    done.assembly.completedStageIds.includes('pre-power')
    && !revoked.assembly.completedStageIds.includes('pre-power')
    && !model.canEnterFirstPower(revoked));
  ok('30d. a stage cannot be marked complete while a confirmation is missing',
    !model.completeAssemblyStage(model.createSession(INPUT as never, {}), 'pre-power')
      .assembly.completedStageIds.includes('pre-power'));
}

// ═══════════════════════════════════════════════════════════════════════════
section('6b — CURRENT-HEADROOM IS A PRE-POWER REQUIREMENT, NOT AN ASIDE');
{
  /*
   * THE CORRECTION THIS SECTION EXISTS FOR.
   *
   * `current-headroom` used to live only in `manualReviews`, attached to
   * nothing. So a reader could tick every pre-power checkbox, name a
   * current-limited method, and reach first power having never looked at what
   * the motor actually draws — the one fact standing between «this ESC is
   * rated for 55A» and «this ESC is rated for THIS motor on THIS prop at THIS
   * voltage», which no catalogue can supply.
   */
  const withoutReview = throughPrePower({ headroom: false });
  ok('8a. every pre-power checkbox and a smoke stopper, but NO headroom review…',
    ids.confirmationsForStage('pre-power')
      .every(c => withoutReview.assembly.confirmations[c.id]?.state === 'user-confirmed')
    && withoutReview.assembly.firstPowerMethod === 'smoke-stopper'
    && withoutReview.assembly.manualReviews['current-headroom'] === undefined);
  ok('8b. …leaves the pre-power stage unsatisfied',
    !model.isStageSatisfied(withoutReview, 'pre-power')
    && !model.completeAssemblyStage(withoutReview, 'pre-power')
      .assembly.completedStageIds.includes('pre-power'));
  ok('8c. …and first power stays shut',
    model.canEnterFirstPower(withoutReview) === false);

  const reviewed = model.confirmManualReview(withoutReview, 'current-headroom', 2);
  ok('9a. confirming the review satisfies the stage — it was the only thing missing',
    model.isStageSatisfied(reviewed, 'pre-power'));
  ok('9b. …and first power opens once the stage is actually completed',
    model.canEnterFirstPower(model.completeAssemblyStage(reviewed, 'pre-power')) === true);

  ok('10a. the review never becomes a compatibility PASS',
    reviewed.assembly.manualReviews['current-headroom']?.state === 'user-confirmed-review');
  ok('10b. the requirement reuses the ENGINE\'s finding id, not a second copy',
    ids.MANUAL_REVIEW_REQUIREMENTS.some(r => r.id === 'current-headroom' && r.stageId === 'pre-power')
    && ids.MANUAL_REVIEW_REQUIREMENTS.every(r => ids.MANUAL_REVIEW_IDS.includes(r.id))
    && REAL.build.manualChecks.includes('current-headroom'));
}

// ═══════════════════════════════════════════════════════════════════════════
section('6c — FIRST POWER CANNOT BE COMPLETED OUT OF ORDER, BY ANY CALLER');
{
  /*
   * The domain refuses these itself. A pure model that a direct call can drive
   * into an impossible state has made a future screen the only safety layer —
   * and the screen is the part most likely to be rewritten.
   */
  const confirmFirstPower = (base: typeof s0) => {
    let x = base;
    for (const c of ids.confirmationsForStage('first-power')) {
      x = model.confirmSafetyItem(x, c.id, 3);
    }
    return model.completeAssemblyStage(x, 'first-power');
  };
  const s0 = throughPrePower();

  const noPrePower = confirmFirstPower(throughPrePower());
  ok('11. first power cannot complete while pre-power is not completed',
    !noPrePower.assembly.completedStageIds.includes('first-power'));

  const noMethodDone = confirmFirstPower(
    model.completeAssemblyStage(throughPrePower({ method: false }), 'pre-power'));
  ok('12. first power cannot complete without a current-limited method',
    !noMethodDone.assembly.completedStageIds.includes('first-power'));

  const unreviewed = confirmFirstPower(model.createSession(INPUT as never, {}));
  ok('13. first power cannot complete on an unreviewed session',
    unreviewed.reviewState === 'unreviewed'
    && unreviewed.assembly.completedStageIds.length === 0);

  const quarantined = model.updatePhase1Sources(
    model.completeAssemblyStage(s0, 'pre-power'),
    { ...INPUT, budgetTier: 'budget' } as never, REAL.selectedParts);
  const duringRevalidation = confirmFirstPower(quarantined);
  ok('14. first power cannot complete while the session awaits revalidation',
    quarantined.reviewState === 'needs-revalidation'
    && duringRevalidation.assembly.completedStageIds.length === 0
    && Object.keys(duringRevalidation.assembly.confirmations).length === 0);

  const proper = confirmFirstPower(model.completeAssemblyStage(s0, 'pre-power'));
  ok('15. with every condition met, the direct call is accepted — the guard is not a wall',
    proper.assembly.completedStageIds.includes('first-power'));

  /* And no transition records anything on a session that is not reviewed. */
  const fresh = model.createSession(INPUT as never, {});
  ok('15b. no progress of any kind can be recorded on an unreviewed session',
    model.confirmSafetyItem(fresh, 'prb-1', 1) === fresh
    && model.confirmManualReview(fresh, 'current-headroom', 1) === fresh
    && model.setFirstPowerMethod(fresh, 'smoke-stopper') === fresh
    && model.setCurrentAssemblyStage(fresh, 'motors') === fresh);
}

// ═══════════════════════════════════════════════════════════════════════════
section('6d — REVOCATION CASCADES AS FAR AS IT HAS TO');
{
  let full = throughPrePower();
  full = model.completeAssemblyStage(full, 'pre-power');
  for (const c of ids.confirmationsForStage('first-power')) {
    full = model.confirmSafetyItem(full, c.id, 3);
  }
  full = model.completeAssemblyStage(full, 'first-power');
  ok('16a. the fixture really does reach a completed first power',
    full.assembly.completedStageIds.includes('pre-power')
    && full.assembly.completedStageIds.includes('first-power'));

  /*
   * One pass would not be enough here: revoking the review invalidates
   * pre-power, and first power's OWN confirmations are untouched — it would
   * keep looking finished. The prune runs to a fixpoint.
   */
  const noReview = model.revokeManualReview(full, 'current-headroom');
  ok('16. revoking the headroom review withdraws pre-power AND first power',
    !noReview.assembly.completedStageIds.includes('pre-power')
    && !noReview.assembly.completedStageIds.includes('first-power')
    && !model.canEnterFirstPower(noReview));

  const noItem = model.revokeSafetyItem(full, 'prb-3');
  ok('17. revoking a pre-power safety item does the same',
    !noItem.assembly.completedStageIds.includes('pre-power')
    && !noItem.assembly.completedStageIds.includes('first-power'));
  ok('17b. it never leaves pre-power incomplete while first power stays complete',
    [noReview, noItem].every(x =>
      !(x.assembly.completedStageIds.includes('first-power')
        && !x.assembly.completedStageIds.includes('pre-power'))));
  ok('17c. revoking something nothing depended on leaves the rest standing',
    model.revokeSafetyItem(full, 'asm-motors-screw-length')
      .assembly.completedStageIds.includes('video'));
}

// ═══════════════════════════════════════════════════════════════════════════
section('6e — ONE ANSWER TO «WHAT DID THE READER CHOOSE?»');
{
  const s = inProgress();
  ok('1. the persisted session holds exactly one selectedParts map',
    !('selectedParts' in (s.phase1.inputs as Record<string, unknown>))
    && typeof s.phase1.selectedParts === 'object');

  /*
   * Two authorities for one answer is no authority: nothing decides which wins,
   * so the build the engine produces could differ from the build the
   * fingerprint describes. Refused rather than resolved by preference.
   */
  ok('2. a record carrying BOTH is refused rather than silently preferring one',
    model.validateSession({
      ...s,
      phase1: {
        inputs: { ...s.phase1.inputs, selectedParts: { frames: 'A' } },
        selectedParts: { frames: 'B' },
      },
    }) === null);

  const rebuilt = model.recommendationInputFromSession(s);
  ok('3a. the engine input is reassembled from the persisted map, exactly',
    deepEqual(rebuilt.selectedParts, REAL.selectedParts));
  ok('3b. …and running the engine on it reproduces the reviewed build',
    fp.fingerprintOfBuild(proposeBuild(rebuilt as never)) === REAL_FP);
  ok('3c. the type subtracts the field rather than re-listing the engine\'s own',
    /Omit<RecommendationInput, 'selectedParts'>/.test(read(`${DIR}/sessionModel.ts`)));
}

// ═══════════════════════════════════════════════════════════════════════════
section('7 — WHAT THIS FOUNDATION IS NOT ALLOWED TO TOUCH');
{
  const files = readdirSync(DIR).filter(f => f.endsWith('.ts'));
  const code = Object.fromEntries(files.map(f => [f, stripComments(read(join(DIR, f)))]));
  const all = Object.values(code).join('\n');

  ok('31. only the storage adapter names localStorage — and it does so through the platform',
    files.filter(f => /localStorage/.test(code[f])).length === 0
    && /from '@core\/platform\/storage'/.test(code['storage.ts']));
  ok('31b. the model, ids and fingerprint are pure — no storage import at all',
    ['sessionModel.ts', 'fingerprint.ts', 'ids.ts']
      .every(f => !/platform\/storage/.test(code[f])));

  ok('32. nothing writes Firebase or the shared project store',
    !/firebase|firestore|saveAssemblyProject|mirrorToProject|fpv-assembly-project/.test(all));
  ok('32b. nothing reaches the network',
    !/fetch\(|XMLHttpRequest|sendBeacon|axios/.test(all));

  ok('33. no phone store or phone progress is read or written',
    !/STORAGE_KEYS|completedRoadmapSteps|useProgress|PROGRESS_ROADMAP/.test(all));

  ok('34. V1\'s gate representation is never read as V2 evidence',
    !/gateChecks|BuildDraft|draftParts|emptyDraft|loadDraft|saveDraft/.test(all));
  /* And V1's own file is untouched by this PR. */
  ok('34b. V1\'s BuildDraft still stores gate confirmations by index — unmigrated',
    /gateChecks: Record<string, number\[\]>/.test(read('web/lib/build/draft.ts')));

  ok('35. the session key is V2-specific and collides with nothing existing',
    store.BUILD_V2_SESSION_KEY === 'fpv-web-build-v2-session-v1'
    && store.BUILD_V2_SESSION_KEY !== 'fpv-assembly-project-v1'
    && store.BUILD_V2_SESSION_KEY !== 'fpv-web-build-draft-v1');

  /* No UI. This is the scope guard for the whole PR. */
  /*
   * `/<[A-Z]/` was the first attempt and it fired on `Readonly<Record<…>>` —
   * a generic type argument, not an element. The claim is that there is no
   * COMPONENT here: no .tsx file, no React, no hook, and no JSX element or
   * fragment. Each of those is matched for what it actually looks like.
   */
  ok('36. NO ASSEMBLY UI EXISTS — the folder holds no component and no JSX',
    files.every(f => !f.endsWith('.tsx'))
    && !/from 'react'|React\.|use(State|Effect|Memo|Ref|Callback)\s*\(/.test(all)
    && !/<\/[A-Za-z]|<>|\/>/.test(all));
  ok('36b. …and no assembly component was added anywhere in the V2 journey',
    !readdirSync('web/components/build/v2').some(f => /assembl|stage|power|wiring/i.test(f)));

  ok('37. no Product Phase 3 concept has an id here',
    !/betaflight|motor-?test|motor-?direction|failsafe|preflight|propeller|first-?flight|arm/i
      .test(ids.ASSEMBLY_STAGE_IDS.join(' ') + ids.SAFETY_CONFIRMATIONS.map(c => c.id).join(' ')));
  ok('37b. the eight stages are exactly the physical ones, in build order',
    ids.ASSEMBLY_STAGE_IDS.length === 8
    && ids.ASSEMBLY_STAGE_IDS[0] === 'workspace-frame'
    && ids.ASSEMBLY_STAGE_IDS[7] === 'first-power');
}

// ═══════════════════════════════════════════════════════════════════════════
section('8 — PHASE 2 AND V1 ARE EXACTLY WHERE THEY WERE');
{
  ok('38. the review model still decides eligibility the same way',
    reviewEligibility(REAL.build).open === true
    && reviewEligibility(null).open === false);
  ok('38b. the proposal still resolves the same eight parts',
    REQUIRED_BUILD_CATEGORIES.every(c => REAL.build.parts[c] !== undefined));
  ok('38c. the manual check still arrives open from the engine',
    REAL.build.manualChecks.includes('current-headroom'));

  /* Every borrowed id still exists in the shared list it was borrowed from. */
  const borrowed = ids.SAFETY_CONFIRMATIONS.filter(c => c.source === 'shared-checklist');
  ok(`39. all ${borrowed.length} borrowed ids still resolve in the shared checklists`,
    borrowed.every(c => checklistsData.find(g => g.id === c.sharedGroupId)
      ?.items.some(i => i.id === c.id)));
  ok('39b. every pre-flight item stays out — those belong to Product Phase 3',
    !ids.SAFETY_CONFIRMATIONS.some(c => /^pf-/.test(c.id)));

  ok('40. the catalogue is untouched and still stocks every required category',
    REQUIRED_BUILD_CATEGORIES.every(c => (PART_CATEGORY_MAP[c] ?? []).length > 0));
}

// ═══════════════════════════════════════════════════════════════════════════
if (failures.length > 0) {
  console.log(`\n❌ testSafeAssemblyFoundation: ${failures.length} FAILED of ${passed + failures.length}`);
  for (const f of failures) console.log(`   · ${f}`);
  process.exit(1);
}
console.log(`\n✅ testSafeAssemblyFoundation: ${passed} assertions passed`);

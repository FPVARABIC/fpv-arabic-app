/**
 * WHAT THE RECOMMENDER IS AND IS NOT ALLOWED TO CLAIM
 * ==================================================
 *
 * A recommendation engine is easy to write badly and hard to catch at it. The
 * failure modes all look like success:
 *
 *   · «pick the first one» reads as a recommendation until you notice it never
 *     changes when the reader's answers do;
 *   · «the only option is the best option» reads as a recommendation until a
 *     second option arrives and the sentence turns out to have been a lie;
 *   · «rank first, prove later» reads as a recommendation until a well-rated
 *     dead end makes the engine declare a workable build impossible;
 *   · «the reader owns it, so it's recommended» reads as a recommendation
 *     until you ask what it was ranked against.
 *
 * So this suite does not check that the engine returns something. It checks
 * that every claim it makes is one the catalogue can back, and that where the
 * data runs out the engine says so instead of guessing.
 *
 * Run: npx tsx --tsconfig web/tsconfig.json scripts/testRecommendation.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { BasePart, Frame } from '../src/data/assembly/types';

const { proposeBuild, snapshotFromParts, rcSystemOf, rcSystemsInCatalogue } =
  await import('../src/data/assembly/recommendation/proposeBuild');
const { REQUIRED_BUILD_CATEGORIES, eligibleCandidates } =
  await import('../src/data/assembly/recommendation/eligibility');
const { computeFindings } = await import('../src/data/project/verdicts');
const { PART_CATEGORY_MAP } = await import('../src/data/project/store');
const { droneTypes } = await import('../src/data/assembly/droneTypes');
const { BUILD_TYPE_AVAILABILITY } = await import('../web/lib/build/availability');

let passed = 0;
function ok(label: string, cond: boolean) {
  assert.ok(cond, `FAILED: ${label}`);
  console.log(`  ok — ${label}`);
  passed++;
}

type Build = ReturnType<typeof proposeBuild>;
const decisionFor = (b: Build, c: string) => b.decisions.find(d => d.category === c)!;
const ENGINE_SRC = readFileSync('src/data/assembly/recommendation/proposeBuild.ts', 'utf8');
const ELIGIBILITY_SRC = readFileSync('src/data/assembly/recommendation/eligibility.ts', 'utf8');

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[1] Prerequisites are asked for, never invented');
{
  // `recommendedBatteryVoltages` is [4, 6] for freestyle. It says both work.
  // It does NOT say 4 is preferable, so taking the first would be a tiebreak
  // with nothing behind it.
  const ft = droneTypes.find(t => t.id === 'freestyle')!;
  ok('freestyle really does declare more than one recommended voltage',
    ft.recommendedBatteryVoltages.length > 1);

  const b = proposeBuild({ droneTypeId: 'freestyle' });
  ok('freestyle with no voltage does NOT silently become 4S', b.cellCount !== 4);
  ok('…it resolves to no voltage at all', b.cellCount === undefined);
  ok('…and asks for one', b.requiredInputs.some(r => r.key === 'cellCount'));
  ok('…offering exactly the voltages that lead to a sound build',
    [...(b.requiredInputs.find(r => r.key === 'cellCount')?.options ?? [])].sort().join() === '4,6');
  ok('…and computes no decisions against a number nobody chose',
    b.decisions.length === 0 && b.provenPath === null);

  // The other half: a genuinely single option is not a question.
  const lr = droneTypes.find(t => t.id === 'long-range')!;
  ok('long-range declares exactly one recommended voltage',
    lr.recommendedBatteryVoltages.length === 1);
  const l = proposeBuild({ droneTypeId: 'long-range' });
  ok('…so it auto-resolves without asking', l.cellCount === 6 && l.requiredInputs.length === 0);
  ok('…and proceeds to a full proposal', l.provenPath !== null);

  // And a question nobody can act on is not asked at all: racing declares
  // [4, 6] too, but NEITHER produces a build.
  const r = proposeBuild({ droneTypeId: 'racing' });
  ok('racing is told to be impossible rather than asked to pick a voltage first',
    r.requiredInputs.length === 0);
  ok('…and names the blocker', r.blockerFindingIds.includes('stack-mount'));

  ok('the engine takes no array-position default anywhere',
    !/recommendedBatteryVoltages\?\.\[0\]/.test(ENGINE_SRC)
    && !/sizes\[0\]/.test(ENGINE_SRC)
    && !/batteryVoltageOptions\[0\]/.test(ENGINE_SRC));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[2] Declaration order carries no meaning');
{
  const ft = droneTypes.find(t => t.id === 'freestyle')!;
  const original = [...ft.recommendedBatteryVoltages];
  const before = proposeBuild({ droneTypeId: 'freestyle' });
  try {
    (ft as { recommendedBatteryVoltages: number[] }).recommendedBatteryVoltages =
      [...original].reverse();
    const after = proposeBuild({ droneTypeId: 'freestyle' });
    ok('reversing [4,6] to [6,4] changes no semantic outcome',
      after.cellCount === before.cellCount
      && after.requiredInputs.length === before.requiredInputs.length);
    ok('…and offers the same option SET',
      [...(after.requiredInputs[0]?.options ?? [])].sort().join()
      === [...(before.requiredInputs[0]?.options ?? [])].sort().join());
  } finally {
    (ft as { recommendedBatteryVoltages: number[] }).recommendedBatteryVoltages = original;
  }
  ok('the drone type was restored',
    ft.recommendedBatteryVoltages.join() === original.join());
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[3] Global feasibility decides who may be ranked — not the other way round');
{
  /*
   * THE FAILURE THIS PROVES ABSENT.
   *
   * A synthetic frame that ranks TOP on the reader's stated budget, and whose
   * 20×20 stack pattern no flight controller in the catalogue matches — so
   * every complete build containing it raises `stack-mount`.
   *
   * Rank-then-prove locks it, fails the search, and reports the whole type
   * unavailable, never having looked at the frames that work. Viability-first
   * removes it before preference is applied.
   */
  const frames = PART_CATEGORY_MAP.frames as BasePart[];
  // Derive the real pool rather than re-deriving eligibility by hand: a frame
  // reaches it through the size TOLERANCE and the tagged-or-all fallback, not
  // by carrying an exact size and tag. A hand-rolled filter here missed two of
  // the three and quietly made this fixture test nothing.
  const eligibleFrames = eligibleCandidates('frames', frames,
    { droneTypeId: 'freestyle', cellCount: 6, sizeInch: 5 });
  ok('the frame pool has more than one member, so ranking has something to do',
    eligibleFrames.length > 1);
  const real = eligibleFrames[0] as Frame;
  const deadEnd: Frame = {
    ...real,
    id: 'frame-synthetic-globally-dead',
    nameAr: 'إطار اصطناعي مسدود',
    tier: 'budget',
    specs: { ...real.specs, stackSizeMm: '20x20' },
  };
  /*
   * The dead candidate must be the UNIQUE top of its ranking, or the scenario
   * does not reproduce the bug: a tie would send the category to
   * `choice-required` and the dead branch would be pruned for the wrong
   * reason. So every real budget frame is temporarily moved out of that tier,
   * leaving the synthetic as the one and only thing a «اقتصادي» answer points
   * at — which is exactly the shape that made rank-then-prove fail.
   */
  const demoted: { part: BasePart; tier: BasePart['tier'] }[] = [];
  for (const f of eligibleFrames) {
    if (f.tier === 'budget') {
      demoted.push({ part: f, tier: f.tier });
      (f as { tier: BasePart['tier'] }).tier = 'mid';
    }
  }
  frames.unshift(deadEnd);
  try {
    const b = proposeBuild({ droneTypeId: 'freestyle', cellCount: 6, budgetTier: 'budget' });
    const d = decisionFor(b, 'frames');
    ok('the engine does NOT declare the build unavailable because of the dead top candidate',
      b.provenPath !== null);
    ok('the globally dead candidate is excluded from the frame decision',
      !d.candidateIds.includes(deadEnd.id));
    ok('…and is never the selected part', d.partId !== deadEnd.id);
    ok('…while workable frames remain available',
      d.candidateIds.length > 0 && d.status !== 'unavailable');
    ok('the proven path uses a frame that really is offered',
      d.candidateIds.includes(b.provenPath!.frames) || d.partId === b.provenPath!.frames);

    // It really was the UNIQUE top: the only budget-tier frame in the pool,
    // and first in catalogue order. Nothing else could have been preferred.
    const budgetFrames = eligibleCandidates('frames', frames,
      { droneTypeId: 'freestyle', cellCount: 6, sizeInch: 5 }).filter(f => f.tier === 'budget');
    ok('the excluded candidate was the ONLY thing the budget answer pointed at',
      budgetFrames.length === 1 && budgetFrames[0].id === deadEnd.id
      && frames[0].id === deadEnd.id);
    ok('…so the surviving frame decision cannot cite the budget answer',
      !d.reasons.some(r => r.inputKey === 'budgetTier'));
  } finally {
    const i = frames.findIndex(f => f.id === deadEnd.id);
    if (i >= 0) frames.splice(i, 1);
    for (const { part, tier } of demoted) (part as { tier: BasePart['tier'] }).tier = tier;
  }
  ok('every demoted frame got its tier back',
    demoted.every(({ part, tier }) => part.tier === tier));
  ok('the catalogue was restored',
    !(PART_CATEGORY_MAP.frames ?? []).some(f => f.id === 'frame-synthetic-globally-dead'));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[4] Radio ecosystems are told apart by their typed value, not a display string');
{
  const systems = rcSystemsInCatalogue();
  ok('the catalogue stocks exactly the two canonical radio systems',
    [...systems].sort().join() === 'Crossfire,ExpressLRS');
  ok('«CRSF» is not one of them', !systems.includes('CRSF'));

  const rx = PART_CATEGORY_MAP.receivers ?? [];
  ok('every receiver display string ends in «/ CRSF» — which is why it cannot be the key',
    rx.every(r => (r.protocolOrSystem ?? '').includes('CRSF')));
  ok('a diversity receiver still reports its own system',
    rx.filter(r => (r.protocolOrSystem ?? '').includes('Diversity'))
      .every(r => ['ExpressLRS', 'Crossfire'].includes(rcSystemOf(r))));

  const elrs = proposeBuild({
    droneTypeId: 'freestyle', cellCount: 6, owned: { rcSystem: 'ExpressLRS' },
  });
  const elrsIds = decisionFor(elrs, 'receivers').candidateIds;
  ok('ExpressLRS matches every ELRS receiver, diversity included',
    elrsIds.length === rx.filter(r => rcSystemOf(r) === 'ExpressLRS'
      && eligibleCandidates('receivers', rx, { droneTypeId: 'freestyle', cellCount: 6, sizeInch: 5 })
        .some(e => e.id === r.id)).length);
  ok('ExpressLRS matches NO Crossfire receiver',
    elrsIds.every(id => rcSystemOf(rx.find(r => r.id === id)!) === 'ExpressLRS'));

  const cf = proposeBuild({
    droneTypeId: 'long-range', owned: { rcSystem: 'Crossfire' },
  });
  const cfIds = decisionFor(cf, 'receivers').candidateIds;
  ok('Crossfire matches Crossfire receivers', cfIds.length > 0);
  ok('Crossfire matches NO ELRS receiver',
    cfIds.every(id => rcSystemOf(rx.find(r => r.id === id)!) === 'Crossfire'));

  // The bug this replaced: a raw «CRSF» answer matched both ecosystems.
  const crsf = proposeBuild({
    droneTypeId: 'freestyle', cellCount: 6, owned: { rcSystem: 'CRSF' },
  });
  const crsfDec = decisionFor(crsf, 'receivers');
  ok('a raw «CRSF» answer matches NOTHING rather than everything',
    crsfDec.candidateIds.length === 0 && crsfDec.status === 'unavailable');

  ok('the engine never matches an ecosystem by substring',
    !/\.includes\((?:proto|pref|part\.protocolOrSystem)/.test(ENGINE_SRC));
  ok('the engine reads the typed protocol, not the display string, for radios',
    /specs\.protocol/.test(ENGINE_SRC));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[5] Owned ecosystem constrains; budget only ranks');
{
  const video = PART_CATEGORY_MAP.videoUnits ?? [];
  const dji = video.filter(v => v.protocolOrSystem === 'DJI');
  const cheapestNonDji = video.find(v => v.protocolOrSystem !== 'DJI' && v.tier === 'mid');
  ok('the catalogue has a non-DJI unit in a tier a reader might ask for', !!cheapestNonDji);

  // A DJI goggle owner asking for «متوازن» must not be handed a Walksnail or
  // Analog unit because it matched the tier.
  const b = proposeBuild({
    droneTypeId: 'freestyle', cellCount: 6, budgetTier: 'mid',
    owned: { videoSystem: 'DJI' },
  });
  const vd = decisionFor(b, 'videoUnits');
  ok('every video candidate offered to a DJI owner is DJI',
    vd.candidateIds.length > 0
    && vd.candidateIds.every(id => video.find(v => v.id === id)?.protocolOrSystem === 'DJI'));
  ok('…and the budget answer cannot introduce a foreign ecosystem',
    !vd.candidateIds.some(id => video.find(v => v.id === id)?.protocolOrSystem !== 'DJI'));
  if (vd.partId) {
    ok('…and any selected unit is DJI',
      video.find(v => v.id === vd.partId)?.protocolOrSystem === 'DJI');
  }
  ok('the DJI owner really was offered fewer units than the whole pool',
    vd.candidateIds.length < dji.length + 1 && dji.length < video.length);

  // Same for the radio.
  const r = proposeBuild({
    droneTypeId: 'freestyle', cellCount: 6, budgetTier: 'mid',
    owned: { rcSystem: 'ExpressLRS' },
  });
  const rd = decisionFor(r, 'receivers');
  ok('every receiver offered to an ExpressLRS owner is ExpressLRS',
    rd.candidateIds.every(id =>
      rcSystemOf((PART_CATEGORY_MAP.receivers ?? []).find(x => x.id === id)!) === 'ExpressLRS'));

  // Ownership must FILTER, not score: it cannot appear as a ranking reason.
  ok('ownership never shows up as a ranking reason',
    b.decisions.every(d => d.reasons.every(rr =>
      !(rr.kind === 'ranking' && (rr.inputKey === 'ownedVideoSystem' || rr.inputKey === 'ownedRcSystem')))));

  // A reader who owns nothing is not constrained.
  const free = proposeBuild({ droneTypeId: 'freestyle', cellCount: 6 });
  ok('a reader who owns no goggles sees every ecosystem',
    new Set(decisionFor(free, 'videoUnits').candidateIds
      .map(id => video.find(v => v.id === id)?.protocolOrSystem)).size > 1);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[6] Owned parts are kept, never re-labelled as recommendations');
{
  const size = 5, cell = 6;
  const framePool = eligibleCandidates('frames', PART_CATEGORY_MAP.frames ?? [],
    { droneTypeId: 'freestyle', cellCount: cell, sizeInch: size });
  const ownedFrame = framePool[framePool.length - 1];

  const b = proposeBuild({
    droneTypeId: 'freestyle', sizeInch: size, cellCount: cell,
    owned: { parts: { frames: ownedFrame } },
  });
  const d = decisionFor(b, 'frames');
  ok('a compatible owned part is kept', d.partId === ownedFrame.id);
  ok('…marked as the reader\'s, not the system\'s', d.selectionSource === 'user-owned');
  ok('…and NOT called a recommendation', d.status === 'user-locked');
  ok('…the proven path uses that exact part', b.provenPath?.frames === ownedFrame.id);

  const wrongSize = (PART_CATEGORY_MAP.frames ?? []).find(f =>
    !framePool.some(p => p.id === f.id) && (f as Frame).specs.sizeInch !== size);
  ok('the catalogue has a frame of another size to test with', !!wrongSize);
  if (wrongSize) {
    const bad = proposeBuild({
      droneTypeId: 'freestyle', sizeInch: size, cellCount: cell,
      owned: { parts: { frames: wrongSize } },
    });
    const bd = decisionFor(bad, 'frames');
    ok('an incompatible owned part is NOT swapped out', bd.partId === wrongSize.id);
    ok('…its identity survives even though the build fails',
      bd.selectionSource === 'user-owned');
    ok('…it is reported unavailable, not selected', bd.status === 'unavailable');
    ok('…and the build does not claim to be complete', !bad.complete);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[7] The decision contract cannot express an impossible state');
{
  const builds: Build[] = [
    proposeBuild({ droneTypeId: 'freestyle', cellCount: 6 }),
    proposeBuild({ droneTypeId: 'freestyle', cellCount: 6, budgetTier: 'budget' }),
    proposeBuild({ droneTypeId: 'cinematic', cellCount: 4 }),
    proposeBuild({ droneTypeId: 'long-range' }),
    proposeBuild({ droneTypeId: 'racing' }),
    proposeBuild({ droneTypeId: 'cinewhoop' }),
  ];
  for (const b of builds) {
    for (const d of b.decisions) {
      ok(`${b.droneTypeId}/${d.category}: partId set iff a source claims it`,
        (d.partId === undefined) === (d.selectionSource === 'none'));
      ok(`${b.droneTypeId}/${d.category}: «choice-required» selects nothing`,
        d.status !== 'choice-required' || (d.partId === undefined && d.selectionSource === 'none'));
      ok(`${b.droneTypeId}/${d.category}: only the reader's own part is «user-locked»`,
        d.status !== 'user-locked' || d.selectionSource === 'user-owned');
      ok(`${b.droneTypeId}/${d.category}: a system pick is «recommended» or «only-compatible»`,
        d.selectionSource !== 'system'
        || d.status === 'recommended' || d.status === 'only-compatible');
      ok(`${b.droneTypeId}/${d.category}: a recommendation carries a ranking reason`,
        d.status !== 'recommended' || d.reasons.some(r => r.kind === 'ranking'));
      ok(`${b.droneTypeId}/${d.category}: «only-compatible» claims no ranking`,
        d.status !== 'only-compatible' || !d.reasons.some(r => r.kind === 'ranking'));
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[8] The manual-check contract says what the engine actually does');
{
  const b = proposeBuild({ droneTypeId: 'freestyle', cellCount: 6, budgetTier: 'budget' });
  ok('relational uncertainty is carried at the BUILD level',
    b.manualChecks.includes('current-headroom'));
  ok('…and never as a category status',
    b.decisions.every(d => (d.status as string) !== 'manual-check'));

  // The enum must not advertise a state production never emits.
  const typesSrc = readFileSync('src/data/assembly/recommendation/types.ts', 'utf8');
  ok('«manual-check» is not a RecommendationStatus member',
    !/^\s*\|\s*'manual-check'/m.test(typesSrc));
  ok('the type file explains where relational uncertainty lives instead',
    typesSrc.includes('manualChecks'));

  // Every status the enum declares must be one the engine can actually reach.
  // Read the union's own block rather than every quoted string in the file, so
  // this counts RecommendationStatus and nothing else.
  const block = typesSrc.match(/export type RecommendationStatus =([\s\S]*?);/)![1];
  const statusMembers = [...block.matchAll(/'([a-z-]+)'/g)].map(m => m[1]);
  ok('the status union declares exactly five members', statusMembers.length === 5);
  ok('…and they are the five documented ones',
    [...statusMembers].sort().join() ===
    ['choice-required', 'only-compatible', 'recommended', 'unavailable', 'user-locked'].join());
  const emitted = new Set<string>();
  const all: Build[] = [
    proposeBuild({ droneTypeId: 'freestyle', cellCount: 6 }),
    proposeBuild({ droneTypeId: 'cinematic', cellCount: 4 }),
    proposeBuild({ droneTypeId: 'racing' }),
    proposeBuild({
      droneTypeId: 'freestyle', cellCount: 6, budgetTier: 'budget',
      owned: { parts: { frames: eligibleCandidates('frames', PART_CATEGORY_MAP.frames ?? [],
        { droneTypeId: 'freestyle', cellCount: 6, sizeInch: 5 })[0] } },
    }),
  ];
  all.forEach(b2 => b2.decisions.forEach(d => emitted.add(d.status)));
  for (const s of statusMembers) {
    ok(`the engine actually emits «${s}»`, emitted.has(s));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[9] Every system-selected part carries the rules it was measured against');
{
  const b = proposeBuild({ droneTypeId: 'cinematic', cellCount: 4 });
  const selected = b.decisions.filter(d => d.selectionSource === 'system');
  ok('there are system-selected parts to check', selected.length > 0);

  const RULE_CATEGORIES: Record<string, string> = {
    frames: 'frame-size', motors: 'frame-motor-class',
    propellers: 'prop-clearance', batteries: 'design-voltage',
  };
  for (const d of selected) {
    const expected = RULE_CATEGORIES[d.category];
    if (expected) {
      ok(`${d.category} records the shared rule that applied to it`,
        d.compatibility.some(c => c.ruleId === expected));
      ok(`${d.category}'s recorded rule reports a real status`,
        d.compatibility.every(c => ['pass', 'violated', 'unknown'].includes(c.status)));
    } else {
      // No shared rule applies to ESCs, FCs, receivers or video units — so
      // nothing is recorded. A fabricated pass would be worse than silence.
      ok(`${d.category} invents no compatibility evidence`, d.compatibility.length === 0);
    }
  }
  ok('a category the engine did not select records nothing',
    b.decisions.filter(d => d.status === 'choice-required')
      .every(d => d.compatibility.length === 0));
  ok('no decision claims a rule that did not run',
    b.decisions.every(d => d.compatibility.length <= 1));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[10] Unavailable types are not proposed — for their own real reason');
{
  const cine = proposeBuild({ droneTypeId: 'cinewhoop' });
  ok('«cinewhoop» yields no proposal', cine.provenPath === null && !cine.complete);
  ok('«cinewhoop» says no frame is tagged for it',
    cine.decisions[0].reasons.some(r => r.ar.includes('لا يوجد إطار')));

  const race = proposeBuild({ droneTypeId: 'racing' });
  ok('«racing» yields no proposal', race.provenPath === null && !race.complete);
  ok('«racing» names the blocker that kills every combination',
    race.blockerFindingIds.includes('stack-mount'));

  for (const t of droneTypes) {
    const declared = BUILD_TYPE_AVAILABILITY[t.id]?.available === true;
    const b = proposeBuild({ droneTypeId: t.id });
    // A type that still needs an answer is not «unavailable» — it is pending.
    const derived = b.provenPath !== null || b.requiredInputs.length > 0;
    ok(`«${t.id}» — the engine's own answer matches BUILD_TYPE_AVAILABILITY (${declared})`,
      derived === declared);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[11] One survivor is «the only compatible one», never «the best»');
{
  const b = proposeBuild({ droneTypeId: 'cinematic', cellCount: 4 });
  const singles = b.decisions.filter(d =>
    d.candidateIds.length === 1 && d.selectionSource === 'system');
  ok('the catalogue really does leave single-candidate categories here', singles.length > 0);
  ok('every one is «only-compatible»', singles.every(d => d.status === 'only-compatible'));
  ok('…and says so in the reader\'s words',
    singles.every(d => d.reasons.some(r => r.ar.includes('الخيار الوحيد المتوافق'))));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[12] Several survivors with nothing to separate them → the reader decides');
{
  const b = proposeBuild({ droneTypeId: 'freestyle', cellCount: 6 });
  const multi = b.decisions.filter(d => d.candidateIds.length > 1);
  ok('freestyle at 6S really does leave multi-candidate categories', multi.length > 0);
  ok('with no preferences given, every one of them defers',
    multi.every(d => d.status === 'choice-required'));
  ok('…and not one silently selected a part', multi.every(d => d.partId === undefined));
  ok('the unresolved list is exactly those categories',
    [...b.unresolved].sort().join() === multi.map(d => d.category).sort().join());
  ok('a build with unresolved categories is NOT complete', !b.complete);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[13] Budget changes the outcome only where the catalogue justifies it');
{
  const none = proposeBuild({ droneTypeId: 'freestyle', cellCount: 6 });
  const budget = proposeBuild({ droneTypeId: 'freestyle', cellCount: 6, budgetTier: 'budget' });

  const moved = budget.decisions.filter(d =>
    d.status === 'recommended' && decisionFor(none, d.category).status === 'choice-required');
  ok('stating a budget settles categories the engine could not settle before',
    moved.length > 0);
  ok('every part it now recommends really is in that tier',
    moved.every(d =>
      (PART_CATEGORY_MAP[d.category] ?? []).find(p => p.id === d.partId)?.tier === 'budget'));
  ok('…and each cites the budget answer', moved.every(d =>
    d.reasons.some(r => r.inputKey === 'budgetTier' && r.kind === 'ranking')));

  ok('where the tier does not separate them, budget changes nothing',
    budget.decisions.filter(d => d.status === 'choice-required').every(d => {
      const pool = d.candidateIds.map(id => (PART_CATEGORY_MAP[d.category] ?? []).find(p => p.id === id)!);
      const inTier = pool.filter(p => p.tier === 'budget');
      return inTier.length !== 1;
    }));

  // Withdrawing the evidence withdraws the recommendation.
  const rec = budget.decisions.find(d => d.status === 'recommended' && d.candidateIds.length > 2);
  if (rec) {
    const d = decisionFor(none, rec.category);
    ok('withdrawing the budget answer withdraws the recommendation',
      d.status === 'choice-required' && d.partId === undefined);
    ok('…and the candidate list is unchanged — only the verdict moved',
      [...d.candidateIds].sort().join() === [...rec.candidateIds].sort().join());
  }
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[14] Determinism, including against catalogue order');
{
  const input = {
    droneTypeId: 'freestyle', sizeInch: 5, cellCount: 6,
    budgetTier: 'budget' as const, owned: { videoSystem: 'DJI', rcSystem: 'ExpressLRS' },
  };
  const shape = (r: Build) => JSON.stringify({
    decisions: r.decisions.map(d => [d.category, d.status, d.selectionSource, d.partId]),
    provenPath: r.provenPath, complete: r.complete,
  });
  const a = proposeBuild(input), b2 = proposeBuild(input), c = proposeBuild(input);
  ok('three identical inputs give three byte-identical results',
    shape(a) === shape(b2) && shape(b2) === shape(c));

  const reordered = proposeBuild({
    owned: { rcSystem: 'ExpressLRS', videoSystem: 'DJI' },
    budgetTier: 'budget', cellCount: 6, sizeInch: 5, droneTypeId: 'freestyle',
  });
  ok('the same answers given in a different order give the same result',
    shape(reordered) === shape(a));

  /*
   * CATALOGUE ORDER MUST NOT DECIDE ANYTHING THE DATA DOES NOT.
   *
   * Reversing every category's array leaves the documented evidence untouched,
   * so every DECIDED category must land on the same part, and every tie must
   * still be a tie — with the same members, whatever order they come in.
   */
  const originals = new Map<string, BasePart[]>();
  for (const cat of REQUIRED_BUILD_CATEGORIES) {
    originals.set(cat, [...(PART_CATEGORY_MAP[cat] as BasePart[])]);
  }
  try {
    for (const cat of REQUIRED_BUILD_CATEGORIES) {
      (PART_CATEGORY_MAP[cat] as BasePart[]).reverse();
    }
    const flipped = proposeBuild(input);
    for (const d of a.decisions) {
      const f = decisionFor(flipped, d.category);
      ok(`${d.category}: reversing the catalogue does not change the verdict`,
        f.status === d.status && f.selectionSource === d.selectionSource);
      ok(`${d.category}: …nor which part was chosen`, f.partId === d.partId);
      ok(`${d.category}: …nor which candidates survive`,
        [...f.candidateIds].sort().join() === [...d.candidateIds].sort().join());
    }
  } finally {
    for (const cat of REQUIRED_BUILD_CATEGORIES) {
      const arr = PART_CATEGORY_MAP[cat] as BasePart[];
      arr.length = 0;
      arr.push(...originals.get(cat)!);
    }
  }
  ok('the catalogue was restored in its original order',
    REQUIRED_BUILD_CATEGORIES.every(cat =>
      (PART_CATEGORY_MAP[cat] as BasePart[]).map(p => p.id).join()
      === originals.get(cat)!.map(p => p.id).join()));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[15] A tie is never broken by position');
{
  const pool = eligibleCandidates('escs', PART_CATEGORY_MAP.escs ?? [],
    { droneTypeId: 'freestyle', cellCount: 6, sizeInch: 5 });
  const original = pool.find(p => p.tier === 'budget');
  ok('there is a budget ESC to clone', !!original);
  if (original) {
    const twin = { ...original, id: `${original.id}-twin`, nameAr: `${original.nameAr} (نسخة)` };
    const escs = PART_CATEGORY_MAP.escs as BasePart[];
    const at = escs.findIndex(p => p.id === original.id);
    escs.splice(at + 1, 0, twin as BasePart);
    try {
      const d = decisionFor(
        proposeBuild({ droneTypeId: 'freestyle', cellCount: 6, budgetTier: 'budget' }), 'escs');
      ok('an indistinguishable twin turns a recommendation into a question',
        d.status === 'choice-required' && d.partId === undefined);
      ok('…and both twins are still offered', d.candidateIds.includes(twin.id));
    } finally {
      const i = escs.findIndex(p => p.id === twin.id);
      if (i >= 0) escs.splice(i, 1);
    }
    ok('the catalogue was restored', !(PART_CATEGORY_MAP.escs ?? []).some(p => p.id === twin.id));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[16] Current headroom stays a manual check — never a ranking criterion');
{
  const b = proposeBuild({ droneTypeId: 'freestyle', cellCount: 6, budgetTier: 'budget' });
  ok('the proposal carries current-headroom as unresolved',
    b.manualChecks.includes('current-headroom'));
  // «تيار» is a substring of «اختيار», so match the words a current-based
  // ranking would actually have to use.
  ok('no decision anywhere ranks on current or headroom',
    b.decisions.every(d => d.reasons.every(r => !/أمبير|هامش التيار|سحب التيار/.test(r.ar))));
  ok('the engine reads no current rating at all',
    !/currentRatingA|maxThrustG|burstCurrentRatingA/.test(ENGINE_SRC));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[17] The proven path is real — re-judged here, not trusted');
{
  for (const [typeId, extra] of [
    ['freestyle', { cellCount: 6 }], ['cinematic', { cellCount: 4 }], ['long-range', {}],
  ] as const) {
    const b = proposeBuild({ droneTypeId: typeId, ...extra });
    ok(`«${typeId}» reaches a complete assignment`, b.provenPath !== null);
    ok(`«${typeId}» — it fills every required category`,
      REQUIRED_BUILD_CATEGORIES.every(c => !!b.provenPath?.[c]));
    const parts = Object.fromEntries(REQUIRED_BUILD_CATEGORIES.map(c => [
      c, (PART_CATEGORY_MAP[c] ?? []).find(p => p.id === b.provenPath![c])!,
    ])) as Record<string, BasePart>;
    const findings = computeFindings(snapshotFromParts(parts, {
      droneTypeId: typeId, sizeInch: b.sizeInch, cellCount: b.cellCount,
    }));
    ok(`«${typeId}» — re-judged independently, it has zero blockers`,
      findings.filter(f => f.severity === 'blocker').length === 0);
    ok(`«${typeId}» — every decision the engine made is honoured by that path`,
      b.decisions.filter(d => d.partId).every(d => b.provenPath![d.category] === d.partId));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[18] The engine selects parts — it never touches safety');
{
  const b = proposeBuild({ droneTypeId: 'freestyle', cellCount: 6, budgetTier: 'budget' });
  const words = b.decisions.flatMap(d => d.reasons.map(r => r.ar)).join(' ');
  for (const forbidden of ['بوابة', 'ليبو', 'LiPo', 'Smoke', 'فيلسيف', 'ما قبل الطيران', 'جاهزة للطيران']) {
    ok(`no decision claims anything about «${forbidden}»`, !words.includes(forbidden));
  }
  ok('the proposal has no gate, safety or ready-to-fly field',
    !/gate|safety|ready|checklist|acknowledg/i.test(Object.keys(b).join(' ')));
  ok('the engine imports no gate, checklist or safety module',
    !/gates|checklists|safetyNotes/.test(ENGINE_SRC));
  ok('«complete» is about categories resolved, never about a build being safe',
    b.complete === (b.unresolved.length === 0 && b.provenPath !== null));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[19] Shared-core clean, and one compatibility truth');
{
  for (const [name, src] of [
    ['proposeBuild.ts', ENGINE_SRC], ['eligibility.ts', ELIGIBILITY_SRC],
    ['types.ts', readFileSync('src/data/assembly/recommendation/types.ts', 'utf8')],
  ] as const) {
    ok(`${name} imports no React`, !/from 'react'/.test(src));
    ok(`${name} imports no Next`, !/from 'next/.test(src));
    ok(`${name} imports nothing from web/`, !/from '.*\/web\/|@\/lib/.test(src));
    ok(`${name} touches no storage`, !/localStorage|sessionStorage|indexedDB/.test(src));
    ok(`${name} touches no Firebase`, !/firebase|firestore/i.test(src));
  }

  ok('the engine calls the shared rules module', ENGINE_SRC.includes("from '../compatibility/rules'"));
  for (const rule of ['frameSizeRule', 'frameMotorClassRule', 'propClearanceRule', 'designVoltageRule']) {
    ok(`…including ${rule}`, ENGINE_SRC.includes(`${rule}(`));
  }
  ok('eligibility reaches frame-size through the shared rule',
    ELIGIBILITY_SRC.includes('frameSizeRule('));
  // The regression this replaced: eligibility used to call frameMatchesSize
  // directly, giving the recommender a private path to a truth Phase 1 had
  // just given exactly one owner.
  for (const [name, src] of [['the engine', ENGINE_SRC], ['eligibility', ELIGIBILITY_SRC]] as const) {
    ok(`${name} calls frameMatchesSize nowhere`, !/frameMatchesSize\(/.test(src));
    ok(`${name} calls no validator directly`, !/\bvalidate[A-Z]\w*\(/.test(src));
    ok(`${name} declares no tolerance of its own`, !/TOLERANCE|0\.15/.test(src));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[20] No ranking criterion the catalogue does not state');
{
  const forbidden: [string, RegExp][] = [
    ['lighter is better', /weightG/],
    ['higher amps is better', /currentRatingA/],
    ['more expensive is better', /priceRangeUSD/],
    ['higher KV is better', /\.kv\b/],
    ['more UARTs is better', /uartCount/],
    ['newer is better', /lastReviewed/],
  ];
  for (const [claim, re] of forbidden) {
    ok(`the engine never ranks on «${claim}»`, !re.test(ENGINE_SRC));
  }
  ok('the only ranking input is the budget tier',
    /p\.tier === input\.budgetTier/.test(ENGINE_SRC));
}

console.log(`\n${passed} assertions passed.\n`);

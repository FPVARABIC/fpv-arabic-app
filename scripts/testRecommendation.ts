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
 *   · «more expensive is better» reads as a recommendation until you ask where
 *     the catalogue says so.
 *
 * So this suite does not check that the engine returns something. It checks
 * that every claim it makes is one the catalogue can back, and that where the
 * data runs out the engine says so instead of guessing.
 *
 * Run: npx tsx --tsconfig web/tsconfig.json scripts/testRecommendation.ts
 */
import assert from 'node:assert/strict';
import type { BasePart } from '../src/data/assembly/types';

const { proposeBuild, snapshotFromParts } =
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

const decisionFor = (b: ReturnType<typeof proposeBuild>, c: string) =>
  b.decisions.find(d => d.category === c)!;

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[1] The three reachable types produce a proposal that completes');
{
  for (const typeId of ['freestyle', 'cinematic', 'long-range']) {
    const b = proposeBuild({ droneTypeId: typeId });
    ok(`«${typeId}» proposes a build that reaches a complete assignment`,
      b.provenPath !== null);
    ok(`«${typeId}» — that assignment fills every required category`,
      REQUIRED_BUILD_CATEGORIES.every(c => !!b.provenPath?.[c]));
    ok(`«${typeId}» — and it carries no blockers`,
      b.blockerFindingIds.length === 0);

    // The receipt is real: re-run the engine's own path through the verdict
    // engine here, rather than trusting the flag the engine set on itself.
    const parts = Object.fromEntries(REQUIRED_BUILD_CATEGORIES.map(c => [
      c, (PART_CATEGORY_MAP[c] ?? []).find(p => p.id === b.provenPath![c])!,
    ])) as Record<string, BasePart>;
    const findings = computeFindings(snapshotFromParts(parts, {
      droneTypeId: typeId, sizeInch: b.sizeInch, cellCount: b.cellCount,
    }));
    ok(`«${typeId}» — re-judged independently, the proven path has zero blockers`,
      findings.filter(f => f.severity === 'blocker').length === 0);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[2] Unavailable types are not proposed — for their own real reason');
{
  const cine = proposeBuild({ droneTypeId: 'cinewhoop' });
  ok('«cinewhoop» yields no proposal at all', cine.provenPath === null && !cine.complete);
  ok('«cinewhoop» selects nothing', Object.keys(cine.parts).length === 0);
  ok('«cinewhoop» reports every category as unavailable',
    cine.decisions.every(d => d.status === 'unavailable'));
  ok('«cinewhoop» says the reason is that no frame is tagged for it',
    cine.decisions[0].reasons.some(r => r.ar.includes('لا يوجد إطار')));

  const race = proposeBuild({ droneTypeId: 'racing' });
  ok('«racing» yields no proposal', race.provenPath === null && !race.complete);
  ok('«racing» selects nothing', Object.keys(race.parts).length === 0);
  // Racing's parts each pass their own card; the type dies only when whole
  // combinations are judged. That is the distinction this engine exists for.
  ok('«racing» names the blocker that kills every combination',
    race.blockerFindingIds.includes('stack-mount'));

  // The engine derived these two independently. They must agree with the
  // declaration the reachability suite proves — one authority, two readers.
  for (const t of droneTypes) {
    const declared = BUILD_TYPE_AVAILABILITY[t.id]?.available === true;
    const derived = proposeBuild({ droneTypeId: t.id }).provenPath !== null;
    ok(`«${t.id}» — the engine's own answer matches BUILD_TYPE_AVAILABILITY (${declared})`,
      derived === declared);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[3] One survivor is «the only compatible one», never «the best»');
{
  // Cinematic at 4S leaves exactly one frame, motor, propeller and video unit.
  const b = proposeBuild({ droneTypeId: 'cinematic', cellCount: 4 });
  const singles = b.decisions.filter(d => d.candidateIds.length === 1 && d.status !== 'unavailable');
  ok('the catalogue really does leave single-candidate categories here', singles.length > 0);
  ok('every single-candidate category is «only-compatible», not «recommended»',
    singles.every(d => d.status === 'only-compatible'));
  ok('…and says so in the reader\'s words',
    singles.every(d => d.reasons.some(r => r.ar.includes('الخيار الوحيد المتوافق'))));
  ok('…and none of them claims to be preferred over anything',
    singles.every(d => !d.reasons.some(r => r.kind === 'ranking')));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[4] Several survivors with nothing to separate them → the reader decides');
{
  // No budget and no ecosystem answers: the engine has no ranking evidence at
  // all, so every multi-candidate category must defer.
  const b = proposeBuild({ droneTypeId: 'freestyle', cellCount: 6 });
  const multi = b.decisions.filter(d => d.candidateIds.length > 1);
  ok('freestyle at 6S really does leave multi-candidate categories', multi.length > 0);
  ok('with no preferences given, every one of them is «choice-required»',
    multi.every(d => d.status === 'choice-required'));
  ok('…and not one of them silently selected a part',
    multi.every(d => d.partId === undefined));
  ok('…and each explains that the data does not separate them',
    multi.every(d => d.reasons.some(r => r.kind === 'tie')));
  ok('the unresolved list is exactly those categories',
    [...b.unresolved].sort().join() === multi.map(d => d.category).sort().join());
  ok('a build with unresolved categories is NOT complete', !b.complete);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[5] Budget changes the outcome only where the catalogue justifies it');
{
  const none = proposeBuild({ droneTypeId: 'freestyle', cellCount: 6 });
  const budget = proposeBuild({ droneTypeId: 'freestyle', cellCount: 6, budgetTier: 'budget' });

  const movedToRecommended = budget.decisions.filter(d =>
    d.status === 'recommended' && decisionFor(none, d.category).status === 'choice-required');
  ok('stating a budget lets the engine settle categories it could not before',
    movedToRecommended.length > 0);
  ok('every part it now recommends really is in that tier',
    movedToRecommended.every(d =>
      (PART_CATEGORY_MAP[d.category] ?? []).find(p => p.id === d.partId)?.tier === 'budget'));
  ok('…and each one cites the budget answer as the reason',
    movedToRecommended.every(d =>
      d.reasons.some(r => r.inputKey === 'budgetTier' && r.kind === 'ranking')));

  // The other half of the same rule: budget must NOT manufacture a decision
  // where the tier does not actually separate the survivors.
  const stillTied = budget.decisions.filter(d => d.status === 'choice-required');
  ok('where the tier does not separate them, budget changes nothing',
    stillTied.every(d => {
      const pool = d.candidateIds.map(id => (PART_CATEGORY_MAP[d.category] ?? []).find(p => p.id === id)!);
      return pool.filter(p => p.tier === 'budget').length !== 1;
    }));

  // A single-candidate category cannot be moved by a preference — there is
  // nothing to prefer it over.
  ok('single-candidate categories are unmoved by budget',
    budget.decisions.filter(d => d.candidateIds.length === 1 && d.status !== 'unavailable')
      .every(d => d.status === 'only-compatible'));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[6] Ecosystem answers rank only their own category, and only when they separate');
{
  // Walksnail: exactly one unit in the pool speaks it, so the answer alone is
  // enough evidence to settle the category.
  const one = proposeBuild({ droneTypeId: 'freestyle', cellCount: 6, videoSystem: 'Walksnail' });
  const video = decisionFor(one, 'videoUnits');
  ok('an ecosystem answer that separates the pool settles the category',
    video.status === 'recommended');
  ok('…with a unit from that very system',
    (PART_CATEGORY_MAP.videoUnits ?? []).find(p => p.id === video.partId)?.protocolOrSystem === 'Walksnail');
  ok('…and cites the goggle answer as the reason',
    video.reasons.some(r => r.inputKey === 'videoSystem' && r.kind === 'ranking'));

  // DJI: THREE units speak it. A matching answer is not automatically a
  // decision — the engine must still refuse to choose among equals.
  const many = proposeBuild({ droneTypeId: 'freestyle', cellCount: 6, videoSystem: 'DJI' });
  const tied = decisionFor(many, 'videoUnits');
  ok('an ecosystem answer that does NOT separate the pool settles nothing',
    tied.status === 'choice-required' && tied.partId === undefined);

  // Two answers combine: the system narrows the pool, the tier picks within it.
  const both = proposeBuild({
    droneTypeId: 'freestyle', cellCount: 6, videoSystem: 'DJI', budgetTier: 'premium',
  });
  const settled = decisionFor(both, 'videoUnits');
  ok('two answers together settle what neither settles alone',
    settled.status === 'recommended');
  const pick = (PART_CATEGORY_MAP.videoUnits ?? []).find(p => p.id === settled.partId);
  ok('…and the choice satisfies both answers',
    pick?.protocolOrSystem === 'DJI' && pick?.tier === 'premium');

  // It must not leak: a video answer may not settle the receiver.
  ok('the goggle answer does not rank receivers',
    !decisionFor(many, 'receivers').reasons.some(r => r.inputKey === 'videoSystem'));

  // «Diversity» is two antennas, not a different language. A reader who
  // answered «ELRS» must not be told a diversity receiver mismatches — so all
  // three ELRS receivers match, and the answer alone leaves them tied.
  const elrs = proposeBuild({ droneTypeId: 'freestyle', cellCount: 6, rcProtocol: 'ELRS' });
  const rx = decisionFor(elrs, 'receivers');
  ok('a diversity receiver still counts as speaking its own protocol',
    rx.status === 'choice-required' && rx.candidateIds.length === 3);
  const elrsMid = proposeBuild({
    droneTypeId: 'freestyle', cellCount: 6, rcProtocol: 'ELRS', budgetTier: 'mid',
  });
  ok('…and the tier settles it once the protocol has narrowed nothing',
    decisionFor(elrsMid, 'receivers').status === 'recommended');
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[7] Existing parts are honoured, never silently replaced');
{
  const size = 5, cell = 6;
  const framePool = eligibleCandidates('frames', PART_CATEGORY_MAP.frames ?? [],
    { droneTypeId: 'freestyle', cellCount: cell, sizeInch: size });
  const compatibleFrame = framePool[framePool.length - 1];

  const withOwned = proposeBuild({
    droneTypeId: 'freestyle', sizeInch: size, cellCount: cell,
    existingParts: { frames: compatibleFrame },
  });
  const frameDec = decisionFor(withOwned, 'frames');
  ok('a compatible part the reader owns stays selected', frameDec.partId === compatibleFrame.id);
  ok('…and the proven path uses that exact part',
    withOwned.provenPath?.frames === compatibleFrame.id);
  ok('…and the reason names it as theirs',
    frameDec.reasons.some(r => r.inputKey === 'existingParts'));

  // A frame from the WRONG size is a documented hard incompatibility.
  const wrongSize = (PART_CATEGORY_MAP.frames ?? []).find(f =>
    !framePool.some(p => p.id === f.id)
    && (f as { specs: { sizeInch: number } }).specs.sizeInch !== size);
  ok('the catalogue has a frame of another size to test with', !!wrongSize);
  if (wrongSize) {
    const bad = proposeBuild({
      droneTypeId: 'freestyle', sizeInch: size, cellCount: cell,
      existingParts: { frames: wrongSize },
    });
    const d = decisionFor(bad, 'frames');
    ok('an incompatible owned part is NOT swapped out', d.partId === wrongSize.id);
    ok('…it is reported as unavailable instead', d.status === 'unavailable');
    ok('…the reason says the decision is the reader\'s', d.reasons.some(r => r.ar.includes('القرار لك')));
    ok('…and the build does not claim to be complete', !bad.complete);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[8] Current headroom stays a manual check — never a ranking criterion');
{
  const b = proposeBuild({ droneTypeId: 'freestyle', cellCount: 6, budgetTier: 'budget' });
  ok('the proposal carries current-headroom as an unresolved manual check',
    b.manualChecks.includes('current-headroom'));
  // «تيار» (current) is a substring of «اختيار» (choice), so a bare
  // substring test would fire on «الاختيار لك» and prove nothing. Match the
  // words a current-based ranking would actually have to use.
  ok('no decision anywhere ranks on current or headroom',
    b.decisions.every(d => d.reasons.every(r =>
      !/أمبير|هامش التيار|سحب التيار|\bA\b/.test(r.ar))));

  // And the engine's own source must not carry a current comparison.
  const src = (await import('node:fs')).readFileSync(
    'src/data/assembly/recommendation/proposeBuild.ts', 'utf8');
  ok('the engine reads no current rating at all',
    !/currentRatingA|maxThrustG|burstCurrentRatingA/.test(src));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[9] Determinism');
{
  const input = {
    droneTypeId: 'freestyle', sizeInch: 5, cellCount: 6,
    budgetTier: 'budget' as const, videoSystem: 'DJI', rcProtocol: 'ELRS',
  };
  const runs = [proposeBuild(input), proposeBuild(input), proposeBuild(input)];
  const json = runs.map(r => JSON.stringify({
    parts: Object.fromEntries(Object.entries(r.parts).map(([k, v]) => [k, v.id])),
    decisions: r.decisions.map(d => [d.category, d.status, d.partId, d.candidateIds]),
    provenPath: r.provenPath, complete: r.complete,
  }));
  ok('three identical inputs give three byte-identical results',
    json[0] === json[1] && json[1] === json[2]);

  // Order-independence of the INPUT object must not matter either.
  const reordered = proposeBuild({
    rcProtocol: 'ELRS', budgetTier: 'budget', cellCount: 6,
    videoSystem: 'DJI', sizeInch: 5, droneTypeId: 'freestyle',
  });
  ok('the same answers given in a different order give the same result',
    JSON.stringify(reordered.provenPath) === JSON.stringify(runs[0].provenPath));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[10] Re-evaluating honestly when a recommendation is taken away');
{
  const b = proposeBuild({ droneTypeId: 'freestyle', cellCount: 6, budgetTier: 'budget' });
  const rec = b.decisions.find(d => d.status === 'recommended' && d.candidateIds.length > 2);
  ok('there is a recommended category with several candidates to test with', !!rec);
  if (rec) {
    // Same question, budget answer withdrawn: the engine loses its evidence
    // and must fall back to asking, not keep the answer it can no longer
    // justify.
    const without = proposeBuild({ droneTypeId: 'freestyle', cellCount: 6 });
    const d = decisionFor(without, rec.category);
    ok('withdrawing the evidence withdraws the recommendation',
      d.status === 'choice-required' && d.partId === undefined);
    ok('…and the candidate list is unchanged — only the verdict moved',
      [...d.candidateIds].sort().join() === [...rec.candidateIds].sort().join());
  }
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[11] A tie is never broken by position');
{
  // Two candidates identical in every field the engine may read. If it has a
  // hidden «first one wins», this is where it shows.
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
      const b = proposeBuild({ droneTypeId: 'freestyle', cellCount: 6, budgetTier: 'budget' });
      const d = decisionFor(b, 'escs');
      ok('adding an indistinguishable twin turns a recommendation into a question',
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
console.log('\n[12] The engine selects parts — it never touches safety');
{
  const b = proposeBuild({ droneTypeId: 'freestyle', cellCount: 6, budgetTier: 'budget' });

  // The parts themselves carry safety prose — that is the catalogue's own
  // authored text and must survive untouched. What matters is that NOTHING
  // the ENGINE writes claims anything about physical completion. So the
  // assertion is on the engine's own words, not on the parts it hands back.
  const engineWords = b.decisions.flatMap(d => d.reasons.map(r => r.ar)).join(' ');
  for (const forbidden of ['بوابة', 'ليبو', 'LiPo', 'Smoke', 'فيلسيف', 'ما قبل الطيران', 'جاهزة للطيران']) {
    ok(`no decision claims anything about «${forbidden}»`, !engineWords.includes(forbidden));
  }

  // And the RESULT SHAPE offers a caller nowhere to read such a claim from.
  const shape = Object.keys(b).join(' ');
  ok('the proposal has no gate, safety or ready-to-fly field',
    !/gate|safety|ready|checklist|acknowledg/i.test(shape));

  const src = (await import('node:fs')).readFileSync(
    'src/data/assembly/recommendation/proposeBuild.ts', 'utf8');
  ok('the engine imports no gate, checklist or safety module',
    !/gates|checklists|safetyNotes/.test(src));
  ok('«complete» is about categories resolved, never about a build being safe',
    b.complete === (b.unresolved.length === 0 && b.provenPath !== null));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[13] The engine is shared-core clean');
{
  const fs = await import('node:fs');
  const files = [
    'src/data/assembly/recommendation/proposeBuild.ts',
    'src/data/assembly/recommendation/eligibility.ts',
    'src/data/assembly/recommendation/types.ts',
  ];
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    ok(`${f.split('/').pop()} imports no React`, !/from 'react'|from "react"/.test(src));
    ok(`${f.split('/').pop()} imports no Next`, !/from 'next|from "next/.test(src));
    ok(`${f.split('/').pop()} imports nothing from web/`, !/from '.*\/web\/|@\/lib/.test(src));
    ok(`${f.split('/').pop()} touches no storage`, !/localStorage|sessionStorage|indexedDB/.test(src));
    ok(`${f.split('/').pop()} touches no Firebase`, !/firebase|firestore/i.test(src));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[14] Compatibility comes from the Phase 1 shared truth, not a second copy');
{
  const src = (await import('node:fs')).readFileSync(
    'src/data/assembly/recommendation/proposeBuild.ts', 'utf8');
  ok('the engine calls the shared rules module',
    src.includes("from '../compatibility/rules'"));
  for (const rule of ['frameSizeRule', 'frameMotorClassRule', 'propClearanceRule', 'designVoltageRule']) {
    ok(`…including ${rule}`, src.includes(`${rule}(`));
  }
  ok('the engine calls no validator directly', !/\bvalidate[A-Z]\w*\(/.test(src));
  ok('the engine declares no tolerance of its own', !/TOLERANCE|0\.15/.test(src));
  ok('the engine calls frameMatchesSize nowhere', !/frameMatchesSize\(/.test(src));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[15] No ranking criterion the catalogue does not state');
{
  const src = (await import('node:fs')).readFileSync(
    'src/data/assembly/recommendation/proposeBuild.ts', 'utf8');
  // The forbidden list from the brief, each one a plausible-sounding rule that
  // nothing in this catalogue actually supports.
  const forbidden: [string, RegExp][] = [
    ['lighter is better', /weightG/],
    ['higher amps is better', /currentRatingA/],
    ['more expensive is better', /priceRangeUSD/],
    ['higher KV is better', /\.kv\b/],
    ['more UARTs is better', /uartCount/],
    ['newer is better', /lastReviewed/],
  ];
  for (const [claim, re] of forbidden) {
    ok(`the engine never ranks on «${claim}»`, !re.test(src));
  }
  ok('the only ranking inputs are the tier and the two ecosystem answers',
    /p\.tier === input\.budgetTier/.test(src) && /speaksEcosystem/.test(src));
}

console.log(`\n${passed} assertions passed.\n`);

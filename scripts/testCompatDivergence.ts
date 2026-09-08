/**
 * KNOWN P0, DELIBERATELY NOT FIXED HERE — THE COMPATIBILITY LAYERS DIVERGE
 * =======================================================================
 *
 * `web/lib/build/checks.ts` opens with a promise:
 *
 *     «…so the card and the final report can never disagree about a rule.»
 *
 * They can, and this file proves it. `checkCandidate` knows `frameMatchesSize`
 * and refuses a frame whose size contradicts the declared build size;
 * `computeFindings` — the full-system engine behind step 11 — has no
 * frame↔size rule at all. So in the advanced mode, where a documented
 * incompatibility may be selected on purpose, the card's objection VANISHES by
 * the time the reader reaches the report, and «التالي» opens on a build the
 * section already told them was wrong.
 *
 * WHY THIS SUITE ASSERTS THE BUG INSTEAD OF FIXING IT
 * --------------------------------------------------
 * The honest repair is architectural: one set of rule primitives that BOTH
 * layers compose, so the difference between them is scope and never rule set.
 * Patching `frameMatchesSize` into `computeFindings` would close this one case
 * and leave the architecture that produced it — and `computeFindings` is
 * shared with the phone app, so a casual extra condition there is a change to
 * a surface this phase is not touching. That work is Phase 1, on its own
 * branch, with its own equivalence tests.
 *
 * Meanwhile the defect must not drift. This suite is a RATCHET: it pins the
 * exact shape of the divergence, so that
 *
 *   · it cannot silently get worse, and
 *   · the moment Phase 1 fixes it, THIS SUITE FAILS — loudly, with an
 *     instruction to invert it. A test that asserts a bug must be the thing
 *     that notices when the bug is gone.
 *
 * CI stays green on a known defect only because the defect is written down
 * here in full, with its blast radius:
 *
 *   REACHABLE ONLY IN ADVANCED MODE. The guided modes refuse to select a
 *   candidate the card marks incompatible, so a first-time builder cannot
 *   reach this state at all. An advanced reader who does reach it was shown
 *   «غير متوافق — مقاس هذا الإطار لا يطابق حجم N إنش الذي اخترته» on the card
 *   and chose to override it. The propeller-clearance and frame-motor rules
 *   still run against the REAL frame, so the physical checks that matter are
 *   unaffected; what is lost is the reminder.
 *
 * Run: npx tsx --tsconfig web/tsconfig.json scripts/testCompatDivergence.ts
 */

import assert from 'node:assert/strict';
import type { Frame, BasePart } from '../src/data/assembly/types';
import type { ProjectSnapshot } from '../src/data/project/types';

const { PART_CATEGORY_MAP } = await import('../src/data/project/store');
const { computeFindings } = await import('../src/data/project/verdicts');
const { buildStages } = await import('../src/data/assembly/buildStages');
const { checkCandidate } = await import('../web/lib/build/checks');
const { frameMatchesSize } = await import('../src/data/assembly/frameSizeMatch');

let passed = 0;
function ok(label: string, cond: boolean) {
  assert.ok(cond, `FAILED: ${label}`);
  console.log(`  ok — ${label}`);
  passed++;
}

console.log('\n[ratchet] The candidate layer and the report layer, on one rule\n');

const DECLARED_SIZE_INCH = 5;
const frames = (PART_CATEGORY_MAP.frames ?? []) as Frame[];
const mismatched = frames.find(f => !frameMatchesSize(f, DECLARED_SIZE_INCH));
assert.ok(mismatched, 'catalogue has no frame that mismatches 5" — this ratchet needs one');

// ── Layer 1: the part card, before selection ────────────────────────────────
const cardVerdict = checkCandidate('frames', mismatched as BasePart, {
  sizeInch: DECLARED_SIZE_INCH,
  parts: {},
});
ok(`the CARD refuses «${mismatched.nameAr}» at ${DECLARED_SIZE_INCH}"`,
  cardVerdict.verdict === 'incompatible');
ok('the card states the size rule as its reason',
  cardVerdict.reasonsAr.some(r => r.includes('مقاس')));

// ── Layer 2: the full-system report, after selection ────────────────────────
const pick = (c: string) => (PART_CATEGORY_MAP[c] ?? [])[0];
const parts: Record<string, BasePart> = {
  frames: mismatched as BasePart,
  motors: pick('motors'),
  escs: pick('escs'),
  flightControllers: pick('flightControllers'),
  batteries: pick('batteries'),
  propellers: pick('propellers'),
  receivers: pick('receivers'),
  videoUnits: pick('videoUnits'),
};
const snapshot: ProjectSnapshot = {
  exists: true,
  droneTypeId: 'freestyle',
  sizeInch: DECLARED_SIZE_INCH,
  cellCount: mismatched.compatibilityTags.batteryVoltages[0],
  stageIndex: buildStages.length - 1,
  totalStages: buildStages.length,
  frame: parts.frames as ProjectSnapshot['frame'],
  motor: parts.motors as ProjectSnapshot['motor'],
  esc: parts.escs as ProjectSnapshot['esc'],
  flightController: parts.flightControllers as ProjectSnapshot['flightController'],
  battery: parts.batteries as ProjectSnapshot['battery'],
  propeller: parts.propellers as ProjectSnapshot['propeller'],
  receiver: parts.receivers as ProjectSnapshot['receiver'],
  videoUnit: parts.videoUnits as ProjectSnapshot['videoUnit'],
  gps: undefined,
  parts,
};

const findings = computeFindings(snapshot);

/*
 * The divergence, stated as a PROPERTY rather than matched as a string.
 *
 * A text search is the obvious detector and the wrong one: several findings
 * quote the frame's own name, and this catalogue's frames are named «إطار 5.5
 * إنش - متوسط», so any search for a size mentions hits part names rather than
 * size rulings. (It did, on the first attempt.)
 *
 * The precise question is whether `computeFindings` READS the declared build
 * size at all. So it is run twice over identical parts with contradictory
 * declared sizes: if the engine judged the frame against that number, the two
 * results would differ. They do not — the field is inert. That is the whole
 * defect, in one comparison, and it flips the moment Phase 1 makes the engine
 * size-aware.
 */
const withOtherSize = computeFindings({ ...snapshot, sizeInch: mismatched.specs.sizeInch });
const engineReadsDeclaredSize =
  JSON.stringify(findings) !== JSON.stringify(withOtherSize);

ok(`the catalogue frame «${mismatched.nameAr}» really is ${mismatched.specs.sizeInch}", not ${DECLARED_SIZE_INCH}"`,
  !frameMatchesSize(mismatched, DECLARED_SIZE_INCH));

// ── The ratchet itself ──────────────────────────────────────────────────────
assert.ok(
  !engineReadsDeclaredSize,
  'THE DIVERGENCE IS FIXED — and this suite is now wrong.\n'
  + '  `computeFindings` has started reporting the frame↔size rule that only\n'
  + '  `checkCandidate` used to know. That is the Phase 1 outcome this file was\n'
  + '  written to wait for.\n'
  + '  ACTION: invert this suite into an EQUIVALENCE test — for every rule\n'
  + '  primitive, the card and the report must agree on the same fixture — and\n'
  + '  delete the ratchet framing above.',
);
ok('KNOWN DEFECT PINNED: the report engine never reads the declared build size',
  !engineReadsDeclaredSize);
ok('so the card\'s objection is absent from the report the reader is shown',
  cardVerdict.verdict === 'incompatible'
    && !findings.some(f => f.severity === 'blocker'));

// The bug must not be allowed to get worse: the checks that protect hardware
// still run against the real frame, and this asserts they do.
ok('propeller clearance is still judged against the REAL frame',
  findings.some(f => f.id === 'prop-clearance'));
ok('the report is not silent overall — it still judges the rest of the build',
  findings.length >= 4);

console.log('\n  ⚠  KNOWN P0 — CARRIED, NOT FIXED');
console.log('     A rule enforced on the part card is absent from the final report.');
console.log('     Scope: advanced mode only; guided modes cannot select the part at all.');
console.log('     Owner: Phase 1 (one rule engine, two consumers). Not this branch.');
console.log(`\n[ratchet] ${passed} assertions passed\n`);

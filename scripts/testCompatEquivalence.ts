/**
 * THE PART CARD AND THE FINAL REPORT MUST AGREE — PERMANENTLY
 * ==========================================================
 *
 * This suite replaces `scripts/testCompatDivergence.ts`, which existed only to
 * pin a defect: `checkCandidate` refused a frame whose size contradicted the
 * declared build size, and `computeFindings` never read `sizeInch` at all, so
 * the objection vanished between the card and the report. That ratchet was
 * written to fail the day the defect was fixed. This is what it became.
 *
 * WHAT IS COMPARED, AND WHAT DELIBERATELY IS NOT
 * ----------------------------------------------
 * The two layers answer different questions and keep different vocabularies —
 * `ok / review / incompatible` on a card, `ok / warning / unknown / blocker` in
 * a report — and forcing those enums to match would be forcing the two surfaces
 * to become one. So this suite compares SEMANTICS, not spelling:
 *
 *   · did the rule fire at all, on the same inputs
 *   · under the same RULE IDENTITY
 *   · with the same technical reason underneath
 *
 * Prose may differ. Severity may differ where the mapping says so, and where
 * it does the mapping is declared here in the open rather than left implicit.
 *
 * THE TWO ASYMMETRIES THIS SUITE RECORDS RATHER THAN HIDES
 * --------------------------------------------------------
 * Two shared rules are mapped to a HARDER severity on the card than in the
 * report, and that predates Phase 1:
 *
 *   frame-motor-class   card: incompatible (unselectable)   report: warning
 *   design-voltage      card: incompatible (unselectable)   report: warning
 *
 * Both are real: a motor one class off the frame does physically mount, and a
 * battery at the wrong design voltage does physically run — the report's
 * `warning` is the technically honest severity, and the card is the stricter
 * of the two. Phase 1 did not change either, because changing them would alter
 * which parts a guided reader may select, which is a product decision and not
 * an architectural one. They are asserted below so the asymmetry stays visible
 * and deliberate instead of drifting.
 *
 * Run: npx tsx --tsconfig web/tsconfig.json scripts/testCompatEquivalence.ts
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type { BasePart, Frame, Motor, Propeller, Battery } from '../src/data/assembly/types';
import type { ProjectSnapshot } from '../src/data/project/types';
import type { CompatRuleId } from '../src/data/assembly/compatibility/rules';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8');

const { PART_CATEGORY_MAP } = await import('../src/data/project/store');
const { computeFindings } = await import('../src/data/project/verdicts');
const { buildStages } = await import('../src/data/assembly/buildStages');
const { frameMatchesSize } = await import('../src/data/assembly/frameSizeMatch');
const { checkCandidate } = await import('../web/lib/build/checks');
const {
  SHARED_COMPAT_RULES, frameSizeRule, frameMotorClassRule,
  propClearanceRule, designVoltageRule,
} = await import('../src/data/assembly/compatibility/rules');

let passed = 0;
const failures: string[] = [];
function ok(label: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ok — ${label}`); }
  else { failures.push(label); console.log(`  FAIL — ${label}`); }
}

const cat = <T extends BasePart>(c: string) => (PART_CATEGORY_MAP[c] ?? []) as unknown as T[];
const frames = cat<Frame>('frames');
const motors = cat<Motor>('motors');
const propellers = cat<Propeller>('propellers');
const batteries = cat<Battery>('batteries');

function snap(over: Partial<ProjectSnapshot>): ProjectSnapshot {
  const parts: Record<string, BasePart> = {};
  if (over.frame) parts.frames = over.frame;
  if (over.motor) parts.motors = over.motor;
  if (over.propeller) parts.propellers = over.propeller;
  if (over.battery) parts.batteries = over.battery;
  return {
    exists: true,
    stageIndex: buildStages.length - 1,
    totalStages: buildStages.length,
    ...over,
    parts,
  } as ProjectSnapshot;
}

/**
 * How each shared rule shows up on each surface.
 *
 * `findingId` differs from the rule id for `design-voltage` because the report
 * has published `voltage-design-mismatch` since before the rule was shared, and
 * other surfaces key off it. The RULE identity is the shared one; the finding
 * id is that consumer's presentation of it, and the difference is recorded here
 * rather than papered over by renaming a live finding.
 */
const SURFACE_MAP: Record<CompatRuleId, {
  findingId: string;
  reportSeverityWhenViolated: string;
  cardVerdictWhenViolated: string;
}> = {
  'frame-size': {
    findingId: 'frame-size',
    reportSeverityWhenViolated: 'blocker',
    cardVerdictWhenViolated: 'incompatible',
  },
  'frame-motor-class': {
    findingId: 'frame-motor-class',
    reportSeverityWhenViolated: 'warning',      // asymmetry, see the header
    cardVerdictWhenViolated: 'incompatible',
  },
  'prop-clearance': {
    findingId: 'prop-clearance',
    reportSeverityWhenViolated: 'blocker',
    cardVerdictWhenViolated: 'incompatible',
  },
  'design-voltage': {
    findingId: 'voltage-design-mismatch',
    reportSeverityWhenViolated: 'warning',      // asymmetry, see the header
    cardVerdictWhenViolated: 'incompatible',
  },
};

// ── [1] The registry is complete and mapped ─────────────────────────────────
console.log('\n[1] Every shared rule has a declared home on both surfaces\n');

for (const rule of SHARED_COMPAT_RULES) {
  ok(`«${rule.id}» (${rule.whatAr}) is mapped to both surfaces`,
    SURFACE_MAP[rule.id] !== undefined);
}
ok('the surface map declares nothing that is not a registered rule',
  Object.keys(SURFACE_MAP).every(id =>
    SHARED_COMPAT_RULES.some(r => r.id === id)));
ok('rule ids are unique',
  new Set(SHARED_COMPAT_RULES.map(r => r.id)).size === SHARED_COMPAT_RULES.length);

// ── [2] Violation agreement, rule by rule ───────────────────────────────────
console.log('\n[2] A violation on one surface is a violation on the other\n');

interface Case {
  ruleId: CompatRuleId;
  label: string;
  violates: boolean;
  card: () => { verdict: string; reasonsAr: string[] };
  report: () => ProjectSnapshot;
}

const mismatchedFrame = frames.find(f => !frameMatchesSize(f, 5));
const matchingFrame = frames.find(f => frameMatchesSize(f, 5));
assert.ok(mismatchedFrame && matchingFrame, 'catalogue needs a 5" frame and a non-5" frame');

const badFrameMotor = (() => {
  for (const f of frames) for (const m of motors) {
    const r = frameMotorClassRule(f, m);
    if (r?.status === 'violated') return { f, m };
  }
  return null;
})();
const goodFrameMotor = (() => {
  for (const f of frames) for (const m of motors) {
    const r = frameMotorClassRule(f, m);
    if (r?.status === 'pass') return { f, m };
  }
  return null;
})();
const badFrameProp = (() => {
  for (const f of frames) for (const pr of propellers) {
    const r = propClearanceRule(f, pr);
    if (r?.status === 'violated') return { f, pr };
  }
  return null;
})();
const goodFrameProp = (() => {
  for (const f of frames) for (const pr of propellers) {
    const r = propClearanceRule(f, pr);
    if (r?.status === 'pass') return { f, pr };
  }
  return null;
})();
const b4 = batteries.find(b => b.specs.sCount === 4);
const b6 = batteries.find(b => b.specs.sCount === 6);
assert.ok(badFrameMotor && goodFrameMotor && badFrameProp && goodFrameProp && b4 && b6,
  'catalogue no longer contains the pairs these fixtures need');

const cases: Case[] = [
  {
    ruleId: 'frame-size', label: 'a 5" build with a frame that is not 5"', violates: true,
    card: () => checkCandidate('frames', mismatchedFrame, { sizeInch: 5, parts: {} }),
    report: () => snap({ sizeInch: 5, frame: mismatchedFrame }),
  },
  {
    ruleId: 'frame-size', label: 'a 5" build with a 5" frame', violates: false,
    card: () => checkCandidate('frames', matchingFrame, { sizeInch: 5, parts: {} }),
    report: () => snap({ sizeInch: 5, frame: matchingFrame }),
  },
  {
    ruleId: 'frame-motor-class', label: 'a motor whose class does not fit the frame', violates: true,
    card: () => checkCandidate('motors', badFrameMotor.m, { parts: { frames: badFrameMotor.f } }),
    report: () => snap({ frame: badFrameMotor.f, motor: badFrameMotor.m }),
  },
  {
    ruleId: 'frame-motor-class', label: 'a motor whose class fits the frame', violates: false,
    card: () => checkCandidate('motors', goodFrameMotor.m, { parts: { frames: goodFrameMotor.f } }),
    report: () => snap({ frame: goodFrameMotor.f, motor: goodFrameMotor.m }),
  },
  {
    ruleId: 'prop-clearance', label: 'a propeller larger than the frame allows', violates: true,
    card: () => checkCandidate('propellers', badFrameProp.pr, { parts: { frames: badFrameProp.f } }),
    report: () => snap({ frame: badFrameProp.f, propeller: badFrameProp.pr }),
  },
  {
    ruleId: 'prop-clearance', label: 'a propeller within the frame', violates: false,
    card: () => checkCandidate('propellers', goodFrameProp.pr, { parts: { frames: goodFrameProp.f } }),
    report: () => snap({ frame: goodFrameProp.f, propeller: goodFrameProp.pr }),
  },
  {
    ruleId: 'design-voltage', label: 'a 4S battery on a 6S design', violates: true,
    card: () => checkCandidate('batteries', b4, { batteryVoltage: 6, parts: {} }),
    report: () => snap({ cellCount: 6, battery: b4 }),
  },
  {
    ruleId: 'design-voltage', label: 'a 6S battery on a 6S design', violates: false,
    card: () => checkCandidate('batteries', b6, { batteryVoltage: 6, parts: {} }),
    report: () => snap({ cellCount: 6, battery: b6 }),
  },
];

for (const c of cases) {
  const map = SURFACE_MAP[c.ruleId];
  const cardVerdict = c.card().verdict;
  const finding = computeFindings(c.report()).find(f => f.id === map.findingId);

  const cardSaysViolated = cardVerdict === map.cardVerdictWhenViolated;
  const reportSaysViolated = !!finding && finding.severity === map.reportSeverityWhenViolated;

  ok(`«${c.ruleId}» — ${c.label}: the CARD agrees with the rule`,
    cardSaysViolated === c.violates);
  ok(`«${c.ruleId}» — ${c.label}: the REPORT agrees with the rule`,
    reportSaysViolated === c.violates);
  ok(`«${c.ruleId}» — ${c.label}: both surfaces agree with EACH OTHER`,
    cardSaysViolated === reportSaysViolated);
  if (c.violates) {
    ok(`«${c.ruleId}» — ${c.label}: the report actually publishes the finding`, !!finding);
  }
}

// ── [3] The defect that started Phase 1, stated as its inverse ──────────────
console.log('\n[3] The original divergence is gone\n');

const beforeParts = snap({
  sizeInch: 5, cellCount: 6,
  frame: mismatchedFrame, motor: motors[0], propeller: propellers[0], battery: batteries[0],
});
const sizeFinding = computeFindings(beforeParts).find(f => f.id === 'frame-size');
ok('the REPORT now carries the frame↔size objection the card always had',
  sizeFinding?.severity === 'blocker');
ok('and the card still carries it',
  checkCandidate('frames', mismatchedFrame, { sizeInch: 5, parts: {} }).verdict === 'incompatible');
ok('the engine now reads the declared size at all',
  JSON.stringify(computeFindings(snap({ sizeInch: 5, frame: mismatchedFrame })))
  !== JSON.stringify(computeFindings(snap({ sizeInch: mismatchedFrame.specs.sizeInch, frame: mismatchedFrame }))));
ok('with no declared size the rule declines rather than inventing a default',
  computeFindings(snap({ frame: mismatchedFrame })).every(f => f.id !== 'frame-size'));

// ── [4] One tolerance, one home ─────────────────────────────────────────────
console.log('\n[4] Neither surface owns its own tolerance\n');

const rulesSrc = read('src/data/assembly/compatibility/rules.ts');
const checksSrc = read('web/lib/build/checks.ts');
const verdictsSrc = read('src/data/project/verdicts.ts');
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

ok('the shared rules module states no numeric tolerance of its own',
  !/\d+\.\d+/.test(strip(rulesSrc).replace(/from '[^']+'/g, '')));
ok('the candidate composer no longer calls frameMatchesSize directly',
  !/frameMatchesSize\(/.test(strip(checksSrc)));
ok('the report composer does not call frameMatchesSize directly either',
  !/frameMatchesSize\(/.test(strip(verdictsSrc)));
ok('both go through the shared rule instead',
  /frameSizeRule\(/.test(strip(checksSrc)) && /frameSizeRule\(/.test(strip(verdictsSrc)));

console.log(`\n[equivalence] ${passed} passed, ${failures.length} failed`);
if (failures.length) {
  failures.forEach(f => console.log(`  FAILED: ${f}`));
  process.exit(1);
}

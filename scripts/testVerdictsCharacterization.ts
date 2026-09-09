/**
 * WHAT THE VERDICT ENGINE SAYS TODAY — FROZEN, BEFORE IT IS REFACTORED
 * ====================================================================
 *
 * `computeFindings` is read by seventeen surfaces across the phone app and the
 * web: the project workspace, the build wizard, every Betaflight and EdgeTX and
 * ExpressLRS page, the encyclopedia's context card, search results. Phase 1
 * moves the TRUTH behind some of its rules into shared primitives so the part
 * card and the final report can never again disagree — and a refactor of that
 * shape is exactly the kind that changes a severity or drops a sentence without
 * anybody noticing.
 *
 * So this suite pins the current output first. It is a CHARACTERIZATION test,
 * not a specification: it does not claim the current behaviour is right, only
 * that the refactor did not change it. Every fixture records, per finding:
 *
 *     id · severity · confidence · claimAr · evidenceAr · missingAr
 *     · manualCheckAr · actionsAr · links · and the ORDER they arrive in
 *
 * against `scripts/fixtures/verdictsBaseline.json`, which is committed. When a
 * change is intended, the baseline is regenerated and the DIFF of that file is
 * the review artefact — you can see exactly which sentence moved.
 *
 *     npx tsx --tsconfig web/tsconfig.json scripts/testVerdictsCharacterization.ts
 *     npx tsx --tsconfig web/tsconfig.json scripts/testVerdictsCharacterization.ts --update
 *
 * ORDERING IS PART OF THE CONTRACT. `sortFindings` puts blockers first so a
 * screen cannot bury the one sentence that matters, and several surfaces render
 * `findings[0]` or slice the top few. So the sequence is compared, not a set.
 */

import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type { BasePart, Frame, Motor, Esc, Battery, Propeller, Receiver, VideoUnit } from '../src/data/assembly/types';
import type { ProjectSnapshot } from '../src/data/project/types';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = path.join(ROOT, 'scripts/fixtures/verdictsBaseline.json');
const UPDATE = process.argv.includes('--update');

const { PART_CATEGORY_MAP } = await import('../src/data/project/store');
const { computeFindings } = await import('../src/data/project/verdicts');
const { buildStages } = await import('../src/data/assembly/buildStages');
const { frameMatchesSize } = await import('../src/data/assembly/frameSizeMatch');

let passed = 0;
const failures: string[] = [];
function ok(label: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ok — ${label}`); }
  else { failures.push(label); console.log(`  FAIL — ${label}`); }
}

const cat = <T extends BasePart>(c: string) => (PART_CATEGORY_MAP[c] ?? []) as unknown as T[];
const frames = cat<Frame>('frames');
const motors = cat<Motor>('motors');
const escs = cat<Esc>('escs');
const batteries = cat<Battery>('batteries');
const propellers = cat<Propeller>('propellers');
const receivers = cat<Receiver>('receivers');
const videoUnits = cat<VideoUnit>('videoUnits');
const fcs = cat<BasePart>('flightControllers');
const gpsUnits = cat<BasePart>('gps');

const byId = <T extends BasePart>(list: T[], id: string): T => {
  const hit = list.find(p => p.id === id);
  assert.ok(hit, `fixture needs a catalogue part that no longer exists: ${id}`);
  return hit;
};
const taggedFor = <T extends BasePart>(list: T[], type: string): T[] =>
  list.filter(p => p.compatibilityTags.droneTypes.includes(type));

/** A snapshot with only what a fixture states — the rest genuinely absent. */
function snap(over: Partial<ProjectSnapshot>): ProjectSnapshot {
  const parts: Record<string, BasePart> = {};
  const put = (k: string, v: BasePart | undefined) => { if (v) parts[k] = v; };
  put('frames', over.frame); put('motors', over.motor); put('escs', over.esc);
  put('flightControllers', over.flightController); put('batteries', over.battery);
  put('propellers', over.propeller); put('receivers', over.receiver);
  put('videoUnits', over.videoUnit); put('gps', over.gps);
  return {
    exists: true,
    stageIndex: buildStages.length - 1,
    totalStages: buildStages.length,
    ...over,
    parts: { ...parts, ...(over.parts ?? {}) },
  } as ProjectSnapshot;
}

/** A clean, blocker-free build for one drone type — derived, never typed out. */
function cleanBuild(droneTypeId: string, sizeInch: number, sCount: number): ProjectSnapshot | null {
  const pick = <T extends BasePart>(list: T[]): T[] => {
    const t = taggedFor(list, droneTypeId);
    return (t.length ? t : list).filter(p => p.compatibilityTags.batteryVoltages.includes(sCount));
  };
  const framePool = pick(frames).filter(f => frameMatchesSize(f, sizeInch));
  for (const frame of framePool)
    for (const motor of pick(motors))
      for (const esc of pick(escs))
        for (const fc of pick(fcs))
          for (const propeller of pick(propellers))
            for (const receiver of pick(receivers))
              for (const videoUnit of pick(videoUnits))
                for (const battery of pick(batteries)) {
                  const s = snap({
                    droneTypeId, sizeInch, cellCount: sCount,
                    frame, motor, esc, flightController: fc,
                    propeller, receiver, videoUnit, battery,
                  });
                  if (computeFindings(s).every(f => f.severity !== 'blocker')) return s;
                }
  return null;
}

// ── The fixtures ────────────────────────────────────────────────────────────
const fixtures: { name: string; snapshot: ProjectSnapshot }[] = [];
const add = (name: string, snapshot: ProjectSnapshot | null) => {
  assert.ok(snapshot, `fixture «${name}» could not be constructed from the catalogue`);
  fixtures.push({ name, snapshot });
};

add('empty project', snap({ exists: false }));
add('clean freestyle 5in 6S', cleanBuild('freestyle', 5, 6));
add('clean freestyle 5in 4S', cleanBuild('freestyle', 5, 4));
add('clean cinematic 5in', cleanBuild('cinematic', 5, 6) ?? cleanBuild('cinematic', 5, 4));
add('clean long-range 7in', cleanBuild('long-range', 7, 6) ?? cleanBuild('long-range', 7, 4));

// stack mount: the racing frame is 20x20, every FC is 30.5
add('stack-mount blocker', snap({
  droneTypeId: 'racing', sizeInch: 5, cellCount: 6,
  frame: byId(frames, 'frame-aos-5r-v5-race-mid'),
  flightController: fcs[0],
}));
// stack mount unknown: an FC with no documented mounting size, if one exists;
// otherwise a frame with no documented stack size. Falls back to frame-only.
add('stack-mount with frame alone (rule must not fire)', snap({
  frame: byId(frames, 'frame-aos-5r-v5-race-mid'),
}));

// voltage mismatches — derived by finding a genuinely incompatible pair
const badMotorBattery = (() => {
  for (const m of motors) for (const b of batteries)
    if (!m.specs.compatibleVoltages.includes(b.specs.sCount)) return { m, b };
  return null;
})();
add('voltage-motor blocker', badMotorBattery
  ? snap({ motor: badMotorBattery.m, battery: badMotorBattery.b })
  : null);

// No stocked ESC is incompatible with any stocked battery, so the catalogue
// cannot reach the `voltage-esc` blocker branch at all — the synthetic 4S-only
// ESC below is what covers it. This fixture therefore pins the PASSING side.
add('voltage-esc on a real (compatible) pair', snap({ esc: escs[0], battery: batteries[0] }));

/*
 * SYNTHETIC PARTS FOR THE BRANCHES THE CATALOGUE CANNOT REACH.
 *
 * Four of the engine's branches have no catalogue part that triggers them: no
 * ESC is incompatible with any stocked battery, every flight controller has six
 * or seven UARTs and a documented 30.5 mounting size, and every frame documents
 * its stack sizes. Leaving those branches uncharacterized would mean the
 * refactor could change `unknown` handling or the UART arithmetic and nothing
 * would notice.
 *
 * These fixtures invent PARTS, never rules — each is a minimal object shaped
 * like the real type, built only to walk a branch that already exists.
 */
const synthEsc = { ...escs[0], id: 'synth-esc-4s-only', nameAr: 'ESC اختباري',
  specs: { ...escs[0].specs, compatibleVoltages: [4] } } as Esc;
const synth6S = batteries.find(b => b.specs.sCount === 6);
add('voltage-esc blocker (synthetic 4S-only ESC on a 6S battery)', synth6S
  ? snap({ esc: synthEsc, battery: synth6S })
  : null);

const fcShape = fcs[0] as BasePart & { specs: Record<string, unknown> };
const synthFc = (uartCount: number, id: string, extra: Record<string, unknown> = {}) =>
  ({ ...fcShape, id, nameAr: 'متحكم اختباري',
    specs: { ...fcShape.specs, uartCount, ...extra } }) as unknown as ProjectSnapshot['flightController'];

add('uart-budget blocker (2 UARTs, 3 consumers)', snap({
  flightController: synthFc(2, 'synth-fc-2-uart'),
  receiver: receivers[0], videoUnit: videoUnits[0], gps: gpsUnits[0] as never,
}));
add('uart-budget warning (3 UARTs, 3 consumers, no spare)', snap({
  flightController: synthFc(3, 'synth-fc-3-uart'),
  receiver: receivers[0], videoUnit: videoUnits[0], gps: gpsUnits[0] as never,
}));
add('stack-mount unknown (FC with no documented mounting size)', snap({
  frame: frames[0],
  flightController: synthFc(6, 'synth-fc-no-mount', { mountingSizeMm: undefined }),
}));

// design voltage vs the battery actually chosen
const four = batteries.find(b => b.specs.sCount === 4);
const six = batteries.find(b => b.specs.sCount === 6);
add('voltage-design-mismatch warning', four && six
  ? snap({ cellCount: 6, battery: four })
  : null);

// frame ↔ motor class (a warning in the report today)
const badFrameMotor = (() => {
  for (const f of frames) for (const m of motors) {
    const nominal = m.compatibilityTags.frameSizeInch;
    if (nominal === undefined) continue;
    if (Math.abs(f.specs.sizeInch - nominal) > 0.15
      && !(m.specs.maxFrameSizeInch !== undefined && f.specs.sizeInch <= m.specs.maxFrameSizeInch)) {
      return { f, m };
    }
  }
  return null;
})();
add('frame-motor-class mismatch', badFrameMotor
  ? snap({ frame: badFrameMotor.f, motor: badFrameMotor.m })
  : null);

// frame ↔ propeller clearance
const badFrameProp = (() => {
  for (const f of frames) for (const pr of propellers) {
    const max = f.specs.maxPropSizeInch ?? f.specs.sizeInch;
    if (pr.specs.sizeInch > max) return { f, pr };
  }
  return null;
})();
add('prop-clearance blocker', badFrameProp
  ? snap({ frame: badFrameProp.f, propeller: badFrameProp.pr })
  : null);

// current-headroom: always unknown, on any esc+motor pair
add('current-headroom unknown', snap({ esc: escs[0], motor: motors[0] }));

// UART budget — crowd the smallest FC
const smallestFc = [...fcs].sort((a, b) =>
  ((a as { specs: { uartCount: number } }).specs.uartCount)
  - ((b as { specs: { uartCount: number } }).specs.uartCount))[0];
add('uart-budget with three consumers', snap({
  flightController: smallestFc,
  receiver: receivers[0], videoUnit: videoUnits[0], gps: gpsUnits[0] as never,
}));
add('uart-budget with one consumer', snap({
  flightController: smallestFc, receiver: receivers[0],
}));

// esc channels
add('esc-channels on a real esc', snap({ esc: escs[0] }));

// missing data everywhere: a frame and an FC only
add('frame + fc only', snap({ frame: frames[0], flightController: fcs[0] }));

// multiple findings on one build — an intentionally bad full build
add('multiple findings on one build', snap({
  droneTypeId: 'freestyle', sizeInch: 5, cellCount: 6,
  frame: byId(frames, 'frame-aos-5r-v5-race-mid'),
  motor: badMotorBattery?.m ?? motors[0],
  battery: badMotorBattery?.b ?? batteries[0],
  esc: escs[0], flightController: fcs[0],
  propeller: propellers[0], receiver: receivers[0], videoUnit: videoUnits[0],
}));

// THE FRAME ↔ DECLARED SIZE CASE — the one intentional change of Phase 1.
// Recorded here BEFORE the fix so the baseline diff shows exactly what appears.
const mismatchedFrame = frames.find(f => !frameMatchesSize(f, 5));
add('frame contradicts the declared build size', mismatchedFrame
  ? snap({
    droneTypeId: 'freestyle', sizeInch: 5, cellCount: 6,
    frame: mismatchedFrame, motor: motors[0], esc: escs[0],
    flightController: fcs[0], propeller: propellers[0],
    receiver: receivers[0], videoUnit: videoUnits[0], battery: batteries[0],
  })
  : null);
add('same parts, declared size REMOVED (rule must not fire)', mismatchedFrame
  ? snap({
    droneTypeId: 'freestyle', cellCount: 6,
    frame: mismatchedFrame, motor: motors[0], esc: escs[0],
    flightController: fcs[0], propeller: propellers[0],
    receiver: receivers[0], videoUnit: videoUnits[0], battery: batteries[0],
  })
  : null);

// ── Capture ─────────────────────────────────────────────────────────────────
const captured = Object.fromEntries(fixtures.map(({ name, snapshot }) => [
  name,
  computeFindings(snapshot).map(f => ({
    id: f.id,
    severity: f.severity,
    confidence: f.confidence,
    claimAr: f.claimAr,
    whyAr: f.whyAr,
    evidenceAr: f.evidenceAr,
    actionsAr: f.actionsAr,
    missingAr: f.missingAr,
    manualCheckAr: f.manualCheckAr ?? null,
    links: f.links ?? [],
  })),
]));

if (UPDATE || !existsSync(BASELINE)) {
  mkdirSync(path.dirname(BASELINE), { recursive: true });
  writeFileSync(BASELINE, `${JSON.stringify(captured, null, 2)}\n`, 'utf8');
  console.log(`\n[characterization] baseline WRITTEN — ${fixtures.length} fixtures`);
  console.log('Review the diff of scripts/fixtures/verdictsBaseline.json before committing.\n');
  process.exit(0);
}

const expected = JSON.parse(readFileSync(BASELINE, 'utf8')) as typeof captured;

console.log('\n[characterization] computeFindings against the frozen baseline\n');

ok('every baseline fixture is still constructed',
  Object.keys(expected).every(k => k in captured));
ok('no fixture was silently dropped',
  Object.keys(expected).length === Object.keys(captured).length);

for (const name of Object.keys(expected)) {
  const before = expected[name];
  const after = captured[name] ?? [];
  const idsBefore = before.map(f => f.id).join(' → ');
  const idsAfter = after.map(f => f.id).join(' → ');
  ok(`«${name}»: same findings, same order`, idsBefore === idsAfter);
  if (idsBefore !== idsAfter) {
    console.log(`      before: ${idsBefore || '(none)'}`);
    console.log(`      after : ${idsAfter || '(none)'}`);
    continue;
  }
  ok(`«${name}»: every field identical`,
    JSON.stringify(before) === JSON.stringify(after));
  if (JSON.stringify(before) !== JSON.stringify(after)) {
    for (let i = 0; i < before.length; i++) {
      if (JSON.stringify(before[i]) !== JSON.stringify(after[i])) {
        console.log(`      «${before[i].id}» changed:`);
        for (const key of Object.keys(before[i]) as (keyof typeof before[0])[]) {
          if (JSON.stringify(before[i][key]) !== JSON.stringify(after[i][key])) {
            console.log(`        ${String(key)}:`);
            console.log(`          before: ${JSON.stringify(before[i][key])}`);
            console.log(`          after : ${JSON.stringify(after[i][key])}`);
          }
        }
      }
    }
  }
}

console.log(`\n[characterization] ${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.log('\nIf a change was INTENDED, regenerate with --update and review the');
  console.log('baseline diff — it is the record of what the refactor altered.\n');
  process.exit(1);
}

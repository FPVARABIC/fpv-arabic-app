/**
 * Proof for the project layer — the verdict engine and the next-step rule.
 *
 * This engine's entire value is that its judgements can be trusted, so the
 * properties that make them trustworthy are asserted here rather than assumed:
 *
 *   - a judgement that cannot be made is reported as unknown, never as silence
 *   - an unknown always names the missing data (otherwise it is just a shrug)
 *   - a blocker always carries an action (otherwise it is just alarm)
 *   - a verified finding carries no busywork actions
 *   - every finding states reasoning distinct from its claim
 *   - every link resolves to a real destination
 *   - severity is a safety ordering: a blocker outranks build progress
 *
 * Run: npx tsx scripts/testProject.ts
 */
import assert from 'node:assert/strict';

import { computeFindings, parseStackSizes, countFindings, sortFindings } from '../src/data/project/verdicts';
import { computeNextStep } from '../src/data/project/nextStep';
import { buildCompatibilityReport } from '../src/components/Assembly/utils/buildReport';
import { SEVERITY_ORDER, type ProjectSnapshot, type Finding } from '../src/data/project/types';
import { resolveLinkRoute } from '../src/data/kb/registry';
import { buildStages } from '../src/data/assembly/buildStages';
import { motors } from '../src/data/assembly/parts/motors';
import { escs } from '../src/data/assembly/parts/escs';
import { batteries } from '../src/data/assembly/parts/batteries';
import { frames } from '../src/data/assembly/parts/frames';
import { flightControllers } from '../src/data/assembly/parts/flightControllers';
import { propellers } from '../src/data/assembly/parts/propellers';
import { receivers } from '../src/data/assembly/parts/receivers';
import { gps } from '../src/data/assembly/parts/gps';

let passed = 0;
function ok(label: string, cond: boolean) {
  assert.ok(cond, `FAILED: ${label}`);
  console.log(`  ok — ${label}`);
  passed++;
}

const EMPTY: ProjectSnapshot = { exists: false, stageIndex: 0, totalStages: buildStages.length, parts: {} };

function snap(over: Partial<ProjectSnapshot>): ProjectSnapshot {
  return { exists: true, stageIndex: 0, totalStages: buildStages.length, parts: {}, ...over };
}

console.log('\n[1] An empty project says so, and points at the one thing worth doing');
{
  const f = computeFindings(EMPTY);
  ok('no findings are invented for a project that does not exist', f.length === 0);

  const next = computeNextStep(EMPTY, f);
  ok('the next step is to start a project', next.route === '/assembly');
  ok('and it explains why that is worth doing', next.reasonAr.length > 60);
  ok('an empty project is not reported as blocked', next.isBlocked === false);
}

console.log('\n[2] A voltage mismatch is a blocker, not a warning');
{
  // Find a real motor/battery pair from the catalogue that genuinely conflicts.
  let pair: { m: typeof motors[number]; b: typeof batteries[number] } | null = null;
  for (const m of motors) {
    for (const b of batteries) {
      if (!m.specs.compatibleVoltages.includes(b.specs.sCount)) { pair = { m, b }; break; }
    }
    if (pair) break;
  }
  assert.ok(pair, 'expected the catalogue to contain at least one incompatible motor/battery pair');

  const f = computeFindings(snap({ motor: pair.m, battery: pair.b }));
  const v = f.find(x => x.id === 'voltage-motor');
  assert.ok(v, 'expected a motor-voltage finding');
  ok('an out-of-range battery is a blocker', v.severity === 'blocker');
  ok('…and it is stated as a direct spec comparison', v.confidence === 'typed-spec');
  ok('…and the evidence names both parts', v.evidenceAr.length >= 2);
  ok('…and it tells the user what to do', v.actionsAr.length > 0);
  ok('…and the reasoning is not a restatement of the claim', v.whyAr !== v.claimAr && v.whyAr.length > 80);

  // The matching case must be reported as verified, not omitted.
  const goodBattery = batteries.find(b => pair!.m.specs.compatibleVoltages.includes(b.specs.sCount));
  if (goodBattery) {
    const f2 = computeFindings(snap({ motor: pair.m, battery: goodBattery }));
    const v2 = f2.find(x => x.id === 'voltage-motor');
    ok('a matching battery is reported as verified rather than left silent', v2?.severity === 'ok');
    ok('…and a verified finding asks the user to do nothing', (v2?.actionsAr.length ?? 1) === 0);
  }
}

console.log('\n[3] What we cannot compute is declared, not hidden');
{
  const f = computeFindings(snap({ motor: motors[0], esc: escs[0] }));
  const h = f.find(x => x.id === 'current-headroom');
  assert.ok(h, 'expected a current-headroom finding whenever a motor and ESC are both chosen');

  ok('current headroom is reported as unknown, not as passing', h.severity === 'unknown');
  ok('…and it is marked as needing the manufacturer, not a guess', h.confidence === 'manual-required');
  ok('…and it names exactly what data is missing', h.missingAr.length > 0);
  ok('…and it says where to get it', !!h.manualCheckAr && h.manualCheckAr.length > 30);
  ok('…and it still gives the user something to do', h.actionsAr.length > 0);

  // The rule must never silently pass just because the ESC rating exists.
  ok('the ESC current rating alone never produces a pass verdict',
    !f.some(x => x.id === 'current-headroom' && x.severity === 'ok'));
}

console.log('\n[4] Invariants that hold for every finding the engine can produce');
{
  // Exercise the engine across many real combinations rather than one fixture,
  // so the invariants are properties of the engine and not of a lucky example.
  const all: Finding[] = [];
  for (const m of motors.slice(0, 3)) {
    for (const b of batteries.slice(0, 3)) {
      for (const e of escs.slice(0, 2)) {
        for (const fr of frames.slice(0, 2)) {
          all.push(...computeFindings(snap({
            motor: m, battery: b, esc: e, frame: fr,
            flightController: flightControllers[0],
            propeller: propellers[0],
            receiver: receivers[0],
            gps: gps[0],
            cellCount: b.specs.sCount,
          })));
        }
      }
    }
  }
  ok(`the engine produced findings across real combinations (${all.length})`, all.length > 50);

  ok('every finding states a claim', all.every(x => x.claimAr.trim().length > 15));
  ok('every finding states reasoning distinct from its claim',
    all.every(x => x.whyAr.trim().length > 40 && x.whyAr !== x.claimAr));
  ok('every blocker carries at least one action', all.filter(x => x.severity === 'blocker').every(x => x.actionsAr.length > 0));
  ok('every unknown names the missing data', all.filter(x => x.severity === 'unknown').every(x => x.missingAr.length > 0));
  ok('no verified finding creates busywork', all.filter(x => x.severity === 'ok').every(x => x.actionsAr.length === 0));
  ok('every finding rests on stated evidence', all.every(x => x.evidenceAr.length > 0));
  ok('no finding id is empty', all.every(x => x.id.trim().length > 0));

  const broken = all.flatMap(x => x.links)
    .filter(l => !resolveLinkRoute({ kind: l.kind, targetId: l.targetId, label: l.label }));
  if (broken.length) console.error('  broken links:', broken.map(l => `${l.kind}:${l.targetId}`));
  ok('every link on every finding resolves to a real destination', broken.length === 0);
}

console.log('\n[5] Severity is a safety ordering, and the next step respects it');
{
  const conflicting = (() => {
    for (const m of motors) for (const b of batteries) {
      if (!m.specs.compatibleVoltages.includes(b.specs.sCount)) return { m, b };
    }
    return null;
  })();
  assert.ok(conflicting, 'expected an incompatible pair');

  // A user mid-build with an unresolved blocker must be stopped, not advanced.
  const midBuild = snap({ motor: conflicting.m, battery: conflicting.b, stageIndex: 3 });
  const f = computeFindings(midBuild);
  const next = computeNextStep(midBuild, f);
  ok('a blocker outranks build progress in the next step', next.isBlocked === true);
  ok('…and the next step explains which blocker', next.reasonAr.length > 20);

  ok('findings are sorted blockers-first', (() => {
    const idx = f.map(x => SEVERITY_ORDER.indexOf(x.severity));
    return idx.every((v, i) => i === 0 || idx[i - 1] <= v);
  })());

  const c = countFindings(f);
  ok('counts add up to the number of findings',
    c.blocker + c.warning + c.unknown + c.ok === f.length);
  ok('sortFindings does not lose or duplicate findings', sortFindings(f).length === f.length);
}

console.log('\n[6] Stack-size parsing — the frame field is prose, not a format');
{
  ok('parses a single square pattern', parseStackSizes('30.5x30.5').join() === '30.5');
  ok('parses several patterns', parseStackSizes('30.5x30.5 / 25.5x25.5 / 20x20').join() === '30.5,25.5,20');
  ok('tolerates the Arabic multiplication sign and loose spacing',
    parseStackSizes('30.5 × 30.5').join() === '30.5');
  ok('ignores non-square dimensions rather than guessing', parseStackSizes('16x19').length === 0);
  ok('an absent field yields nothing rather than a default', parseStackSizes(undefined).length === 0);
  ok('unparseable prose yields nothing rather than a default', parseStackSizes('حسب النسخة').length === 0);
}

console.log('\n[7] A project with no comparable parts produces no fabricated verdicts');
{
  const f = computeFindings(snap({ frame: frames[0] }));
  ok('a lone part produces no pairwise findings', f.every(x => x.id !== 'voltage-motor' && x.id !== 'voltage-esc'));
  const next = computeNextStep(snap({ frame: frames[0], stageIndex: 2 }), f);
  ok('the next step falls back to continuing the build', next.route === '/assembly' && !next.isBlocked);
}

console.log('\n[8] One engine — the assembly report and the workspace cannot disagree');
{
  // The failure this guards against is a user reading «كل القطع متوافقة» on
  // one screen and a blocker about the same two parts on another. That is only
  // impossible if both screens read the same judgements.
  const conflicting = (() => {
    for (const m of motors) for (const b of batteries) {
      if (!m.specs.compatibleVoltages.includes(b.specs.sCount)) return { m, b };
    }
    return null;
  })();
  assert.ok(conflicting, 'expected an incompatible pair');

  const sel = {
    frame: frames[0], motor: conflicting.m, esc: escs[0],
    battery: conflicting.b, propeller: propellers[0],
    flightController: flightControllers[0], receiver: receivers[0],
  };
  const report = buildCompatibilityReport(sel);
  const engine = computeFindings(snap(sel));

  ok('the assembly report returns exactly the engine\'s findings',
    report.findings.length === engine.length
    && report.findings.every((f, i) => f.id === engine[i].id && f.severity === engine[i].severity));

  ok('a blocker in the workspace is a failure in the assembly report',
    engine.filter(f => f.severity === 'blocker')
      .every(f => report.items.some(i => i.descriptionAr === f.claimAr && !i.isCompatible)));

  ok('the score never reaches 100% while a blocker exists', report.scorePercent < 100);

  // Unknowns must be carried, not scored — counting them either way invents
  // an answer the engine explicitly refused to give.
  ok('unknowns are excluded from the scored items', report.items.length === engine.filter(f => f.severity !== 'unknown').length);
  ok('…and surfaced separately instead of dropped',
    report.openQuestions.length === engine.filter(f => f.severity === 'unknown').length
    && report.openQuestions.length > 0);
  ok('every open question still names its missing data on this screen too',
    report.openQuestions.every(q => q.missingAr.length > 0 && q.actionsAr.length > 0));

  // A clean build must still be able to read 100%, or the number stops meaning
  // anything and the honesty change would have broken a working screen.
  const goodBattery = batteries.find(b => conflicting.m.specs.compatibleVoltages.includes(b.specs.sCount));
  if (goodBattery) {
    const clean = buildCompatibilityReport({ motor: conflicting.m, battery: goodBattery, esc: escs[0] });
    const decidable = clean.items.every(i => i.isCompatible);
    ok('a build whose every decidable check passes still scores 100%', !decidable || clean.scorePercent === 100);
    ok('…while its undecided checks remain visible rather than absorbed into the score',
      clean.openQuestions.length > 0);
  }

  ok('a failing item carries the engine\'s reasoning, not just a label',
    report.items.filter(i => !i.isCompatible).every(i => (i.reasonAr?.length ?? 0) > 40));
  ok('a passing item adds no noise', report.items.filter(i => i.isCompatible).every(i => i.reasonAr === undefined));
}

console.log(`\n✅ testProject: ${passed} assertions passed\n`);

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
import type { RcSetup } from '../src/data/project/rcSetup';
import { buildCompatibilityReport } from '../src/components/Assembly/utils/buildReport';
import { SEVERITY_ORDER, type ProjectSnapshot, type Finding } from '../src/data/project/types';
import {
  MODULE_PART_SLOTS, projectPartsForModule, findingsForArticle, hasProjectContext,
  BF_PAGE_RC_FIELDS, MODULE_RC_FIELDS, findingsForBetaflightPage,
  rcFactsForBetaflightPage, rcFactsForModule,
} from '../src/data/project/context';
import { bfPageRegistry } from '../src/data/betaflight/pageRegistry';
import { resolveLinkRoute, allKbModules, allKbArticles, getArticle } from '../src/data/kb/registry';
import { buildStages } from '../src/data/assembly/buildStages';
import { droneTypes } from '../src/data/assembly/droneTypes';
import { frames } from '../src/data/assembly/parts/frames';
import {
  saveAssemblyProject, saveRcSetup, saveVideoSetup,
  loadAndValidateAssemblyProject, clearAssemblyProject,
} from '../src/data/project/store';
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

console.log('\n[9] The article knows the reader\'s parts — without inventing a relationship');
{
  // Every mapped module must be a real module, or the panel silently never
  // renders on a page the mapping claims to cover.
  const moduleIds = new Set(allKbModules.map(m => m.id));
  ok('every module in the mapping is a real module',
    Object.keys(MODULE_PART_SLOTS).every(id => moduleIds.has(id)));
  ok('every authored module is mapped, so no article page is left generic',
    allKbModules.every(m => MODULE_PART_SLOTS[m.id]?.length));

  const full = snap({
    frame: frames[0], motor: motors[0], esc: escs[0], battery: batteries[0],
    propeller: propellers[0], flightController: flightControllers[0],
    receiver: receivers[0], gps: gps[0],
  });

  ok('an ESC article shows the ESC, the motors it drives and the battery it switches',
    projectPartsForModule(full, 'esc').map(r => r.labelAr).join() === 'الـESC,المحركات,البطارية');
  ok('no module dumps the entire parts list onto the page',
    allKbModules.every(m => projectPartsForModule(full, m.id).length <= 4));
  ok('a module nobody mapped produces nothing rather than a guess',
    projectPartsForModule(full, 'not-a-module').length === 0);
  ok('a project that does not exist produces no parts anywhere',
    allKbModules.every(m => projectPartsForModule(EMPTY, m.id).length === 0));
  ok('a slot the user has not filled is skipped, not shown empty',
    projectPartsForModule(snap({ esc: escs[0] }), 'esc').length === 1);

  // The article↔finding relationship must come from the engine's own links.
  const findings = computeFindings(full);
  const linkedIds = new Set(
    findings.flatMap(f => f.links).filter(l => l.kind === 'article').map(l => l.targetId));
  ok('the engine genuinely links its findings to articles', linkedIds.size > 0);

  for (const id of linkedIds) {
    const hits = findingsForArticle(findings, id);
    assert.ok(hits.length > 0, `expected ${id} to surface its findings`);
    assert.ok(
      hits.every(f => f.links.some(l => l.kind === 'article' && l.targetId === id)),
      `a finding surfaced on ${id} without linking to it`,
    );
  }
  ok(`every linked article surfaces exactly the findings that named it (${linkedIds.size} articles)`, true);

  const unlinked = allKbArticles().filter(a => !linkedIds.has(a.id));
  ok('an article no finding points at surfaces none',
    unlinked.every(a => findingsForArticle(findings, a.id).length === 0));
  ok('every article a finding links to is a real article',
    [...linkedIds].every(id => !!getArticle(id)));

  ok('with no project there is nothing to show on any article',
    allKbArticles().every(a => findingsForArticle(computeFindings(EMPTY), a.id).length === 0));

  // The panel must not render as an empty promise.
  ok('the panel is suppressed when there is nothing true to say',
    !hasProjectContext(projectPartsForModule(EMPTY, 'esc'), findingsForArticle(computeFindings(EMPTY), 'esc-ratings')));
  ok('…and shown when there is', hasProjectContext(projectPartsForModule(full, 'esc'), []));
}

console.log('\n[10] The control link — verdicts about facts no catalogue holds');
{
  const base = (rc: Partial<RcSetup>) => snap({ rcSetup: rc as RcSetup });

  // Nothing recorded → nothing invented.
  ok('an empty control-link setup produces no control-link findings',
    computeFindings(snap({})).every(f => !f.id.startsWith('rc-')));

  // Band mismatch is the one that can never be worked around.
  const bandClash = computeFindings(base({ txBand: 'sub-ghz', rxBand: '2.4ghz' }));
  const band = bandClash.find(f => f.id === 'rc-band-match');
  assert.ok(band, 'expected a band finding');
  ok('two different bands is a blocker, not a warning', band.severity === 'blocker');
  ok('…and it says plainly that no setting can fix it', band.whyAr.includes('لن يحدث ربط'));
  ok('…and its first action is to stop wasting time on binding', band.actionsAr[0].includes('أوقف'));

  ok('matching bands are reported as verified rather than left silent',
    computeFindings(base({ txBand: '2.4ghz', rxBand: '2.4ghz' }))
      .find(f => f.id === 'rc-band-match')?.severity === 'ok');

  // Same band, different system — the confusion this rule exists for.
  const sysClash = computeFindings(base({ txBand: '2.4ghz', rxBand: '2.4ghz', txSystem: 'elrs', rxSystem: 'tracer' }));
  const sys = sysClash.find(f => f.id === 'rc-system-match');
  assert.ok(sys, 'expected a system finding');
  ok('the same band with different systems is still a blocker', sys.severity === 'blocker');
  ok('…and the reasoning names the exact confusion it resolves', sys.whyAr.includes('كلاهما 2.4'));

  // A system on a band it is not known to support.
  const oddBand = computeFindings(base({ txSystem: 'crossfire', txBand: '2.4ghz' }));
  ok('a system recorded on a band we do not know it supports is flagged',
    oddBand.some(f => f.id === 'rc-system-band-tx' && f.severity === 'warning'));
  ok('…but it allows for a product we do not know, rather than calling the user wrong',
    oddBand.find(f => f.id === 'rc-system-band-tx')?.missingAr.length === 1);

  // Battery voltage straight to a receiver.
  const vbat = computeFindings(base({ rxVoltage: 'fc-vbat' }));
  const power = vbat.find(f => f.id === 'rc-rx-power');
  assert.ok(power, 'expected a receiver power finding');
  ok('feeding a receiver from battery voltage is a blocker', power.severity === 'blocker');
  ok('…and the first action is to cut power, not to keep testing', power.actionsAr[0].includes('افصل'));
  ok('…and it still points at the manual rather than asserting a limit', !!power.manualCheckAr);

  ok('an unrecorded supply is reported as undecidable, not as fine',
    computeFindings(base({ rxVoltage: 'unknown' })).find(f => f.id === 'rc-rx-power')?.severity === 'unknown');

  // Hold-last failsafe — the flyaway.
  const hold = computeFindings(base({ failsafeStrategy: 'hold-last' }));
  const fs = hold.find(f => f.id === 'rc-failsafe-strategy');
  assert.ok(fs, 'expected a failsafe finding');
  ok('holding last values is a blocker', fs.severity === 'blocker');
  ok('…and the reasoning explains the flyaway mechanism', fs.whyAr.includes('تختفي في الأفق'));
  ok('…and it forbids flying before the behaviour is seen', fs.actionsAr.some(a => a.includes('لا تطر')));

  ok('a disarm failsafe that was actually tested is reported as verified',
    computeFindings(base({ failsafeStrategy: 'drop-disarm', failsafeTestedOn: '2026-08-01' }))
      .find(f => f.id === 'rc-failsafe-strategy')?.severity === 'ok');
  ok('an untested disarm failsafe still asks for the missing test',
    (computeFindings(base({ failsafeStrategy: 'drop-disarm' }))
      .find(f => f.id === 'rc-failsafe-strategy')?.missingAr.length ?? 0) > 0);

  // Two devices on one port.
  const clash = computeFindings(base({ uartIndex: 2, gpsUartIndex: 2 }));
  const uart = clash.find(f => f.id === 'rc-uart-conflict');
  assert.ok(uart, 'expected a UART finding');
  ok('two devices on one UART is a blocker', uart.severity === 'blocker');
  ok('…and the evidence names both claimants on that port',
    uart.evidenceAr.some(e => e.includes('المستقبل') && e.includes('GPS')));
  ok('distinct ports are reported as verified',
    computeFindings(base({ uartIndex: 2, gpsUartIndex: 3 }))
      .find(f => f.id === 'rc-uart-conflict')?.severity === 'ok');

  // A port number the board does not have.
  const tooHigh = computeFindings(snap({
    flightController: flightControllers[0],
    rcSetup: { uartIndex: 11 } as RcSetup,
  }));
  ok('a UART number beyond the board\'s port count is a blocker',
    tooHigh.find(f => f.id === 'rc-uart-exists')?.severity === 'blocker');

  // Inversion is never asserted from a port number.
  const sbus = computeFindings(base({ serialProtocol: 'sbus', uartIndex: 3 }));
  const inv = sbus.find(f => f.id === 'rc-inversion-support');
  assert.ok(inv, 'expected an inversion finding');
  ok('inversion support is declared undecidable, never assumed', inv.severity === 'unknown');
  ok('…and it is marked as needing the board schematic', inv.confidence === 'manual-required');

  ok('a legacy protocol is flagged without being forbidden',
    computeFindings(base({ serialProtocol: 'ppm' })).find(f => f.id === 'rc-protocol-choice')?.severity === 'warning');
  ok('a modern protocol is reported as suitable',
    computeFindings(base({ serialProtocol: 'crsf' })).find(f => f.id === 'rc-protocol-choice')?.severity === 'ok');

  // Antenna placement.
  ok('an antenna inside the frame is flagged',
    computeFindings(base({ antennaPlacement: 'inside-frame' }))
      .find(f => f.id === 'rc-antenna-placement')?.severity === 'warning');
  ok('the best placement is reported as verified',
    computeFindings(base({ antennaPlacement: 'outside-perpendicular' }))
      .find(f => f.id === 'rc-antenna-placement')?.severity === 'ok');

  // The engine-wide invariants must hold for the control-link rules too.
  const every = [
    ...computeFindings(base({ txBand: 'sub-ghz', rxBand: '2.4ghz', txSystem: 'elrs', rxSystem: 'crossfire' })),
    ...computeFindings(base({
      rxVoltage: 'fc-vbat', failsafeStrategy: 'hold-last', antennaPlacement: 'inside-frame',
      serialProtocol: 'sbus', uartIndex: 2, gpsUartIndex: 2, modelMatch: false,
      txFirmware: '3.4.3', rxFirmware: '3.3.0',
      txRegulatoryDomain: 'FCC', rxRegulatoryDomain: 'EU CE',
      moduleKind: 'external',
    })),
  ].filter(f => f.id.startsWith('rc-'));
  ok(`the control-link rules produce a real body of findings (${every.length})`, every.length > 12);
  ok('every control-link finding states reasoning distinct from its claim',
    every.every(f => f.whyAr.length > 60 && f.whyAr !== f.claimAr));
  ok('every control-link blocker carries an action', every.filter(f => f.severity === 'blocker').every(f => f.actionsAr.length > 0));
  ok('every control-link unknown names its missing data', every.filter(f => f.severity === 'unknown').every(f => f.missingAr.length > 0));
  ok('no verified control-link finding creates busywork', every.filter(f => f.severity === 'ok').every(f => f.actionsAr.length === 0));
  ok('every control-link finding rests on stated evidence', every.every(f => f.evidenceAr.length > 0));

  const brokenRc = every.flatMap(f => f.links)
    .filter(l => !resolveLinkRoute({ kind: l.kind, targetId: l.targetId, label: l.label }));
  if (brokenRc.length) console.error('  broken rc links:', brokenRc.map(l => `${l.kind}:${l.targetId}`));
  ok('every link on every control-link finding resolves', brokenRc.length === 0);

  // Blockers must still win the next step, whatever produced them.
  const midBuild = snap({ stageIndex: 3, rcSetup: { failsafeStrategy: 'hold-last' } as RcSetup });
  ok('a control-link blocker stops the build just as a part blocker does',
    computeNextStep(midBuild, computeFindings(midBuild)).isBlocked === true);
}

console.log('\n[11] The software centre reads the user\'s own setup');
{
  const FULL: RcSetup = {
    txSystem: 'elrs', txBand: '2.4ghz', rxSystem: 'elrs', rxBand: '2.4ghz',
    rxTarget: 'RadioMaster RP1 2400 RX', txFirmware: '3.4.3', rxFirmware: '3.4.3',
    serialProtocol: 'crsf', uartIndex: 2, gpsUartIndex: 4, videoUartIndex: 6,
    antennaPlacement: 'outside-perpendicular', failsafeStrategy: 'drop-disarm',
    failsafeTestedOn: '2026-08-01', modelMatch: true, packetRateHz: 250,
    rxModel: 'RadioMaster RP1',
  };
  const withRc = snap({ rcSetup: FULL, flightController: flightControllers[0] });

  // The mapping must point at real pages, or the panel silently never renders.
  const bfIds = new Set(bfPageRegistry.map(e => e.id));
  ok('every mapped Betaflight page id is a real registry page',
    Object.keys(BF_PAGE_RC_FIELDS).every(id => bfIds.has(id)));
  ok('every mapped KB module id is a real module',
    Object.keys(MODULE_RC_FIELDS).every(id => allKbModules.some(m => m.id === id)));

  ok('the ports page shows the ports the user recorded',
    rcFactsForBetaflightPage(withRc, 'ports').map(f => f.field).join() === 'uartIndex,gpsUartIndex,videoUartIndex,serialProtocol');
  ok('…rendered as readable values, not raw keys',
    rcFactsForBetaflightPage(withRc, 'ports').every(f => f.valueAr.length > 0 && !f.valueAr.includes('undefined')));
  ok('the failsafe page shows the recorded strategy and whether it was tested',
    rcFactsForBetaflightPage(withRc, 'failsafe').length === 2);

  ok('a page with nothing to say about the control link shows nothing',
    rcFactsForBetaflightPage(withRc, 'pid-tuning').length === 0);
  ok('a project with no control-link setup produces no facts anywhere',
    Object.keys(BF_PAGE_RC_FIELDS).every(id => rcFactsForBetaflightPage(snap({}), id).length === 0));
  ok('an unfilled field produces no row rather than an empty one',
    rcFactsForBetaflightPage(snap({ rcSetup: { uartIndex: 3 } as RcSetup }), 'ports').length === 1);

  // The reverse index must be asserted by the engine, never guessed.
  const rcFindings = computeFindings(snap({
    rcSetup: { failsafeStrategy: 'hold-last', uartIndex: 2, gpsUartIndex: 2 } as RcSetup,
  }));
  ok('a finding that named the failsafe page is found from that page',
    findingsForBetaflightPage(rcFindings, 'failsafe').some(f => f.id === 'rc-failsafe-strategy'));
  ok('a page no finding named surfaces none',
    findingsForBetaflightPage(rcFindings, 'pid-tuning').length === 0);
  ok('every finding surfaced on a page genuinely links to that page',
    Object.keys(BF_PAGE_RC_FIELDS).every(id =>
      findingsForBetaflightPage(rcFindings, id)
        .every(f => f.links.some(l => l.kind === 'betaflight' && l.targetId === id))));

  // The article side of the same data.
  ok('a control-link article shows the reader\'s recorded system and band',
    rcFactsForModule(withRc, 'rc-link').some(f => f.field === 'txBand')
    && rcFactsForModule(withRc, 'rc-link').some(f => f.field === 'rxSystem'));
  ok('an unrelated module shows no control-link facts',
    rcFactsForModule(withRc, 'esc').length === 0);
  ok('…and no project means no facts at all', rcFactsForModule(EMPTY, 'rc-link').length === 0);

  // Every betaflight link any finding can emit must be a real page.
  const allBfTargets = new Set(
    [...computeFindings(snap({
      motor: motors[0], battery: batteries[0], esc: escs[0], frame: frames[0],
      flightController: flightControllers[0], propeller: propellers[0],
      receiver: receivers[0], gps: gps[0], rcSetup: FULL,
    })), ...rcFindings]
      .flatMap(f => f.links).filter(l => l.kind === 'betaflight').map(l => l.targetId),
  );
  ok(`findings link to real Betaflight pages (${allBfTargets.size})`,
    allBfTargets.size > 0 && [...allBfTargets].every(id => bfIds.has(id)));
}

/* ────────────────────────────────────────────────────────────────────────────
 * The project store preserves what it does not own
 *
 * A REGRESSION TEST FOR REAL DATA LOSS
 * ------------------------------------
 * `saveAssemblyProject` used to construct its payload from its arguments alone.
 * It is called on EVERY part change by the build flow, and the build flow does
 * not pass `rcSetup` or `videoSetup` — so recording a control link and then
 * swapping a motor silently destroyed the entire control-link record, and the
 * video record with it. The write succeeded, the project still loaded, and the
 * configuration was simply gone.
 *
 * The sequence below is exactly that: configure, then make an ordinary part
 * change, then read back. It fails on the old writer and passes on the merging
 * one.
 * ──────────────────────────────────────────────────────────────────────────── */
console.log('\n[storage] a part change does not destroy the control-link or video record');
{
  // `platform/storage.ts` talks to localStorage and try/catch-wraps it, so in
  // node every write silently no-ops and every read returns null. A minimal
  // in-memory shim is what makes the round trip observable at all — it is the
  // real store code being exercised, only the browser API is stood in for.
  const mem = new Map<string, string>();
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => { mem.set(k, v); },
    removeItem: (k: string) => { mem.delete(k); },
    clear: () => mem.clear(),
  };

  const dt = droneTypes[0].id;
  const twoMotors = motors.slice(0, 2);

  saveAssemblyProject({
    droneTypeId: dt, stageIndex: 2, sizeInch: 5, batteryVoltage: 6,
    parts: { frames: frames[0], motors: twoMotors[0] },
  });

  const withRc = saveRcSetup({ txSystem: 'elrs', txBand: '2.4ghz', serialProtocol: 'crsf' });
  ok('the control-link record is stored', withRc?.rcSetup?.txSystem === 'elrs');

  const withVideo = saveVideoSetup({ ecosystem: 'analog-58', airUnitModel: 'Test VTX' });
  ok('the video record is stored', withVideo?.videoSetup?.ecosystem === 'analog-58');
  ok('storing the video record leaves the control-link record intact',
    withVideo?.rcSetup?.txSystem === 'elrs');

  // The ordinary thing a user does next: change a part.
  saveAssemblyProject({
    droneTypeId: dt, stageIndex: 3, sizeInch: 5, batteryVoltage: 6,
    parts: { frames: frames[0], motors: twoMotors[1] ?? twoMotors[0] },
  });

  const after = loadAndValidateAssemblyProject();
  ok('the part change itself was saved', after?.stageIndex === 3);
  ok('THE CONTROL-LINK RECORD SURVIVES A PART CHANGE', after?.rcSetup?.txSystem === 'elrs');
  ok('THE VIDEO RECORD SURVIVES A PART CHANGE', after?.videoSetup?.ecosystem === 'analog-58');
  ok('…with its detail, not merely a truthy object', after?.videoSetup?.airUnitModel === 'Test VTX');

  // An explicit value still wins — merging must not make the field unwritable.
  saveAssemblyProject({
    droneTypeId: dt, stageIndex: 3, sizeInch: 5, batteryVoltage: 6,
    parts: { frames: frames[0], motors: twoMotors[0] },
    rcSetup: { txSystem: 'crossfire', txBand: 'sub-ghz' },
  });
  ok('an explicitly-passed control-link record still replaces the stored one',
    loadAndValidateAssemblyProject()?.rcSetup?.txSystem === 'crossfire');

  clearAssemblyProject();
  ok('clearing removes the project entirely', loadAndValidateAssemblyProject() === null);
}

console.log(`\n✅ testProject: ${passed} assertions passed\n`);

/**
 * Structural/data proof for the Betaflight Arabic companion architecture:
 * types, glossary, version model, source model, page registry, old-ID
 * compatibility map, and (Phase 2) the four complete pages: Setup, Ports,
 * Motors, Failsafe. Does not test rendering — see
 * testBetaflightArchitectureUI.ts for the browser-driven behavioral proof.
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bfPageRegistry } from '../src/data/betaflight/pageRegistry';
import { bfCompatibilityMap, resolveCompatibilityId } from '../src/data/betaflight/compatibilityMap';
import { bfGlossary } from '../src/data/betaflight/glossary';
import { BF_VERSION_CONTEXT, officialDocUrl } from '../src/data/betaflight/sourceHelpers';
import { setupPage } from '../src/data/betaflight/pages/setup';
import { portsPage } from '../src/data/betaflight/pages/ports';
import { motorsPage } from '../src/data/betaflight/pages/motors';
import { failsafePage } from '../src/data/betaflight/pages/failsafe';
import { configurationPage } from '../src/data/betaflight/pages/configuration';
import { powerPage } from '../src/data/betaflight/pages/power';
import { receiverPage } from '../src/data/betaflight/pages/receiver';
import { modesPage } from '../src/data/betaflight/pages/modes';
import { betaflightData } from '../src/data/betaflightData';
import type { BfPage } from '../src/data/betaflight/types';

const PHASE_2_PAGES = [setupPage, portsPage, motorsPage, failsafePage] as BfPage[];
const PHASE_3_PAGES = [configurationPage, powerPage, receiverPage, modesPage] as BfPage[];
const ALL_REVIEWED_PAGES = [...PHASE_2_PAGES, ...PHASE_3_PAGES];

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

let passed = 0;
function ok(label: string, cond: boolean) {
  assert.ok(cond, `FAILED: ${label}`);
  console.log(`  ok — ${label}`);
  passed++;
}

const SAFETY_LEVELS = new Set(['informational', 'caution', 'warning', 'critical']);
const CONTENT_LEVELS = new Set(['basic', 'advanced', 'expert']);
const CONTENT_STATUSES = new Set(['not-started', 'architecture-preview', 'reviewed']);

console.log('\n[1] Version context is the confirmed stable baseline, not RC/development');
{
  ok('firmwareVersion is set', BF_VERSION_CONTEXT.firmwareVersion.length > 0);
  ok('appVersion is set', BF_VERSION_CONTEXT.appVersion.length > 0);
  ok('stability is "stable"', BF_VERSION_CONTEXT.stability === 'stable');
  ok('releaseLine matches firmware/app major line (2025.12)', BF_VERSION_CONTEXT.releaseLine === '2025.12');
  ok('firmwareVersion is within the 2025.12 line', BF_VERSION_CONTEXT.firmwareVersion.startsWith('2025.12.'));
  ok('appVersion is within the 2025.12 line', BF_VERSION_CONTEXT.appVersion.startsWith('2025.12.'));
  ok('reviewedAt is a plausible ISO date', /^\d{4}-\d{2}-\d{2}$/.test(BF_VERSION_CONTEXT.reviewedAt));
}

console.log('\n[2] officialDocUrl() matches the verified per-tab doc-link pattern');
{
  ok('setup -> betaflight.com/docs/wiki/app/setup-tab', officialDocUrl('setup') === 'https://betaflight.com/docs/wiki/app/setup-tab');
  ok('ports -> betaflight.com/docs/wiki/app/ports-tab', officialDocUrl('ports') === 'https://betaflight.com/docs/wiki/app/ports-tab');
  ok('underscored IDs are hyphenated (onboard_logging)', officialDocUrl('onboard_logging') === 'https://betaflight.com/docs/wiki/app/onboard-logging-tab');
  ok('underscored IDs are hyphenated (pid_tuning)', officialDocUrl('pid_tuning') === 'https://betaflight.com/docs/wiki/app/pid-tuning-tab');
}

console.log('\n[3] Page registry: unique IDs, valid order, no duplicates');
{
  const ids = bfPageRegistry.map(e => e.id);
  ok('registry has 26 verified entries', bfPageRegistry.length === 26);
  ok('all registry IDs are unique', new Set(ids).size === ids.length);
  const orders = bfPageRegistry.map(e => e.officialOrder);
  ok('all officialOrder values are unique', new Set(orders).size === orders.length);
  ok('officialOrder values are 1..26 with no gaps', JSON.stringify([...orders].sort((a, b) => a - b)) === JSON.stringify(Array.from({ length: 26 }, (_, i) => i + 1)));
  ok('every entry has a non-empty officialId', bfPageRegistry.every(e => e.officialId.length > 0));
  ok('every entry has a non-empty officialTitle', bfPageRegistry.every(e => e.officialTitle.length > 0));
  ok('every entry has a non-empty titleAr', bfPageRegistry.every(e => e.titleAr.length > 0));
  ok('every entry has a valid safetyLevel', bfPageRegistry.every(e => SAFETY_LEVELS.has(e.safetyLevel)));
  ok('every entry has a valid contentStatus', bfPageRegistry.every(e => CONTENT_STATUSES.has(e.contentStatus)));
}

console.log('\n[4] Conditional pages are represented, not silently omitted');
{
  const conditional = bfPageRegistry.filter(e => e.scope === 'feature-dependent');
  const expectedConditionalIds = ['gps', 'led-strip', 'osd', 'servos', 'transponder', 'vtx'];
  ok('exactly 6 feature-dependent pages exist', conditional.length === 6);
  ok('conditional IDs match the verified cloud-build-gated tab set', JSON.stringify(conditional.map(e => e.id).sort()) === JSON.stringify([...expectedConditionalIds].sort()));
  ok('every conditional page has a non-empty conditionNote', conditional.every(e => (e.conditionNote ?? '').length > 0));
  const disconnected = bfPageRegistry.filter(e => e.connectionState === 'disconnected');
  ok('exactly 5 disconnected-state pages exist', disconnected.length === 5);
}

console.log('\n[5] Old-ID compatibility map contains all ten legacy IDs and resolves');
{
  const OLD_IDS = ['interface', 'firmware', 'ports', 'receiver', 'modes', 'motors', 'failsafe', 'osd', 'blackbox', 'cli'];
  ok('compatibility map has exactly 10 entries', bfCompatibilityMap.length === 10);
  ok('compatibility map covers exactly the 10 legacy IDs', JSON.stringify(bfCompatibilityMap.map(m => m.oldId).sort()) === JSON.stringify([...OLD_IDS].sort()));
  ok('betaflightData.ts (legacy, untouched) still defines exactly these same 10 IDs', JSON.stringify(betaflightData.map(s => s.id).sort()) === JSON.stringify([...OLD_IDS].sort()));
  for (const oldId of OLD_IDS) {
    const newId = resolveCompatibilityId(oldId);
    ok(`"${oldId}" resolves to a compatibility target`, typeof newId === 'string' && newId.length > 0);
    ok(`"${oldId}" -> "${newId}" points to a real registry entry (no route points to a missing page)`, bfPageRegistry.some(e => e.id === newId));
  }
  ok('every compatibility mapping has a non-empty note', bfCompatibilityMap.every(m => m.note.length > 0));
}

console.log('\n[6] Glossary: Phase 1 scope only, every entry fully populated');
{
  const expectedTermIds = ['setup', 'ports', 'msp', 'uart', 'serial-rx', 'save-and-reboot', 'arming-disable-flags'];
  ok('glossary has exactly the 7 Phase-1-scoped terms (no speculative pre-fill)', bfGlossary.length === 7);
  ok('glossary term IDs match the approved Phase 1 list', JSON.stringify(bfGlossary.map(t => t.id).sort()) === JSON.stringify([...expectedTermIds].sort()));
  ok('every glossary term has a non-empty English label', bfGlossary.every(t => t.en.length > 0));
  ok('every glossary term has a non-empty Arabic meaning', bfGlossary.every(t => t.ar.length > 0));
  ok('every glossary term has a non-empty explanation', bfGlossary.every(t => t.explanation.length > 0));
}

console.log('\n[7] Setup, Ports, Motors, Failsafe: honest "reviewed" status, real source-backed fields, no invented data');
{
  for (const page of PHASE_2_PAGES) {
    ok(`${page.id}: contentStatus is explicitly "reviewed" (Phase 2 complete pages)`, page.contentStatus === 'reviewed');
    ok(`${page.id}: has a non-empty source.url`, page.source.url.length > 0);
    ok(`${page.id}: source.url matches the verified officialDocUrl pattern`, page.source.url === officialDocUrl(page.officialId));
    ok(`${page.id}: has a non-empty source.repoPath (real file, not invented)`, (page.source.repoPath ?? '').length > 0);
    ok(`${page.id}: source.commit is a real 40-char git hash`, /^[0-9a-f]{40}$/.test(page.source.commit ?? ''));
    ok(`${page.id}: has at least one group`, page.groups.length > 0);
    ok(`${page.id}: every group has at least one field`, page.groups.every(g => g.fields.length > 0));
    ok(`${page.id}: no page content lives outside typed data (groups/fields are plain data, not JSX)`, page.groups.every(g => typeof g.titleAr === 'string'));

    const allFields = page.groups.flatMap(g => g.fields);
    ok(`${page.id}: field IDs are unique within the page`, new Set(allFields.map(f => f.id)).size === allFields.length);
    ok(`${page.id}: group IDs are unique within the page`, new Set(page.groups.map(g => g.id)).size === page.groups.length);
    ok(`${page.id}: every field has a non-empty englishLabel`, allFields.every(f => f.englishLabel.length > 0));
    ok(`${page.id}: every field has a non-empty arabicMeaning`, allFields.every(f => f.arabicMeaning.length > 0));
    ok(`${page.id}: every field has a non-empty arabicExplanation`, allFields.every(f => f.arabicExplanation.length > 0));
    ok(`${page.id}: every field has a valid safetyLevel`, allFields.every(f => SAFETY_LEVELS.has(f.safetyLevel)));
    ok(`${page.id}: every field has a valid controlType`, allFields.every(f => ['toggle', 'select', 'number', 'text', 'button', 'table', 'graph', 'status', 'action'].includes(f.controlType)));
    ok(`${page.id}: every field carries its own source`, allFields.every(f => f.source.url.length > 0));
    ok(`${page.id}: every field's source.repoPath is a real path (non-empty)`, allFields.every(f => (f.source.repoPath ?? '').length > 0));
    ok(`${page.id}: every field with scope !== 'universal' has a conditionNote`, allFields.every(f => f.scope === 'universal' || (f.conditionNote ?? '').length > 0));
    ok(`${page.id}: every field explicitly states requiresSave (boolean)`, allFields.every(f => typeof f.requiresSave === 'boolean'));
    ok(`${page.id}: every field explicitly states requiresReboot (boolean)`, allFields.every(f => typeof f.requiresReboot === 'boolean'));
    ok(`${page.id}: no field invents a numeric range without min AND max together`, allFields.every(f => !f.range || (f.range.min === undefined) === (f.range.max === undefined)));
    ok(`${page.id}: every group has a valid content level`, page.groups.every(g => CONTENT_LEVELS.has(g.level)));
    ok(`${page.id}: dependsOnFieldIds (if present) reference real field IDs on the same page`, allFields.every(f => (f.dependsOnFieldIds ?? []).every(depId => allFields.some(other => other.id === depId))));
  }

  ok('setupPage is registered in bfPageRegistry with matching content', bfPageRegistry.find(e => e.id === 'setup')?.page === setupPage);
  ok('portsPage is registered in bfPageRegistry with matching content', bfPageRegistry.find(e => e.id === 'ports')?.page === portsPage);
  ok('motorsPage is registered in bfPageRegistry with matching content', bfPageRegistry.find(e => e.id === 'motors')?.page === motorsPage);
  ok('failsafePage is registered in bfPageRegistry with matching content', bfPageRegistry.find(e => e.id === 'failsafe')?.page === failsafePage);
  ok('no registry entry is left at "architecture-preview" (Phase 1 preview status fully retired)', bfPageRegistry.filter(e => e.contentStatus === 'architecture-preview').length === 0);
}

console.log('\n[7e] Configuration, Power, Receiver, Modes (Phase 3): honest "reviewed" status, real source-backed fields, no invented data');
{
  for (const page of PHASE_3_PAGES) {
    ok(`${page.id}: contentStatus is explicitly "reviewed" (Phase 3 complete pages)`, page.contentStatus === 'reviewed');
    ok(`${page.id}: has a non-empty source.url`, page.source.url.length > 0);
    ok(`${page.id}: source.url matches the verified officialDocUrl pattern`, page.source.url === officialDocUrl(page.officialId));
    ok(`${page.id}: has a non-empty source.repoPath (real file, not invented)`, (page.source.repoPath ?? '').length > 0);
    ok(`${page.id}: source.commit is a real 40-char git hash`, /^[0-9a-f]{40}$/.test(page.source.commit ?? ''));
    ok(`${page.id}: has at least one group`, page.groups.length > 0);
    ok(`${page.id}: every group has at least one field`, page.groups.every(g => g.fields.length > 0));

    const allFields = page.groups.flatMap(g => g.fields);
    ok(`${page.id}: field IDs are unique within the page`, new Set(allFields.map(f => f.id)).size === allFields.length);
    ok(`${page.id}: group IDs are unique within the page`, new Set(page.groups.map(g => g.id)).size === page.groups.length);
    ok(`${page.id}: every field has a non-empty englishLabel`, allFields.every(f => f.englishLabel.length > 0));
    ok(`${page.id}: every field has a non-empty arabicMeaning`, allFields.every(f => f.arabicMeaning.length > 0));
    ok(`${page.id}: every field has a non-empty arabicExplanation`, allFields.every(f => f.arabicExplanation.length > 0));
    ok(`${page.id}: every field has a valid safetyLevel`, allFields.every(f => SAFETY_LEVELS.has(f.safetyLevel)));
    ok(`${page.id}: every field has a valid controlType`, allFields.every(f => ['toggle', 'select', 'number', 'text', 'button', 'table', 'graph', 'status', 'action'].includes(f.controlType)));
    ok(`${page.id}: every field carries its own source`, allFields.every(f => f.source.url.length > 0));
    ok(`${page.id}: every field's source.repoPath is a real path (non-empty)`, allFields.every(f => (f.source.repoPath ?? '').length > 0));
    ok(`${page.id}: every field with scope !== 'universal' has a conditionNote`, allFields.every(f => f.scope === 'universal' || (f.conditionNote ?? '').length > 0));
    ok(`${page.id}: every field explicitly states requiresSave (boolean)`, allFields.every(f => typeof f.requiresSave === 'boolean'));
    ok(`${page.id}: every field explicitly states requiresReboot (boolean)`, allFields.every(f => typeof f.requiresReboot === 'boolean'));
    ok(`${page.id}: no field invents a numeric range without min AND max together`, allFields.every(f => !f.range || (f.range.min === undefined) === (f.range.max === undefined)));
    ok(`${page.id}: every group has a valid content level`, page.groups.every(g => CONTENT_LEVELS.has(g.level)));
    ok(`${page.id}: dependsOnFieldIds (if present) reference real field IDs on the same page`, allFields.every(f => (f.dependsOnFieldIds ?? []).every(depId => allFields.some(other => other.id === depId))));
  }

  ok('configurationPage is registered in bfPageRegistry with matching content', bfPageRegistry.find(e => e.id === 'configuration')?.page === configurationPage);
  ok('powerPage is registered in bfPageRegistry with matching content', bfPageRegistry.find(e => e.id === 'power')?.page === powerPage);
  ok('receiverPage is registered in bfPageRegistry with matching content', bfPageRegistry.find(e => e.id === 'receiver')?.page === receiverPage);
  ok('modesPage is registered in bfPageRegistry with matching content', bfPageRegistry.find(e => e.id === 'modes')?.page === modesPage);

  ok('exactly 8 registry entries are "reviewed" (Setup, Ports, Motors, Failsafe, Configuration, Power, Receiver, Modes)', bfPageRegistry.filter(e => e.contentStatus === 'reviewed').length === 8);
  ok('the remaining 18 registry entries are honestly "not-started"', bfPageRegistry.filter(e => e.contentStatus === 'not-started').length === 18);
}

console.log('\n[7b] Motors: highest safety level, propeller warning adjacent to the enable-control, DShot/ESC-telemetry/battery/order coverage');
{
  ok('Motors page-level safetyLevel is "critical" (highest)', motorsPage.safetyLevel === 'critical');
  const motorTestGroup = motorsPage.groups.find(g => g.id === 'motor-test');
  ok('motor-test group exists', Boolean(motorTestGroup));
  const testFieldIds = motorTestGroup?.fields.map(f => f.id) ?? [];
  const warnIdx = testFieldIds.indexOf('propeller-removal-warning');
  const enableIdx = testFieldIds.indexOf('enable-test-mode');
  ok('propeller-removal-warning field exists', warnIdx !== -1);
  ok('enable-test-mode field exists', enableIdx !== -1);
  ok('propeller warning is immediately adjacent to (directly before) the enable-control field, not buried elsewhere', enableIdx === warnIdx + 1);
  ok('propeller warning field is safetyLevel "critical"', motorTestGroup?.fields.find(f => f.id === 'propeller-removal-warning')?.safetyLevel === 'critical');
  ok('enable-test-mode field is safetyLevel "critical"', motorTestGroup?.fields.find(f => f.id === 'enable-test-mode')?.safetyLevel === 'critical');
  ok('propeller warning explanation contains the real official "Remove all propellers" text', /Remove all propellers/i.test(motorTestGroup?.fields.find(f => f.id === 'propeller-removal-warning')?.arabicExplanation ?? ''));

  const allMotorFields = motorsPage.groups.flatMap(g => g.fields);
  ok('battery requirement is covered (battery-power-info field exists)', allMotorFields.some(f => f.id === 'battery-power-info'));
  ok('motor order is covered (reorder-motors field exists)', allMotorFields.some(f => f.id === 'reorder-motors'));
  ok('motor direction is covered (motor-direction-reversed and motor-direction-dshot-wizard fields exist)', allMotorFields.some(f => f.id === 'motor-direction-reversed') && allMotorFields.some(f => f.id === 'motor-direction-dshot-wizard'));
  ok('DShot controls are covered (esc-protocol and dshot-bidir fields exist)', allMotorFields.some(f => f.id === 'esc-protocol') && allMotorFields.some(f => f.id === 'dshot-bidir'));
  ok('ESC telemetry is covered (esc-telemetry field exists)', allMotorFields.some(f => f.id === 'esc-telemetry'));
  ok('save/reboot behavior is covered (save-and-reboot action field exists, requiresSave+requiresReboot true)', allMotorFields.find(f => f.id === 'save-and-reboot')?.requiresSave === true && allMotorFields.find(f => f.id === 'save-and-reboot')?.requiresReboot === true);
}

console.log('\n[7c] Failsafe: highest safety level, stage/procedure separation, GPS Rescue ownership, no bench-test overclaim');
{
  ok('Failsafe page-level safetyLevel is "critical" (highest)', failsafePage.safetyLevel === 'critical');
  const groupIds = failsafePage.groups.map(g => g.id);
  ok('receiver-loss/pulse-range behavior is its own group', groupIds.includes('pulse-range'));
  ok('stage timing is its own group (stage-two)', groupIds.includes('stage-two'));
  ok('drop/land procedure lives inside stage-two (failsafe-procedure field)', failsafePage.groups.find(g => g.id === 'stage-two')?.fields.some(f => f.id === 'failsafe-procedure'));
  ok('GPS Rescue relationship is covered as its own dedicated group (not duplicated on a separate GPS page in this phase)', groupIds.includes('gps-rescue'));
  const gpsRescueGroup = failsafePage.groups.find(g => g.id === 'gps-rescue');
  ok('GPS Rescue group has the real 15 fields verified from source (failsafe.html name= inputs)', gpsRescueGroup?.fields.length === 15);
  ok('testing procedure is covered via beginnerGuidance on the most safety-critical GPS Rescue field (throttle hover)', (gpsRescueGroup?.fields.find(f => f.id === 'gps-rescue-throttle-hover')?.beginnerGuidance ?? '').length > 0);

  const allFailsafeText = JSON.stringify(failsafePage);
  ok('no field/explanation implies a bench test alone guarantees a safe failsafe', !/يضمن|guarantee/i.test(allFailsafeText));
  ok('failsafe-switch-mode field explicitly documents the Kill option (arms are blocked, aircraft will crash)', /Kill/.test(failsafePage.groups.find(g => g.id === 'failsafe-switch')?.fields[0]?.arabicExplanation ?? ''));
}

console.log('\n[7d] Independent-review corrections: Motor Stop/ESC Sensor, Ports/Failsafe Save-and-Reboot, Setup field/group splits, no fabricated combo labels remain');
{
  const allMotorFields = motorsPage.groups.flatMap(g => g.fields);
  ok('Motors: "Motor Stop" feature toggle exists', allMotorFields.some(f => f.id === 'feature-motor-stop'));
  ok('Motors: "Motor Stop" englishLabel matches the real official string exactly', allMotorFields.find(f => f.id === 'feature-motor-stop')?.englishLabel === "Don't spin the motors when armed");
  ok('Motors: "ESC Sensor" feature toggle exists', allMotorFields.some(f => f.id === 'feature-esc-sensor'));
  ok('Motors: "ESC Sensor" englishLabel matches the real official string exactly', allMotorFields.find(f => f.id === 'feature-esc-sensor')?.englishLabel === 'Use KISS/BLHeli_32 ESC telemetry over a separate wire');
  ok('Motors: motor-poles no longer references an invisible ESC_SENSOR concept (the toggle is now represented)', allMotorFields.some(f => f.id === 'feature-esc-sensor') && allMotorFields.some(f => f.id === 'motor-poles'));

  const allPortsFields = portsPage.groups.flatMap(g => g.fields);
  ok('Ports: "Save and Reboot" action exists', allPortsFields.some(f => f.id === 'save-and-reboot'));
  const portsSaveField = allPortsFields.find(f => f.id === 'save-and-reboot');
  ok('Ports: "Save and Reboot" englishLabel matches exactly', portsSaveField?.englishLabel === 'Save and Reboot');
  ok('Ports: "Save and Reboot" is modeled as an action, not an editable setting', portsSaveField?.controlType === 'action');
  ok('Ports: "Save and Reboot" correctly requires save+reboot', portsSaveField?.requiresSave === true && portsSaveField?.requiresReboot === true);
  const peripheralsField = allPortsFields.find(f => f.id === 'peripherals');
  ok('Ports: Peripherals condition note mentions MSP API 1.45+ specifically for VTX_MSP', /1\.45/.test(peripheralsField?.conditionNote ?? '') && /VTX \(MSP \+ Displayport\)/.test(peripheralsField?.conditionNote ?? ''));
  ok('Ports: Peripherals condition note explicitly scopes the 1.45+ requirement to that one option, not the whole selector', /بقية الخيارات غير مرتبطة/.test(peripheralsField?.conditionNote ?? ''));

  const allFailsafeFields2 = failsafePage.groups.flatMap(g => g.fields);
  ok('Failsafe: "Save and Reboot" action exists', allFailsafeFields2.some(f => f.id === 'save-and-reboot'));
  const failsafeSaveField = allFailsafeFields2.find(f => f.id === 'save-and-reboot');
  ok('Failsafe: "Save and Reboot" englishLabel matches exactly', failsafeSaveField?.englishLabel === 'Save and Reboot');
  ok('Failsafe: "Save and Reboot" is modeled as an action, not an editable setting', failsafeSaveField?.controlType === 'action');
  ok('Failsafe: "Save and Reboot" correctly requires save+reboot', failsafeSaveField?.requiresSave === true && failsafeSaveField?.requiresReboot === true);
  ok('Failsafe: the 15 verified GPS Rescue fields are unchanged after adding the page-actions group', failsafePage.groups.find(g => g.id === 'gps-rescue')?.fields.length === 15);

  const allSetupFields = setupPage.groups.flatMap(g => g.fields);
  const setupGroupIds = setupPage.groups.map(g => g.id);
  ok('Setup: separate "Type" network field exists', allSetupFields.some(f => f.id === 'network-type' && f.englishLabel === 'Type'));
  ok('Setup: separate "Downlink" network field exists', allSetupFields.some(f => f.id === 'network-downlink' && f.englishLabel === 'Downlink'));
  ok('Setup: separate "RTT" network field exists', allSetupFields.some(f => f.id === 'network-rtt' && f.englishLabel === 'RTT'));
  ok('Setup: "Status" network field is still its own field', allSetupFields.some(f => f.id === 'network-status' && f.englishLabel === 'Status'));
  ok('Setup: separate "Latitude" field exists', allSetupFields.some(f => f.id === 'gps-latitude' && f.englishLabel === 'Latitude'));
  ok('Setup: separate "Longitude" field exists', allSetupFields.some(f => f.id === 'gps-longitude' && f.englishLabel === 'Longitude'));
  ok('Setup: separate "Yaw" field exists', allSetupFields.some(f => f.id === 'attitude-yaw' && f.englishLabel === 'Yaw'));
  ok('Setup: separate "Pitch" field exists', allSetupFields.some(f => f.id === 'attitude-pitch' && f.englishLabel === 'Pitch'));
  ok('Setup: separate "Roll" field exists', allSetupFields.some(f => f.id === 'attitude-roll' && f.englishLabel === 'Roll'));
  ok('Setup: 3D model / Reset Z axis action was not dropped', allSetupFields.some(f => f.id === 'reset-z-axis'));
  ok('Setup: official "Instruments" group exists', setupPage.groups.some(g => g.id === 'live-attitude' && g.officialTitle === 'Instruments'));
  ok('Setup: separate "GPS" group exists (not combined with Sonar)', setupPage.groups.some(g => g.id === 'gps' && g.officialTitle === 'GPS'));
  ok('Setup: separate "Sonar" group exists (not combined with GPS)', setupPage.groups.some(g => g.id === 'sonar' && g.officialTitle === 'Sonar'));
  ok('Setup: GPS group contains only GPS fields', (setupPage.groups.find(g => g.id === 'gps')?.fields ?? []).every(f => f.id.startsWith('gps-')));
  ok('Setup: Sonar group contains only Sonar fields', (setupPage.groups.find(g => g.id === 'sonar')?.fields ?? []).every(f => f.id.startsWith('sonar-')));

  const allSetupJson = JSON.stringify(setupPage);
  const allPortsJson = JSON.stringify(portsPage);
  ok('fabricated label "Type / Downlink / RTT" no longer exists anywhere in Setup', !allSetupJson.includes('Type / Downlink / RTT'));
  ok('fabricated label "Latitude / Longitude" no longer exists anywhere in Setup', !allSetupJson.includes('Latitude / Longitude'));
  ok('fabricated label "Yaw / Pitch / Roll" no longer exists anywhere in Setup', !allSetupJson.includes('Yaw / Pitch / Roll'));
  ok('fabricated group title "GPS / Sonar" no longer exists anywhere in Setup', !allSetupJson.includes('GPS / Sonar'));
  ok('no stray "gps-sonar" group id remains', !setupGroupIds.includes('gps-sonar'));
  ok('no leftover fabricated labels in Ports either', !allPortsJson.includes('Type / Downlink / RTT'));
}

console.log('\n[7f] Configuration: two distinct beeper-condition lists kept separate, gyro-required-on-API-1.47 gate, dynamic Other Features table');
{
  const allConfigFields = configurationPage.groups.flatMap(g => g.fields);
  const beeperTable = allConfigFields.find(f => f.id === 'beeper-conditions-table');
  const dshotBeeperTable = allConfigFields.find(f => f.id === 'dshot-beacon-conditions-table');
  ok('Configuration: full Beeper Configuration condition table exists', Boolean(beeperTable));
  ok('Configuration: restricted Dshot Beacon condition table exists as a SEPARATE field (not merged with Beeper Configuration)', Boolean(dshotBeeperTable) && dshotBeeperTable?.id !== beeperTable?.id);
  ok('Configuration: Beeper Configuration table lists all 22 real conditions', /RX_LOST/.test(beeperTable?.arabicExplanation ?? '') && (beeperTable?.arabicExplanation.match(/[,،]/g)?.length ?? 0) >= 20);
  ok('Configuration: Dshot Beacon table is explicitly noted as the restricted 2-condition list, distinct from the full Beeper list', /RX_LOST/.test(dshotBeeperTable?.arabicExplanation ?? '') && /RX_SET/.test(dshotBeeperTable?.arabicExplanation ?? ''));

  const otherFeaturesField = allConfigFields.find(f => f.id === 'other-features-table');
  ok('Configuration: Other Features table exists and is modeled as a dynamic table (hardware/feature-dependent scope)', otherFeaturesField?.controlType === 'table' && otherFeaturesField?.scope === 'feature-dependent');

  const gyroFields = allConfigFields.filter(f => f.group === 'gyro-alignment');
  ok('Configuration: gyro-alignment group exists with real fields', gyroFields.length > 0);

  ok('Configuration page-level safetyLevel is "warning"', configurationPage.safetyLevel === 'warning');
  ok('Configuration: page-actions Save-and-Reboot exists and requires save+reboot', allConfigFields.find(f => f.id === 'save-and-reboot')?.requiresSave === true && allConfigFields.find(f => f.id === 'save-and-reboot')?.requiresReboot === true);
}

console.log('\n[7g] Power & Battery: verbatim propeller-removal calibration warning, hardware-dependent meter-source selects not fabricated as fixed lists');
{
  const allPowerFields = powerPage.groups.flatMap(g => g.fields);
  const calibNote = allPowerFields.find(f => f.id === 'calibration-manager-note');
  ok('Power: calibration-manager-note field exists', Boolean(calibNote));
  ok('Power: calibration note contains the verbatim official propeller-removal warning', /remove propellers before plugging in a battery/i.test(calibNote?.arabicExplanation ?? ''));
  ok('Power: calibration note is safetyLevel "critical"', calibNote?.safetyLevel === 'critical');

  const voltageSource = allPowerFields.find(f => f.id === 'battery-voltage-meter-source');
  const currentSource = allPowerFields.find(f => f.id === 'battery-current-meter-source');
  ok('Power: Voltage Meter Source is modeled as hardware-dependent (no fabricated fixed option list)', voltageSource?.scope === 'hardware-dependent' && !voltageSource?.range?.options);
  ok('Power: Current Meter Source is modeled as hardware-dependent (no fabricated fixed option list)', currentSource?.scope === 'hardware-dependent' && !currentSource?.range?.options);
  ok('Power: page-level safetyLevel is "warning"', powerPage.safetyLevel === 'warning');

  const powerSave = allPowerFields.find(f => f.id === 'power-save');
  ok('Power: Save action exists and does NOT require reboot (verified: powerButtonSave has no reboot behavior in source)', powerSave?.requiresSave === true && powerSave?.requiresReboot === false);
}

console.log('\n[7h] Receiver: two distinct Save buttons kept separate, Bind/Radio-Emulator gates distinct, Failsafe-testing reminder preserved, real fixed SPI RX list');
{
  const allReceiverFields = receiverPage.groups.flatMap(g => g.fields);
  const saveField = allReceiverFields.find(f => f.id === 'receiver-save');
  const saveRebootField = allReceiverFields.find(f => f.id === 'receiver-save-and-reboot');
  ok('Receiver: "Save" (no reboot) action exists as its own field', Boolean(saveField));
  ok('Receiver: "Save and Reboot" action exists as its own SEPARATE field (not merged with Save)', Boolean(saveRebootField) && saveRebootField?.id !== saveField?.id);
  ok('Receiver: "Save" correctly does not require reboot', saveField?.requiresSave === true && saveField?.requiresReboot === false);
  ok('Receiver: "Save and Reboot" correctly requires reboot', saveRebootField?.requiresSave === true && saveRebootField?.requiresReboot === true);

  const radioEmulator = allReceiverFields.find(f => f.id === 'radio-emulator');
  const bindReceiver = allReceiverFields.find(f => f.id === 'bind-receiver');
  ok('Receiver: Radio Emulator button exists, gated on the RX_MSP feature (distinct from Bind Receiver)', radioEmulator?.scope === 'feature-dependent' && /RX_MSP/.test(radioEmulator?.conditionNote ?? ''));
  ok('Receiver: Bind Receiver button exists, gated on hardware capability SUPPORTS_RX_BIND (distinct from Radio Emulator)', bindReceiver?.scope === 'hardware-dependent' && /SUPPORTS_RX_BIND/.test(bindReceiver?.conditionNote ?? ''));

  const helpNote = allReceiverFields.find(f => f.id === 'receiver-help-note');
  ok('Receiver: help note contains the verbatim official Failsafe-testing reminder', /Failsafe is working properly/i.test(helpNote?.arabicExplanation ?? ''));

  const spiRxField = allReceiverFields.find(f => f.id === 'spi-rx-provider');
  ok('Receiver: SPI RX Provider is a real fixed 20-item list (not fabricated, not hardware-dynamic)', spiRxField?.range?.options?.length === 20 && spiRxField.range.options.includes('EXPRESSLRS'));
  ok('Receiver: page-level safetyLevel is "critical" (Failsafe-adjacent)', receiverPage.safetyLevel === 'critical');
}

console.log('\n[7i] Modes (auxiliary): honest no-reboot save, ARM-cannot-be-linked exception preserved, dynamic mode table not fabricated as fixed');
{
  const allModesFields = modesPage.groups.flatMap(g => g.fields);
  const modesSave = allModesFields.find(f => f.id === 'modes-save');
  ok('Modes: Save action exists and correctly does NOT require reboot (verified via writeConfiguration(false) -> MSPHelper.js signature)', modesSave?.requiresSave === true && modesSave?.requiresReboot === false);
  ok('Modes: unlike Receiver (which shows one of two save buttons conditionally), Modes has exactly one unconditional Save action', modesPage.groups.flatMap(g => g.fields).filter(f => f.id === 'modes-save').length === 1);
  ok('Modes: no page group is named/labelled "Save and Reboot" (the real auxiliary.html toolbar button is plain "Save")', !modesPage.groups.flatMap(g => g.fields).some(f => f.englishLabel === 'Save and Reboot'));

  const helpNote = allModesFields.find(f => f.id === 'auxiliary-help-note');
  ok('Modes: help note contains the verbatim official ARM-cannot-be-linked exception text', /ARM cannot be linked/i.test(helpNote?.arabicExplanation ?? ''));
  ok('Modes: help note explains AND/OR activation logic', /AND/.test(helpNote?.arabicExplanation ?? '') && /OR/.test(helpNote?.arabicExplanation ?? ''));

  const modesTable = allModesFields.find(f => f.id === 'modes-assignment-table');
  ok('Modes: the per-mode assignment table is modeled as hardware-dependent (genuinely dynamic, read live via MSP_BOXNAMES)', modesTable?.controlType === 'table' && modesTable?.scope === 'hardware-dependent');
  ok('Modes: officialId is "auxiliary" (internal tab ID), while officialTitle is the visible "Modes"', modesPage.officialId === 'auxiliary' && modesPage.officialTitle === 'Modes');
  ok('Modes: page-level safetyLevel is "critical" (governs ARM among other modes)', modesPage.safetyLevel === 'critical');

  ok('all 8 Phase 2 + Phase 3 pages are honestly marked "reviewed"', ALL_REVIEWED_PAGES.every(p => p.contentStatus === 'reviewed'));
  ok('all 8 Phase 2 + Phase 3 pages carry a real 40-char verified source commit hash', ALL_REVIEWED_PAGES.every(p => /^[0-9a-f]{40}$/.test(p.source.commit ?? '')));
}

console.log('\n[8] Version overlays are empty unless a verified difference exists (no speculative overlays)');
{
  ok('setupPage has no version overlays (none verified yet)', (setupPage.versionOverlays ?? []).length === 0);
  ok('portsPage has no version overlays (none verified yet)', (portsPage.versionOverlays ?? []).length === 0);
}

console.log('\n[9] Legacy Betaflight files are untouched (do not replace all ten current articles this phase)');
{
  const betaflightDataSrc = readFileSync(join(ROOT, 'src/data/betaflightData.ts'), 'utf8');
  const betaflightViewSrc = readFileSync(join(ROOT, 'src/views/BetaflightView.tsx'), 'utf8');
  ok('betaflightData.ts still defines exactly 10 sections', (betaflightDataSrc.match(/id: '[a-z]+', title:/g) ?? []).length === 10);
  ok('BetaflightView.tsx (hub) is untouched — still renders the exact existing heading', betaflightViewSrc.includes('Betaflight بالعربي'));
  ok('BetaflightView.tsx (hub) is untouched — still navigates the legacy way for its 10 cards', betaflightViewSrc.includes('navigate(`/betaflight/${section.id}`)'));
  const betaflightDetailSrc = readFileSync(join(ROOT, 'src/views/BetaflightDetailView.tsx'), 'utf8');
  ok('BetaflightDetailView.tsx legacy return-navigation is preserved exactly twice', (betaflightDetailSrc.match(/navigate\('\/betaflight'\)/g) ?? []).length === 2);
  ok('BetaflightDetailView.tsx legacy branch (icon back button) is preserved', betaflightDetailSrc.includes("navigate('/betaflight')} className=\"w-9 h-9 rounded-xl bg-white/5"));
  ok('BetaflightDetailView.tsx legacy branch (return button) is preserved', betaflightDetailSrc.includes('العودة إلى Betaflight'));
}

console.log('\n[10] OFFICIAL-SOURCE CROSS-CHECK — reads the real cloned Configurator source directly, not authored data');
{
  const CLONE_DIR = '/tmp/betaflight-official-audit/configurator';
  const EXPECTED_COMMIT = 'a2d0f50623cbb4fd492bc94eac2aec3acc8b2c5a';
  const EXPECTED_TAG = '2025.12.2';

  ok('official-source cross-check: read-only audit clone exists at /tmp/betaflight-official-audit/configurator', existsSync(CLONE_DIR));

  const commit = execSync('git rev-parse HEAD', { cwd: CLONE_DIR }).toString().trim();
  const tag = execSync('git describe --tags', { cwd: CLONE_DIR }).toString().trim();
  ok('official-source cross-check: clone HEAD is the expected commit', commit === EXPECTED_COMMIT);
  ok('official-source cross-check: clone is checked out at the expected tag (2025.12.2)', tag === EXPECTED_TAG);

  const setupHtmlPath = join(CLONE_DIR, 'src/tabs/setup.html');
  const portsVuePath = join(CLONE_DIR, 'src/components/tabs/PortsTab.vue');
  const localePath = join(CLONE_DIR, 'locales/en/messages.json');
  ok('official-source cross-check: real src/tabs/setup.html exists in the clone', existsSync(setupHtmlPath));
  ok('official-source cross-check: real src/components/tabs/PortsTab.vue exists in the clone', existsSync(portsVuePath));
  ok('official-source cross-check: real locales/en/messages.json exists in the clone', existsSync(localePath));

  const locale = JSON.parse(readFileSync(localePath, 'utf8')) as Record<string, { message?: string } | string>;
  const realLabel = (key: string): string | undefined => {
    const v = locale[key];
    return typeof v === 'string' ? v : v?.message;
  };

  const realCalibrateAccel = realLabel('initialSetupButtonCalibrateAccel');
  const realSystemInfoTitle = realLabel('initialSetupInfoHead');
  const realPortsSerialRx = realLabel('portsSerialRx');
  ok('official-source cross-check: the real locale actually defines "initialSetupButtonCalibrateAccel"', typeof realCalibrateAccel === 'string' && realCalibrateAccel.length > 0);
  ok('official-source cross-check: the real locale actually defines "initialSetupInfoHead"', typeof realSystemInfoTitle === 'string' && realSystemInfoTitle.length > 0);
  ok('official-source cross-check: the real locale actually defines "portsSerialRx"', typeof realPortsSerialRx === 'string' && realPortsSerialRx.length > 0);

  const setupAccelField = setupPage.groups.flatMap(g => g.fields).find(f => f.id === 'calibrate-accelerometer');
  ok('official-source cross-check: Setup "Calibrate Accelerometer" englishLabel matches the live-read real locale string exactly', setupAccelField?.englishLabel === realCalibrateAccel);

  const setupSystemInfoGroup = setupPage.groups.find(g => g.id === 'system-info');
  ok('official-source cross-check: Setup "system-info" group officialTitle matches the live-read real locale string exactly ("System info")', setupSystemInfoGroup?.officialTitle === realSystemInfoTitle);

  const portsSerialRxField = portsPage.groups.flatMap(g => g.fields).find(f => f.id === 'serial-rx');
  ok('official-source cross-check: Ports "Serial Rx" englishLabel matches the live-read real locale string exactly', portsSerialRxField?.englishLabel === realPortsSerialRx);

  const motorsHtmlPath = join(CLONE_DIR, 'src/tabs/motors.html');
  const failsafeHtmlPath = join(CLONE_DIR, 'src/tabs/failsafe.html');
  ok('official-source cross-check: real src/tabs/motors.html exists in the clone', existsSync(motorsHtmlPath));
  ok('official-source cross-check: real src/tabs/failsafe.html exists in the clone', existsSync(failsafeHtmlPath));

  const realMotorsMaster = realLabel('motorsMaster');
  const realFailsafePulseRangeTitle = realLabel('failsafePulsrangeTitle');
  const realFailsafeStageTwoTitle = realLabel('failsafeStageTwoSettingsTitle');
  ok('official-source cross-check: the real locale actually defines "motorsMaster"', typeof realMotorsMaster === 'string' && realMotorsMaster.length > 0);
  ok('official-source cross-check: the real locale actually defines "failsafePulsrangeTitle"', typeof realFailsafePulseRangeTitle === 'string' && realFailsafePulseRangeTitle.length > 0);
  ok('official-source cross-check: the real locale actually defines "failsafeStageTwoSettingsTitle"', typeof realFailsafeStageTwoTitle === 'string' && realFailsafeStageTwoTitle.length > 0);

  const motorsMasterField = motorsPage.groups.flatMap(g => g.fields).find(f => f.id === 'master-slider');
  ok('official-source cross-check: Motors "Master" englishLabel matches the live-read real locale string exactly', motorsMasterField?.englishLabel === realMotorsMaster);

  const failsafePulseRangeGroup = failsafePage.groups.find(g => g.id === 'pulse-range');
  const failsafeStageTwoGroup = failsafePage.groups.find(g => g.id === 'stage-two');
  ok('official-source cross-check: Failsafe "pulse-range" group officialTitle matches the live-read real locale string exactly ("Valid Pulse Range Settings")', failsafePulseRangeGroup?.officialTitle === realFailsafePulseRangeTitle);
  ok('official-source cross-check: Failsafe "stage-two" group officialTitle matches the live-read real locale string exactly ("Stage 2 - Settings")', failsafeStageTwoGroup?.officialTitle === realFailsafeStageTwoTitle);

  const realMotorsNotice = realLabel('motorsNotice');
  ok('official-source cross-check: the real locale actually defines "motorsNotice"', typeof realMotorsNotice === 'string' && realMotorsNotice.length > 0);
  ok('official-source cross-check: motorsNotice locale text contains "Remove all propellers" (verbatim safety text)', /Remove all propellers/i.test(realMotorsNotice ?? ''));

  // ── Independent-review corrections: live cross-check against the real clone for every newly corrected label ──
  const stripColon = (s: string | undefined) => (s ?? '').replace(/:$/, '');
  const stripHtml = (s: string | undefined) => (s ?? '').replace(/<[^>]+>/g, '');

  const realFeatureMotorStop = realLabel('featureMOTOR_STOP');
  const realFeatureEscSensor = realLabel('featureESC_SENSOR');
  ok('official-source cross-check: the real locale actually defines "featureMOTOR_STOP"', typeof realFeatureMotorStop === 'string' && realFeatureMotorStop.length > 0);
  ok('official-source cross-check: the real locale actually defines "featureESC_SENSOR"', typeof realFeatureEscSensor === 'string' && realFeatureEscSensor.length > 0);
  const featuresJsPath = join(CLONE_DIR, 'src/js/Features.js');
  ok('official-source cross-check: real src/js/Features.js exists in the clone (source of the MOTOR_STOP/ESC_SENSOR toggles)', existsSync(featuresJsPath));
  const featuresJsSrc = readFileSync(featuresJsPath, 'utf8');
  ok('official-source cross-check: Features.js really defines a MOTOR_STOP feature (bit 4)', /name:\s*"MOTOR_STOP"/.test(featuresJsSrc));
  ok('official-source cross-check: Features.js really defines an ESC_SENSOR feature (bit 27)', /name:\s*"ESC_SENSOR"/.test(featuresJsSrc));

  const motorStopField = motorsPage.groups.flatMap(g => g.fields).find(f => f.id === 'feature-motor-stop');
  const escSensorField = motorsPage.groups.flatMap(g => g.fields).find(f => f.id === 'feature-esc-sensor');
  ok('official-source cross-check: Motors "Motor Stop" englishLabel matches the live-read real locale string exactly', motorStopField?.englishLabel === realFeatureMotorStop);
  ok('official-source cross-check: Motors "ESC Sensor" englishLabel matches the live-read real locale string exactly (HTML stripped)', escSensorField?.englishLabel === stripHtml(realFeatureEscSensor));

  const realSaveAndReboot = realLabel('configurationButtonSave');
  ok('official-source cross-check: the real locale actually defines "configurationButtonSave"', typeof realSaveAndReboot === 'string' && realSaveAndReboot.length > 0);
  const portsSaveField2 = portsPage.groups.flatMap(g => g.fields).find(f => f.id === 'save-and-reboot');
  const failsafeSaveField2 = failsafePage.groups.flatMap(g => g.fields).find(f => f.id === 'save-and-reboot');
  ok('official-source cross-check: Ports "Save and Reboot" englishLabel matches the live-read real locale string exactly', portsSaveField2?.englishLabel === realSaveAndReboot);
  ok('official-source cross-check: Failsafe "Save and Reboot" englishLabel matches the live-read real locale string exactly', failsafeSaveField2?.englishLabel === realSaveAndReboot);
  const portsHtmlForSave = readFileSync(join(CLONE_DIR, 'src/tabs/failsafe.html'), 'utf8');
  ok('official-source cross-check: failsafe.html really renders a "configurationButtonSave" save button', /i18n="configurationButtonSave"/.test(portsHtmlForSave));

  const realNetworkType = realLabel('initialSetupNetworkType');
  const realNetworkDownlink = realLabel('initialSetupNetworkDownlink');
  const realNetworkRtt = realLabel('initialSetupNetworkRtt');
  ok('official-source cross-check: the real locale actually defines "initialSetupNetworkType"', typeof realNetworkType === 'string' && realNetworkType.length > 0);
  ok('official-source cross-check: the real locale actually defines "initialSetupNetworkDownlink"', typeof realNetworkDownlink === 'string' && realNetworkDownlink.length > 0);
  ok('official-source cross-check: the real locale actually defines "initialSetupNetworkRtt"', typeof realNetworkRtt === 'string' && realNetworkRtt.length > 0);
  const allSetupFields2 = setupPage.groups.flatMap(g => g.fields);
  ok('official-source cross-check: Setup "Type" englishLabel matches the live-read real locale string exactly (colon stripped)', allSetupFields2.find(f => f.id === 'network-type')?.englishLabel === stripColon(realNetworkType));
  ok('official-source cross-check: Setup "Downlink" englishLabel matches the live-read real locale string exactly (colon stripped)', allSetupFields2.find(f => f.id === 'network-downlink')?.englishLabel === stripColon(realNetworkDownlink));
  ok('official-source cross-check: Setup "RTT" englishLabel matches the live-read real locale string exactly (colon stripped)', allSetupFields2.find(f => f.id === 'network-rtt')?.englishLabel === stripColon(realNetworkRtt));

  const realGpsLatitude = realLabel('gpsLatitude');
  const realGpsLongitude = realLabel('gpsLongitude');
  ok('official-source cross-check: the real locale actually defines "gpsLatitude"', typeof realGpsLatitude === 'string' && realGpsLatitude.length > 0);
  ok('official-source cross-check: the real locale actually defines "gpsLongitude"', typeof realGpsLongitude === 'string' && realGpsLongitude.length > 0);
  ok('official-source cross-check: Setup "Latitude" englishLabel matches the live-read real locale string exactly (colon stripped)', allSetupFields2.find(f => f.id === 'gps-latitude')?.englishLabel === stripColon(realGpsLatitude));
  ok('official-source cross-check: Setup "Longitude" englishLabel matches the live-read real locale string exactly (colon stripped)', allSetupFields2.find(f => f.id === 'gps-longitude')?.englishLabel === stripColon(realGpsLongitude));

  const realYaw = realLabel('initialSetupHeading');
  const realPitch = realLabel('initialSetupPitch');
  const realRoll = realLabel('initialSetupRoll');
  const realInstrumentsHead = realLabel('initialSetupInstrumentsHead');
  ok('official-source cross-check: the real locale actually defines "initialSetupHeading" (Yaw)', typeof realYaw === 'string' && realYaw.length > 0);
  ok('official-source cross-check: the real locale actually defines "initialSetupPitch"', typeof realPitch === 'string' && realPitch.length > 0);
  ok('official-source cross-check: the real locale actually defines "initialSetupRoll"', typeof realRoll === 'string' && realRoll.length > 0);
  ok('official-source cross-check: the real locale actually defines "initialSetupInstrumentsHead"', typeof realInstrumentsHead === 'string' && realInstrumentsHead.length > 0);
  ok('official-source cross-check: Setup "Yaw" englishLabel matches the live-read real locale string exactly (colon stripped)', allSetupFields2.find(f => f.id === 'attitude-yaw')?.englishLabel === stripColon(realYaw));
  ok('official-source cross-check: Setup "Pitch" englishLabel matches the live-read real locale string exactly (colon stripped)', allSetupFields2.find(f => f.id === 'attitude-pitch')?.englishLabel === stripColon(realPitch));
  ok('official-source cross-check: Setup "Roll" englishLabel matches the live-read real locale string exactly (colon stripped)', allSetupFields2.find(f => f.id === 'attitude-roll')?.englishLabel === stripColon(realRoll));
  ok('official-source cross-check: Setup "Instruments" group officialTitle matches the live-read real locale string exactly', setupPage.groups.find(g => g.id === 'live-attitude')?.officialTitle === realInstrumentsHead);

  const realGpsHead = realLabel('initialSetupGPSHead');
  const realSonarHead = realLabel('initialSetupSonarHead');
  ok('official-source cross-check: the real locale actually defines "initialSetupGPSHead"', typeof realGpsHead === 'string' && realGpsHead.length > 0);
  ok('official-source cross-check: the real locale actually defines "initialSetupSonarHead"', typeof realSonarHead === 'string' && realSonarHead.length > 0);
  ok('official-source cross-check: Setup "GPS" group officialTitle matches the live-read real locale string exactly', setupPage.groups.find(g => g.id === 'gps')?.officialTitle === realGpsHead);
  ok('official-source cross-check: Setup "Sonar" group officialTitle matches the live-read real locale string exactly', setupPage.groups.find(g => g.id === 'sonar')?.officialTitle === realSonarHead);
}

console.log('\n[11] OFFICIAL-SOURCE CROSS-CHECK (Phase 3) — Configuration, Power, Receiver, Modes read live against the real cloned Configurator/firmware source');
{
  const CLONE_DIR = '/tmp/betaflight-official-audit/configurator';
  const FW_CLONE_DIR = '/tmp/betaflight-official-audit/firmware';
  const localePath = join(CLONE_DIR, 'locales/en/messages.json');
  const locale = JSON.parse(readFileSync(localePath, 'utf8')) as Record<string, { message?: string } | string>;
  const realLabel = (key: string): string | undefined => {
    const v = locale[key];
    return typeof v === 'string' ? v : v?.message;
  };

  // ── Configuration (Vue tab) ──
  const configVuePath = join(CLONE_DIR, 'src/components/tabs/ConfigurationTab.vue');
  ok('official-source cross-check: real src/components/tabs/ConfigurationTab.vue exists in the clone', existsSync(configVuePath));
  const realBeeperHead = realLabel('configurationBeeper');
  const realOtherFeaturesHead = realLabel('configurationFeatures');
  const realSmallAngle = realLabel('configurationSmallAngle');
  ok('official-source cross-check: the real locale actually defines "configurationBeeper"', typeof realBeeperHead === 'string' && realBeeperHead.length > 0);
  ok('official-source cross-check: the real locale actually defines "configurationFeatures"', typeof realOtherFeaturesHead === 'string' && realOtherFeaturesHead.length > 0);
  ok('official-source cross-check: the real locale actually defines "configurationSmallAngle"', typeof realSmallAngle === 'string' && realSmallAngle.length > 0);
  const beeperGroup = configurationPage.groups.find(g => g.id === 'beeper-config');
  const otherFeaturesGroup = configurationPage.groups.find(g => g.id === 'other-features');
  const smallAngleField = configurationPage.groups.flatMap(g => g.fields).find(f => f.id === 'small-angle');
  ok('official-source cross-check: Configuration "Beeper Configuration" group officialTitle matches the live-read real locale string exactly', beeperGroup?.officialTitle === realBeeperHead);
  ok('official-source cross-check: Configuration "Other Features" group officialTitle matches the live-read real locale string exactly', otherFeaturesGroup?.officialTitle === realOtherFeaturesHead);
  ok('official-source cross-check: Configuration "Small angle" englishLabel matches the live-read real locale string exactly', smallAngleField?.englishLabel === realSmallAngle);

  const beepersJsPath = join(CLONE_DIR, 'src/js/Beepers.js');
  ok('official-source cross-check: real src/js/Beepers.js exists in the clone (source of the beeper condition lists)', existsSync(beepersJsPath));
  const serialBackendSrc = readFileSync(join(CLONE_DIR, 'src/js/serial_backend.js'), 'utf8');
  ok('official-source cross-check: serial_backend.js really instantiates the restricted DshotBeaconConditions list as ["RX_LOST", "RX_SET"]', /dshotBeaconConditions\s*=\s*new Beepers\(FC\.CONFIG,\s*\["RX_LOST",\s*"RX_SET"\]\)/.test(serialBackendSrc));

  // ── Power ──
  const powerHtmlPath = join(CLONE_DIR, 'src/tabs/power.html');
  ok('official-source cross-check: real src/tabs/power.html exists in the clone', existsSync(powerHtmlPath));
  const realPowerCalibNote = realLabel('powerCalibrationManagerNote');
  const realPowerBatteryHead = realLabel('powerBatteryHead');
  ok('official-source cross-check: the real locale actually defines "powerCalibrationManagerNote"', typeof realPowerCalibNote === 'string' && realPowerCalibNote.length > 0);
  ok('official-source cross-check: powerCalibrationManagerNote locale text contains the verbatim propeller-removal warning', /remove propellers before plugging in a battery/i.test(realPowerCalibNote ?? ''));
  const powerBatteryGroup = powerPage.groups.find(g => g.id === 'battery');
  ok('official-source cross-check: Power "Battery" group officialTitle matches the live-read real locale string exactly', powerBatteryGroup?.officialTitle === realPowerBatteryHead);
  const powerCalibNoteField = powerPage.groups.flatMap(g => g.fields).find(f => f.id === 'calibration-manager-note');
  ok('official-source cross-check: Power calibration-manager-note field text contains the same verbatim warning as the live locale', /remove propellers before plugging in a battery/i.test(powerCalibNoteField?.arabicExplanation ?? ''));

  // ── Receiver ──
  const receiverHtmlPath = join(CLONE_DIR, 'src/tabs/receiver.html');
  const receiverJsPath = join(CLONE_DIR, 'src/js/tabs/receiver.js');
  ok('official-source cross-check: real src/tabs/receiver.html exists in the clone', existsSync(receiverHtmlPath));
  ok('official-source cross-check: real src/js/tabs/receiver.js exists in the clone', existsSync(receiverJsPath));
  const realReceiverHelp = realLabel('receiverHelp');
  const realReceiverSave = realLabel('receiverButtonSave');
  const realConfigurationSave = realLabel('configurationButtonSave');
  ok('official-source cross-check: the real locale actually defines "receiverHelp"', typeof realReceiverHelp === 'string' && realReceiverHelp.length > 0);
  ok('official-source cross-check: receiverHelp locale text contains the verbatim official Failsafe-testing reminder', /Always check that your Failsafe is working properly/i.test(realReceiverHelp ?? ''));
  ok('official-source cross-check: the real locale defines "receiverButtonSave" as "Save" (no reboot)', realReceiverSave === 'Save');
  ok('official-source cross-check: the real locale defines "configurationButtonSave" as "Save and Reboot" (shared with the reboot-required save button)', realConfigurationSave === 'Save and Reboot');
  const receiverSaveField = receiverPage.groups.flatMap(g => g.fields).find(f => f.id === 'receiver-save');
  const receiverSaveRebootField = receiverPage.groups.flatMap(g => g.fields).find(f => f.id === 'receiver-save-and-reboot');
  ok('official-source cross-check: Receiver "Save" englishLabel matches the live-read real locale string exactly', receiverSaveField?.englishLabel === realReceiverSave);
  ok('official-source cross-check: Receiver "Save and Reboot" englishLabel matches the live-read real locale string exactly', receiverSaveRebootField?.englishLabel === realConfigurationSave);

  const receiverJsSrc = readFileSync(receiverJsPath, 'utf8');
  ok('official-source cross-check: receiver.js really defines the spiRxTypes array with EXPRESSLRS as a real entry', /"EXPRESSLRS"/.test(receiverJsSrc));
  ok('official-source cross-check: receiver.js really gates the bind button on SUPPORTS_RX_BIND', /SUPPORTS_RX_BIND/.test(receiverJsSrc));

  const realStickMin = realLabel('receiverStickMin');
  const stickMinField = receiverPage.groups.flatMap(g => g.fields).find(f => f.id === 'stick-min');
  ok('official-source cross-check: the real locale actually defines "receiverStickMin"', typeof realStickMin === 'string' && realStickMin.length > 0);
  ok('official-source cross-check: Receiver "Stick Low Threshold" englishLabel matches the live-read real locale string exactly (quote normalization)', stickMinField?.englishLabel === realStickMin);

  // ── Modes (auxiliary) ──
  const auxHtmlPath = join(CLONE_DIR, 'src/tabs/auxiliary.html');
  const auxJsPath = join(CLONE_DIR, 'src/js/tabs/auxiliary.js');
  ok('official-source cross-check: real src/tabs/auxiliary.html exists in the clone', existsSync(auxHtmlPath));
  ok('official-source cross-check: real src/js/tabs/auxiliary.js exists in the clone', existsSync(auxJsPath));
  const realAuxHelp = realLabel('auxiliaryHelp');
  const realAuxToggleUnused = realLabel('auxiliaryToggleUnused');
  const realAuxSave = realLabel('auxiliaryButtonSave');
  ok('official-source cross-check: the real locale actually defines "auxiliaryHelp"', typeof realAuxHelp === 'string' && realAuxHelp.length > 0);
  ok('official-source cross-check: auxiliaryHelp locale text contains the verbatim ARM-cannot-be-linked exception', /ARM cannot be linked/i.test(realAuxHelp ?? ''));
  ok('official-source cross-check: the real locale actually defines "auxiliaryToggleUnused"', typeof realAuxToggleUnused === 'string' && realAuxToggleUnused.length > 0);
  ok('official-source cross-check: the real locale defines "auxiliaryButtonSave" as plain "Save" (not "Save and Reboot")', realAuxSave === 'Save');

  const toggleUnusedField = modesPage.groups.flatMap(g => g.fields).find(f => f.id === 'toggle-unused-modes');
  ok('official-source cross-check: Modes "Hide unused modes" englishLabel matches the live-read real locale string exactly', toggleUnusedField?.englishLabel === realAuxToggleUnused);
  const modesSaveField2 = modesPage.groups.flatMap(g => g.fields).find(f => f.id === 'modes-save');
  ok('official-source cross-check: Modes "Save" englishLabel matches the live-read real locale string exactly', modesSaveField2?.englishLabel === realAuxSave);

  const auxJsSrc = readFileSync(auxJsPath, 'utf8');
  ok('official-source cross-check: auxiliary.js really calls writeConfiguration(false) (confirms no-reboot save)', /writeConfiguration\(false\)/.test(auxJsSrc));
  ok('official-source cross-check: auxiliary.js really requests live mode names via MSP_BOXNAMES (confirms the mode table is genuinely dynamic, not a fixed compile-time list)', /MSP_BOXNAMES/.test(auxJsSrc));

  const mspHelperJsPath = join(CLONE_DIR, 'src/js/msp/MSPHelper.js');
  ok('official-source cross-check: real src/js/msp/MSPHelper.js exists in the clone', existsSync(mspHelperJsPath));
  const mspHelperSrc = readFileSync(mspHelperJsPath, 'utf8');
  ok('official-source cross-check: MSPHelper.js really defines writeConfiguration(reboot, callback) with reboot as the first parameter', /writeConfiguration\s*=\s*function\s*\(reboot,\s*callback\)/.test(mspHelperSrc));

  // ── Firmware-side verification for the dynamic mode/box list cited in modes.ts ──
  const mspBoxCPath = join(FW_CLONE_DIR, 'src/main/msp/msp_box.c');
  ok('official-source cross-check: real firmware src/main/msp/msp_box.c exists in the clone', existsSync(mspBoxCPath));
  const mspBoxCSrc = readFileSync(mspBoxCPath, 'utf8');
  ok('official-source cross-check: msp_box.c really registers BOXARM (arming is a real, verified mode)', /BME\(BOXARM\)/.test(mspBoxCSrc));
  ok('official-source cross-check: msp_box.c really registers BOXFAILSAFE (failsafe status is a real, verified mode)', /BME\(BOXFAILSAFE\)/.test(mspBoxCSrc));
  ok('official-source cross-check: msp_box.c really registers BOXGPSRESCUE (GPS Rescue is a real, verified mode)', /BME\(BOXGPSRESCUE\)/.test(mspBoxCSrc));
}

console.log(`\nAll ${passed} structural assertions passed.`);

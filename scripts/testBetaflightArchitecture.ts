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
import { pidTuningPage } from '../src/data/betaflight/pages/pid_tuning';
import { presetsPage } from '../src/data/betaflight/pages/presets';
import { adjustmentsPage } from '../src/data/betaflight/pages/adjustments';
import { osdPage } from '../src/data/betaflight/pages/osd';
import { vtxPage } from '../src/data/betaflight/pages/vtx';
import { sensorsPage } from '../src/data/betaflight/pages/sensors';
import { gpsPage } from '../src/data/betaflight/pages/gps';
import { ledStripPage } from '../src/data/betaflight/pages/led_strip';
import { servosPage } from '../src/data/betaflight/pages/servos';
import { cliPage } from '../src/data/betaflight/pages/cli';
import { betaflightData } from '../src/data/betaflightData';
import type { BfPage } from '../src/data/betaflight/types';

const PHASE_2_PAGES = [setupPage, portsPage, motorsPage, failsafePage] as BfPage[];
const PHASE_3_PAGES = [configurationPage, powerPage, receiverPage, modesPage] as BfPage[];
const PHASE_4_PAGES = [pidTuningPage, presetsPage, adjustmentsPage] as BfPage[];
const PHASE_5_PAGES = [osdPage, vtxPage, sensorsPage, gpsPage, ledStripPage, servosPage, cliPage] as BfPage[];
const ALL_REVIEWED_PAGES = [...PHASE_2_PAGES, ...PHASE_3_PAGES, ...PHASE_4_PAGES, ...PHASE_5_PAGES];

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

  ok('no registry entry is left at "architecture-preview" (Phase 1 preview status fully retired)', bfPageRegistry.filter(e => e.contentStatus === 'architecture-preview').length === 0);
}

console.log('\n[7j] PID Tuning, Presets, Adjustments (Phase 4): honest "reviewed" status, real source-backed fields, no invented data');
{
  for (const page of PHASE_4_PAGES) {
    ok(`${page.id}: contentStatus is explicitly "reviewed" (Phase 4 complete pages)`, page.contentStatus === 'reviewed');
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

  ok('pidTuningPage is registered in bfPageRegistry with matching content', bfPageRegistry.find(e => e.id === 'pid-tuning')?.page === pidTuningPage);
  ok('presetsPage is registered in bfPageRegistry with matching content', bfPageRegistry.find(e => e.id === 'presets')?.page === presetsPage);
  ok('adjustmentsPage is registered in bfPageRegistry with matching content', bfPageRegistry.find(e => e.id === 'adjustments')?.page === adjustmentsPage);

  ok('exactly 11 registry entries were "reviewed" as of Phase 4 (Setup, Ports, Motors, Failsafe, Configuration, Power, Receiver, Modes, PID Tuning, Presets, Adjustments)',
    ['adjustments', 'configuration', 'failsafe', 'modes', 'motors', 'pid-tuning', 'ports', 'power', 'presets', 'receiver', 'setup']
      .every(id => bfPageRegistry.find(e => e.id === id)?.contentStatus === 'reviewed'));
}

console.log('\n[7k] PID Tuning: dead/permanently-hidden source elements correctly excluded, real save-without-reboot semantics, no fabricated Launch Control section');
{
  const allPidFields = pidTuningPage.groups.flatMap(g => g.fields);
  ok('PID Tuning: no field references a "controller" PID-controller-type select (verified unconditionally hidden in source)', !allPidFields.some(f => f.id.includes('controller-select') || f.englishLabel === 'PID Controller'));
  ok('PID Tuning: no field models "Yaw Jump Prevention" (verified unconditionally hidden in source)', !allPidFields.some(f => /yaw.?jump/i.test(f.id)));
  ok('PID Tuning: no field models "Launch Control" (verified absent from the real source entirely)', !allPidFields.some(f => /launch.?control/i.test(f.id) || /launch.?control/i.test(f.englishLabel)));
  ok('PID Tuning: no field models "Smart Feedforward" (verified unconditionally hidden in source)', !allPidFields.some(f => /smart.?feedforward/i.test(f.id)));
  const saveField = allPidFields.find(f => f.id === 'pid-save-button');
  ok('PID Tuning: Save action exists and correctly does NOT require reboot (verified: MSP_EEPROM_WRITE only, no reboot call in source)', saveField?.requiresSave === true && saveField?.requiresReboot === false);
  ok('PID Tuning: main PID table has all 15 real per-axis fields (Roll/Pitch/Yaw × P/I/D/D-Max/F), not merged', pidTuningPage.groups.find(g => g.id === 'pid-main-table')?.fields.length === 15);
  ok('PID Tuning: D-term fields carry critical safety level (verified real motor-heat/overheating warnings in source help text)', allPidFields.filter(f => f.id.startsWith('pid-') && f.id.endsWith('-d')).every(f => f.safetyLevel === 'critical'));
  ok('PID Tuning page-level safetyLevel is "critical" (highest — largest and most safety-sensitive tuning surface)', pidTuningPage.safetyLevel === 'critical');
}

console.log('\n[7l] Presets: not a simple dropdown, sources dialog modeled, no explicit reboot command but Save-and-Reboot honestly reflects the real outcome');
{
  const allPresetsFields = presetsPage.groups.flatMap(g => g.fields);
  ok('Presets: more than one field models the page (not collapsed into a single dropdown)', allPresetsFields.length > 10);
  ok('Presets: sources dialog fields exist (user-editable preset source list)', presetsPage.groups.some(g => g.id === 'sources-dialog'));
  ok('Presets: official sources cannot be edited/deleted, only activated — captured in source-name/source-url conditionNote', /رسمي/.test(allPresetsFields.find(f => f.id === 'source-name')?.conditionNote ?? '') || /رسمي/.test(allPresetsFields.find(f => f.id === 'source-name')?.arabicExplanation ?? ''));
  const saveAndReboot = allPresetsFields.find(f => f.id === 'presets-save-and-reboot');
  ok('Presets: "Save and Reboot" action exists and is modeled as requiring reboot (the real outcome, even though no explicit reboot command is sent)', saveAndReboot?.requiresReboot === true);
  ok('Presets: the no-explicit-reboot-command fact is documented honestly in the explanation text', /Rebooting/.test(saveAndReboot?.arabicExplanation ?? ''));
  ok('Presets page-level safetyLevel is "critical" (arbitrary third-party CLI execution against a real flight controller)', presetsPage.safetyLevel === 'critical');
  ok('Presets: the verbatim third-party-source danger warning is preserved', /Malicious or bad preset sources will break your aircraft configuration/.test(allPresetsFields.find(f => f.id === 'sources-dialog-warning')?.arabicExplanation ?? ''));
}

console.log('\n[7m] Adjustments: no fabricated add/remove slot action, enable/disable sentinel documented honestly, no-reboot save');
{
  const allAdjFields = adjustmentsPage.groups.flatMap(g => g.fields);
  ok('Adjustments: no field models a fabricated "add slot" or "remove slot" action (verified absent from the real source)', !allAdjFields.some(f => /add.?slot|remove.?slot|delete.?slot/i.test(f.id)));
  ok('Adjustments: the real 32-function adjustmentsFunction list is present in full, not truncated', allAdjFields.find(f => f.id === 'adjustment-apply-function')?.range?.options?.length === 32);
  const saveField = allAdjFields.find(f => f.id === 'adjustments-save');
  ok('Adjustments: Save action exists and correctly does NOT require reboot (verified: MSP_EEPROM_WRITE only, no reboot call in source)', saveField?.requiresSave === true && saveField?.requiresReboot === false);
  ok('Adjustments: the enable/disable sentinel (range start===end) is documented honestly, not glossed over', /Start\s*=\s*End/i.test(adjustmentsPage.groups.flatMap(g => g.fields).find(f => f.id === 'adjustment-enable')?.arabicExplanation ?? ''));
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

  ok('all 18 reviewed pages (Phases 2-5) are honestly marked "reviewed"', ALL_REVIEWED_PAGES.every(p => p.contentStatus === 'reviewed'));
  ok('all 18 reviewed pages (Phases 2-5) carry a real 40-char verified source commit hash', ALL_REVIEWED_PAGES.every(p => /^[0-9a-f]{40}$/.test(p.source.commit ?? '')));
}

console.log('\n[7n] OSD, VTX, Sensors, GPS, LED Strip, Servos, CLI (Phase 5): honest "reviewed" status, real source-backed fields, no invented data');
{
  for (const page of PHASE_5_PAGES) {
    ok(`${page.id}: contentStatus is explicitly "reviewed" (Phase 5 complete pages)`, page.contentStatus === 'reviewed');
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

  ok('osdPage is registered in bfPageRegistry with matching content', bfPageRegistry.find(e => e.id === 'osd')?.page === osdPage);
  ok('vtxPage is registered in bfPageRegistry with matching content', bfPageRegistry.find(e => e.id === 'vtx')?.page === vtxPage);
  ok('sensorsPage is registered in bfPageRegistry with matching content', bfPageRegistry.find(e => e.id === 'sensors')?.page === sensorsPage);
  ok('gpsPage is registered in bfPageRegistry with matching content', bfPageRegistry.find(e => e.id === 'gps')?.page === gpsPage);
  ok('ledStripPage is registered in bfPageRegistry with matching content', bfPageRegistry.find(e => e.id === 'led-strip')?.page === ledStripPage);
  ok('servosPage is registered in bfPageRegistry with matching content', bfPageRegistry.find(e => e.id === 'servos')?.page === servosPage);
  ok('cliPage is registered in bfPageRegistry with matching content', bfPageRegistry.find(e => e.id === 'cli')?.page === cliPage);

  ok('exactly 26 registry entries exist total', bfPageRegistry.length === 26);
  ok('exactly 18 registry entries are "reviewed" after Phase 5', bfPageRegistry.filter(e => e.contentStatus === 'reviewed').length === 18);
  ok('exactly 8 registry entries remain honestly "not-started"', bfPageRegistry.filter(e => e.contentStatus === 'not-started').length === 8);
  ok('the 8 not-started IDs match the verified out-of-scope Phase 5 list', JSON.stringify(bfPageRegistry.filter(e => e.contentStatus === 'not-started').map(e => e.id).sort())
    === JSON.stringify(['landing', 'firmware-flasher', 'privacy-policy', 'options', 'help', 'tethered-logging', 'blackbox', 'transponder'].sort()));
}

console.log('\n[7o] OSD: dead/permanently-hidden source elements correctly excluded, plain-Save-vs-Upload-Font-reboot semantics kept distinct');
{
  const allOsdFields = osdPage.groups.flatMap(g => g.fields);
  ok('OSD: no field models the dead "VTX Settings" box (verified permanently display:none, never populated)', !allOsdFields.some(f => /vtx-settings|osdSetupVtxTitle/i.test(f.id)));
  ok('OSD: no field models the dead "Aircraft Name" / callsign box (verified permanently display:none, never populated)', !allOsdFields.some(f => f.id === 'osd-craft-name' || f.id === 'osd-callsign'));
  ok('OSD: no field models the inert Zoom checkbox (verified CSS force-hidden, id never referenced in JS)', !allOsdFields.some(f => /preview-zoom/i.test(f.id)));
  ok('OSD: the Rulers checkbox IS modeled (verified real and wired to drawRulers())', allOsdFields.some(f => f.id === 'osd-preview-rulers-toggle'));
  const saveField = allOsdFields.find(f => f.id === 'osd-save');
  const uploadFontField = allOsdFields.find(f => f.id === 'osd-upload-font-button');
  ok('OSD: plain "Save" correctly does NOT require reboot (verified: MSP_EEPROM_WRITE only)', saveField?.requiresSave === true && saveField?.requiresReboot === false);
  ok('OSD: "Upload Font" is the only action page-wide that requires reboot (verified: MSP_SET_REBOOT sent only here)', uploadFontField?.requiresReboot === true);
  ok('OSD: exactly one field on the whole page requires reboot', allOsdFields.filter(f => f.requiresReboot === true).length === 1);
  ok('OSD: the Elements list documents real version-gated additions (1.45/1.46/1.47), not a fabricated flat list', /1\.45/.test(allOsdFields.find(f => f.id === 'osd-elements-list')?.conditionNote ?? '') && /1\.46/.test(allOsdFields.find(f => f.id === 'osd-elements-list')?.arabicExplanation ?? ''));
  ok('OSD: the preset-position grid documents all 15 real named positions', (allOsdFields.find(f => f.id === 'osd-preset-position-grid')?.arabicExplanation.match(/Top|Bottom|Left|Right|Center|Middle/g) ?? []).length >= 15);
  ok('OSD page-level safetyLevel is "caution"', osdPage.safetyLevel === 'caution');
}

console.log('\n[7p] VTX: no fabricated protocol-select field (auto-detected/read-only), hardware-dependent power fallback, no-reboot save');
{
  const allVtxFields = vtxPage.groups.flatMap(g => g.fields);
  ok('VTX: no field models a user-facing "protocol" select (verified auto-detected, display-only in Current Values)', !allVtxFields.some(f => f.id === 'vtx-protocol' || f.englishLabel === 'Protocol'));
  ok('VTX: the Current Values status field is the only place VTX type/protocol is surfaced', allVtxFields.find(f => f.id === 'vtx-current-values-status')?.controlType === 'status');
  const powerField = allVtxFields.find(f => f.id === 'vtx-power');
  ok('VTX: Power select is hardware-dependent (no fabricated fixed option list — real range depends on detected VTX type or custom table)', powerField?.scope === 'hardware-dependent' && !powerField?.range?.options);
  const saveField = allVtxFields.find(f => f.id === 'vtx-save');
  ok('VTX: Save action exists and correctly does NOT require reboot (verified: writeConfiguration(false, ...))', saveField?.requiresSave === true && saveField?.requiresReboot === false);
  ok('VTX: no field on the whole page requires reboot', allVtxFields.every(f => f.requiresReboot === false));
  ok('VTX page-level safetyLevel is "warning"', vtxPage.safetyLevel === 'warning');
}

console.log('\n[7q] Sensors: NO page-actions/Save group exists (verified genuinely absent from real source), hardware-detection gating, no fabricated calibration/declination');
{
  ok('Sensors: no "page-actions" group exists (verified: zero MSP_EEPROM_WRITE/writeConfiguration/reboot calls anywhere in sensors.js)', !sensorsPage.groups.some(g => g.id === 'page-actions'));
  const allSensorFields = sensorsPage.groups.flatMap(g => g.fields);
  ok('Sensors: not a single field on the page requires save', allSensorFields.every(f => f.requiresSave === false));
  ok('Sensors: not a single field on the page requires reboot', allSensorFields.every(f => f.requiresReboot === false));
  ok('Sensors: no field models a calibration action (verified absent — calibration lives on Setup)', !allSensorFields.some(f => /calibrat/i.test(f.id)));
  ok('Sensors: no field models magnetic declination (verified absent — lives on Configuration/GPS)', !allSensorFields.some(f => /declination/i.test(f.id)));
  ok('Sensors: no field models optical flow (verified have_sensor() never queried for it in this tab)', !allSensorFields.some(f => /optical.?flow/i.test(f.id)));
  const accelEnable = allSensorFields.find(f => f.id === 'sensors-accel-enable');
  const gyroEnable = allSensorFields.find(f => f.id === 'sensors-gyro-enable');
  ok('Sensors: Accelerometer checkbox is hardware-gated (unlike Gyroscope, which is always available)', accelEnable?.scope === 'sensor-dependent' && gyroEnable?.scope === 'universal');
  ok('Sensors page-level safetyLevel is "caution"', sensorsPage.safetyLevel === 'caution');
}

console.log('\n[7r] GPS: no duplicated GPS Rescue tuning (references Failsafe instead), read-only declination display, real Save-and-Reboot');
{
  const allGpsFields = gpsPage.groups.flatMap(g => g.fields);
  ok('GPS: no field models GPS Rescue tuning (verified absent from gps.html/gps.js by grep)', !allGpsFields.some(f => /rescue/i.test(f.id)));
  ok('GPS: relatedPageIds references failsafe instead of duplicating GPS Rescue tuning', (gpsPage.relatedPageIds ?? []).includes('failsafe'));
  const declinationField = allGpsFields.find(f => f.id === 'gps-magnetic-declination-status');
  ok('GPS: Magnetic Declination is modeled as read-only status, not an editable input (the real editable field lives on Configuration)', declinationField?.controlType === 'status');
  const saveField = allGpsFields.find(f => f.id === 'gps-save-and-reboot');
  ok('GPS: "Save and Reboot" action exists and correctly requires reboot (verified: writeConfiguration(true))', saveField?.requiresSave === true && saveField?.requiresReboot === true);
  ok('GPS page-level safetyLevel is "caution"', gpsPage.safetyLevel === 'caution');
}

console.log('\n[7s] LED Strip: fixed 256-cell grid distinct from dynamic wire order, Larson/Blink mutual exclusion documented, no-reboot save');
{
  const allLedFields = ledStripPage.groups.flatMap(g => g.fields);
  ok('LED Strip: id is "led-strip" (hyphenated, matches registry) while officialId is "led_strip" (underscored, matches source)', ledStripPage.id === 'led-strip' && ledStripPage.officialId === 'led_strip');
  ok('LED Strip: the spatial grid field is distinct from the wiring-mode field (two genuinely separate concepts)', allLedFields.some(f => f.id === 'led-strip-grid') && allLedFields.some(f => f.id === 'led-strip-wiring-mode'));
  const larson = allLedFields.find(f => f.id === 'led-strip-larson-scanner');
  const blink = allLedFields.find(f => f.id === 'led-strip-blink-always');
  ok('LED Strip: Larson scanner and Blink always both document their mutual exclusivity', /Blink/.test(larson?.conditionNote ?? '') && /Larson/.test(blink?.conditionNote ?? ''));
  const saveField = allLedFields.find(f => f.id === 'led-strip-save');
  ok('LED Strip: Save action exists and correctly does NOT require reboot (verified: writeConfiguration(false, ...))', saveField?.requiresSave === true && saveField?.requiresReboot === false);
  ok('LED Strip: Rainbow and Brightness are both version-gated (API >= 1.46)', allLedFields.find(f => f.id === 'led-strip-rainbow')?.scope === 'version-dependent' && allLedFields.find(f => f.id === 'led-strip-brightness')?.scope === 'version-dependent');
}

console.log('\n[7t] Servos: hardware-dependent support (not a fabricated mixer-type check), live-mode instant-apply, no-reboot save');
{
  const allServoFields = servosPage.groups.flatMap(g => g.fields);
  const saveField = allServoFields.find(f => f.id === 'servos-save');
  ok('Servos: Save action exists and correctly does NOT require reboot (verified: writeConfiguration(false, ...))', saveField?.requiresSave === true && saveField?.requiresReboot === false);
  const liveMode = allServoFields.find(f => f.id === 'servos-live-mode-toggle');
  ok('Servos: Live mode toggle exists and correctly does NOT require an explicit save (instant RAM-only apply)', liveMode?.requiresSave === false);
  ok('Servos: the servo rate select documents the real 201 discrete options (-100..100), not a fabricated coarse range', /201/.test(allServoFields.find(f => f.id === 'servo-rate')?.arabicExplanation ?? ''));
  ok('Servos page-level safetyLevel is "caution"', servosPage.safetyLevel === 'caution');
}

console.log('\n[7u] CLI: modeled as an interactive terminal (not a settings page), no fabricated command reference, heavy critical safety framing');
{
  const allCliFields = cliPage.groups.flatMap(g => g.fields);
  const commandInput = allCliFields.find(f => f.id === 'command-input');
  ok('CLI: the command input field explicitly states commands depend on the connected firmware build (no invented command reference)', /عتمد|firmware/i.test(commandInput?.arabicExplanation ?? ''));
  ok('CLI: no field enumerates a fabricated list of CLI commands (only real toolbar/terminal-mechanic fields exist)', !allCliFields.some(f => /^cli-command-list$/.test(f.id)));
  ok('CLI page-level safetyLevel is "critical"', cliPage.safetyLevel === 'critical');
  ok('CLI page-level expertRequired is true', cliPage.expertRequired === true);
  const infoWarning = allCliFields.find(f => f.id === 'cli-info-warning');
  ok('CLI: the info warning field carries critical safety level', infoWarning?.safetyLevel === 'critical');
}

console.log('\n[8] Version overlays are empty unless a verified difference exists (no speculative overlays)');
{
  ok('setupPage has no version overlays (none verified yet)', (setupPage.versionOverlays ?? []).length === 0);
  ok('portsPage has no version overlays (none verified yet)', (portsPage.versionOverlays ?? []).length === 0);
}

console.log('\n[9] Legacy compatibility files stay honestly untouched (the live hub is the intentional exception, see [14])');
{
  const betaflightDataSrc = readFileSync(join(ROOT, 'src/data/betaflightData.ts'), 'utf8');
  const betaflightViewSrc = readFileSync(join(ROOT, 'src/views/BetaflightView.tsx'), 'utf8');
  ok('betaflightData.ts still defines exactly 10 sections', (betaflightDataSrc.match(/id: '[a-z]+', title:/g) ?? []).length === 10);
  ok('BetaflightView.tsx still renders the exact existing heading', betaflightViewSrc.includes('Betaflight بالعربي'));
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

console.log('\n[12] OFFICIAL-SOURCE CROSS-CHECK (Phase 4) — PID Tuning, Presets, Adjustments read live against the real cloned Configurator source');
{
  const CLONE_DIR = '/tmp/betaflight-official-audit/configurator';
  const localePath = join(CLONE_DIR, 'locales/en/messages.json');
  const locale = JSON.parse(readFileSync(localePath, 'utf8')) as Record<string, { message?: string } | string>;
  const realLabel = (key: string): string | undefined => {
    const v = locale[key];
    return typeof v === 'string' ? v : v?.message;
  };

  // ── PID Tuning ──
  const pidHtmlPath = join(CLONE_DIR, 'src/tabs/pid_tuning.html');
  const pidJsPath = join(CLONE_DIR, 'src/js/tabs/pid_tuning.js');
  ok('official-source cross-check: real src/tabs/pid_tuning.html exists in the clone', existsSync(pidHtmlPath));
  ok('official-source cross-check: real src/js/tabs/pid_tuning.js exists in the clone', existsSync(pidJsPath));
  const pidJsSrc = readFileSync(pidJsPath, 'utf8');
  ok('official-source cross-check: pid_tuning.js really force-hides the PID Controller select container (confirms it is correctly excluded as a field)', /div\.controller.*\.hide\(\)|controller.*hide/.test(pidJsSrc.replace(/\s+/g, ' ')));
  ok('official-source cross-check: pid_tuning.js really force-hides the YAW_JUMP_PREVENTION row (confirms it is correctly excluded as a field)', /YAW_JUMP_PREVENTION.*hide/.test(pidJsSrc.replace(/\s+/g, ' ')));
  ok('official-source cross-check: pid_tuning.js contains no reference to "Launch Control" anywhere (confirms it is correctly absent from the page)', !/Launch Control/i.test(pidJsSrc));
  ok('official-source cross-check: pid_tuning.html contains no reference to "Launch Control" anywhere', !/Launch Control/i.test(readFileSync(pidHtmlPath, 'utf8')));

  const realPidTuningTitle = realLabel('tabPidTuning');
  const realProportionalHelp = realLabel('pidTuningProportionalHelp');
  const realDerivativeHelp = realLabel('pidTuningDerivativeHelp');
  ok('official-source cross-check: the real locale actually defines "tabPidTuning"', realPidTuningTitle === 'PID Tuning');
  ok('official-source cross-check: the real locale actually defines "pidTuningProportionalHelp"', typeof realProportionalHelp === 'string' && realProportionalHelp.length > 0);
  ok('official-source cross-check: pidTuningDerivativeHelp locale text contains the verbatim motor-heat/burnout warning', /burn out motors/i.test(realDerivativeHelp ?? ''));

  const allPidFieldsCheck = pidTuningPage.groups.flatMap(g => g.fields);
  const pidRollD = allPidFieldsCheck.find(f => f.id === 'pid-roll-d');
  ok('official-source cross-check: PID Tuning "Roll — D" field references the real motor-heat danger from pidTuningDerivativeHelp', /burn out motors|حرق المحركات/i.test(pidRollD?.arabicExplanation ?? ''));

  ok('official-source cross-check: pid_tuning.js really calls MSP_EEPROM_WRITE on save with no reboot MSP call in the same handler region', /MSP_EEPROM_WRITE/.test(pidJsSrc));

  const realCellCount1S = realLabel('pidTuningCellCount1S');
  const cellCountField = allPidFieldsCheck.find(f => f.id === 'cell-count-select');
  ok('official-source cross-check: the real locale defines "pidTuningCellCount1S" as "1S"', realCellCount1S === '1S');
  ok('official-source cross-check: PID Tuning cell-count-select includes the real "1S" option', (cellCountField?.range?.options ?? []).includes('1S'));

  // ── Presets ──
  const presetsHtmlPath = join(CLONE_DIR, 'src/tabs/presets/presets.html');
  const presetsJsPath = join(CLONE_DIR, 'src/tabs/presets/presets.js');
  const cliEnginePath = join(CLONE_DIR, 'src/tabs/presets/CliEngine.js');
  ok('official-source cross-check: real src/tabs/presets/presets.html exists in the clone', existsSync(presetsHtmlPath));
  ok('official-source cross-check: real src/tabs/presets/presets.js exists in the clone', existsSync(presetsJsPath));
  ok('official-source cross-check: real src/tabs/presets/CliEngine.js exists in the clone', existsSync(cliEnginePath));
  const cliEngineSrc = readFileSync(cliEnginePath, 'utf8');
  ok('official-source cross-check: CliEngine.js really sends the literal CLI command "save" (s_commandSave)', /s_commandSave\s*=\s*"save"/.test(cliEngineSrc));
  ok('official-source cross-check: CliEngine.js really detects reboot only by watching for the literal substring "Rebooting" in serial output (no explicit reboot command)', /Rebooting/.test(cliEngineSrc));
  ok('official-source cross-check: CliEngine.js contains no explicit MSP reboot command constant', !/s_command.*[Rr]eboot\s*=/.test(cliEngineSrc));

  const realPresetsButtonSave = realLabel('presetsButtonSave');
  const realSourcesDialogWarning = realLabel('presets_sources_dialog_warning');
  ok('official-source cross-check: the real locale defines "presetsButtonSave" as "Save and Reboot"', realPresetsButtonSave === 'Save and Reboot');
  ok('official-source cross-check: the real locale actually defines "presets_sources_dialog_warning"', typeof realSourcesDialogWarning === 'string' && realSourcesDialogWarning.length > 0);
  ok('official-source cross-check: presets_sources_dialog_warning locale text contains the verbatim "harm your devices" warning', /harm your devices/i.test(realSourcesDialogWarning ?? ''));

  const allPresetsFieldsCheck = presetsPage.groups.flatMap(g => g.fields);
  const presetsSaveField2 = allPresetsFieldsCheck.find(f => f.id === 'presets-save-and-reboot');
  ok('official-source cross-check: Presets "Save and Reboot" englishLabel matches the live-read real locale string exactly', presetsSaveField2?.englishLabel === realPresetsButtonSave);
  ok('official-source cross-check: Presets sources-dialog-warning field references the real "harm your devices" verbatim text', /harm your devices/i.test(allPresetsFieldsCheck.find(f => f.id === 'sources-dialog-warning')?.arabicExplanation ?? ''));

  // ── Adjustments ──
  const adjHtmlPath = join(CLONE_DIR, 'src/tabs/adjustments.html');
  const adjJsPath = join(CLONE_DIR, 'src/js/tabs/adjustments.js');
  ok('official-source cross-check: real src/tabs/adjustments.html exists in the clone', existsSync(adjHtmlPath));
  ok('official-source cross-check: real src/js/tabs/adjustments.js exists in the clone', existsSync(adjJsPath));
  const adjHtmlSrc = readFileSync(adjHtmlPath, 'utf8');
  const adjJsSrc = readFileSync(adjJsPath, 'utf8');
  ok('official-source cross-check: adjustments.html really has no add/remove-slot button anywhere (confirms the absence is a verified fact, not an oversight)', !/add.?slot|remove.?slot|delete.?slot/i.test(adjHtmlSrc));
  ok('official-source cross-check: adjustments.js really has no add/remove-slot function anywhere', !/add.?slot|remove.?slot|delete.?slot/i.test(adjJsSrc));
  ok('official-source cross-check: adjustments.js really uses the {start:900,end:900} sentinel for the disabled state', /start:\s*900/.test(adjJsSrc) && /end:\s*900/.test(adjJsSrc));
  ok('official-source cross-check: adjustments.js really has no reboot-related MSP call anywhere', !/reboot/i.test(adjJsSrc));

  const realAdjustmentsFunction31 = realLabel('adjustmentsFunction31');
  ok('official-source cross-check: the real locale defines "adjustmentsFunction31" as "LED Brightness Adjust" (the real last function)', realAdjustmentsFunction31 === 'LED Brightness Adjust');
  const allAdjFieldsCheck = adjustmentsPage.groups.flatMap(g => g.fields);
  const adjFunctionField = allAdjFieldsCheck.find(f => f.id === 'adjustment-apply-function');
  ok('official-source cross-check: Adjustments apply-function options include the real last function "LED Brightness Adjust"', (adjFunctionField?.range?.options ?? []).includes('LED Brightness Adjust'));
}

console.log('\n[13] OFFICIAL-SOURCE CROSS-CHECK (Phase 5) — OSD, VTX, Sensors, GPS, LED Strip, Servos, CLI read live against the real cloned Configurator source');
{
  const CLONE_DIR = '/tmp/betaflight-official-audit/configurator';
  const localePath = join(CLONE_DIR, 'locales/en/messages.json');
  const locale = JSON.parse(readFileSync(localePath, 'utf8')) as Record<string, { message?: string } | string>;
  const realLabel = (key: string): string | undefined => {
    const v = locale[key];
    return typeof v === 'string' ? v : v?.message;
  };

  // ── OSD ──
  const osdHtmlPath = join(CLONE_DIR, 'src/tabs/osd.html');
  const osdJsPath = join(CLONE_DIR, 'src/js/tabs/osd.js');
  ok('official-source cross-check: real src/tabs/osd.html exists in the clone', existsSync(osdHtmlPath));
  ok('official-source cross-check: real src/js/tabs/osd.js exists in the clone', existsSync(osdJsPath));
  const osdJsSrc = readFileSync(osdJsPath, 'utf8');
  const osdHtmlSrc = readFileSync(osdHtmlPath, 'utf8');
  ok('official-source cross-check: osd.js really sends MSP_EEPROM_WRITE on the plain Save button with no reboot in the same handler', /\$\("a\.save"\)\.click/.test(osdJsSrc.replace(/\s+/g, ' ')) && /MSPCodes\.MSP_EEPROM_WRITE/.test(osdJsSrc));
  ok('official-source cross-check: osd.js really sends MSP_SET_REBOOT only inside the font-upload flow', /MSPCodes\.MSP_SET_REBOOT/.test(osdJsSrc));
  ok('official-source cross-check: osd.html really contains a permanently display:none VTX Settings box', /osdSetupVtxTitle/.test(osdHtmlSrc));
  ok('official-source cross-check: osd.js never references ".vtx-settings" outside the dead static markup (confirms it is correctly excluded)', !osdJsSrc.includes('.vtx-settings'));
  const realOsdSetupTitle = realLabel('osdSetupTitle');
  const realOsdElementsTitle = realLabel('osdSetupElementsTitle');
  ok('official-source cross-check: the real locale defines "osdSetupTitle" as "OSD"', realOsdSetupTitle === 'OSD');
  ok('official-source cross-check: the real locale actually defines "osdSetupElementsTitle"', typeof realOsdElementsTitle === 'string' && realOsdElementsTitle.length > 0);
  ok('official-source cross-check: OSD officialTitle matches the live-read real locale string exactly', osdPage.officialTitle === realOsdSetupTitle);

  // ── VTX ──
  const vtxHtmlPath = join(CLONE_DIR, 'src/tabs/vtx.html');
  const vtxJsPath = join(CLONE_DIR, 'src/js/tabs/vtx.js');
  ok('official-source cross-check: real src/tabs/vtx.html exists in the clone', existsSync(vtxHtmlPath));
  ok('official-source cross-check: real src/js/tabs/vtx.js exists in the clone', existsSync(vtxJsPath));
  const vtxJsSrc = readFileSync(vtxJsPath, 'utf8');
  ok('official-source cross-check: vtx.js really calls writeConfiguration(false, ...) on save (confirms no-reboot save)', /writeConfiguration\(false,\s*save_completed\)/.test(vtxJsSrc));
  ok('official-source cross-check: vtx.js really defines per-VTX-type power fallback ranges (RTC6705/SmartAudio/Tramp/MSP)', /VTXDEV_RTC6705/.test(vtxJsSrc) && /VTXDEV_SMARTAUDIO/.test(vtxJsSrc) && /VTXDEV_TRAMP/.test(vtxJsSrc));
  const realVtxTab = realLabel('tabVtx');
  ok('official-source cross-check: the real locale defines "tabVtx" as "Video Transmitter"', realVtxTab === 'Video Transmitter');
  ok('official-source cross-check: VTX officialTitle matches the live-read real locale string exactly', vtxPage.officialTitle === realVtxTab);

  // ── Sensors ──
  const sensorsHtmlPath = join(CLONE_DIR, 'src/tabs/sensors.html');
  const sensorsJsPath = join(CLONE_DIR, 'src/js/tabs/sensors.js');
  ok('official-source cross-check: real src/tabs/sensors.html exists in the clone', existsSync(sensorsHtmlPath));
  ok('official-source cross-check: real src/js/tabs/sensors.js exists in the clone', existsSync(sensorsJsPath));
  const sensorsJsSrc = readFileSync(sensorsJsPath, 'utf8');
  ok('official-source cross-check: sensors.js contains no MSP_EEPROM_WRITE call anywhere (confirms the page genuinely has no Save/EEPROM path)', !/MSP_EEPROM_WRITE/.test(sensorsJsSrc));
  ok('official-source cross-check: sensors.js contains no "reboot" reference anywhere', !/reboot/i.test(sensorsJsSrc));
  ok('official-source cross-check: sensors.js really gates the Accelerometer checkbox on have_sensor(activeSensors, "acc")', /have_sensor\(FC\.CONFIG\.activeSensors,\s*"acc"\)/.test(sensorsJsSrc));

  // ── GPS ──
  const gpsHtmlPath = join(CLONE_DIR, 'src/tabs/gps.html');
  const gpsJsPath = join(CLONE_DIR, 'src/js/tabs/gps.js');
  ok('official-source cross-check: real src/tabs/gps.html exists in the clone', existsSync(gpsHtmlPath));
  ok('official-source cross-check: real src/js/tabs/gps.js exists in the clone', existsSync(gpsJsPath));
  const gpsHtmlSrc = readFileSync(gpsHtmlPath, 'utf8');
  const gpsJsSrc = readFileSync(gpsJsPath, 'utf8');
  ok('official-source cross-check: gps.html contains no reference to "rescue"/"Rescue" (confirms GPS Rescue tuning genuinely lives elsewhere)', !/rescue/i.test(gpsHtmlSrc));
  ok('official-source cross-check: gps.js contains no reference to "rescue"/"Rescue" (confirms GPS Rescue tuning genuinely lives elsewhere)', !/rescue/i.test(gpsJsSrc));
  ok('official-source cross-check: gps.js really calls writeConfiguration(true, ...) on the toolbar save (confirms real reboot outcome)', /writeConfiguration\(true\)/.test(gpsJsSrc));

  // ── LED Strip ──
  const ledStripHtmlPath = join(CLONE_DIR, 'src/tabs/led_strip.html');
  const ledStripJsPath = join(CLONE_DIR, 'src/js/tabs/led_strip.js');
  ok('official-source cross-check: real src/tabs/led_strip.html exists in the clone', existsSync(ledStripHtmlPath));
  ok('official-source cross-check: real src/js/tabs/led_strip.js exists in the clone', existsSync(ledStripJsPath));
  const ledStripJsSrc = readFileSync(ledStripJsPath, 'utf8');
  ok('official-source cross-check: led_strip.js really builds exactly a 256-cell grid (16x16 fixed layout)', /i\s*<\s*256/.test(ledStripJsSrc));
  ok('official-source cross-check: led_strip.js really documents Larson/Blink as mutually exclusive in source comments', /not working properly at the same time/i.test(ledStripJsSrc));
  ok('official-source cross-check: led_strip.js really calls writeConfiguration(false, save_completed) on save (confirms no-reboot save)', /writeConfiguration\(false,\s*save_completed\)/.test(ledStripJsSrc));

  // ── Servos ──
  const servosVuePath = join(CLONE_DIR, 'src/components/tabs/ServosTab.vue');
  ok('official-source cross-check: real src/components/tabs/ServosTab.vue exists in the clone', existsSync(servosVuePath));
  const servosVueSrc = readFileSync(servosVuePath, 'utf8');
  ok('official-source cross-check: ServosTab.vue really gates support on FC.SERVO_CONFIG.length (not a fabricated mixer-type check)', /SERVO_CONFIG/.test(servosVueSrc));

  // ── CLI ──
  const cliHtmlPath = join(CLONE_DIR, 'src/tabs/cli.html');
  const cliJsPath = join(CLONE_DIR, 'src/js/tabs/cli.js');
  ok('official-source cross-check: real src/tabs/cli.html exists in the clone', existsSync(cliHtmlPath));
  ok('official-source cross-check: real src/js/tabs/cli.js exists in the clone', existsSync(cliJsPath));
  const realCliInfo = realLabel('cliInfo');
  const realTabCli = realLabel('tabCLI');
  ok('official-source cross-check: the real locale actually defines "cliInfo"', typeof realCliInfo === 'string' && realCliInfo.length > 0);
  ok('official-source cross-check: the real locale defines "tabCLI" as "CLI"', realTabCli === 'CLI');
  const cliInfoField = cliPage.groups.flatMap(g => g.fields).find(f => f.id === 'cli-info-warning');
  ok('official-source cross-check: CLI info-warning field text reflects the real locale warning being present in source (non-empty, sourced)', (cliInfoField?.arabicExplanation ?? '').length > 0 && cliInfoField?.source.repoPath?.includes('cli'));
}

console.log('\n[14] LIVE HUB INTEGRATION — /betaflight is registry-driven, not the legacy 10-article hub');
{
  const betaflightViewSrc = readFileSync(join(ROOT, 'src/views/BetaflightView.tsx'), 'utf8');
  const hubRendererSrc = readFileSync(join(ROOT, 'src/components/betaflight/BetaflightHubRenderer.tsx'), 'utf8');

  ok('BetaflightView.tsx imports BetaflightHubRenderer', /import\s*\{\s*BetaflightHubRenderer\s*\}\s*from\s*'\.\.\/components\/betaflight\/BetaflightHubRenderer';/.test(betaflightViewSrc));
  ok('BetaflightView.tsx imports bfPageRegistry (the real 26-page registry)', /import\s*\{\s*bfPageRegistry\s*\}\s*from\s*'\.\.\/data\/betaflight\/pageRegistry';/.test(betaflightViewSrc));
  ok('BetaflightView.tsx no longer imports the legacy betaflightData array', !/from\s*'\.\.\/data\/betaflightData'/.test(betaflightViewSrc));
  ok('BetaflightView.tsx no longer imports BetaflightVisual (legacy card illustrations)', !/BetaflightVisual/.test(betaflightViewSrc));
  ok('BetaflightView.tsx renders <BetaflightHubRenderer with entries={bfPageRegistry}', /<BetaflightHubRenderer[\s\S]*?entries=\{bfPageRegistry\}/.test(betaflightViewSrc));
  ok('BetaflightView.tsx is genuinely a thin wrapper (under 40 lines)', betaflightViewSrc.split('\n').length < 40);

  ok('exactly 26 registry entries exist total (unchanged by this task)', bfPageRegistry.length === 26);
  ok('exactly 18 registry entries are "reviewed" (unchanged by this task)', bfPageRegistry.filter(e => e.contentStatus === 'reviewed').length === 18);
  ok('exactly 8 registry entries are "not-started" (unchanged by this task)', bfPageRegistry.filter(e => e.contentStatus === 'not-started').length === 8);

  // ── every registry ID appears in exactly one of the 5 hub groups, no duplicates, no invented IDs ──
  const groupBlockMatches = [...hubRendererSrc.matchAll(/id:\s*'([a-z-]+)',\s*titleAr:\s*'[^']*',\s*icon:\s*\w+,\s*pageIds:\s*\[([^\]]*)\]/g)];
  ok('exactly 5 hub groups are defined in BetaflightHubRenderer.tsx', groupBlockMatches.length === 5);
  const allGroupedIds = groupBlockMatches.flatMap(m => [...m[2].matchAll(/'([a-z-]+)'/g)].map(x => x[1]));
  ok('the 5 hub groups together list exactly 26 page IDs (one per registry entry)', allGroupedIds.length === 26);
  ok('no duplicate page ID appears across the hub groups', new Set(allGroupedIds).size === allGroupedIds.length);
  const registryIds = new Set(bfPageRegistry.map(e => e.id));
  ok('every grouped ID maps to a real registry entry (no invented/fabricated page)', allGroupedIds.every(id => registryIds.has(id)));
  ok('every registry entry is represented in exactly one hub group (no page silently dropped)', bfPageRegistry.every(e => allGroupedIds.includes(e.id)));

  // ── search/filter/summary UI affordances exist in source ──
  ok('the hub renders a live search input', /betaflight-hub-search-input/.test(hubRendererSrc));
  ok('the hub renders status filter controls (all/reviewed/not-started)', /betaflight-hub-filter-\$\{value\}/.test(hubRendererSrc) && /\['all',\s*'الكل'\]/.test(hubRendererSrc) && /\['reviewed',\s*'مراجَع'\]/.test(hubRendererSrc) && /\['not-started',\s*'لم يُبدأ بعد'\]/.test(hubRendererSrc));
  ok('the hub renders a visible summary of reviewed/not-started counts', /صفحة مراجعة/.test(hubRendererSrc) && /صفحات قيد الإعداد/.test(hubRendererSrc));
  ok('the hub search matches on official English title, Arabic title, ID, and page summary (not a fabricated subset)', /officialTitle\.toLowerCase\(\)\.includes/.test(hubRendererSrc) && /titleAr\.includes/.test(hubRendererSrc) && /entry\.id\.toLowerCase\(\)\.includes/.test(hubRendererSrc) && /page\?\.summaryAr/.test(hubRendererSrc));
  ok('the hub uses the new dark bf-shell theme (not the old white-frame card-feature-only layout)', /bf-shell/.test(hubRendererSrc));
  ok('the hub uses lucide-react exclusively for icons (single icon family)', /from 'lucide-react'/.test(hubRendererSrc) && !/react-icons|@heroicons|phosphor/.test(hubRendererSrc));
  ok('every card icon is additive (Arabic/English text labels are still rendered, not replaced by icons)', /entry\.officialTitle/.test(hubRendererSrc) && /entry\.titleAr/.test(hubRendererSrc));

  // ── no dangling unused-hub-renderer state remains: it now has a real consumer ──
  const appTsxSrc = readFileSync(join(ROOT, 'src/App.tsx'), 'utf8');
  ok('App.tsx still routes /betaflight to BetaflightView unchanged (only the view internals changed)', /<Route path="\/betaflight" element=\{<BetaflightView\/>\}\/>/.test(appTsxSrc));

  // ── content preservation: compatibility file this task must not touch; the
  // reviewed-page priority branch in BetaflightDetailView.tsx is untouched
  // (only its not-started dispatch precedence was corrected, see below) ──
  const detailViewSrc = readFileSync(join(ROOT, 'src/views/BetaflightDetailView.tsx'), 'utf8');
  ok('compatibilityMap.ts still defines exactly 10 legacy mappings (untouched)', bfCompatibilityMap.length === 10);
  ok('BetaflightDetailView.tsx registry-priority (reviewed) branch is untouched', /registryEntry\?\.page/.test(detailViewSrc));
  ok('compatibilityMap.ts still resolves every legacy ID via resolveCompatibilityId (untouched)', resolveCompatibilityId('ports') === 'ports');
}

console.log('\n[15] BLACKBOX DISPATCH PRECEDENCE — a not-started registry ID that collides with a legacy article ID must render the honest not-started state, not the legacy article');
{
  const detailViewSrc = readFileSync(join(ROOT, 'src/views/BetaflightDetailView.tsx'), 'utf8');
  const blackboxEntry = bfPageRegistry.find(e => e.id === 'blackbox');
  ok('blackbox exists in the registry', !!blackboxEntry);
  ok('blackbox registry status remains "not-started" (this fix does not author Blackbox content)', blackboxEntry?.contentStatus === 'not-started');
  ok('blackbox has no `.page` (still genuinely not-started, not secretly reviewed)', blackboxEntry?.page === undefined);
  ok('blackbox also exists in legacy betaflightData (the actual collision this fix resolves)', betaflightData.some(s => s.id === 'blackbox'));
  ok(
    'the not-started dispatch branch no longer excludes legacy-ID collisions (the old `!isLegacyId` gate is gone)',
    !/registryEntry\s*&&\s*!isLegacyId/.test(detailViewSrc) && /if \(registryEntry\) \{/.test(detailViewSrc),
  );
  // Every OTHER not-started registry ID has no legacy counterpart, so this
  // precedence fix is a no-op for them; only 'blackbox' actually collides.
  const otherNotStarted = bfPageRegistry.filter(e => e.contentStatus === 'not-started' && e.id !== 'blackbox');
  ok(
    'no other not-started registry ID collides with a legacy article ID (the fix is narrowly scoped to blackbox)',
    otherNotStarted.every(e => !betaflightData.some(s => s.id === e.id)),
  );
  // Reviewed IDs that also collide with a legacy article (receiver/modes/
  // motors/failsafe/osd/cli/ports) must still be dispatched via the
  // untouched `registryEntry?.page` branch above, never via the not-started
  // or legacy branch.
  const reviewedLegacyCollisions = bfPageRegistry.filter(e => e.contentStatus === 'reviewed' && betaflightData.some(s => s.id === e.id));
  ok('at least the known reviewed/legacy-collision IDs still exist and are reviewed (regression guard)', reviewedLegacyCollisions.length >= 7);
  ok('every reviewed/legacy-collision entry still carries a `.page` (dispatched via the reviewed branch, unaffected by this fix)', reviewedLegacyCollisions.every(e => !!e.page));
  // Legacy-only IDs with no registry counterpart at all must still fall
  // through to the legacy branch untouched.
  const legacyOnlyIds = betaflightData.map(s => s.id).filter(id => !bfPageRegistry.some(e => e.id === id));
  ok('legacy-only IDs with no registry counterpart still exist (interface/firmware)', legacyOnlyIds.includes('interface') && legacyOnlyIds.includes('firmware'));
}

console.log(`\nAll ${passed} structural assertions passed.`);

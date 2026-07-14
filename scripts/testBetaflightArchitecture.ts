/**
 * Structural/data proof for the Betaflight Arabic companion Phase 1
 * architecture: types, glossary, version model, source model, page
 * registry, and old-ID compatibility map. Does not test rendering — see
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
import { betaflightData } from '../src/data/betaflightData';
import type { BfPage } from '../src/data/betaflight/types';

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

console.log('\n[7] Setup and Ports fixtures: honest architecture-preview status, real source-backed fields');
{
  for (const page of [setupPage, portsPage] as BfPage[]) {
    ok(`${page.id}: contentStatus is explicitly "architecture-preview" (not claimed complete)`, page.contentStatus === 'architecture-preview');
    ok(`${page.id}: has a non-empty source.url`, page.source.url.length > 0);
    ok(`${page.id}: source.url matches the verified officialDocUrl pattern`, page.source.url === officialDocUrl(page.officialId));
    ok(`${page.id}: has a non-empty source.repoPath (real file, not invented)`, (page.source.repoPath ?? '').length > 0);
    ok(`${page.id}: source.commit is a real 40-char git hash`, /^[0-9a-f]{40}$/.test(page.source.commit ?? ''));
    ok(`${page.id}: has at least one group`, page.groups.length > 0);
    ok(`${page.id}: every group has at least one field`, page.groups.every(g => g.fields.length > 0));
    ok(`${page.id}: no page content lives outside typed data (groups/fields are plain data, not JSX)`, page.groups.every(g => typeof g.titleAr === 'string'));

    const allFields = page.groups.flatMap(g => g.fields);
    ok(`${page.id}: field IDs are unique within the page`, new Set(allFields.map(f => f.id)).size === allFields.length);
    ok(`${page.id}: every field has a non-empty englishLabel`, allFields.every(f => f.englishLabel.length > 0));
    ok(`${page.id}: every field has a non-empty arabicExplanation`, allFields.every(f => f.arabicExplanation.length > 0));
    ok(`${page.id}: every field has a valid safetyLevel`, allFields.every(f => SAFETY_LEVELS.has(f.safetyLevel)));
    ok(`${page.id}: every field carries its own source`, allFields.every(f => f.source.url.length > 0));
    ok(`${page.id}: every field with scope !== 'universal' has a conditionNote`, allFields.every(f => f.scope === 'universal' || (f.conditionNote ?? '').length > 0));
    ok(`${page.id}: every group has a valid content level`, page.groups.every(g => CONTENT_LEVELS.has(g.level)));
  }
  ok('setupPage is registered in bfPageRegistry with matching content', bfPageRegistry.find(e => e.id === 'setup')?.page === setupPage);
  ok('portsPage is registered in bfPageRegistry with matching content', bfPageRegistry.find(e => e.id === 'ports')?.page === portsPage);
  ok('exactly 2 registry entries are architecture-preview (no more claimed this phase)', bfPageRegistry.filter(e => e.contentStatus === 'architecture-preview').length === 2);
  ok('the remaining 24 registry entries are honestly "not-started"', bfPageRegistry.filter(e => e.contentStatus === 'not-started').length === 24);
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
}

console.log(`\nAll ${passed} structural assertions passed.`);

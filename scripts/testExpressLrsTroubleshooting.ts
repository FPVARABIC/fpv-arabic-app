/**
 * Real source-structure assertions for the ExpressLRS troubleshooting guide:
 * src/data/expresslrs/troubleshootingIssues.ts,
 * src/hooks/useExpressLrsTroubleshootingProgress.ts,
 * src/views/ExpressLrsTroubleshootingView.tsx, and
 * src/components/expresslrs/ExpressLrsTroubleshootingIssueCard.tsx.
 *
 * Like testExpressLrsSetup.ts, this imports the real data module directly
 * and asserts on the actual runtime values, while the view/hook files are
 * asserted on as source text. scripts/testExpressLrsTroubleshootingUI.ts
 * proves the same behaviors in a real browser.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { troubleshootingIssues, TOTAL_TROUBLESHOOTING_ISSUES } from '../src/data/expresslrs/troubleshootingIssues';
import { setupSteps } from '../src/data/expresslrs/setupSteps';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

let passed = 0;
function ok(label: string, cond: boolean) {
  assert.ok(cond, `FAILED: ${label}`);
  console.log(`  ok — ${label}`);
  passed++;
}

const appTsx = readFileSync(join(ROOT, 'src/App.tsx'), 'utf8');
const storageKeysTs = readFileSync(join(ROOT, 'src/utils/storageKeys.ts'), 'utf8');
const viewTsx = readFileSync(join(ROOT, 'src/views/ExpressLrsTroubleshootingView.tsx'), 'utf8');
const hookTs = readFileSync(join(ROOT, 'src/hooks/useExpressLrsTroubleshootingProgress.ts'), 'utf8');
const cardTsx = readFileSync(join(ROOT, 'src/components/expresslrs/ExpressLrsTroubleshootingIssueCard.tsx'), 'utf8');
const setupProgressHookTs = readFileSync(join(ROOT, 'src/hooks/useExpressLrsSetupProgress.ts'), 'utf8');
const setupViewTsx = readFileSync(join(ROOT, 'src/views/ExpressLrsSetupView.tsx'), 'utf8');

console.log('\n[1] Route wiring');
{
  // Moved from an eager `import` to `lazy(() => import(...))` when this screen
  // began reading the user's project and resolving links through the KB
  // registry: eager, it dragged the parts catalogue and the encyclopedia into
  // the first load. The route it serves is unchanged, so the assertion follows
  // the module, not the keyword.
  ok('App.tsx loads ExpressLrsTroubleshootingView from its own module', /import\('\.\/views\/ExpressLrsTroubleshootingView'\)/.test(appTsx));
  ok('…and it is code-split rather than eagerly bundled', /const ExpressLrsTroubleshootingView = lazy\(/.test(appTsx));
  ok('App.tsx registers /programming/expresslrs/troubleshooting', /<Route path="\/programming\/expresslrs\/troubleshooting" element=\{<ExpressLrsTroubleshootingView\/>\}\/>/.test(appTsx));
}

console.log('\n[2] Isolated storage key, fully separate from the setup guide\'s progress');
{
  ok('storageKeys.ts defines EXPRESSLRS_TROUBLESHOOTING_PROGRESS: \'fpv_expresslrs_troubleshooting_progress\'', /EXPRESSLRS_TROUBLESHOOTING_PROGRESS:\s*'fpv_expresslrs_troubleshooting_progress'/.test(storageKeysTs));
  ok('the troubleshooting progress hook uses STORAGE_KEYS.EXPRESSLRS_TROUBLESHOOTING_PROGRESS', /useLocalStorage[\s\S]*?STORAGE_KEYS\.EXPRESSLRS_TROUBLESHOOTING_PROGRESS/.test(hookTs));
  ok('the troubleshooting hook never imports or references the setup progress hook', !/useExpressLrsSetupProgress/.test(hookTs));
  ok('the troubleshooting hook never reads or writes the setup storage key', !hookTs.includes('STORAGE_KEYS.EXPRESSLRS_SETUP_PROGRESS'));
  ok('the setup progress hook was not modified to know about troubleshooting', !setupProgressHookTs.includes('Troubleshooting'));
  ok('the setup view was not modified to know about troubleshooting', !setupViewTsx.includes('Troubleshooting'));
  ok('setupSteps.ts still carries the full curriculum (12 steps after the two Configurator gaps were closed)', setupSteps.length === 12);
}

// 36 grew to 40 when the four confirmed diagnostic gaps were closed. Each new
// issue sits inside the category it belongs to rather than at the end, so the
// safety closer stays last and the update category still reads as a sequence.
console.log('\n[3] Exactly the 40 approved categories exist, each with a unique id');
{
  ok('exactly 40 issues are defined', troubleshootingIssues.length === 40 && TOTAL_TROUBLESHOOTING_ISSUES === 40);
  const ids = troubleshootingIssues.map(i => i.id);
  ok('all issue ids are unique', new Set(ids).size === 40);
  const orders = troubleshootingIssues.slice().sort((a, b) => a.order - b.order).map(i => i.order);
  ok('order fields are 1..40 in sequence', JSON.stringify(orders) === JSON.stringify(Array.from({ length: 40 }, (_, i) => i + 1)));

  const expectedIds = [
    'no-power', 'led-off', 'led-unclear', 'tx-not-detected', 'lua-not-loading', 'lua-stuck-loading',
    'cannot-enter-wifi', 'webui-not-opening', 'no-bind', 'binding-phrase-mismatch', 'firmware-incompatibility',
    'wrong-regulatory-domain', 'model-match-blocks', 'connects-then-disconnects', 'unstable-short-range',
    'low-rssi-lq', 'bound-no-channel-movement', 'wrong-uart', 'uart-conflict', 'serial-rx-not-enabled',
    'wrong-mode-provider',
    'wiring-reversed', 'wrong-pad', 'serialrx-flags-wrong', 'spi-config-problems', 'telemetry-missing',
    'telemetry-ratio-issue', 'dynamic-power-issue', 'packet-rate-mismatch', 'arming-blocked', 'failsafe-incorrect',
    'bench-ok-fails-after-takeoff', 'repeated-bootloader-wifi', 'build-failure', 'flashing-fails',
    'wrong-target-selected', 'recovery-after-bad-flash', 'passthrough-failure', 'wifi-upload-interrupted',
    'when-to-stop',
  ];
  const idsInOrder = troubleshootingIssues.slice().sort((a, b) => a.order - b.order).map(i => i.id);
  ok('the 40 category ids match the approved list exactly, in the approved order', JSON.stringify(idsInOrder) === JSON.stringify(expectedIds));
}

console.log('\n[4] Every issue carries the full required content shape');
{
  for (const issue of troubleshootingIssues) {
    ok(`"${issue.id}" has a non-empty title`, issue.title.length > 0);
    ok(`"${issue.id}" has a non-empty symptom`, issue.symptom.length > 0);
    ok(`"${issue.id}" has at least one likely cause`, issue.likelyCauses.length >= 1);
    ok(`"${issue.id}" has a resolvedWhen description`, issue.resolvedWhen.length > 0);
    ok(`"${issue.id}" has a nextIfUnresolved description`, issue.nextIfUnresolved.length > 0);
    ok(`"${issue.id}" has at least one official source`, issue.sources.length >= 1);
    ok(`"${issue.id}" has a reviewedAt date`, /^\d{4}-\d{2}-\d{2}$/.test(issue.reviewedAt));
    ok(`"${issue.id}" sources use https URLs on official domains`, issue.sources.every(s => /^https:\/\/(www\.)?(expresslrs\.org|betaflight\.com)/.test(s.url)));
    ok(`"${issue.id}" applicability is a valid value`, ['uart', 'spi', 'both'].includes(issue.applicability));
    if (issue.checks.length > 0) {
      const checkIds = issue.checks.map(c => c.id);
      ok(`"${issue.id}" checklist item ids are unique`, new Set(checkIds).size === checkIds.length);
      for (const check of issue.checks) {
        ok(`"${issue.id}" check "${check.id}" has an instruction, expected result, and next-action`, !!check.instruction && !!check.expectedResult && !!check.ifFailed);
      }
    }
  }
}

console.log('\n[5] UART/SPI-specific issues are labeled correctly');
{
  const uartOnly = troubleshootingIssues.filter(i => i.applicability === 'uart').map(i => i.id);
  const spiOnly = troubleshootingIssues.filter(i => i.applicability === 'spi').map(i => i.id);
  ok('wrong-uart, serial-rx-not-enabled, wiring-reversed, wrong-pad, serialrx-flags-wrong are UART-only', ['wrong-uart', 'serial-rx-not-enabled', 'wiring-reversed', 'wrong-pad', 'serialrx-flags-wrong'].every(id => uartOnly.includes(id)));
  ok('spi-config-problems is SPI-only', spiOnly.includes('spi-config-problems'));
  ok('most issues remain applicable to both architectures (this is a general guide, not architecture-gated)', troubleshootingIssues.filter(i => i.applicability === 'both').length >= 25);
}

console.log('\n[6] Safety rules are honored in the data itself');
{
  const allText = JSON.stringify(troubleshootingIssues);
  ok('no instruction anywhere tells the user to test motors with propellers installed', !/بروبيلر|مروحة مركبة|مراوح مركبة/.test(allText));
  ok('bound-no-channel-movement explicitly warns that binding alone does not prove flight-safety', /الربط اللاسلكي وحده لا يثبت/.test(JSON.stringify(troubleshootingIssues.find(i => i.id === 'bound-no-channel-movement'))));
  ok('failsafe-incorrect explicitly warns that channel movement alone does not prove failsafe is configured', /لا يثبت أن Failsafe مضبوط/.test(JSON.stringify(troubleshootingIssues.find(i => i.id === 'failsafe-incorrect'))));
  ok('arming-blocked explicitly separates receiver-link problems from generic Betaflight arming problems', /ليست مشكلة في رابط ExpressLRS/.test(JSON.stringify(troubleshootingIssues.find(i => i.id === 'arming-blocked'))));
  ok('when-to-stop (category 36) exists and covers damaged wiring, overheating, unstable power, wrong firmware target, and unreliable failsafe stop conditions', ['تلف', 'سخونة', 'طاقة غير مستقرة', 'هدف برنامج ثابت', 'Failsafe'].every(k => JSON.stringify(troubleshootingIssues.find(i => i.id === 'when-to-stop')).includes(k)));
  ok('led-unclear (the issue that interprets specific LED patterns) explicitly flags hardware/firmware LED variance rather than asserting a universal pattern', JSON.stringify(troubleshootingIssues.find(i => i.id === 'led-unclear')).includes('تختلف'));
}

console.log('\n[7] Navigation is open (non-gating) — direct access to any category, no lock');
{
  ok('the view never disables a nav button based on prior category completion', !/expresslrs-troubleshooting-nav-\$\{issue\.id\}[\s\S]{0,200}disabled/.test(viewTsx));
  ok('goToIssue in the hook has no gating condition (any valid issue id is accepted unconditionally)', /const goToIssue = \(issueId: string\) => setState\(prev => \(\{ \.\.\.prev, currentIssueId: issueId/.test(hookTs));
}

console.log('\n[8] Diagnostic state updates are scoped to exactly one check at a time');
{
  ok('setCheckOutcome only ever updates a single checkId key, never a batch of checks', /checkOutcomes: \{ \.\.\.prev\.checkOutcomes, \[checkId\]: outcome \}/.test(hookTs));
  ok('the issue card renders one independent radio-group per check (no single control spans multiple checks)', /name=\{`expresslrs-check-\$\{check\.id\}`\}/.test(cardTsx));
}

console.log('\n[9] Reset is scoped correctly: per-issue reset vs. reset-all, and never touches setup progress');
{
  ok('a per-issue restart control exists, scoped to that issue\'s own check ids only', /onResetIssue=\{\(\) => progress\.resetIssue\(currentIssue\.checks\.map\(c => c\.id\)\)\}/.test(viewTsx));
  ok('a global reset-all control exists with an explicit confirmation step', /expresslrs-troubleshooting-reset-all-confirm-yes/.test(viewTsx));
  ok('the reset-all confirmation copy explicitly states it does not affect the setup guide', /لا يؤثر على دليل الإعداد/.test(viewTsx));
  ok('resetAll only ever writes to the troubleshooting hook\'s own state (never imports the setup hook)', !/useExpressLrsSetupProgress/.test(viewTsx));
}

console.log('\n[10] Accessibility: no incomplete ARIA widgets, native controls throughout');
{
  ok('no role="tablist" anywhere', !/role="tablist"/.test(viewTsx) && !/role="tablist"/.test(cardTsx));
  ok('no role="tab" anywhere', !/role="tab"/.test(viewTsx) && !/role="tab"/.test(cardTsx));
  ok('no aria-selected anywhere', !/aria-selected/.test(viewTsx) && !/aria-selected/.test(cardTsx));
  ok('category navigation uses a semantic <nav> with an accessible label', /<nav className="space-y-4" data-testid="expresslrs-troubleshooting-nav" aria-label="[^"]+"/.test(viewTsx));
  ok('the active category-nav button uses aria-current, not color alone', /aria-current=\{active \? 'true' : undefined\}/.test(viewTsx));
  ok('check outcomes use native radio inputs', /type="radio"/.test(cardTsx));
  ok('checks use native <fieldset>/<legend> for grouping (not a custom ARIA group)', /<fieldset/.test(cardTsx) && /<legend/.test(cardTsx));
  ok('heading levels are sequential: h2 for issue title, h3 for section labels (no h1 duplicated, no skipped level)', !/<h1\b/.test(viewTsx) && !/<h1\b/.test(cardTsx) && /<h2\b/.test(cardTsx) && /<h3\b/.test(cardTsx));
}

console.log(`\nAll ${passed} assertions passed.`);

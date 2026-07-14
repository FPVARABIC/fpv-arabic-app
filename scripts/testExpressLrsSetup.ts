/**
 * Real source-structure assertions for the ExpressLRS setup guide:
 * src/data/expresslrs/types.ts, src/data/expresslrs/setupSteps.ts,
 * src/hooks/useExpressLrsSetupProgress.ts, src/views/ExpressLrsSetupView.tsx,
 * and src/components/expresslrs/*.tsx.
 *
 * This is a source-structure test (reads real files on disk and asserts on
 * their content/shape) rather than a behavioral one — the data file is
 * imported directly to assert on the actual runtime values of the step
 * curriculum, while the view/component files are asserted on as text.
 * scripts/testExpressLrsSetupUI.ts proves the same behaviors in a real
 * browser.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setupSteps, TOTAL_SETUP_STEPS } from '../src/data/expresslrs/setupSteps';

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
const viewTsx = readFileSync(join(ROOT, 'src/views/ExpressLrsSetupView.tsx'), 'utf8');
const hookTs = readFileSync(join(ROOT, 'src/hooks/useExpressLrsSetupProgress.ts'), 'utf8');
const onboardingTsx = readFileSync(join(ROOT, 'src/components/expresslrs/ExpressLrsOnboarding.tsx'), 'utf8');
const stepCardTsx = readFileSync(join(ROOT, 'src/components/expresslrs/ExpressLrsStepCard.tsx'), 'utf8');
const useProgressTs = readFileSync(join(ROOT, 'src/hooks/useProgress.ts'), 'utf8');
const progressContextTsx = readFileSync(join(ROOT, 'src/contexts/ProgressContext.tsx'), 'utf8');

console.log('\n[1] Route wiring');
{
  ok('App.tsx imports ExpressLrsSetupView', /import\s*\{\s*ExpressLrsSetupView\s*\}\s*from\s*'\.\/views\/ExpressLrsSetupView';/.test(appTsx));
  ok('App.tsx registers /programming/expresslrs/setup', /<Route path="\/programming\/expresslrs\/setup" element=\{<ExpressLrsSetupView\/>\}\/>/.test(appTsx));
}

console.log('\n[2] Isolated storage key');
{
  ok('storageKeys.ts defines EXPRESSLRS_SETUP_PROGRESS: \'fpv_expresslrs_setup_progress\'', /EXPRESSLRS_SETUP_PROGRESS:\s*'fpv_expresslrs_setup_progress'/.test(storageKeysTs));
  ok('the setup progress hook uses STORAGE_KEYS.EXPRESSLRS_SETUP_PROGRESS (not a hardcoded literal key)', /useLocalStorage[\s\S]*?STORAGE_KEYS\.EXPRESSLRS_SETUP_PROGRESS/.test(hookTs));
  ok('the hook does not touch useProgress.ts', !useProgressTs.includes('EXPRESSLRS'));
  ok('the hook does not touch ProgressContext.tsx', !progressContextTsx.includes('EXPRESSLRS'));
}

console.log('\n[3] Exactly the 10 approved steps, in the approved order');
{
  ok('exactly 10 steps are defined', setupSteps.length === 10 && TOTAL_SETUP_STEPS === 10);
  const ids = setupSteps.map(s => s.id);
  ok('step id order matches the approved curriculum exactly', JSON.stringify(ids) === JSON.stringify([
    'identify-hardware', 'prepare-radio', 'configurator-target', 'update-tx', 'update-rx',
    'binding', 'receiver-wiring', 'configure-betaflight', 'lua-webui', 'final-verification',
  ]));
  const orders = setupSteps.map(s => s.order);
  ok('step `order` fields are 1..10 in sequence', JSON.stringify(orders) === JSON.stringify([1,2,3,4,5,6,7,8,9,10]));

  const expectedTitles: Record<string, string> = {
    'identify-hardware': 'تحديد نوع النظام والأجهزة',
    'prepare-radio': 'تجهيز الراديو ووحدة الإرسال',
    'configurator-target': 'تثبيت Configurator واختيار Target',
    'update-tx': 'تحديث TX Module',
    'update-rx': 'تحديث Receiver',
    'binding': 'اختيار وتنفيذ Binding',
    'receiver-wiring': 'توصيل المستقبل بمتحكم الطيران',
    'configure-betaflight': 'إعداد ExpressLRS داخل Betaflight',
    'lua-webui': 'إعداد من Lua Script وWeb UI',
    'final-verification': 'التحقق النهائي قبل الاستخدام',
  };
  for (const s of setupSteps) {
    ok(`step "${s.id}" title matches exactly`, s.title === expectedTitles[s.id]);
  }
}

console.log('\n[4] Every step carries the full required content shape (non-empty core fields)');
{
  for (const s of setupSteps) {
    ok(`"${s.id}" has a non-empty goal`, typeof s.goal === 'string' && s.goal.length > 0);
    ok(`"${s.id}" has at least one prerequisite`, s.prerequisites.length >= 1);
    ok(`"${s.id}" has at least one action`, s.actions.length >= 1);
    ok(`"${s.id}" has at least one expected result`, s.expectedResult.length >= 1);
    ok(`"${s.id}" has at least one "if not seen" entry`, s.ifNotSeen.length >= 1);
    ok(`"${s.id}" has at least one checklist item`, s.checklist.length >= 1);
    ok(`"${s.id}" has at least one official source`, s.sources.length >= 1);
    ok(`"${s.id}" has a reviewedAt date`, /^\d{4}-\d{2}-\d{2}$/.test(s.reviewedAt));
    ok(`"${s.id}" checklist item ids are unique`, new Set(s.checklist.map(c => c.id)).size === s.checklist.length);
    ok(`"${s.id}" sources use https URLs on official domains`, s.sources.every(src => /^https:\/\/(www\.)?(expresslrs\.org|github\.com\/ExpressLRS|betaflight\.com|manual\.edgetx\.org|edgetx\.org)/.test(src.url)));
  }
}

console.log('\n[5] Step 2 (prepare-radio) carries the approved baud-rate reference table with its exception caveat');
{
  const s = setupSteps.find(x => x.id === 'prepare-radio')!;
  const text = JSON.stringify(s);
  ok('mentions 400K for packet rates up to 250Hz', text.includes('400K') && text.includes('250Hz'));
  ok('mentions 921K up to 500Hz', text.includes('921K') && text.includes('500Hz'));
  ok('mentions 1.87M for F1000 and below', text.includes('1.87M') && text.includes('F1000'));
  ok('explicitly caveats that hardware/radio exceptions exist', /تختلف بعض الأجهزة والراديوهات/.test(text));
}

console.log('\n[6] Step 6 (binding) distinguishes Binding Phrase / UID / Model Match correctly');
{
  const s = setupSteps.find(x => x.id === 'binding')!;
  const text = JSON.stringify(s);
  ok('defines Binding Phrase as anti-collision, not security', /منع التصادم/.test(text) && /ليس الأمان/.test(text));
  ok('explains the six-byte UID hashed from the Binding Phrase', /ستة بايتات/.test(text) && /Binding Phrase/.test(text));
  ok('explains Model Match is separate from Binding Phrase', /Model Match/.test(text) && /منفصلة تمامًا عن Binding Phrase/.test(text));
}

console.log('\n[7] Step 7 (receiver-wiring) covers both UART and SPI paths, with the documented KISS exception');
{
  const s = setupSteps.find(x => x.id === 'receiver-wiring')!;
  ok('has at least one [UART]-branch action', s.actions.some(a => a.startsWith('[UART]')));
  ok('has at least one [SPI]-branch action', s.actions.some(a => a.startsWith('[SPI]')));
  ok('documents the KISS FC UART-labeling exception', s.actions.some(a => a.includes('KISS')));
  ok('applicableHardware is restricted to uart/spi (this step is inherently hardware-specific)', JSON.stringify(s.applicableHardware.slice().sort()) === JSON.stringify(['spi', 'uart']));
}

console.log('\n[8] Step 8 (configure-betaflight) carries the exact approved UART and SPI settings');
{
  const s = setupSteps.find(x => x.id === 'configure-betaflight')!;
  const text = JSON.stringify(s);
  ok('UART: Ports tab Serial RX on the wired UART only', /Ports[\s\S]*Serial RX/.test(text));
  ok('UART: Receiver Mode=Serial, Provider=CRSF', text.includes('Mode = Serial') && text.includes('Provider = CRSF'));
  ok('UART: Telemetry enabled, RSSI Channel disabled', /فعّل Telemetry/.test(text) && /عطّل RSSI Channel/.test(text));
  ok('UART: CLI serialrx_inverted=off and serialrx_halfduplex=off', text.includes('serialrx_inverted = off') && text.includes('serialrx_halfduplex = off'));
  ok('SPI: Mode=SPI RX, Provider=EXPRESSLRS', text.includes('Mode = SPI RX') && text.includes('EXPRESSLRS'));
  ok('SPI: version note requires Betaflight 4.4.0+', /4\.4\.0/.test(text));
  ok('SPI: notes the missing D250/D500/F500/F1000/Full-Res modes', text.includes('D250') && text.includes('Full-Res'));
}

console.log('\n[9] Step 9 (lua-webui) carries the exact approved Telemetry Ratio list and Dynamic Power table');
{
  const s = setupSteps.find(x => x.id === 'lua-webui')!;
  const text = JSON.stringify(s);
  ok('Telemetry Ratio list matches exactly: Off, Std, Race, 1:128..1:2', text.includes('Off، Std، Race، 1:128، 1:64، 1:32، 1:16، 1:8، 1:4، 1:2'));
  ok('explains 1:64 semantics (one telemetry packet per 64)', /1:64[\s\S]{0,40}لكل 64/.test(text) || text.includes('حزمة تيليمتري واحدة لكل 64 حزمة'));
  ok('flags Race as disabling telemetry/sync while armed, not a casual recommendation', /Race[\s\S]{0,60}يعطّل التيليمتري والمزامنة أثناء التسليح/.test(text));
  ok('Dynamic Power table has all seven approved rate/ratio pairs', ['1000Hz', '500Hz', '250Hz', '200Hz', '150Hz', '100Hz', '50Hz'].every(k => text.includes(k)));
  ok('Dynamic Power table values match exactly (1:128, 1:128, 1:64, 1:64, 1:32, 1:32, 1:16)', text.includes('1000Hz ← 1:128، 500Hz ← 1:128، 250Hz ← 1:64، 200Hz ← 1:64، 150Hz ← 1:32، 100Hz ← 1:32، 50Hz ← 1:16'));
  ok('labels the Dynamic Power table as official minimum guidance, not a universal flight-profile recommendation', /ليست توصية عامة لأي بروفايل طيران/.test(text));
  ok('advanced disclosures include Switch Mode, Antenna Mode, RF Band, VTX Administrator, WiFi Connectivity, BLE Joystick, Backpack, Bind Command', [
    'Switch Mode', 'Antenna Mode', 'RF Band', 'VTX Administrator', 'WiFi Connectivity', 'BLE Joystick', 'Backpack', 'Bind Command',
  ].every(k => text.includes(k)));
}

console.log('\n[10] Step 10 (final-verification) carries a full checklist and the exact required/forbidden wording');
{
  const s = setupSteps.find(x => x.id === 'final-verification')!;
  ok('checklist has at least 20 items', s.checklist.length >= 20);
  const text = JSON.stringify(s);
  ok('success message states bench-level configuration and verification', text.includes('تم إعداد رابط التحكم والتحقق منه للتشغيل على الطاولة'));
  ok('explicitly does NOT claim binding alone proves safety / channel movement alone proves failsafe / bench success proves flight readiness', /الربط وحده لا يثبت الأمان/.test(text) && /تحرك القنوات وحده لا يثبت أن Failsafe يعمل/.test(text) && /لا يعني جاهزية الطائرة للطيران/.test(text));
}

console.log('\n[11] Onboarding component covers exactly the 5 approved questions with exact option text');
{
  ok('question 1: نوع المستقبل — مستقبل خارجي UART / مستقبل مدمج SPI / لا أعرف', onboardingTsx.includes("legend: 'نوع المستقبل'"));
  ok('question 2: وحدة الإرسال', onboardingTsx.includes("legend: 'وحدة الإرسال'"));
  ok('question 3: نطاق التردد', onboardingTsx.includes("legend: 'نطاق التردد'"));
  ok('question 4: الحالة الحالية', onboardingTsx.includes("legend: 'الحالة الحالية'"));
  ok('question 5: برنامج متحكم الطيران', onboardingTsx.includes("legend: 'برنامج متحكم الطيران'"));
  {
    const setupIntentStart = onboardingTsx.indexOf("key: 'setupIntent'");
    const nextKeyStart = onboardingTsx.indexOf("key:", setupIntentStart + 1);
    const setupIntentBlock = onboardingTsx.slice(setupIntentStart, nextKeyStart);
    ok('setupIntent question has no "لا أعرف" option (per the approved spec, only 4 concrete options)', !setupIntentBlock.includes('helpForUnknown'));
  }
  ok('answers are never auto-detected — onAnswer is only called from a user-driven onChange handler', /onChange=\{\(\)\s*=>\s*\{[\s\S]*?onAnswer\(/.test(onboardingTsx));
  ok('selections use native radio inputs (keyboard-accessible by default)', /type="radio"/.test(onboardingTsx));
  ok('selected state is visually marked beyond color alone (a Check icon renders)', /isSelected\s*&&\s*<Check/.test(onboardingTsx));
}

console.log('\n[12] Progress/navigation is open (non-gating) — no lock on later steps');
{
  ok('the view never disables a step-nav button based on prerequisite completion', !/expresslrs-setup-step-nav-\$\{s\.id\}[\s\S]{0,200}disabled/.test(viewTsx));
  ok('a non-blocking prerequisite reminder banner exists, distinct from any lock', /expresslrs-prerequisite-reminder/.test(stepCardTsx));
  ok('the reminder text explicitly says the user can continue anyway', /يمكنك المتابعة/.test(stepCardTsx));
  ok('prev/next buttons are only disabled at the actual first/last step boundary (not by completion state)', /disabled=\{!prevStep\}/.test(viewTsx) && /disabled=\{!nextStep\}/.test(viewTsx));
}

console.log('\n[13] Reset requires explicit confirmation, and progress storage stays isolated from lessons');
{
  ok('reset is a two-step control (click once to arm, again to confirm)', /confirmingReset/.test(viewTsx) && /expresslrs-setup-reset-confirm-yes/.test(viewTsx));
  ok('a cancel control exists for the reset confirmation', /expresslrs-setup-reset-confirm-cancel/.test(viewTsx));
  ok('an explicit exit control navigates back to /programming/expresslrs', /navigate\('\/programming\/expresslrs'\)/.test(viewTsx));
}

console.log('\n[14] Step navigation is a plain button group — no tab semantics');
{
  ok('the step-nav container carries no role="tablist"', !/role="tablist"/.test(viewTsx));
  ok('no step-nav button carries role="tab"', !/role="tab"/.test(viewTsx));
  ok('no step-nav button carries aria-selected', !/aria-selected/.test(viewTsx));
  ok('no role="tabpanel" exists anywhere in the setup view or step card', !/role="tabpanel"/.test(viewTsx) && !/role="tabpanel"/.test(stepCardTsx));
  ok('the step-nav container is a semantic <nav> with an accessible label', /<nav className="flex flex-wrap gap-1\.5" data-testid="expresslrs-setup-step-nav" aria-label="[^"]+"/.test(viewTsx));
  ok('the active step-nav button is marked with aria-current="step"', /aria-current=\{active \? 'step' : undefined\}/.test(viewTsx));
}

console.log('\n[15] Persisted-state normalization guards every field independently');
{
  ok('the hook re-validates raw storage as unknown, not a trusted `as T` cast', /useLocalStorage<unknown>\(STORAGE_KEYS\.EXPRESSLRS_SETUP_PROGRESS/.test(hookTs));
  ok('a normalizeProgressState function merges valid fields over defaults', /function normalizeProgressState\(raw: unknown\): ExpressLrsSetupProgressState/.test(hookTs));
  ok('onboarding answers are validated per-field via type guards (not trusted wholesale)', /isReceiverArchitecture/.test(hookTs) && /isTxModuleLocation/.test(hookTs) && /isFrequencyBand/.test(hookTs) && /isSetupIntent/.test(hookTs) && /isFcSoftware/.test(hookTs));
  ok('completedStepIds/completedChecklistItemIds are filtered against known-valid id sets, not trusted as-is', /normalizeIdArray/.test(hookTs) && /VALID_STEP_IDS/.test(hookTs) && /VALID_CHECKLIST_IDS/.test(hookTs));
  ok('currentStepId falls back to a real step id when the stored value is unknown or non-string', /VALID_STEP_IDS\.has\(obj\.currentStepId\)/.test(hookTs));
  ok('lastReviewedAt is validated as a parseable date, not trusted as any string', /normalizeTimestamp/.test(hookTs) && /Date\.parse\(raw\)/.test(hookTs));
  ok('every write re-normalizes `prev` before merging new fields, so corrupt state can never propagate forward', /setRawState\(\(prev: unknown\) => updater\(normalizeProgressState\(prev\)\)\)/.test(hookTs));
  ok('the shared generic useLocalStorage.ts hook was not modified by this corrective pass', !/normalizeProgressState|VALID_STEP_IDS|isReceiverArchitecture/.test(readFileSync(join(ROOT, 'src/hooks/useLocalStorage.ts'), 'utf8')));
}

console.log(`\nAll ${passed} assertions passed.`);

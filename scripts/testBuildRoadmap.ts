/**
 * Structural/data proof for the upgraded /roadmap (البناء) practical build
 * guide. Covers roadmapData.ts (untouched identity: IDs/order/checklists)
 * and the new roadmapStageContent.ts (practical content added by this
 * task). Complements testBuildRoadmapUI.ts, which drives a real browser.
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { roadmapData, TOTAL_ROADMAP_STEPS, ROADMAP_STEP_IDS } from '../src/data/roadmapData';
import { roadmapStageContent, getRoadmapStageContent } from '../src/data/roadmapStageContent';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

let passed = 0;
function ok(label: string, cond: boolean) {
  assert.ok(cond, `FAILED: ${label}`);
  console.log(`  ok — ${label}`);
  passed++;
}

const APPROVED_ORDER = [
  'build-soldering-basics',
  'build-parts-tools',
  'build-frame',
  'build-motors',
  'build-esc',
  'build-fc',
  'build-receiver',
  'build-gps',
  'build-vtx',
  'build-pre-battery',
];

const ORIGINAL_IMAGE_PATHS = [
  '/build-images/build-stage-01-soldering-wiring.png',
  '/build-images/build-stage-02-parts-tools.png',
  '/build-images/build-stage-03-frame-assembly.png',
  '/build-images/build-stage-04-motor-mounting.png',
  '/build-images/build-stage-05-esc-mounting.png',
  '/build-images/build-stage-06-flight-controller-mounting.png',
  '/build-images/build-stage-07-receiver-installation.png',
  '/build-images/build-stage-08-gps-installation.png',
  '/build-images/build-stage-09-vtx-video-system.png',
  '/build-images/build-stage-10-pre-battery-check.png',
];

console.log('\n[1] Exactly 10 stages, exact approved IDs and order');
{
  ok('TOTAL_ROADMAP_STEPS is 10', TOTAL_ROADMAP_STEPS === 10);
  ok('roadmapData has exactly 10 entries', roadmapData.length === 10);
  ok('stage IDs and order exactly match the approved list', JSON.stringify(roadmapData.map(s => s.id)) === JSON.stringify(APPROVED_ORDER));
  ok('stage numbers are 1..10 in order', roadmapData.every((s, i) => s.number === i + 1));
  ok('ROADMAP_STEP_IDS contains exactly the 10 approved IDs', APPROVED_ORDER.every(id => ROADMAP_STEP_IDS.has(id)) && ROADMAP_STEP_IDS.size === 10);
}

console.log('\n[2] Every stage has all required practical-content fields');
{
  for (const id of APPROVED_ORDER) {
    const c = roadmapStageContent[id as keyof typeof roadmapStageContent];
    ok(`${id}: has a preparation array`, Array.isArray(c.preparation));
    ok(`${id}: has a non-empty practicalSteps array`, Array.isArray(c.practicalSteps) && c.practicalSteps.length > 0);
    ok(`${id}: has an explicit warnings array (may be empty)`, Array.isArray(c.warnings));
    ok(`${id}: has an explicit commonMistakes array (may be empty)`, Array.isArray(c.commonMistakes));
    ok(`${id}: has a non-empty acceptanceChecks array`, Array.isArray(c.acceptanceChecks) && c.acceptanceChecks.length > 0);
    ok(`${id}: has an explicit stopConditions array (may be empty)`, Array.isArray(c.stopConditions));
    ok(`${id}: every practicalStep is a non-empty string`, c.practicalSteps.every(s => typeof s === 'string' && s.trim().length > 0));
    ok(`${id}: every acceptanceCheck is a non-empty string`, c.acceptanceChecks.every(s => typeof s === 'string' && s.trim().length > 0));
  }
  ok('getRoadmapStageContent returns safe empty defaults for an unknown id', (() => {
    const c = getRoadmapStageContent('not-a-real-stage-id');
    return c.preparation.length === 0 && c.practicalSteps.length === 0 && c.warnings.length === 0 &&
      c.commonMistakes.length === 0 && c.acceptanceChecks.length === 0 && c.stopConditions.length === 0;
  })());
}

console.log('\n[3] Brevity limits respected (stage 1 and 10 may exceed the normal 4-8/1-4/1-3 caps)');
{
  for (const id of APPROVED_ORDER) {
    const c = roadmapStageContent[id as keyof typeof roadmapStageContent];
    const isExceptionStage = id === 'build-soldering-basics' || id === 'build-pre-battery';
    const stepCap = isExceptionStage ? 16 : 9;
    ok(`${id}: practicalSteps within cap (${stepCap})`, c.practicalSteps.length <= stepCap);
    ok(`${id}: warnings within normal cap (<=4)`, c.warnings.length <= 4);
    ok(`${id}: commonMistakes within normal cap (<=3)`, c.commonMistakes.length <= 3);
  }
}

console.log('\n[4] All 10 original image paths remain exactly unchanged; no new/deleted image');
{
  // Images moved from BuildRoadmapView.tsx (now the stage list) to
  // BuildRoadmapStageDetailView.tsx (the new per-stage detail page) as part
  // of the list->detail redesign — still the same 10 real files.
  const detailTsx = readFileSync(join(ROOT, 'src/views/BuildRoadmapStageDetailView.tsx'), 'utf8');
  for (const path of ORIGINAL_IMAGE_PATHS) {
    ok(`image path present unchanged: ${path}`, detailTsx.includes(`'${path}'`));
    ok(`image file exists on disk: ${path}`, existsSync(join(ROOT, 'public', path.replace(/^\//, ''))));
  }
  const imagePathMatches = [...detailTsx.matchAll(/'\/build-images\/[^']+\.png'/g)].map(m => m[0].slice(1, -1));
  const uniquePaths = new Set(imagePathMatches);
  ok('no new /build-images path was introduced beyond the original 10', uniquePaths.size === 10 && ORIGINAL_IMAGE_PATHS.every(p => uniquePaths.has(p)));
  ok('BuildRoadmapView.tsx (the new stage list) no longer embeds stage images directly', !readFileSync(join(ROOT, 'src/views/BuildRoadmapView.tsx'), 'utf8').includes('/build-images/'));
}

console.log('\n[5] Content-accuracy mandatory checks');
{
  const gps = roadmapStageContent['build-gps'];
  const gpsLinksBlock = readFileSync(join(ROOT, 'src/views/BuildRoadmapStageDetailView.tsx'), 'utf8')
    .match(/'build-gps':\s*\[[\s\S]*?\](?=,\s*\n\s*'build-vtx')/);
  ok('Stage 8 (GPS) does not reference a fake/nonexistent GPS lesson (no learning links entry for build-gps)', !gpsLinksBlock);
  ok('Stage 8 practical content is self-contained (has its own preparation/steps/checks, not just a link)', gps.practicalSteps.length > 0 && gps.acceptanceChecks.length > 0);

  const motors = roadmapStageContent['build-motors'];
  const motorsText = JSON.stringify(motors);
  ok('Stage 4 does not claim a universal fixed CW/CCW physical-placement rule', !/الأمامي الأيسر.*عكس عقارب|CCW.*الأمامي الأيسر/.test(motorsText));
  ok('Stage 4 explicitly defers rotation-direction verification to Programming', /البرمجة/.test(motorsText) && /(اتجاه دوران|CW\/CCW)/.test(motorsText));

  const fc = roadmapStageContent['build-fc'];
  ok('Stage 6 includes a pin-order warning (FC↔ESC cable)', fc.warnings.some(w => /ترتيب الأطراف/.test(w)) || fc.practicalSteps.some(s => /ترتيب أطراف/.test(s)));

  const receiver = roadmapStageContent['build-receiver'];
  const receiverText = JSON.stringify(receiver);
  ok('Stage 7 states TX(Receiver)→RX(FC)', /TX من طرف الـ Receiver إلى RX في طرف FC/.test(receiverText));
  ok('Stage 7 states RX(Receiver)→TX(FC)', /RX من طرف الـ Receiver إلى TX في طرف FC/.test(receiverText));

  ok('Stage 8 (GPS) does not hardcode a single universal voltage value', !/GPS[\s\S]*?(3\.3V أو 5V|5V فقط)/.test(JSON.stringify(gps)));

  const vtx = roadmapStageContent['build-vtx'];
  ok('Stage 9 (VTX) does not hardcode a single universal voltage value (states "من الجهاز نفسه" instead)', !/(5V أو 9V أو 12V)/.test(JSON.stringify(vtx)));

  const preBattery = roadmapStageContent['build-pre-battery'];
  const preBatteryText = JSON.stringify(preBattery);
  ok('Stage 10 explicitly rejects any flight-readiness claim', /جاهزية الطيران/.test(preBatteryText));

  const viewTsx = readFileSync(join(ROOT, 'src/views/BuildRoadmapView.tsx'), 'utf8');
  const finalCardMatch = viewTsx.match(/roadmap-final-completion"[\s\S]{0,1500}/);
  ok('final completion state exists', !!finalCardMatch);
  ok('final completion state says physical assembly is complete', /تم إكمال التجميع المادي للدرون/.test(finalCardMatch?.[0] ?? ''));
  ok('final completion state says the drone is NOT flight-ready', /ليس جاهزًا للطيران/.test(finalCardMatch?.[0] ?? ''));
  ok('final completion state says propellers must remain uninstalled', /المراوح غير مركبة/.test(finalCardMatch?.[0] ?? ''));
  ok('final completion state links to /programming', /navigate\('\/programming'\)/.test(finalCardMatch?.[0] ?? ''));
  ok('final completion state does not link to a First-Flight destination', !/أول طيران|First Flight/i.test(finalCardMatch?.[0] ?? ''));
}

console.log('\n[6] Checklist identity fully preserved (roadmapData.ts untouched by this task)');
{
  const CHECKLIST_COUNTS: Record<string, number> = {
    'build-soldering-basics': 8, 'build-parts-tools': 12, 'build-frame': 6, 'build-motors': 7,
    'build-esc': 6, 'build-fc': 6, 'build-receiver': 7, 'build-gps': 7, 'build-vtx': 7, 'build-pre-battery': 9,
  };
  for (const step of roadmapData) {
    ok(`${step.id}: checklist length unchanged (${CHECKLIST_COUNTS[step.id]})`, step.checklist.length === CHECKLIST_COUNTS[step.id]);
  }
  ok('checklist item 0 of stage 1 text unchanged (identity proof)', roadmapData[0].checklist[0] === 'عرفت شكل نقطة اللحام الجيدة');
  ok('checklist item 0 of stage 10 text unchanged (identity proof)', roadmapData[9].checklist[0] === 'لا توجد مراوح مركبة');
}

console.log('\n[7] Scope boundaries — diff must not touch /assembly, Lessons, Programming, ExpressLRS, Community, Firebase, Bot V2');
{
  const { execSync } = await import('node:child_process');
  const diffNames = execSync('git diff --name-only HEAD', { cwd: ROOT }).toString().trim().split('\n').filter(Boolean);
  const untrackedNames = execSync('git ls-files --others --exclude-standard', { cwd: ROOT }).toString().trim().split('\n').filter(Boolean);
  const allChanged = [...diffNames, ...untrackedNames];
  const forbiddenPrefixes = [
    'src/data/assembly/', 'src/components/Assembly/', 'src/views/AssemblyView.tsx',
    'src/data/lessonsData.ts', 'src/views/ProgrammingView.tsx', 'src/views/ExpressLrs',
    'src/data/expresslrs/', 'src/components/expresslrs/', 'src/components/Community/',
    'src/views/BotV2', 'src/components/BotV2', 'src/components/AppShell.tsx',
    // 'src/views/BetaflightView.tsx' and 'src/views/BetaflightDetailView.tsx'
    // intentionally removed from this list: later, explicit tasks
    // ("BETAFLIGHT LIVE HUB INTEGRATION", "BETAFLIGHT FINAL BLACKBOX
    // CONSISTENCY FIX") authorized rewriting the live Betaflight hub and
    // correcting its not-started dispatch precedence. Those files are no
    // longer out-of-scope for the whole repo going forward — this scope
    // boundary only ever applied to the original BuildRoadmap-only task this
    // script was written for.
  ];
  const violations = allChanged.filter(f => forbiddenPrefixes.some(p => f.startsWith(p)));
  ok('no forbidden-scope file appears in the diff', violations.length === 0);
  if (violations.length > 0) console.log('  VIOLATIONS:', violations);
}

console.log('\n[8] Invalid-stage route correction (final review corrections)');
{
  const detailTsx = readFileSync(join(ROOT, 'src/views/BuildRoadmapStageDetailView.tsx'), 'utf8');
  const invalidBlockMatch = detailTsx.match(/if \(!step\) \{([\s\S]*?)\n\s{2}\}\n\n\s{2}const done/);
  const invalidBlock = invalidBlockMatch?.[1] ?? '';
  ok('invalid-stage fallback block is present and isolated', invalidBlock.length > 0);
  ok('invalid-stage fallback renders inside AppShell', /<AppShell/.test(invalidBlock));
  ok('invalid-stage fallback shows the honest Arabic message', invalidBlock.includes('المرحلة غير موجودة'));
  ok('invalid-stage fallback exposes a native return-to-roadmap button', /<button[\s\S]*?العودة إلى خريطة البناء/.test(invalidBlock));
  ok('invalid-stage fallback uses fixed navigation to /roadmap (not a dynamic/derived path)', /navigate\('\/roadmap'\)/.test(invalidBlock));
  ok('invalid-stage fallback has an accessible back icon with an Arabic aria-label', /aria-label="العودة"/.test(invalidBlock));
  ok('invalid-stage fallback contains exactly one h1 (no nested/duplicate heading)', (invalidBlock.match(/<h1/g) || []).length === 1);

  // No raw emoji introduced anywhere in the redesign's own files (lucide-react icons only).
  // The single U+2715 ("✕") is excluded deliberately: it is the zoom-overlay's
  // functional close-icon glyph, inherited byte-for-byte unchanged from the
  // original accordion implementation (not a decorative emoji this redesign
  // introduced), and is present identically in the committed pre-redesign file.
  const EMOJI_RANGE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{2714}\u{2716}-\u{27BF}]/u;
  for (const relPath of ['src/views/BuildRoadmapView.tsx', 'src/views/BuildRoadmapStageDetailView.tsx']) {
    const text = readFileSync(join(ROOT, relPath), 'utf8');
    ok(`${relPath}: no raw emoji characters`, !EMOJI_RANGE.test(text));
  }
}

console.log('\n[9] Route architecture unchanged; scope is exactly the known Build Roadmap file set');
{
  const appTsx = readFileSync(join(ROOT, 'src/App.tsx'), 'utf8');
  ok('/roadmap route still present', /path="\/roadmap"\s+element=\{<BuildRoadmapView\/>\}/.test(appTsx));
  ok('/roadmap/:stageId route still present', /path="\/roadmap\/:stageId"\s+element=\{<BuildRoadmapStageDetailView\/>\}/.test(appTsx));

  const { execSync } = await import('node:child_process');
  const diffNames = execSync('git diff --name-only HEAD', { cwd: ROOT }).toString().trim().split('\n').filter(Boolean);
  const untrackedNames = execSync('git ls-files --others --exclude-standard', { cwd: ROOT }).toString().trim().split('\n').filter(Boolean);
  const allChanged = [...diffNames, ...untrackedNames];
  const ALLOWED_SCOPE = new Set([
    'scripts/testBuildRoadmap.ts',
    'scripts/testBuildRoadmapUI.ts',
    'src/App.tsx',
    'src/index.css',
    'src/views/BuildRoadmapView.tsx',
    'src/views/BuildRoadmapStageDetailView.tsx',
  ]);
  const outOfScope = allChanged.filter(f => !ALLOWED_SCOPE.has(f));
  ok('no file outside the known 6-file Build Roadmap scope is dirty', outOfScope.length === 0);
  if (outOfScope.length > 0) console.log('  OUT OF SCOPE:', outOfScope);
}

console.log(`\nAll ${passed} structural assertions passed.`);

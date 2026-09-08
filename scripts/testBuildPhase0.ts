/**
 * PHASE 0 — the defects the multi-expert audit found, pinned so they cannot
 * come back.
 *
 * This suite is deliberately narrow. It does not describe how the build
 * section SHOULD be designed — that is a later phase, and nothing here
 * anticipates it. It asserts the specific properties that were false in
 * production and are now true:
 *
 *   [1] an unavailable build type cannot start a journey
 *   [2] a foundational change announces what it will delete, before deleting
 *   [3] blocked progression always says why
 *   [4] the two hardware-killing facts are present where the work happens
 *   [5] the safety gates explain their own terminology — without relaxing
 *   [6] the phone mirror does not overstate progress
 *   [7] nothing shared was edited to achieve any of the above
 *
 * Reachability itself lives in `scripts/testBuildReachability.ts`, which
 * derives it from the catalogue rather than asserting it from a list.
 *
 * Run: npx tsx --tsconfig web/tsconfig.json scripts/testBuildPhase0.ts
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8');
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

let passed = 0;
function ok(label: string, cond: boolean) {
  assert.ok(cond, `FAILED: ${label}`);
  console.log(`  ok — ${label}`);
  passed++;
}

const wizard = read('web/components/build/BuildWizard.tsx');
const wizardCode = stripComments(wizard);
const gateStep = read('web/components/build/GateStep.tsx');
const guideSteps = read('web/components/build/GuideSteps.tsx');
const css = read('web/app/globals.css');

const { droneTypes } = await import('../src/data/assembly/droneTypes');
const { roadmapData } = await import('../src/data/roadmapData');
const { checklistsData } = await import('../src/data/checklistsData');
const { lessonsData } = await import('../src/data/lessonsData');
const { buildStages } = await import('../src/data/assembly/buildStages');
const { BUILD_TYPE_AVAILABILITY, isBuildTypeAvailable, buildTypeAvailability } =
  await import('../web/lib/build/availability');
const { ASSEMBLY_STAGE_SAFETY, GATE_TERM_NOTES, gateTermNoteFor, PRE_BATTERY_SAFETY } =
  await import('../web/lib/build/safetyNotes');
const { SAFETY_GATES } = await import('../web/lib/build/gates');
const { phoneStageIndexFor, BUILD_PATH } = await import('../web/lib/build/path');

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[1] An unavailable build type cannot start a journey\n');

ok('every drone type has an availability verdict',
  droneTypes.every(t => BUILD_TYPE_AVAILABILITY[t.id] !== undefined));
ok('an unknown type id defaults to unavailable, never to available',
  !isBuildTypeAvailable('a-type-that-does-not-exist'));
ok('isBuildTypeAvailable treats undefined as unavailable',
  !isBuildTypeAvailable(undefined));

ok('the goal step disables the card for an unavailable type',
  /disabled=\{!available\}/.test(wizardCode));
ok('the goal step shows the «قريبًا» badge on an unavailable type',
  wizard.includes('goal-unavailable-') && wizard.includes('unavailableLabelAr()'));
ok('the goal step prints the reason on the card itself',
  wizard.includes('goal-reason-') && /\{reasonAr\}/.test(wizard));
ok('an unavailable type is still LISTED — it is explained, not hidden',
  /droneTypes\.map\(/.test(wizardCode) && !/droneTypes\s*\.\s*filter\([^)]*available/.test(wizardCode));

ok('canAdvance on the goal step requires an AVAILABLE type, not merely a chosen one',
  /if \(step\.id === 'goal'\) return isBuildTypeAvailable\(draft\.droneTypeId\)/.test(wizardCode));

for (const t of droneTypes) {
  const a = buildTypeAvailability(t.id);
  if (a.available) continue;
  ok(`«${t.primaryName}» carries a reader-facing reason`, !!a.reasonAr);
  ok(`«${t.primaryName}»'s reason names the catalogue, not a policy`,
    !!a.reasonAr && /القطع|إطار|الكتالوج/.test(a.reasonAr));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[2] A foundational change announces what it will delete\n');

ok('window.confirm is gone from the build surface entirely',
  !wizardCode.includes('window.confirm'));
// Type, size and voltage: each calls the one confirmation path exactly once,
// so none of them can grow a private deletion route.
ok('all three foundational selectors route through one confirmation path',
  (wizardCode.match(/\bapplyFoundationalChange\(\s*$|\bapplyFoundationalChange\(/gm) ?? []).length === 3);
for (const selector of ['selectSize', 'selectVoltage', 'selectDroneType']) {
  const body = wizardCode.slice(wizardCode.indexOf(`const ${selector} =`));
  ok(`${selector} asks before it deletes`,
    body.slice(0, body.indexOf('\n  };')).includes('applyFoundationalChange('));
}
ok('the removal list is DERIVED from the computed next draft, not retyped',
  /Object\.keys\(draft\.partIds\)\.filter\(c => !next\.partIds\[c\]\)/.test(wizardCode));
ok('a change that removes nothing applies without asking',
  /if \(removedCategories\.length === 0 && !dropsSize\) \{\s*setDraft\(next\);/.test(wizardCode));
ok('a size the reader chose counts as discarded work too',
  /dropsSize/.test(wizardCode));
ok('the confirmation surface exists and is in-app, not native',
  wizard.includes('invalidation-sheet') && wizard.includes("role=\"alertdialog\""));
ok('the confirmation names each affected part by its own name',
  wizard.includes('invalidation-item-') && /part\?\.nameAr/.test(wizard));
ok('the confirmation offers both continue and cancel',
  wizard.includes('invalidation-confirm') && wizard.includes('invalidation-cancel'));
ok('cancel does not mutate the draft',
  /data-testid="invalidation-cancel"[\s\S]{0,120}onClick=\{\(\) => setPendingChange\(null\)\}/.test(wizard));
ok('confirm applies exactly the draft that was described',
  /setDraft\(pendingChange\.next\)/.test(wizardCode));
// The precomputed result is only honest if the draft cannot move underneath
// it. Step 4 keeps a battery picker on screen below the sheet, so this is a
// reachable path rather than a theoretical one.
ok('the draft is frozen while a confirmation is open',
  /const selectPart = [\s\S]{0,120}if \(pendingChange\) return;/.test(wizardCode));
ok('the confirmation is styled at every width — it is a question, not a summary',
  css.includes('.invalidation-sheet') && !/\.invalidation-sheet\s*\{[^}]*display:\s*none/.test(css));

// Phase 0 does NOT auto-replace: that is a later phase, and quietly swapping a
// part for another is the same class of surprise this fix removes.
ok('no automatic replacement was introduced (that belongs to a later phase)',
  !/RecommendationEngine|autoReplace|suggestReplacement/i.test(wizardCode));

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[3] Blocked progression always says why\n');

ok('a disabled primary action is visually distinct from an enabled one',
  /\.btn-primary:disabled/.test(css));
ok('the disabled state drops the gradient that reads as «press me»',
  /\.btn-primary:disabled[\s\S]{0,200}background:\s*var\(--surface-2\)/.test(css));
ok('the disabled state drops the hover lift and the press animation',
  /\.btn-primary:disabled:hover[\s\S]{0,160}transform:\s*none/.test(css));
ok('aria-disabled is styled identically, so the two cannot drift',
  /\.btn-primary\[aria-disabled='true'\]/.test(css));
ok('the card-shaped option buttons get the same treatment',
  /button\.card-sm:disabled/.test(css));

ok('a reason is computed for every step kind that can block',
  ['choice', 'parts', 'report', 'gate'].every(kind =>
    new RegExp(`case '${kind}'`).test(wizardCode.slice(wizardCode.indexOf('blockedReasonAr')))));
ok('the reason renders as its own note, not only as a report-step aside',
  wizard.includes('wizard-blocked-reason'));
ok('«التالي» points at the reason for assistive technology',
  /aria-describedby=\{blockedReason \? 'wizard-blocked-reason' : undefined\}/.test(wizard));
ok('the old report-only «مقفل» aside is gone, replaced by the general rule',
  !wizardCode.includes('«التالي» مقفل حتى تُعالج الموانع أعلاه'));

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[4] The two hardware-killing facts are where the work happens\n');

const stageIds = new Set(roadmapData.map(s => s.id));
for (const stageId of Object.keys(ASSEMBLY_STAGE_SAFETY)) {
  ok(`safety note «${stageId}» is attached to a REAL roadmap stage`, stageIds.has(stageId));
}
ok('motor screw length is taught at the motor-mounting stage',
  !!ASSEMBLY_STAGE_SAFETY['build-motors']
  && /ملفات|مسمار/.test(ASSEMBLY_STAGE_SAFETY['build-motors'].bodyAr));
ok('the VTX antenna rule is taught at the video-install stage',
  !!ASSEMBLY_STAGE_SAFETY['build-vtx']
  && /هوائي/.test(ASSEMBLY_STAGE_SAFETY['build-vtx'].bodyAr));
ok('the VTX antenna rule is repeated on the last screen before any current flows',
  gateStep.includes('safety-note-prebattery') && /هوائي/.test(PRE_BATTERY_SAFETY.bodyAr));

const lessonIds = new Set(lessonsData.map(l => l.id));
for (const [stageId, note] of Object.entries(ASSEMBLY_STAGE_SAFETY)) {
  ok(`«${stageId}» links to a lesson that exists: ${note.lessonId}`, lessonIds.has(note.lessonId));
  ok(`«${stageId}» names the lesson it links to`, note.lessonTitleAr.length > 3);
}
ok('the notes are rendered, not merely declared',
  guideSteps.includes('ASSEMBLY_STAGE_SAFETY[stage.id]') && guideSteps.includes('SafetyCallout'));
ok('a hazard note is not collapsible — it is not a disclosure',
  !/SafetyCallout[\s\S]{0,600}useState/.test(guideSteps));

// Phase 0 scope: LiPo handling and the props-removed → props-installed
// transition need screens of their own and are NOT started here.
ok('no LiPo acknowledgement model was started (a later phase owns it)',
  !/lipoAcknowledged/i.test(wizardCode));
ok('no prop-state model was started (a later phase owns it)',
  !/propsInstalled/i.test(wizardCode));

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[5] The gates explain their terminology without relaxing\n');

const allGateItems = SAFETY_GATES.flatMap(g => g.items);
for (const note of GATE_TERM_NOTES) {
  ok(`«${note.token}» still appears in a live gate item`,
    allGateItems.some(i => i.toLowerCase().includes(note.token.toLowerCase())));
  ok(`«${note.token}» is explained in Arabic`, /[؀-ۿ]/.test(note.explanationAr));
}
ok('the lookup matches on the term, not on exact item text',
  !!gateTermNoteFor('تأكدت من عدم وجود solder bridge')
  && !!gateTermNoteFor('لا يوجد solder bridge في أي مكان'));
ok('an item with no known term gets no note',
  gateTermNoteFor('لا توجد مراوح مركبة') === undefined);
ok('the clarification renders beside the item',
  gateStep.includes('gate-term-') && gateStep.includes('gateTermNoteFor'));

// The safety-critical half: an explanation must not become an escape hatch.
ok('the Smoke Stopper note explains the tool without offering a way to skip it',
  GATE_TERM_NOTES.some(n => n.token === 'Smoke Stopper'
    && /تُحدّ التيار|حماية/.test(n.explanationAr)
    && !/يمكنك تخطي|بدون|اختياري|لا بأس/.test(n.explanationAr)));
ok('gate completion still requires every item — no term note changes the count',
  /confirmed\?\.length \?\? 0\) >= gate\.items\.length/.test(read('web/components/build/GateStep.tsx')));

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[6] The phone mirror does not overstate progress\n');

const REQUIRED_ALL = [
  'frames', 'motors', 'propellers', 'escs',
  'flightControllers', 'receivers', 'videoUnits',
];
const stepIndexOf = (id: string) => BUILD_PATH.findIndex(s => s.id === id);

// THE MEASURED DEFECT. A reader on web step 5 of 20 with a frame, motors,
// propellers and a battery used to mirror as stage 12 → «المرحلة 13 من 18».
const defectCase = phoneStageIndexFor(
  stepIndexOf('propulsion'),
  ['frames', 'motors', 'propellers', 'batteries'],
);
ok('the measured 5/20 → 13/18 overstatement is gone',
  defectCase < 12);
ok('that same reader is not credited past the first thing they have not chosen',
  defectCase <= 1); // videoUnits is shared stage 2 and is still unchosen

ok('nothing chosen never credits progress, at any step',
  BUILD_PATH.every((_, i) => phoneStageIndexFor(i, []) <= 1));
ok('the mirror never exceeds the shared flow\'s own bounds',
  BUILD_PATH.every((_, i) =>
    phoneStageIndexFor(i, [...REQUIRED_ALL, 'batteries']) <= buildStages.length - 1));
ok('a complete selection at the report step still advances the mirror',
  phoneStageIndexFor(stepIndexOf('compat'), [...REQUIRED_ALL, 'batteries']) > defectCase);
ok('the mirror is never negative',
  BUILD_PATH.every((_, i) => phoneStageIndexFor(i, REQUIRED_ALL) >= 0));
ok('skipping an OPTIONAL category does not stall the mirror forever',
  phoneStageIndexFor(BUILD_PATH.length - 1, [...REQUIRED_ALL, 'batteries'])
    > phoneStageIndexFor(BUILD_PATH.length - 1, ['frames']));
ok('a category supplied from outside the catalogue counts as done',
  read('web/lib/build/draft.ts').includes('Object.keys(draft.externalParts)'));

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[7] Nothing shared was edited to achieve any of this\n');

ok('the gates still read the shared checklist verbatim',
  read('web/lib/build/gates.ts').includes("checklistItems('pre-battery')")
  && read('web/lib/build/gates.ts').includes("checklistItems('pre-flight')"));
ok('the shared pre-battery list still has its nine items',
  checklistsData.find(g => g.id === 'pre-battery')?.items.length === 9);
ok('the shared pre-flight list still has its ten items',
  checklistsData.find(g => g.id === 'pre-flight')?.items.length === 10);
ok('the gate step does not rewrite shared item text',
  !/items\.map\([^)]*\)\s*\.map\(/.test(stripComments(gateStep))
  && gateStep.includes('{text}'));
ok('the shared project store schema is untouched by this phase',
  !read('src/data/project/store.ts').includes('phoneStageIndexFor'));
ok('mirrorToProject still writes the same shared store',
  read('web/lib/build/draft.ts').includes('saveAssemblyProject({'));
ok('bom.ts was not touched',
  read('web/lib/build/bom.ts').includes('export function computeBom'));

console.log(`\n[phase 0] ${passed} assertions passed\n`);

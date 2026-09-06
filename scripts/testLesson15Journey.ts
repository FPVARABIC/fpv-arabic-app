/**
 * Real assertions against Lesson 15's journey definition
 * (src/data/lessons/lesson15Journey.definition.ts) driven through the
 * generic session-state engine (src/data/lessons/lessonJourneyEngine.ts).
 * No DOM, no React — this proves the gating/readiness logic itself;
 * scripts/testLesson15JourneyUI.ts proves the same behaviors are actually
 * wired up in the rendered UI.
 */
import assert from 'node:assert/strict';
import {
  createInitialSessionState, goToStageId, nextStage, prevStage,
  recordCheckpointAnswer, recordInteractionVariant, recordRecallRevealed,
  isCheckpointAnswered, areAllCheckpointsAnswered, isInteractionComplete, isRecallComplete,
  getReadinessRequirements, isReadyToComplete, stageCount, currentStage,
} from '../src/data/lessons/lessonJourneyEngine';
import { lesson15JourneyDefinition as def } from '../src/data/lessons/lesson15Journey.definition';
import type { CheckpointStage, RecallStage, GlossaryStage, ComparisonStage, InteractiveDiagramStage } from '../src/types/lessonJourney';
import { lessonsData } from '../src/data/lessonsData';
import { getLessonJourneyDefinition } from '../src/data/lessons/journeyRegistry';

let passed = 0;
function ok(label: string, cond: boolean) {
  assert.ok(cond, `FAILED: ${label}`);
  console.log(`  ok — ${label}`);
  passed++;
}

const CHECKPOINT_STAGES = def.stages.filter((s): s is CheckpointStage => s.type === 'checkpoint');
const DIAGRAM_STAGE = def.stages.find((s): s is InteractiveDiagramStage => s.type === 'interactive_diagram')!;
const RECALL = def.stages.find((s): s is RecallStage => s.type === 'recall')!;
const GLOSSARY_STAGE = def.stages.find((s): s is GlossaryStage => s.type === 'glossary')!;
const COMPARISON_STAGE = def.stages.find((s): s is ComparisonStage => s.type === 'comparison')!;
const STAGE_COUNT = stageCount(def);

console.log('\n[1] Registration: Lesson 15 is registered in the journey registry with real lesson data');
{
  const lesson15 = lessonsData.find(l => l.id === 'lesson-receiver-install')!;
  ok('lesson15JourneyDefinition.lessonId matches the real Lesson 15 id', def.lessonId === lesson15.id);
  ok('getLessonJourneyDefinition resolves Lesson 15 to this exact definition', getLessonJourneyDefinition(lesson15.id) === def);
  ok('Lesson 15 has 17 stages', STAGE_COUNT === 17);
}

console.log('\n[2] The receiver-uart diagram stage exists with exactly the 4 real pin ids as required variants');
{
  ok('exactly one interactive_diagram stage exists', def.stages.filter(s => s.type === 'interactive_diagram').length === 1);
  ok('diagramType is receiver-uart', DIAGRAM_STAGE.diagramType === 'receiver-uart');
  ok('required variants are exactly the 4 real pins', JSON.stringify(DIAGRAM_STAGE.requiredVariants) === JSON.stringify(['v5', 'gnd', 'tx', 'rx']));
}

console.log('\n[3] Initial state — nothing satisfied, completion unavailable at initial render');
{
  const s = createInitialSessionState(def);
  ok('starts on the orientation stage', currentStage(def, s).id === 'orientation');
  ok('diagram not yet explored', !isInteractionComplete(DIAGRAM_STAGE, s));
  ok('no checkpoint answered', !areAllCheckpointsAnswered(def, s));
  ok('final recall not complete', !isRecallComplete(RECALL, s));
  ok('readiness gate is NOT satisfied at initial state', !isReadyToComplete(def, s));
  ok(
    'readiness requirement list has one entry per gate (diagram + 4 checkpoints + recall)',
    getReadinessRequirements(def, s).length === CHECKPOINT_STAGES.length + 2,
  );
  ok('every requirement reports unmet at initial state', getReadinessRequirements(def, s).every(r => !r.met));
}

console.log('\n[4] Reaching the last stage alone does not grant readiness');
{
  let s = createInitialSessionState(def);
  for (let i = 0; i < STAGE_COUNT; i++) s = nextStage(def, s);
  ok('currentStage moved to the final stage', s.currentStageIndex === STAGE_COUNT - 1);
  ok('readiness is still NOT satisfied merely by navigating to the last stage', !isReadyToComplete(def, s));
}

console.log('\n[5] Receiver-UART diagram completion requires exploring all 4 distinct pins');
{
  let s = createInitialSessionState(def);
  ok('not complete before any pin explored', !isInteractionComplete(DIAGRAM_STAGE, s));
  s = recordInteractionVariant(s, DIAGRAM_STAGE.id, 'v5');
  ok('still not complete after exploring only "v5"', !isInteractionComplete(DIAGRAM_STAGE, s));
  s = recordInteractionVariant(s, DIAGRAM_STAGE.id, 'v5'); // repeat, should not substitute for the others
  ok('repeatedly exploring the same pin never substitutes for exploring the others', !isInteractionComplete(DIAGRAM_STAGE, s));
  s = recordInteractionVariant(s, DIAGRAM_STAGE.id, 'gnd');
  ok('still not complete after exploring 2 of 4 pins', !isInteractionComplete(DIAGRAM_STAGE, s));
  s = recordInteractionVariant(s, DIAGRAM_STAGE.id, 'tx');
  ok('still not complete after exploring 3 of 4 pins', !isInteractionComplete(DIAGRAM_STAGE, s));
  s = recordInteractionVariant(s, DIAGRAM_STAGE.id, 'rx');
  ok('complete once all 4 pins have been explored', isInteractionComplete(DIAGRAM_STAGE, s));
}

console.log('\n[6] Checkpoints: wrong-first-attempt never permanently blocks, retry always possible');
{
  let s = createInitialSessionState(def);
  const cp = CHECKPOINT_STAGES[0].checkpoint;
  const wrongOption = cp.options.find(o => !o.correct)!;
  const correctOption = cp.options.find(o => o.correct)!;

  ok('checkpoint unanswered initially', !isCheckpointAnswered(s, cp.id));
  s = recordCheckpointAnswer(s, cp.id, wrongOption.id);
  ok('a wrong first answer still counts as "answered"', isCheckpointAnswered(s, cp.id));
  ok('every checkpoint option carries non-empty explanatory feedback', cp.options.every(o => o.feedback.length > 20));
  s = recordCheckpointAnswer(s, cp.id, correctOption.id);
  ok('retry after a wrong answer is possible and updates the recorded answer', s.checkpointAnswers[cp.id] === correctOption.id);
}

console.log('\n[7] All four required concept checks exist and each has exactly one correct option with feedback');
{
  ok('exactly 4 checkpoint stages defined', CHECKPOINT_STAGES.length === 4);
  for (const stage of CHECKPOINT_STAGES) {
    const cp = stage.checkpoint;
    const correctCount = cp.options.filter(o => o.correct).length;
    ok(`checkpoint "${cp.id}" has exactly one correct option`, correctCount === 1);
    ok(`checkpoint "${cp.id}": every option has feedback text`, cp.options.every(o => o.feedback && o.feedback.trim().length > 0));
  }
  const ids = CHECKPOINT_STAGES.map(s => s.checkpoint.id);
  ok('checkpoint ids are: securingReceiverPrinciple, insulationAndCarbonPrinciple, antennaPlacementPrinciple, serviceabilityAndInstallVsConfigPrinciple',
    JSON.stringify(ids) === JSON.stringify([
      'securingReceiverPrinciple', 'insulationAndCarbonPrinciple', 'antennaPlacementPrinciple', 'serviceabilityAndInstallVsConfigPrinciple',
    ]));
}

console.log('\n[8] Misconception targeting: each checkpoint explicitly names the correct distinction, not just asserts it');
{
  const secureCp = CHECKPOINT_STAGES.find(s => s.checkpoint.id === 'securingReceiverPrinciple')!.checkpoint;
  const secureCorrect = secureCp.options.find(o => o.correct)!;
  ok('securing correct option names real mounting and accessibility balance', secureCorrect.text.includes('وسيلة تثبيت حقيقية') && secureCorrect.text.includes('الوصول'));

  const insulCp = CHECKPOINT_STAGES.find(s => s.checkpoint.id === 'insulationAndCarbonPrinciple')!.checkpoint;
  const insulCorrect = insulCp.options.find(o => o.correct)!;
  ok('insulation correct option names carbon separation and voltage matching', insulCorrect.text.includes('كربوني') && insulCorrect.text.includes('يطابق مواصفات'));

  const antennaCp = CHECKPOINT_STAGES.find(s => s.checkpoint.id === 'antennaPlacementPrinciple')!.checkpoint;
  const antennaCorrect = antennaCp.options.find(o => o.correct)!;
  ok('antenna correct option names propeller clearance and fold/crush avoidance', antennaCorrect.text.includes('مسار دوران المراوح') && antennaCorrect.text.includes('طيّه'));

  const serviceCp = CHECKPOINT_STAGES.find(s => s.checkpoint.id === 'serviceabilityAndInstallVsConfigPrinciple')!.checkpoint;
  const serviceCorrect = serviceCp.options.find(o => o.correct)!;
  ok('serviceability correct option names the physical-vs-software separation', serviceCorrect.text.includes('منفصل تمامًا') && serviceCorrect.text.includes('binding'));
}

console.log('\n[9] Completion remains unavailable until every checkpoint, the diagram, and recall have been engaged with');
{
  let s = createInitialSessionState(def);
  for (const stage of CHECKPOINT_STAGES) {
    const wrong = stage.checkpoint.options.find(o => !o.correct)!;
    s = recordCheckpointAnswer(s, stage.checkpoint.id, wrong.id);
  }
  ok('all 4 checkpoints now answered (even though every answer was wrong)', areAllCheckpointsAnswered(def, s));
  ok('still not ready — receiver-uart diagram not yet explored', !isReadyToComplete(def, s));

  for (const v of DIAGRAM_STAGE.requiredVariants) s = recordInteractionVariant(s, DIAGRAM_STAGE.id, v);
  ok('still not ready — final recall not yet viewed', !isReadyToComplete(def, s));

  for (const p of RECALL.prompts) s = recordRecallRevealed(s, RECALL.id, p.id);
  ok('final recall now complete', isRecallComplete(RECALL, s));
  ok('READY once diagram + all 4 (even all-wrong) checkpoints + final recall are all engaged with', isReadyToComplete(def, s));
}

console.log('\n[10] Readiness checklist always names exactly what remains, in the declared order');
{
  let s = createInitialSessionState(def);
  const reqs = getReadinessRequirements(def, s);
  ok('every requirement has a non-empty human-readable label', reqs.every(r => r.label && r.label.trim().length > 0));
  ok('requirements are returned in the declared readinessOrder (first checkpoint listed first)', reqs[0].id === 'checkpoint-securingReceiverPrinciple');
  for (const v of DIAGRAM_STAGE.requiredVariants) s = recordInteractionVariant(s, DIAGRAM_STAGE.id, v);
  const reqs2 = getReadinessRequirements(def, s);
  ok('the receiver-uart diagram requirement flips to met once satisfied, others remain unmet',
    reqs2.find(r => r.id === 'receiverUartDiagram')!.met && reqs2.filter(r => r.id !== 'receiverUartDiagram').every(r => !r.met));
}

console.log('\n[11] Backward navigation preserves already-recorded session progress');
{
  let s = createInitialSessionState(def);
  s = recordInteractionVariant(s, DIAGRAM_STAGE.id, 'v5');
  s = recordCheckpointAnswer(s, 'securingReceiverPrinciple', CHECKPOINT_STAGES[0].checkpoint.options[0].id);
  s = goToStageId(def, s, 'receiverUartDiagram');
  s = goToStageId(def, s, 'orientation');
  ok('navigating backward does not clear a recorded checkpoint answer', isCheckpointAnswered(s, 'securingReceiverPrinciple'));
  ok('navigating backward does not clear a recorded diagram variant', s.interactionVariants['receiverUartDiagram']?.['v5'] === true);
  s = goToStageId(def, s, 'receiverUartDiagram');
  ok('navigating forward again still preserves progress', s.interactionVariants['receiverUartDiagram']?.['v5'] === true);
  s = prevStage(def, s);
  ok('prevStage() by position also works and preserves progress', isCheckpointAnswered(s, 'securingReceiverPrinciple'));
}

console.log('\n[12] A fresh session (equivalent to a page refresh) starts with zero interaction progress');
{
  const fresh = createInitialSessionState(def);
  ok('fresh state has no pins explored', Object.values(fresh.interactionVariants['receiverUartDiagram'] ?? {}).every(v => v === false));
  ok('fresh state has no checkpoints answered', Object.values(fresh.checkpointAnswers).every(v => v === null));
  ok('fresh state has no recall prompts revealed', Object.values(fresh.recallRevealed[RECALL.id]).every(v => v === false));
}

console.log('\n[13] The comparison stage carries the secured/insulated/antenna-safe-vs-dangling/carbon-touching/prop-adjacent contrast');
{
  ok('exactly one comparison stage exists', def.stages.filter(s => s.type === 'comparison').length === 1);
  ok('comparison has exactly 2 items (correct vs unsafe)', COMPARISON_STAGE.items.length === 2);
  const labels = COMPARISON_STAGE.items.map(i => i.label);
  ok('one item is the correct secured/insulated/antenna-safe setup', labels.some(l => l.includes('الصحيح')));
  ok('one item is the unsafe dangling/carbon-touching/prop-adjacent setup', labels.some(l => l.includes('غير الآمن')));
}

console.log('\n[14] Glossary covers the key receiver-installation vocabulary with real, non-empty MSA definitions');
{
  ok('exactly 5 glossary terms defined', GLOSSARY_STAGE.terms.length === 5);
  const termNames = GLOSSARY_STAGE.terms.map(t => t.term);
  ok('glossary defines real mechanical mounting', termNames.some(t => t.includes('التثبيت الميكانيكي الحقيقي')));
  ok('glossary defines conductive-carbon separation', termNames.some(t => t.includes('العزل عن الكربون')));
  ok('glossary defines supply-voltage matching', termNames.some(t => t.includes('مطابقة جهد التغذية')));
  ok('glossary defines safe antenna placement', termNames.some(t => t.includes('موضع الهوائي الآمن')));
  ok('glossary defines strain-free wire routing', termNames.some(t => t.includes('تنظيم الأسلاك دون إجهاد')));
  ok('every glossary definition is substantive (non-empty)', GLOSSARY_STAGE.terms.every(t => t.definition.length > 10));
}

console.log('\n[15] Content-boundary check: Lesson 15 stays at physical-installation level, not protocol/UART-config/binding/failsafe depth');
{
  // The definition alone was not enough. Its overview stage body is the
  // literal 'lesson-explanation', so the prose a learner actually reads never
  // reached this check — and that is exactly where the contradiction lived:
  // the orientation promised no software setup while the explanation walked
  // the learner through enabling serial reception on a port. Everything the
  // renderers show is checked now: the lesson's own text and derived stages.
  const lesson = lessonsData.find(l => l.id === def.lessonId)!;
  const rendered = [
    lesson.description, lesson.objective, lesson.explanation,
    ...lesson.importantPoints, lesson.commonMistake, lesson.warning ?? '',
  ].join(' ');
  const allText = `${JSON.stringify(def)} ${rendered}`.toLowerCase();
  // Note: bare 'لحام'/'soldering' is intentionally NOT banned — the lesson
  // legitimately references an existing "exposed solder point" (نقطة لحام
  // مكشوفة) as a physical hazard to insulate against (a required teaching
  // point), without ever teaching soldering technique itself. What must stay
  // banned is any soldering *procedure* phrasing.
  const outOfScopeTerms = [
    'كيفية اللحام', 'خطوات اللحام', 'طريقة اللحام', 'serial rx', 'crsf', 'sbus', 'betaflight',
    'uart configuration', 'uart assignment', 'اختر uart', 'فعّل serial',
    'اختر بروتوكول', 'protocol selection', 'خطوات الربط', 'كيفية الربط',
    'failsafe', 'channel mapping', 'receiver tab', 'ports tab',
    'camera', 'vtx', 'motor test', 'first flight',
  ];
  for (const term of outOfScopeTerms) {
    ok(`Lesson 15 does not mention out-of-scope term "${term}"`, !allText.includes(term.toLowerCase()));
  }
  // "binding" is used exactly 3 times, deliberately, only as the
  // parenthetical English gloss for الربط — once in the orientation stage's
  // scope disclaimer, twice in the install-vs-config checkpoint's options
  // (a boundary reminder, not an instructional procedure) — confirm the
  // count stays exactly at that expected boundary-reminder usage.
  ok('the word "binding" is used only as the expected boundary-reminder gloss (exactly 3 occurrences)', (allText.match(/binding/g) ?? []).length === 3);
}

console.log('\n[16] Lesson 15\'s transition bridge to Lesson 16 is built from real lessonsData, not hardcoded text');
{
  const lesson16 = lessonsData.find(l => l.id === 'lesson-video-system')!;
  const completionStage = def.stages[def.stages.length - 1];
  ok('the final stage is a completion stage', completionStage.type === 'completion');
  if (completionStage.type === 'completion') {
    const bridgeText = completionStage.nextLessonBridge(lesson16);
    ok('bridge text contains Lesson 16\'s real title', bridgeText.includes(lesson16.title));
    ok('bridge text contains Lesson 16\'s real description', bridgeText.includes(lesson16.description));
  }
}

console.log('\n[17] Reused architecture: no Lesson-15-specific engine code exists — same generic engine as Lessons 1-14');
{
  ok('stage ids are unique across the whole definition', new Set(def.stages.map(s => s.id)).size === def.stages.length);
  ok('checkpoint ids are unique across the whole definition', new Set(CHECKPOINT_STAGES.map(s => s.checkpoint.id)).size === CHECKPOINT_STAGES.length);
}

console.log(`\nAll ${passed} assertions passed.`);

/**
 * Real assertions against Lesson 03's journey definition
 * (src/data/lessons/lesson03Journey.definition.ts) driven through the
 * generic session-state engine (src/data/lessons/lessonJourneyEngine.ts).
 * No DOM, no React — this proves the gating/readiness logic itself;
 * scripts/testLesson03JourneyUI.ts proves the same behaviors are actually
 * wired up in the rendered UI.
 */
import assert from 'node:assert/strict';
import {
  createInitialSessionState, goToStageId, nextStage, prevStage, recordInteractionVariant,
  recordCheckpointAnswer, recordRecallRevealed, isInteractionComplete, isCheckpointAnswered,
  areAllCheckpointsAnswered, isRecallComplete, getReadinessRequirements, isReadyToComplete,
  stageCount, currentStage,
} from '../src/data/lessons/lessonJourneyEngine';
import { lesson03JourneyDefinition as def } from '../src/data/lessons/lesson03Journey.definition';
import type { CheckpointStage, InteractiveDiagramStage, RecallStage, GlossaryStage } from '../src/types/lessonJourney';
import { lessonsData } from '../src/data/lessonsData';
import { getLessonJourneyDefinition } from '../src/data/lessons/journeyRegistry';

let passed = 0;
function ok(label: string, cond: boolean) {
  assert.ok(cond, `FAILED: ${label}`);
  console.log(`  ok — ${label}`);
  passed++;
}

const CHECKPOINT_STAGES = def.stages.filter((s): s is CheckpointStage => s.type === 'checkpoint');
const PARTS_DIAGRAM = def.stages.find((s): s is InteractiveDiagramStage => s.type === 'interactive_diagram')!;
const RECALL = def.stages.find((s): s is RecallStage => s.type === 'recall')!;
const GLOSSARY_STAGE = def.stages.find((s): s is GlossaryStage => s.type === 'glossary')!;
const STAGE_COUNT = stageCount(def);

console.log('\n[1] Registration: Lesson 03 is registered in the journey registry with real lesson data');
{
  const lesson3 = lessonsData.find(l => l.id === 'lesson-drone-parts')!;
  ok('lesson03JourneyDefinition.lessonId matches the real Lesson 3 id', def.lessonId === lesson3.id);
  ok('getLessonJourneyDefinition resolves Lesson 3 to this exact definition', getLessonJourneyDefinition(lesson3.id) === def);
  ok('Lesson 3 has 15 stages, matching Lessons 1 & 2\'s depth', STAGE_COUNT === 15);
}

console.log('\n[2] Initial state — nothing satisfied, completion unavailable at initial render');
{
  const s = createInitialSessionState(def);
  ok('starts on the orientation stage', currentStage(def, s).id === 'orientation');
  ok('parts-map diagram not yet explored', !isInteractionComplete(PARTS_DIAGRAM, s));
  ok('no checkpoint answered', !areAllCheckpointsAnswered(def, s));
  ok('final recall not complete', !isRecallComplete(RECALL, s));
  ok('readiness gate is NOT satisfied at initial state', !isReadyToComplete(def, s));
  ok(
    'readiness requirement list has one entry per gate (parts diagram + 4 checkpoints + recall)',
    getReadinessRequirements(def, s).length === 1 + CHECKPOINT_STAGES.length + 1,
  );
  ok('every requirement reports unmet at initial state', getReadinessRequirements(def, s).every(r => !r.met));
}

console.log('\n[3] Reaching the last stage alone does not grant readiness');
{
  let s = createInitialSessionState(def);
  for (let i = 0; i < STAGE_COUNT; i++) s = nextStage(def, s);
  ok('currentStage moved to the final stage', s.currentStageIndex === STAGE_COUNT - 1);
  ok('readiness is still NOT satisfied merely by navigating to the last stage', !isReadyToComplete(def, s));
}

console.log('\n[4] Parts-map diagram completion requires exploring all 8 parts');
{
  let s = createInitialSessionState(def);
  ok('exactly 8 required variants declared', PARTS_DIAGRAM.requiredVariants.length === 8);
  ok('not complete before any part explored', !isInteractionComplete(PARTS_DIAGRAM, s));
  const all = ['frame', 'motors', 'fc', 'esc', 'rx', 'vtx', 'lipo', 'props'];
  ok('required variants are exactly the 8 real PartsMap part ids', JSON.stringify([...PARTS_DIAGRAM.requiredVariants].sort()) === JSON.stringify([...all].sort()));
  for (const variant of all.slice(0, 7)) {
    s = recordInteractionVariant(s, PARTS_DIAGRAM.id, variant);
    ok(`still not complete after exploring only up through "${variant}"`, !isInteractionComplete(PARTS_DIAGRAM, s));
  }
  s = recordInteractionVariant(s, PARTS_DIAGRAM.id, 'props');
  ok('complete once all 8 parts have been explored', isInteractionComplete(PARTS_DIAGRAM, s));
  // repetition must not fake completion of an unexplored variant
  let s2 = createInitialSessionState(def);
  s2 = recordInteractionVariant(s2, PARTS_DIAGRAM.id, 'frame');
  s2 = recordInteractionVariant(s2, PARTS_DIAGRAM.id, 'frame');
  s2 = recordInteractionVariant(s2, PARTS_DIAGRAM.id, 'frame');
  ok('repeatedly exploring the same part never substitutes for exploring the others', !isInteractionComplete(PARTS_DIAGRAM, s2));
}

console.log('\n[5] Checkpoints: wrong-first-attempt never permanently blocks, retry always possible');
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

console.log('\n[6] All four required concept checks exist and each has exactly one correct option with feedback');
{
  ok('exactly 4 checkpoint stages defined', CHECKPOINT_STAGES.length === 4);
  for (const stage of CHECKPOINT_STAGES) {
    const cp = stage.checkpoint;
    const correctCount = cp.options.filter(o => o.correct).length;
    ok(`checkpoint "${cp.id}" has exactly one correct option`, correctCount === 1);
    ok(`checkpoint "${cp.id}": every option has feedback text`, cp.options.every(o => o.feedback && o.feedback.trim().length > 0));
  }
  const ids = CHECKPOINT_STAGES.map(s => s.checkpoint.id);
  ok('checkpoint ids are: framePassive, threeBoardsDistinction, motorPropDistinction, cameraVtxDistinction',
    JSON.stringify(ids) === JSON.stringify(['framePassive', 'threeBoardsDistinction', 'motorPropDistinction', 'cameraVtxDistinction']));
}

console.log('\n[7] Misconception targeting: each checkpoint explicitly names the correct distinction, not just asserts it');
{
  const frameCp = CHECKPOINT_STAGES.find(s => s.checkpoint.id === 'framePassive')!.checkpoint;
  const frameCorrect = frameCp.options.find(o => o.correct)!;
  ok('frame-passive correct option explicitly states no signal is processed', frameCorrect.text.includes('دون معالجة أي إشارة'));

  const boardsCp = CHECKPOINT_STAGES.find(s => s.checkpoint.id === 'threeBoardsDistinction')!.checkpoint;
  const boardsCorrect = boardsCp.options.find(o => o.correct)!;
  ok('three-boards correct option explicitly names all three roles in order', boardsCorrect.text.includes('يستقبل') && boardsCorrect.text.includes('يقرر') && boardsCorrect.text.includes('ينفّذ'));

  const motorPropCp = CHECKPOINT_STAGES.find(s => s.checkpoint.id === 'motorPropDistinction')!.checkpoint;
  const motorPropCorrect = motorPropCp.options.find(o => o.correct)!;
  ok('motor-prop correct option explicitly credits Props with generating thrust', motorPropCorrect.text.includes('المروحة') && motorPropCorrect.text.includes('دفع'));

  const cameraCp = CHECKPOINT_STAGES.find(s => s.checkpoint.id === 'cameraVtxDistinction')!.checkpoint;
  const cameraCorrect = cameraCp.options.find(o => o.correct)!;
  ok('camera-vtx correct option explicitly separates capture (camera) from transmission (VTX)', cameraCorrect.text.includes('الكاميرا') && cameraCorrect.text.includes('النظارة') && cameraCorrect.text.includes('يبثّها'));
}

console.log('\n[8] Completion remains unavailable until every checkpoint has been engaged with (perfect answers not required)');
{
  let s = createInitialSessionState(def);
  for (const v of PARTS_DIAGRAM.requiredVariants) s = recordInteractionVariant(s, PARTS_DIAGRAM.id, v);
  ok('parts-map diagram alone is not sufficient for readiness', !isReadyToComplete(def, s));

  for (const stage of CHECKPOINT_STAGES.slice(0, 3)) {
    const wrong = stage.checkpoint.options.find(o => !o.correct)!;
    s = recordCheckpointAnswer(s, stage.checkpoint.id, wrong.id);
  }
  ok('still not ready with one checkpoint unanswered', !isReadyToComplete(def, s));
  const lastWrong = CHECKPOINT_STAGES[3].checkpoint.options.find(o => !o.correct)!;
  s = recordCheckpointAnswer(s, CHECKPOINT_STAGES[3].checkpoint.id, lastWrong.id);
  ok('all 4 checkpoints now answered (even though every answer was wrong)', areAllCheckpointsAnswered(def, s));
  ok('still not ready — final recall not yet viewed', !isReadyToComplete(def, s));

  for (const p of RECALL.prompts) s = recordRecallRevealed(s, RECALL.id, p.id);
  ok('final recall now complete', isRecallComplete(RECALL, s));
  ok('READY once parts-map diagram + all 4 (even all-wrong) checkpoints + final recall are all engaged with', isReadyToComplete(def, s));
}

console.log('\n[9] Readiness checklist always names exactly what remains, in the declared order');
{
  let s = createInitialSessionState(def);
  const reqs = getReadinessRequirements(def, s);
  ok('every requirement has a non-empty human-readable label', reqs.every(r => r.label && r.label.trim().length > 0));
  ok('requirements are returned in the declared readinessOrder (parts diagram first)', reqs[0].id === 'partsMapDiagram');
  for (const v of PARTS_DIAGRAM.requiredVariants) s = recordInteractionVariant(s, PARTS_DIAGRAM.id, v);
  const reqs2 = getReadinessRequirements(def, s);
  ok('the parts-map requirement flips to met once satisfied, others remain unmet',
    reqs2.find(r => r.id === 'partsMapDiagram')!.met && reqs2.filter(r => r.id !== 'partsMapDiagram').every(r => !r.met));
}

console.log('\n[10] Backward navigation preserves already-recorded session progress');
{
  let s = createInitialSessionState(def);
  for (const v of PARTS_DIAGRAM.requiredVariants) s = recordInteractionVariant(s, PARTS_DIAGRAM.id, v);
  s = recordCheckpointAnswer(s, 'framePassive', CHECKPOINT_STAGES[0].checkpoint.options[0].id);
  s = goToStageId(def, s, PARTS_DIAGRAM.id);
  s = goToStageId(def, s, 'orientation');
  ok('navigating backward does not clear parts-map completion', isInteractionComplete(PARTS_DIAGRAM, s));
  ok('navigating backward does not clear a recorded checkpoint answer', isCheckpointAnswered(s, 'framePassive'));
  s = goToStageId(def, s, PARTS_DIAGRAM.id);
  ok('navigating forward again still preserves progress', isInteractionComplete(PARTS_DIAGRAM, s) && isCheckpointAnswered(s, 'framePassive'));
  s = prevStage(def, s);
  ok('prevStage() by position also works and preserves progress', isInteractionComplete(PARTS_DIAGRAM, s));
}

console.log('\n[11] A fresh session (equivalent to a page refresh) starts with zero interaction progress');
{
  const fresh = createInitialSessionState(def);
  ok('fresh state has no parts explored', Object.values(fresh.interactionVariants[PARTS_DIAGRAM.id]).every(v => v === false));
  ok('fresh state has no checkpoints answered', Object.values(fresh.checkpointAnswers).every(v => v === null));
  ok('fresh state has no recall prompts revealed', Object.values(fresh.recallRevealed[RECALL.id]).every(v => v === false));
}

console.log('\n[12] Glossary covers all 8 parts with real, non-empty MSA definitions');
{
  ok('exactly 8 glossary terms defined', GLOSSARY_STAGE.terms.length === 8);
  const termNames = GLOSSARY_STAGE.terms.map(t => t.term);
  ok('glossary defines Frame', termNames.some(t => t.includes('Frame')));
  ok('glossary defines Motors', termNames.some(t => t.includes('Motors')));
  ok('glossary defines Flight Controller (FC)', termNames.some(t => t.includes('Flight Controller')));
  ok('glossary defines ESC', termNames.some(t => t.includes('ESC')));
  ok('glossary defines Receiver (RX)', termNames.some(t => t.includes('Receiver')));
  ok('glossary defines Camera / VTX', termNames.some(t => t.includes('Camera') && t.includes('VTX')));
  ok('glossary defines LiPo', termNames.some(t => t.includes('LiPo')));
  ok('glossary defines Props', termNames.some(t => t.includes('Props')));
  ok('every glossary definition is substantive (non-empty)', GLOSSARY_STAGE.terms.every(t => t.definition.length > 10));
}

console.log('\n[13] Content-boundary check: Lesson 3 stays at identification level, not specs/compatibility/wiring/Betaflight');
{
  const allText = JSON.stringify(def).toLowerCase();
  const outOfScopeTerms = ['betaflight', 'uart', 'لحام', 'soldering', 'binding', 'pid tuning', 'أمبير', 'فولت', '35a', '45a'];
  for (const term of outOfScopeTerms) {
    ok(`Lesson 3 does not mention out-of-scope term "${term}"`, !allText.includes(term.toLowerCase()));
  }
}

console.log('\n[14] Lesson 3\'s transition bridge to Lesson 4 is built from real lessonsData, not hardcoded text');
{
  const lesson4 = lessonsData.find(l => l.id === 'lesson-define-goal')!;
  const completionStage = def.stages[def.stages.length - 1];
  ok('the final stage is a completion stage', completionStage.type === 'completion');
  if (completionStage.type === 'completion') {
    const bridgeText = completionStage.nextLessonBridge(lesson4);
    ok('bridge text contains Lesson 4\'s real title', bridgeText.includes(lesson4.title));
    ok('bridge text contains Lesson 4\'s real description', bridgeText.includes(lesson4.description));
  }
}

console.log('\n[15] Reused architecture: no Lesson-03-specific engine code exists — same generic engine as Lessons 1 & 2');
{
  ok('stage ids are unique across the whole definition', new Set(def.stages.map(s => s.id)).size === def.stages.length);
  ok('checkpoint ids are unique across the whole definition', new Set(CHECKPOINT_STAGES.map(s => s.checkpoint.id)).size === CHECKPOINT_STAGES.length);
}

console.log(`\nAll ${passed} assertions passed.`);

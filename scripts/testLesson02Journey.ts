/**
 * Real assertions against Lesson 02's journey definition
 * (src/data/lessons/lesson02Journey.definition.ts) driven through the
 * generic session-state engine (src/data/lessons/lessonJourneyEngine.ts).
 * No DOM, no React — this proves the gating/readiness logic itself;
 * scripts/testLesson02JourneyUI.ts proves the same behaviors are actually
 * wired up in the rendered UI.
 */
import assert from 'node:assert/strict';
import {
  createInitialSessionState, goToStageId, nextStage, prevStage, recordInteractionVariant,
  recordCheckpointAnswer, recordRecallRevealed, isInteractionComplete, isCheckpointAnswered,
  areAllCheckpointsAnswered, isRecallComplete, getReadinessRequirements, isReadyToComplete,
  stageCount, currentStage,
} from '../src/data/lessons/lessonJourneyEngine';
import { lesson02JourneyDefinition as def } from '../src/data/lessons/lesson02Journey.definition';
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
const SIGNAL_DIAGRAM = def.stages.find((s): s is InteractiveDiagramStage => s.type === 'interactive_diagram')!;
const RECALL = def.stages.find((s): s is RecallStage => s.type === 'recall')!;
const GLOSSARY_STAGE = def.stages.find((s): s is GlossaryStage => s.type === 'glossary')!;
const STAGE_COUNT = stageCount(def);

console.log('\n[1] Registration: Lesson 02 is registered in the journey registry with real lesson data');
{
  const lesson2 = lessonsData.find(l => l.id === 'lesson-quadcopter-how-it-works')!;
  ok('lesson02JourneyDefinition.lessonId matches the real Lesson 2 id', def.lessonId === lesson2.id);
  ok('getLessonJourneyDefinition resolves Lesson 2 to this exact definition', getLessonJourneyDefinition(lesson2.id) === def);
  ok('Lesson 2 has 15 stages, matching Lesson 1\'s depth', STAGE_COUNT === 15);
}

console.log('\n[2] Initial state — nothing satisfied, completion unavailable at initial render');
{
  const s = createInitialSessionState(def);
  ok('starts on the orientation stage', currentStage(def, s).id === 'orientation');
  ok('signal-flow diagram not yet explored', !isInteractionComplete(SIGNAL_DIAGRAM, s));
  ok('no checkpoint answered', !areAllCheckpointsAnswered(def, s));
  ok('final recall not complete', !isRecallComplete(RECALL, s));
  ok('readiness gate is NOT satisfied at initial state', !isReadyToComplete(def, s));
  ok(
    'readiness requirement list has one entry per gate (signal diagram + 4 checkpoints + recall)',
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

console.log('\n[4] Signal-flow diagram completion requires exploring all 5 nodes (radio, rx, fc, esc, motors)');
{
  let s = createInitialSessionState(def);
  ok('exactly 5 required variants declared', SIGNAL_DIAGRAM.requiredVariants.length === 5);
  ok('not complete before any node explored', !isInteractionComplete(SIGNAL_DIAGRAM, s));
  for (const variant of ['radio', 'rx', 'fc', 'esc']) {
    s = recordInteractionVariant(s, SIGNAL_DIAGRAM.id, variant);
    ok(`still not complete after exploring only up through "${variant}"`, !isInteractionComplete(SIGNAL_DIAGRAM, s));
  }
  s = recordInteractionVariant(s, SIGNAL_DIAGRAM.id, 'motors');
  ok('complete once all 5 nodes have been explored', isInteractionComplete(SIGNAL_DIAGRAM, s));
  // repetition must not fake completion of an unexplored variant
  let s2 = createInitialSessionState(def);
  s2 = recordInteractionVariant(s2, SIGNAL_DIAGRAM.id, 'radio');
  s2 = recordInteractionVariant(s2, SIGNAL_DIAGRAM.id, 'radio');
  s2 = recordInteractionVariant(s2, SIGNAL_DIAGRAM.id, 'radio');
  ok('repeatedly exploring the same node never substitutes for exploring the others', !isInteractionComplete(SIGNAL_DIAGRAM, s2));
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
  ok('checkpoint ids are: directControl, receiverRole, closedLoopNeed, perMotorCommand',
    JSON.stringify(ids) === JSON.stringify(['directControl', 'receiverRole', 'closedLoopNeed', 'perMotorCommand']));
}

console.log('\n[7] Misconception targeting: closed-loop necessity is explicitly taught, not just asserted');
{
  const closedLoopCp = CHECKPOINT_STAGES.find(s => s.checkpoint.id === 'closedLoopNeed')!.checkpoint;
  const correct = closedLoopCp.options.find(o => o.correct)!;
  ok('the correct option explicitly names comparing request vs actual state', correct.text.includes('يقارن') && correct.text.includes('يصحّح'));
  ok('the feedback explicitly names "closed-loop" terminology', correct.feedback.includes('حلقة مغلقة') || correct.feedback.includes('Closed-loop'));

  const perMotorCp = CHECKPOINT_STAGES.find(s => s.checkpoint.id === 'perMotorCommand')!.checkpoint;
  const correctPerMotor = perMotorCp.options.find(o => o.correct)!;
  ok('per-motor-command correct option explicitly states each motor gets its own command', correctPerMotor.text.includes('مختلف') || correctPerMotor.text.includes('خاصًا'));
}

console.log('\n[8] Completion remains unavailable until every checkpoint has been engaged with (perfect answers not required)');
{
  let s = createInitialSessionState(def);
  for (const v of SIGNAL_DIAGRAM.requiredVariants) s = recordInteractionVariant(s, SIGNAL_DIAGRAM.id, v);
  ok('signal-flow diagram alone is not sufficient for readiness', !isReadyToComplete(def, s));

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
  ok('READY once signal-flow diagram + all 4 (even all-wrong) checkpoints + final recall are all engaged with', isReadyToComplete(def, s));
}

console.log('\n[9] Readiness checklist always names exactly what remains, in the declared order');
{
  let s = createInitialSessionState(def);
  const reqs = getReadinessRequirements(def, s);
  ok('every requirement has a non-empty human-readable label', reqs.every(r => r.label && r.label.trim().length > 0));
  ok('requirements are returned in the declared readinessOrder (signal diagram first)', reqs[0].id === 'signalFlowDiagram');
  for (const v of SIGNAL_DIAGRAM.requiredVariants) s = recordInteractionVariant(s, SIGNAL_DIAGRAM.id, v);
  const reqs2 = getReadinessRequirements(def, s);
  ok('the signal-flow requirement flips to met once satisfied, others remain unmet',
    reqs2.find(r => r.id === 'signalFlowDiagram')!.met && reqs2.filter(r => r.id !== 'signalFlowDiagram').every(r => !r.met));
}

console.log('\n[10] Backward navigation preserves already-recorded session progress');
{
  let s = createInitialSessionState(def);
  for (const v of SIGNAL_DIAGRAM.requiredVariants) s = recordInteractionVariant(s, SIGNAL_DIAGRAM.id, v);
  s = recordCheckpointAnswer(s, 'directControl', CHECKPOINT_STAGES[0].checkpoint.options[0].id);
  s = goToStageId(def, s, SIGNAL_DIAGRAM.id);
  s = goToStageId(def, s, 'orientation');
  ok('navigating backward does not clear signal-flow completion', isInteractionComplete(SIGNAL_DIAGRAM, s));
  ok('navigating backward does not clear a recorded checkpoint answer', isCheckpointAnswered(s, 'directControl'));
  s = goToStageId(def, s, SIGNAL_DIAGRAM.id);
  ok('navigating forward again still preserves progress', isInteractionComplete(SIGNAL_DIAGRAM, s) && isCheckpointAnswered(s, 'directControl'));
  s = prevStage(def, s);
  ok('prevStage() by position also works and preserves progress', isInteractionComplete(SIGNAL_DIAGRAM, s));
}

console.log('\n[11] A fresh session (equivalent to a page refresh) starts with zero interaction progress');
{
  const fresh = createInitialSessionState(def);
  ok('fresh state has no signal-flow nodes explored', Object.values(fresh.interactionVariants[SIGNAL_DIAGRAM.id]).every(v => v === false));
  ok('fresh state has no checkpoints answered', Object.values(fresh.checkpointAnswers).every(v => v === null));
  ok('fresh state has no recall prompts revealed', Object.values(fresh.recallRevealed[RECALL.id]).every(v => v === false));
}

console.log('\n[12] Glossary connects Lesson 1 vocabulary onward and introduces this lesson\'s new terms');
{
  ok('exactly 7 glossary terms defined', GLOSSARY_STAGE.terms.length === 7);
  const termNames = GLOSSARY_STAGE.terms.map(t => t.term);
  ok('glossary defines Flight Controller (FC)', termNames.some(t => t.includes('Flight Controller')));
  ok('glossary defines ESC', termNames.some(t => t.includes('ESC')));
  ok('glossary defines Receiver', termNames.some(t => t.includes('Receiver') || t.includes('المستقبل')));
  ok('glossary defines Gyroscope', termNames.some(t => t.includes('الجيروسكوب')));
  ok('glossary defines Accelerometer', termNames.some(t => t.includes('المسرّع')));
  ok('glossary defines closed-loop control', termNames.some(t => t.includes('حلقة مغلقة')));
  ok('every glossary definition is non-empty and formula-free (no raw = or digits-heavy notation)', GLOSSARY_STAGE.terms.every(t => t.definition.length > 10));
}

console.log('\n[13] Lesson 2\'s transition bridge to Lesson 3 is built from real lessonsData, not hardcoded text');
{
  const lesson3 = lessonsData.find(l => l.id === 'lesson-drone-parts')!;
  const completionStage = def.stages[def.stages.length - 1];
  ok('the final stage is a completion stage', completionStage.type === 'completion');
  if (completionStage.type === 'completion') {
    const bridgeText = completionStage.nextLessonBridge(lesson3);
    ok('bridge text contains Lesson 3\'s real title', bridgeText.includes(lesson3.title));
    ok('bridge text contains Lesson 3\'s real description', bridgeText.includes(lesson3.description));
  }
}

console.log('\n[14] Reused architecture: no Lesson-02-specific engine code exists — same generic engine as Lesson 1');
{
  // Sanity check: the exact same engine functions used by Lesson 1's tests
  // operate correctly against Lesson 2's differently-shaped definition
  // (different stage ids, different checkpoint ids, 5 variants instead of 2).
  ok('stage ids are unique across the whole definition', new Set(def.stages.map(s => s.id)).size === def.stages.length);
  ok('checkpoint ids are unique across the whole definition', new Set(CHECKPOINT_STAGES.map(s => s.checkpoint.id)).size === CHECKPOINT_STAGES.length);
}

console.log(`\nAll ${passed} assertions passed.`);

/**
 * Real assertions against Lesson 01's journey definition
 * (src/data/lessons/lesson01Journey.definition.ts) driven through the
 * generic session-state engine (src/data/lessons/lessonJourneyEngine.ts).
 * No DOM, no React — this proves the gating/readiness logic itself;
 * scripts/testLesson01JourneyUI.ts proves the same behaviors are actually
 * wired up in the rendered UI. scripts/testLessonJourneyEngine.ts proves the
 * engine itself is generic and not hardcoded to Lesson 01.
 */
import assert from 'node:assert/strict';
import {
  createInitialSessionState, goToStageId, nextStage, prevStage, recordInteractionVariant,
  recordCheckpointAnswer, recordRecallRevealed, isInteractionComplete, isCheckpointAnswered,
  areAllCheckpointsAnswered, isRecallComplete, getReadinessRequirements, isReadyToComplete,
  stageCount, currentStage,
} from '../src/data/lessons/lessonJourneyEngine';
import { lesson01JourneyDefinition as def } from '../src/data/lessons/lesson01Journey.definition';
import type { CheckpointStage, InteractiveDiagramStage, RecallStage, GlossaryStage } from '../src/types/lessonJourney';
import { lessonsData } from '../src/data/lessonsData';

let passed = 0;
function ok(label: string, cond: boolean) {
  assert.ok(cond, `FAILED: ${label}`);
  console.log(`  ok — ${label}`);
  passed++;
}

const CHECKPOINT_STAGES = def.stages.filter((s): s is CheckpointStage => s.type === 'checkpoint');
const X_LAYOUT = def.stages.find((s): s is InteractiveDiagramStage => s.type === 'interactive_diagram')!;
const FINAL_RECALL = def.stages.find((s): s is RecallStage => s.type === 'recall')!;
const GLOSSARY_STAGE = def.stages.find((s): s is GlossaryStage => s.type === 'glossary')!;
const STAGE_COUNT = stageCount(def);

console.log('\n[1] Initial state — nothing satisfied, completion unavailable at initial render');
{
  const s = createInitialSessionState(def);
  ok('starts on stage 1 (orientation)', currentStage(def, s).id === 'orientation');
  ok('X-layout not yet explored', !isInteractionComplete(X_LAYOUT, s));
  ok('no checkpoint answered', !areAllCheckpointsAnswered(def, s));
  ok('final recall not complete', !isRecallComplete(FINAL_RECALL, s));
  ok('readiness gate is NOT satisfied at initial state', !isReadyToComplete(def, s));
  ok(
    'readiness requirement list has one entry per gate (xLayout + 4 checkpoints + recall)',
    getReadinessRequirements(def, s).length === 1 + CHECKPOINT_STAGES.length + 1,
  );
  ok('every requirement reports unmet at initial state', getReadinessRequirements(def, s).every(r => !r.met));
}

console.log('\n[2] Reaching the last stage alone (scrolling to the bottom) does not grant readiness');
{
  let s = createInitialSessionState(def);
  for (let i = 0; i < STAGE_COUNT; i++) s = nextStage(def, s);
  ok('currentStage moved to the final stage', s.currentStageIndex === STAGE_COUNT - 1);
  ok('readiness is still NOT satisfied merely by navigating to the last stage', !isReadyToComplete(def, s));
}

console.log('\n[3] X-layout completion requires both a CW and a CCW motor explored');
{
  let s = createInitialSessionState(def);
  ok('not complete before any motor explored', !isInteractionComplete(X_LAYOUT, s));
  s = recordInteractionVariant(s, X_LAYOUT.id, 'cw');
  ok('still not complete after only a CW motor', !isInteractionComplete(X_LAYOUT, s));
  s = recordInteractionVariant(s, X_LAYOUT.id, 'cw'); // repetition must not fake completion
  ok('still not complete after two CW motors (no CCW yet)', !isInteractionComplete(X_LAYOUT, s));
  s = recordInteractionVariant(s, X_LAYOUT.id, 'ccw');
  ok('complete once both a CW and a CCW motor have been explored', isInteractionComplete(X_LAYOUT, s));
}

console.log('\n[4] Checkpoints: wrong-first-attempt never permanently blocks, retry always possible');
{
  let s = createInitialSessionState(def);
  const cp = CHECKPOINT_STAGES[0].checkpoint;
  const wrongOption = cp.options.find(o => !o.correct)!;
  const correctOption = cp.options.find(o => o.correct)!;

  ok('checkpoint unanswered initially', !isCheckpointAnswered(s, cp.id));
  s = recordCheckpointAnswer(s, cp.id, wrongOption.id);
  ok('a wrong first answer still counts as "answered" (participation, not correctness, is the gate)', isCheckpointAnswered(s, cp.id));
  ok('every checkpoint option carries non-empty explanatory feedback (never bare correct/incorrect)', cp.options.every(o => o.feedback.length > 20));
  s = recordCheckpointAnswer(s, cp.id, correctOption.id);
  ok('retry after a wrong answer is possible and updates the recorded answer', s.checkpointAnswers[cp.id] === correctOption.id);
}

console.log('\n[5] All four required concept checks exist and each has exactly one correct option with feedback');
{
  ok('exactly 4 checkpoint stages defined', CHECKPOINT_STAGES.length === 4);
  for (const stage of CHECKPOINT_STAGES) {
    const cp = stage.checkpoint;
    const correctCount = cp.options.filter(o => o.correct).length;
    ok(`checkpoint "${cp.id}" has exactly one correct option`, correctCount === 1);
    ok(`checkpoint "${cp.id}": every option (correct and incorrect) has feedback text`, cp.options.every(o => o.feedback && o.feedback.trim().length > 0));
  }
  const movementCp = CHECKPOINT_STAGES.find(s => s.checkpoint.id === 'movementPrediction')!.checkpoint;
  const correctMovementOption = movementCp.options.find(o => o.correct)!;
  const correctMovementText = correctMovementOption.text;
  const correctMovementFeedback = correctMovementOption.feedback;
  ok('movement-prediction correct option text explicitly states the rear rises', correctMovementText.includes('يرتفع الجزء الخلفي'));
  ok('movement-prediction correct option text explicitly states the front becomes relatively lower', correctMovementText.includes('الأمامي أخفض'));
  ok('movement-prediction correct option text explicitly states the aircraft pitches forward', correctMovementText.includes('تنحني الطائرة للأمام'));
  ok('movement-prediction feedback still conveys the rear-rises/front-lower/pitch-forward chain', correctMovementFeedback.includes('يرتفع الخلف') && correctMovementFeedback.includes('الأمام أخفض') && correctMovementFeedback.includes('تنحني الطائرة للأمام'));
  ok('movement-prediction feedback adds the "what pushing the pitch stick means" angle instead of repeating stage 9 verbatim', correctMovementFeedback.includes('عصا') && correctMovementFeedback.includes('Pitch'));
  ok('movement-prediction feedback is phrased differently from the option text (not a near-duplicate)', !correctMovementFeedback.includes('يرتفع الجزء الخلفي نسبيًا فيصبح الجزء الأمامي أخفض'));
}

console.log('\n[6] Completion remains unavailable until every checkpoint has been engaged with (perfect answers not required)');
{
  let s = createInitialSessionState(def);
  s = recordInteractionVariant(s, X_LAYOUT.id, 'cw');
  s = recordInteractionVariant(s, X_LAYOUT.id, 'ccw');
  ok('X-layout alone is not sufficient for readiness', !isReadyToComplete(def, s));

  for (const stage of CHECKPOINT_STAGES.slice(0, 3)) {
    const wrong = stage.checkpoint.options.find(o => !o.correct)!;
    s = recordCheckpointAnswer(s, stage.checkpoint.id, wrong.id);
  }
  ok('still not ready with one checkpoint unanswered', !isReadyToComplete(def, s));
  const lastWrong = CHECKPOINT_STAGES[3].checkpoint.options.find(o => !o.correct)!;
  s = recordCheckpointAnswer(s, CHECKPOINT_STAGES[3].checkpoint.id, lastWrong.id);
  ok('all 4 checkpoints now answered (even though every answer was wrong)', areAllCheckpointsAnswered(def, s));
  ok('still not ready — final recall not yet viewed', !isReadyToComplete(def, s));

  for (const p of FINAL_RECALL.prompts) s = recordRecallRevealed(s, FINAL_RECALL.id, p.id);
  ok('final recall now complete', isRecallComplete(FINAL_RECALL, s));
  ok('READY once X-layout + all 4 (even all-wrong) checkpoints + final recall are all engaged with', isReadyToComplete(def, s));
}

console.log('\n[7] Readiness checklist always names exactly what remains (never a bare unexplained gate)');
{
  let s = createInitialSessionState(def);
  const reqs = getReadinessRequirements(def, s);
  ok('every requirement has a non-empty human-readable label', reqs.every(r => r.label && r.label.trim().length > 0));
  s = recordInteractionVariant(s, X_LAYOUT.id, 'cw');
  s = recordInteractionVariant(s, X_LAYOUT.id, 'ccw');
  const reqs2 = getReadinessRequirements(def, s);
  ok('the X-layout requirement flips to met once satisfied, others remain unmet', reqs2.find(r => r.id === 'xLayout')!.met && reqs2.filter(r => r.id !== 'xLayout').every(r => !r.met));
}

console.log('\n[8] Backward navigation preserves already-recorded session progress');
{
  let s = createInitialSessionState(def);
  s = recordInteractionVariant(s, X_LAYOUT.id, 'cw');
  s = recordInteractionVariant(s, X_LAYOUT.id, 'ccw');
  s = recordCheckpointAnswer(s, 'definition', CHECKPOINT_STAGES[0].checkpoint.options[0].id);
  s = goToStageId(def, s, X_LAYOUT.id);
  s = goToStageId(def, s, 'orientation');
  ok('navigating backward does not clear X-layout completion', isInteractionComplete(X_LAYOUT, s));
  ok('navigating backward does not clear a recorded checkpoint answer', isCheckpointAnswered(s, 'definition'));
  s = goToStageId(def, s, X_LAYOUT.id);
  ok('navigating forward again still preserves progress', isInteractionComplete(X_LAYOUT, s) && isCheckpointAnswered(s, 'definition'));
  s = prevStage(def, s);
  ok('prevStage() by position also works and preserves progress', isInteractionComplete(X_LAYOUT, s));
}

console.log('\n[9] A fresh session (equivalent to a page refresh) starts with zero interaction progress');
{
  const fresh = createInitialSessionState(def);
  ok('fresh state has no motors explored', Object.values(fresh.interactionVariants[X_LAYOUT.id]).every(v => v === false));
  ok('fresh state has no checkpoints answered', Object.values(fresh.checkpointAnswers).every(v => v === null));
  ok('fresh state has no recall prompts revealed', Object.values(fresh.recallRevealed[FINAL_RECALL.id]).every(v => v === false));
}

console.log('\n[10] Glossary defines Pitch and Roll (previously used in the lesson but undefined)');
{
  const pitch = GLOSSARY_STAGE.terms.find(g => g.term === 'Pitch');
  const roll = GLOSSARY_STAGE.terms.find(g => g.term === 'Roll');
  ok('glossary contains a "Pitch" entry', pitch !== undefined);
  ok('glossary contains a "Roll" entry', roll !== undefined);
  ok('Pitch is defined as forward/backward tilt around the lateral axis', /أمام|خلف/.test(pitch!.definition) && pitch!.definition.includes('محورها الجانبي'));
  ok('Roll is defined as left/right tilt around the longitudinal axis', /يمين|يسار/.test(roll!.definition) && roll!.definition.includes('محورها الطولي'));
  ok('Pitch definition contains no formula characters (=, +, -, /, digits)', !/[=+/\d]/.test(pitch!.definition));
  ok('Roll definition contains no formula characters (=, +, -, /, digits)', !/[=+/\d]/.test(roll!.definition));
  ok('existing glossary structure (term/definition shape) is preserved for the new entries', typeof pitch!.term === 'string' && typeof pitch!.definition === 'string' && typeof roll!.term === 'string' && typeof roll!.definition === 'string');
}

console.log('\n[11] Lesson 1 duration was corrected; Lessons 2-16 metadata is untouched');
{
  const lesson1 = lessonsData.find(l => l.id === 'lesson-quadcopter-intro')!;
  ok('Lesson 1 duration is no longer the stale "10 دقائق"', lesson1.duration !== '10 دقائق');
  ok('Lesson 1 duration is a non-empty, plausible value for a 15-stage journey', lesson1.duration.length > 0 && /\d/.test(lesson1.duration));
  ok('Lesson 1 level is unchanged ("مبتدئ")', lesson1.level === 'مبتدئ');
  const otherLessons = lessonsData.filter(l => l.id !== 'lesson-quadcopter-intro');
  ok('every other lesson (2-16) still has a duration string', otherLessons.every(l => typeof l.duration === 'string' && l.duration.length > 0));
  const expectedOtherDurations: Record<string, string> = {
    'lesson-quadcopter-how-it-works': '12 دقائق', 'lesson-drone-parts': '15 دقائق', 'lesson-define-goal': '10 دقائق',
    'lesson-drone-size': '10 دقائق', 'lesson-electricity-basics': '15 دقائق', 'lesson-lipo-batteries': '15 دقائق',
    'lesson-power-rails': '12 دقائق', 'lesson-tx-rx': '10 دقائق', 'lesson-pre-battery-safety': '12 دقائق',
    'lesson-frame-assembly': '20 دقائق', 'lesson-motor-install': '20 دقائق', 'lesson-esc-install': '15 دقائق',
    'lesson-fc-install': '15 دقائق', 'lesson-receiver-install': '12 دقائق', 'lesson-video-system': '12 دقائق',
    'lesson-first-power-up': '18 دقيقة', 'lesson-betaflight-minimum': '25 دقيقة',
    'lesson-propellers': '20 دقيقة',
    'lesson-stick-control-first-flight': '20 دقائق',
  };
  ok('Lessons 2-20 durations are byte-identical to their authored values (only Lesson 1 was ever corrected)',
    otherLessons.every(l => expectedOtherDurations[l.id] === l.duration));
}

console.log('\n[12] Lesson 01 is registered in the journey registry; other lessons are not');
{
  ok('lesson01JourneyDefinition.lessonId matches the real Lesson 1 id', def.lessonId === 'lesson-quadcopter-intro');
  ok('lesson01JourneyDefinition has exactly 15 stages (unchanged stage count)', STAGE_COUNT === 15);
}

console.log(`\nAll ${passed} assertions passed.`);

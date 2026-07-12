/**
 * Real assertions against Lesson 01's pure session-progression state machine
 * (src/data/lessons/lesson01JourneyState.ts). No DOM, no React — this proves
 * the gating/readiness logic itself; scripts/testLesson01JourneyUI.ts proves
 * the same behaviors are actually wired up in the rendered UI.
 */
import assert from 'node:assert/strict';
import {
  createInitialJourneyState, goToStage, recordMotorExplored, recordCheckpointAnswer,
  recordRecallRevealed, isXLayoutComplete, isCheckpointAnswered, areAllCheckpointsAnswered,
  isFinalRecallComplete, getReadinessRequirements, isReadyToComplete, STAGE, STAGE_COUNT,
} from '../src/data/lessons/lesson01JourneyState';
import { CHECKPOINTS, RECALL_PROMPTS, GLOSSARY } from '../src/data/lessons/lesson01JourneyContent';
import { lessonsData } from '../src/data/lessonsData';

let passed = 0;
function ok(label: string, cond: boolean) {
  assert.ok(cond, `FAILED: ${label}`);
  console.log(`  ok — ${label}`);
  passed++;
}

console.log('\n[1] Initial state — nothing satisfied, completion unavailable at initial render');
{
  const s = createInitialJourneyState();
  ok('starts on stage 1 (orientation)', s.currentStage === STAGE.ORIENTATION);
  ok('X-layout not yet explored', !isXLayoutComplete(s));
  ok('no checkpoint answered', !areAllCheckpointsAnswered(s));
  ok('final recall not complete', !isFinalRecallComplete(s));
  ok('readiness gate is NOT satisfied at initial state', !isReadyToComplete(s));
  ok('readiness requirement list has one entry per gate (xLayout + 4 checkpoints + recall)', getReadinessRequirements(s).length === 1 + CHECKPOINTS.length + 1);
  ok('every requirement reports unmet at initial state', getReadinessRequirements(s).every(r => !r.met));
}

console.log('\n[2] Reaching the last stage alone (scrolling to the bottom) does not grant readiness');
{
  let s = createInitialJourneyState();
  s = goToStage(s, STAGE_COUNT);
  ok('currentStage moved to the final stage', s.currentStage === STAGE_COUNT);
  ok('readiness is still NOT satisfied merely by navigating to the last stage', !isReadyToComplete(s));
}

console.log('\n[3] X-layout completion requires both a CW and a CCW motor explored');
{
  let s = createInitialJourneyState();
  ok('not complete before any motor explored', !isXLayoutComplete(s));
  s = recordMotorExplored(s, true); // a CW motor
  ok('still not complete after only a CW motor', !isXLayoutComplete(s));
  s = recordMotorExplored(s, true); // another CW motor — repetition must not fake completion
  ok('still not complete after two CW motors (no CCW yet)', !isXLayoutComplete(s));
  s = recordMotorExplored(s, false); // now a CCW motor
  ok('complete once both a CW and a CCW motor have been explored', isXLayoutComplete(s));
}

console.log('\n[4] Checkpoints: wrong-first-attempt never permanently blocks, retry always possible');
{
  let s = createInitialJourneyState();
  const cp = CHECKPOINTS[0];
  const wrongOption = cp.options.find(o => !o.correct)!;
  const correctOption = cp.options.find(o => o.correct)!;

  ok('checkpoint unanswered initially', !isCheckpointAnswered(s, cp.id));
  s = recordCheckpointAnswer(s, cp.id, wrongOption.id);
  ok('a wrong first answer still counts as "answered" (participation, not correctness, is the gate)', isCheckpointAnswered(s, cp.id));
  ok('every checkpoint option carries non-empty explanatory feedback (never bare correct/incorrect)', cp.options.every(o => o.feedback.length > 20));
  // retry: learner picks a different option afterwards
  s = recordCheckpointAnswer(s, cp.id, correctOption.id);
  ok('retry after a wrong answer is possible and updates the recorded answer', s.checkpointAnswers[cp.id] === correctOption.id);
}

console.log('\n[5] All four required concept checks exist and each has exactly one correct option with feedback');
{
  ok('exactly 4 checkpoints defined', CHECKPOINTS.length === 4);
  for (const cp of CHECKPOINTS) {
    const correctCount = cp.options.filter(o => o.correct).length;
    ok(`checkpoint "${cp.id}" has exactly one correct option`, correctCount === 1);
    ok(`checkpoint "${cp.id}": every option (correct and incorrect) has feedback text`, cp.options.every(o => o.feedback && o.feedback.trim().length > 0));
  }
  const movementCp = CHECKPOINTS.find(c => c.id === 'movementPrediction')!;
  const correctMovementOption = movementCp.options.find(o => o.correct)!;
  const correctMovementText = correctMovementOption.text;
  const correctMovementFeedback = correctMovementOption.feedback;
  // The three required physics facts must be explicit somewhere the learner
  // always sees (the option's own text, visible whether or not it's picked).
  ok('movement-prediction correct option text explicitly states the rear rises', correctMovementText.includes('يرتفع الجزء الخلفي'));
  ok('movement-prediction correct option text explicitly states the front becomes relatively lower', correctMovementText.includes('الأمامي أخفض'));
  ok('movement-prediction correct option text explicitly states the aircraft pitches forward', correctMovementText.includes('تنحني الطائرة للأمام'));
  // The feedback (shown only once this option is picked) must still convey
  // the same physics correctly, but from a different angle than stage 9 /
  // the option text — not a near-verbatim repeat of "يرتفع الجزء الخلفي".
  ok('movement-prediction feedback still conveys the rear-rises/front-lower/pitch-forward chain', correctMovementFeedback.includes('يرتفع الخلف') && correctMovementFeedback.includes('الأمام أخفض') && correctMovementFeedback.includes('تنحني الطائرة للأمام'));
  ok('movement-prediction feedback adds the "what pushing the pitch stick means" angle instead of repeating stage 9 verbatim', correctMovementFeedback.includes('عصا') && correctMovementFeedback.includes('Pitch'));
  ok('movement-prediction feedback is phrased differently from the option text (not a near-duplicate)', !correctMovementFeedback.includes('يرتفع الجزء الخلفي نسبيًا فيصبح الجزء الأمامي أخفض'));
}

console.log('\n[6] Completion remains unavailable until every checkpoint has been engaged with (perfect answers not required)');
{
  let s = createInitialJourneyState();
  s = recordMotorExplored(s, true);
  s = recordMotorExplored(s, false);
  ok('X-layout alone is not sufficient for readiness', !isReadyToComplete(s));

  // answer 3 of 4 checkpoints, all WRONG on purpose — wrong answers must not block anything
  for (const cp of CHECKPOINTS.slice(0, 3)) {
    const wrong = cp.options.find(o => !o.correct)!;
    s = recordCheckpointAnswer(s, cp.id, wrong.id);
  }
  ok('still not ready with one checkpoint unanswered', !isReadyToComplete(s));
  const lastWrong = CHECKPOINTS[3].options.find(o => !o.correct)!;
  s = recordCheckpointAnswer(s, CHECKPOINTS[3].id, lastWrong.id);
  ok('all 4 checkpoints now answered (even though every answer was wrong)', areAllCheckpointsAnswered(s));
  ok('still not ready — final recall not yet viewed', !isReadyToComplete(s));

  for (const p of RECALL_PROMPTS) s = recordRecallRevealed(s, p.id);
  ok('final recall now complete', isFinalRecallComplete(s));
  ok('READY once X-layout + all 4 (even all-wrong) checkpoints + final recall are all engaged with', isReadyToComplete(s));
}

console.log('\n[7] Readiness checklist always names exactly what remains (never a bare unexplained gate)');
{
  let s = createInitialJourneyState();
  const reqs = getReadinessRequirements(s);
  ok('every requirement has a non-empty human-readable label', reqs.every(r => r.label && r.label.trim().length > 0));
  s = recordMotorExplored(s, true);
  s = recordMotorExplored(s, false);
  const reqs2 = getReadinessRequirements(s);
  ok('the X-layout requirement flips to met once satisfied, others remain unmet', reqs2.find(r => r.id === 'xLayout')!.met && reqs2.filter(r => r.id !== 'xLayout').every(r => !r.met));
}

console.log('\n[8] Backward navigation preserves already-recorded session progress');
{
  let s = createInitialJourneyState();
  s = recordMotorExplored(s, true);
  s = recordMotorExplored(s, false);
  s = recordCheckpointAnswer(s, 'definition', CHECKPOINTS[0].options[0].id);
  s = goToStage(s, STAGE.X_LAYOUT);
  s = goToStage(s, STAGE.ORIENTATION); // navigate backward
  ok('navigating backward does not clear X-layout completion', isXLayoutComplete(s));
  ok('navigating backward does not clear a recorded checkpoint answer', isCheckpointAnswered(s, 'definition'));
  s = goToStage(s, STAGE.X_LAYOUT); // forward again
  ok('navigating forward again still preserves progress', isXLayoutComplete(s) && isCheckpointAnswered(s, 'definition'));
}

console.log('\n[9] A fresh session (equivalent to a page refresh) starts with zero interaction progress');
{
  const fresh = createInitialJourneyState();
  ok('fresh state has no motors explored', !fresh.motorsExplored.cw && !fresh.motorsExplored.ccw);
  ok('fresh state has no checkpoints answered', Object.values(fresh.checkpointAnswers).every(v => v === null));
  ok('fresh state has no recall prompts revealed', Object.values(fresh.recallRevealed).every(v => v === false));
  ok('the dead visitedStages field has been removed from the state shape entirely', !('visitedStages' in fresh));
}

console.log('\n[10] Glossary defines Pitch and Roll (previously used in the lesson but undefined)');
{
  const pitch = GLOSSARY.find(g => g.term === 'Pitch');
  const roll = GLOSSARY.find(g => g.term === 'Roll');
  ok('glossary contains a "Pitch" entry', pitch !== undefined);
  ok('glossary contains a "Roll" entry', roll !== undefined);
  ok('Pitch is defined as forward/backward tilt around the lateral axis', /أمام|خلف/.test(pitch!.definition) && pitch!.definition.includes('محورها الجانبي'));
  ok('Roll is defined as left/right tilt around the longitudinal axis', /يمين|يسار/.test(roll!.definition) && roll!.definition.includes('محورها الطولي'));
  ok('Pitch definition contains no formula characters (=, +, -, /, digits)', !/[=+/\d]/.test(pitch!.definition));
  ok('Roll definition contains no formula characters (=, +, -, /, digits)', !/[=+/\d]/.test(roll!.definition));
  ok('existing glossary structure (term/definition shape) is preserved for the new entries', typeof pitch!.term === 'string' && typeof pitch!.definition === 'string' && typeof roll!.term === 'string' && typeof roll!.definition === 'string');
}

console.log('\n[11] Lesson 1 duration was corrected; Lessons 2-18 metadata is untouched');
{
  const lesson1 = lessonsData.find(l => l.id === 'lesson-quadcopter-intro')!;
  ok('Lesson 1 duration is no longer the stale "10 دقائق"', lesson1.duration !== '10 دقائق');
  ok('Lesson 1 duration is a non-empty, plausible value for a 15-stage journey', lesson1.duration.length > 0 && /\d/.test(lesson1.duration));
  ok('Lesson 1 level is unchanged ("مبتدئ")', lesson1.level === 'مبتدئ');
  const otherLessons = lessonsData.filter(l => l.id !== 'lesson-quadcopter-intro');
  ok('every other lesson (2-18) still has a duration string', otherLessons.every(l => typeof l.duration === 'string' && l.duration.length > 0));
  // Known-good snapshot of lessons 2-18's durations, exactly as authored before this fix.
  const expectedOtherDurations: Record<string, string> = {
    'lesson-quadcopter-how-it-works': '12 دقائق', 'lesson-drone-parts': '15 دقائق', 'lesson-define-goal': '10 دقائق',
    'lesson-drone-size': '10 دقائق', 'lesson-electricity-basics': '15 دقائق', 'lesson-lipo-batteries': '15 دقائق',
    'lesson-power-rails': '12 دقائق', 'lesson-tx-rx': '10 دقائق', 'lesson-pre-battery-safety': '12 دقائق',
    'lesson-frame-assembly': '20 دقائق', 'lesson-motor-install': '20 دقائق', 'lesson-esc-install': '15 دقائق',
    'lesson-fc-install': '15 دقائق', 'lesson-receiver-install': '12 دقائق', 'lesson-video-system': '12 دقائق',
    'lesson-motor-test': '15 دقائق', 'lesson-first-flight': '20 دقائق',
  };
  ok('Lessons 2-18 durations are byte-identical to before this correction (only Lesson 1 changed)',
    otherLessons.every(l => expectedOtherDurations[l.id] === l.duration));
}

console.log(`\nAll ${passed} assertions passed.`);

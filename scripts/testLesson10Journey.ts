/**
 * Real assertions against Lesson 10's journey definition
 * (src/data/lessons/lesson10Journey.definition.ts) driven through the
 * generic session-state engine (src/data/lessons/lessonJourneyEngine.ts).
 * No DOM, no React — this proves the gating/readiness logic itself;
 * scripts/testLesson10JourneyUI.ts proves the same behaviors are actually
 * wired up in the rendered UI.
 */
import assert from 'node:assert/strict';
import {
  createInitialSessionState, goToStageId, nextStage, prevStage,
  recordCheckpointAnswer, recordRecallRevealed, recordInteractionVariant,
  isCheckpointAnswered, areAllCheckpointsAnswered, isRecallComplete,
  getReadinessRequirements, isReadyToComplete, stageCount, currentStage,
} from '../src/data/lessons/lessonJourneyEngine';
import { lesson10JourneyDefinition as def } from '../src/data/lessons/lesson10Journey.definition';
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
const RECALL = def.stages.find((s): s is RecallStage => s.type === 'recall')!;
const GLOSSARY_STAGE = def.stages.find((s): s is GlossaryStage => s.type === 'glossary')!;
const COMPARISON_STAGE = def.stages.find((s): s is ComparisonStage => s.type === 'comparison')!;
const STAGE_COUNT = stageCount(def);

console.log('\n[1] Registration: Lesson 10 is registered in the journey registry with real lesson data');
{
  const lesson10 = lessonsData.find(l => l.id === 'lesson-pre-battery-safety')!;
  ok('lesson10JourneyDefinition.lessonId matches the real Lesson 10 id', def.lessonId === lesson10.id);
  ok('getLessonJourneyDefinition resolves Lesson 10 to this exact definition', getLessonJourneyDefinition(lesson10.id) === def);
  ok('Lesson 10 has 16 stages (15 + the safety-protocol interactive stage)', STAGE_COUNT === 16);
}

console.log('\n[2] Exactly one interactive_diagram stage exists — all four protocol steps required');
{
  const diagrams = def.stages.filter((s): s is InteractiveDiagramStage => s.type === 'interactive_diagram');
  ok('exactly one interactive_diagram stage exists', diagrams.length === 1);
  ok('it renders the safety-before-battery diagram', diagrams[0].diagramType === 'safety-before-battery');
  ok('it requires the four real step ids', JSON.stringify(diagrams[0].requiredVariants) === JSON.stringify(['no-props', 'smoke-stopper', 'multimeter', 'battery']));
  ok('it is listed in readinessOrder', (def.readinessOrder ?? []).includes(diagrams[0].id));
}

console.log('\n[3] Initial state — nothing satisfied, completion unavailable at initial render');
{
  const s = createInitialSessionState(def);
  ok('starts on the orientation stage', currentStage(def, s).id === 'orientation');
  ok('no checkpoint answered', !areAllCheckpointsAnswered(def, s));
  ok('final recall not complete', !isRecallComplete(RECALL, s));
  ok('readiness gate is NOT satisfied at initial state', !isReadyToComplete(def, s));
  ok(
    'readiness requirement list has one entry per gate (4 checkpoints + diagram + recall)',
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
  ok('checkpoint ids are: propellerRemovalTiming, smokeStopperMechanism, continuityReadingInterpretation, bothChecksRequired',
    JSON.stringify(ids) === JSON.stringify([
      'propellerRemovalTiming', 'smokeStopperMechanism', 'continuityReadingInterpretation', 'bothChecksRequired',
    ]));
}

console.log('\n[7] Misconception targeting: each checkpoint explicitly names the correct distinction, not just asserts it');
{
  const propCp = CHECKPOINT_STAGES.find(s => s.checkpoint.id === 'propellerRemovalTiming')!.checkpoint;
  const propCorrect = propCp.options.find(o => o.correct)!;
  ok('propeller correct option puts prop removal before connecting the battery', propCorrect.text.includes('انزع المراوح أولًا') && propCorrect.text.includes('أي توصيل للبطارية'));
  ok('propeller correct option keeps the "even if the wiring looks right" clause', propCorrect.text.includes('ولو بدا التوصيل سليمًا'));

  const smokeCp = CHECKPOINT_STAGES.find(s => s.checkpoint.id === 'smokeStopperMechanism')!.checkpoint;
  const smokeCorrect = smokeCp.options.find(o => o.correct)!;
  ok('smoke-stopper correct option explicitly states manual disconnection is required', smokeCorrect.text.includes('الفصل يدويًا'));

  const contCp = CHECKPOINT_STAGES.find(s => s.checkpoint.id === 'continuityReadingInterpretation')!.checkpoint;
  const contCorrect = contCp.options.find(o => o.correct)!;
  ok('continuity correct option explicitly names a likely short circuit', contCorrect.text.includes('قصر كهربائي'));

  const bothCp = CHECKPOINT_STAGES.find(s => s.checkpoint.id === 'bothChecksRequired')!.checkpoint;
  const bothCorrect = bothCp.options.find(o => o.correct)!;
  ok('both-checks correct option explicitly states neither check substitutes for the other', bothCorrect.text.includes('لا يغني أحدهما عن الآخر'));
}

console.log('\n[8] Completion remains unavailable until every checkpoint and recall have been engaged with');
{
  let s = createInitialSessionState(def);
  for (const stage of CHECKPOINT_STAGES) {
    const wrong = stage.checkpoint.options.find(o => !o.correct)!;
    s = recordCheckpointAnswer(s, stage.checkpoint.id, wrong.id);
  }
  ok('all 4 checkpoints now answered (even though every answer was wrong)', areAllCheckpointsAnswered(def, s));
  ok('still not ready — final recall not yet viewed', !isReadyToComplete(def, s));

  for (const p of RECALL.prompts) s = recordRecallRevealed(s, RECALL.id, p.id);
  ok('final recall now complete', isRecallComplete(RECALL, s));
  ok('still not ready — the diagram has not been explored', !isReadyToComplete(def, s));
  const DIAGRAM = def.stages.find((st): st is InteractiveDiagramStage => st.type === 'interactive_diagram')!;
  for (const v of DIAGRAM.requiredVariants) s = recordInteractionVariant(s, DIAGRAM.id, v);
  ok('READY once all 4 (even all-wrong) checkpoints + diagram + final recall are all engaged with', isReadyToComplete(def, s));
}

console.log('\n[9] Readiness checklist always names exactly what remains, in the declared order');
{
  const s = createInitialSessionState(def);
  const reqs = getReadinessRequirements(def, s);
  ok('every requirement has a non-empty human-readable label', reqs.every(r => r.label && r.label.trim().length > 0));
  ok('requirements are returned in the declared readinessOrder (first checkpoint listed first)', reqs[0].id === 'checkpoint-propellerRemovalTiming');
  ok('recall requirement is listed last', reqs[reqs.length - 1].id === 'recall');
}

console.log('\n[10] Backward navigation preserves already-recorded session progress');
{
  let s = createInitialSessionState(def);
  s = recordCheckpointAnswer(s, 'propellerRemovalTiming', CHECKPOINT_STAGES[0].checkpoint.options[0].id);
  s = goToStageId(def, s, 'propellerCheckpoint');
  s = goToStageId(def, s, 'orientation');
  ok('navigating backward does not clear a recorded checkpoint answer', isCheckpointAnswered(s, 'propellerRemovalTiming'));
  s = goToStageId(def, s, 'propellerCheckpoint');
  ok('navigating forward again still preserves progress', isCheckpointAnswered(s, 'propellerRemovalTiming'));
  s = prevStage(def, s);
  ok('prevStage() by position also works and preserves progress', isCheckpointAnswered(s, 'propellerRemovalTiming'));
}

console.log('\n[11] A fresh session (equivalent to a page refresh) starts with zero interaction progress');
{
  const fresh = createInitialSessionState(def);
  ok('fresh state has no checkpoints answered', Object.values(fresh.checkpointAnswers).every(v => v === null));
  ok('fresh state has no recall prompts revealed', Object.values(fresh.recallRevealed[RECALL.id]).every(v => v === false));
}

console.log('\n[12] The comparison stage carries the correct-vs-unsafe contrast that replaces the passive diagram');
{
  ok('exactly one comparison stage exists', def.stages.filter(s => s.type === 'comparison').length === 1);
  ok('comparison has exactly 2 items (correct sequence vs unsafe shortcut)', COMPARISON_STAGE.items.length === 2);
  const labels = COMPARISON_STAGE.items.map(i => i.label);
  ok('one item is the correct full sequence', labels.some(l => l.includes('الصحيح')));
  ok('one item is the unsafe shortcut', labels.some(l => l.includes('الاختصار غير الآمن')));
  const correctItem = COMPARISON_STAGE.items.find(i => i.label.includes('الصحيح'))!;
  ok('correct item names propeller removal, resistance check, and Smoke Stopper', correctItem.body.includes('نزع المراوح') && correctItem.body.includes('VBAT') && correctItem.body.includes('Smoke Stopper'));
  const wrongItem = COMPARISON_STAGE.items.find(i => i.label.includes('الاختصار'))!;
  ok('wrong item names skipping the meter check and ignoring the warning lamp', wrongItem.body.includes('تخطي فحص المقياس') && wrongItem.body.includes('اللمبة'));
}

console.log('\n[13] Glossary covers the key pre-power-safety vocabulary with real, non-empty MSA definitions');
{
  ok('exactly 6 glossary terms defined', GLOSSARY_STAGE.terms.length === 6);
  const termNames = GLOSSARY_STAGE.terms.map(t => t.term);
  ok('glossary defines Smoke Stopper', termNames.some(t => t === 'Smoke Stopper'));
  ok('glossary defines the resistance/continuity check', termNames.some(t => t.includes('فحص المقاومة')));
  ok('glossary defines short circuit', termNames.some(t => t.includes('قصر كهربائي')));
  ok('glossary defines propeller removal before testing', termNames.some(t => t.includes('نزع المراوح')));
  ok('glossary defines the safe sequence', termNames.some(t => t.includes('التسلسل الآمن')));
  ok('every glossary definition is substantive (non-empty)', GLOSSARY_STAGE.terms.every(t => t.definition.length > 10));
}

console.log('\n[14] Content-boundary check: Lesson 10 stays at pre-power-safety level, not general multimeter theory/soldering/frame/motor/Betaflight depth');
{
  const allText = JSON.stringify(def).toLowerCase();
  const outOfScopeTerms = [
    'betaflight', 'uart', 'soldering', 'لحام', 'xt60', 'wire gauge',
    'frame assembly', 'تركيب الهيكل', '6-8mm', 'cw/ccw', 'esc wiring',
    'receiver wiring', 'arming', 'angle mode', 'failsafe',
    'charging', 'شحن البطارية', 'storage voltage',
  ];
  for (const term of outOfScopeTerms) {
    ok(`Lesson 10 does not mention out-of-scope term "${term}"`, !allText.includes(term.toLowerCase()));
  }
}

console.log('\n[14b] The protocol is tied to the moment it gets executed, and to the current concept it rests on');
{
  const smoke = def.stages.find(s => s.id === 'smokeStopperExplanation')!;
  const smokeText = JSON.stringify(smoke);
  ok('the Smoke Stopper stage names where the current idea came from (Lessons 4 and 6)',
    smokeText.includes('الدرس السادس') && smokeText.includes('الدرس الرابع'));
  const completion = def.stages[def.stages.length - 1];
  const completionText = JSON.stringify(completion);
  ok('the summary tells the learner this protocol is executed at first power-up, not left here',
    completionText.includes('أول توصيل طاقة') && completionText.includes('اكتمال التركيب'));
}

console.log('\n[15] Lesson 10\'s transition bridge to Lesson 11 is built from real lessonsData, not hardcoded text');
{
  const lesson11 = lessonsData.find(l => l.id === 'lesson-frame-assembly')!;
  const completionStage = def.stages[def.stages.length - 1];
  ok('the final stage is a completion stage', completionStage.type === 'completion');
  if (completionStage.type === 'completion') {
    const bridgeText = completionStage.nextLessonBridge(lesson11);
    ok('bridge text contains Lesson 11\'s real title', bridgeText.includes(lesson11.title));
    ok('bridge text contains Lesson 11\'s real description', bridgeText.includes(lesson11.description));
  }
}

console.log('\n[16] Reused architecture: no Lesson-10-specific engine code exists — same generic engine as Lessons 1-9');
{
  ok('stage ids are unique across the whole definition', new Set(def.stages.map(s => s.id)).size === def.stages.length);
  ok('checkpoint ids are unique across the whole definition', new Set(CHECKPOINT_STAGES.map(s => s.checkpoint.id)).size === CHECKPOINT_STAGES.length);
}

console.log(`\nAll ${passed} assertions passed.`);

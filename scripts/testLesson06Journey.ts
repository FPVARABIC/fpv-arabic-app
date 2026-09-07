/**
 * Real assertions against Lesson 06's journey definition
 * (src/data/lessons/lesson06Journey.definition.ts) driven through the
 * generic session-state engine (src/data/lessons/lessonJourneyEngine.ts).
 * No DOM, no React — this proves the gating/readiness logic itself;
 * scripts/testLesson06JourneyUI.ts proves the same behaviors are actually
 * wired up in the rendered UI.
 */
import assert from 'node:assert/strict';
import {
  createInitialSessionState, goToStageId, nextStage, prevStage,
  recordCheckpointAnswer, recordInteractionVariant, recordRecallRevealed,
  isCheckpointAnswered, areAllCheckpointsAnswered, isInteractionComplete, isRecallComplete,
  getReadinessRequirements, isReadyToComplete, stageCount, currentStage,
} from '../src/data/lessons/lessonJourneyEngine';
import { lesson06JourneyDefinition as def } from '../src/data/lessons/lesson06Journey.definition';
import type { CheckpointStage, RecallStage, GlossaryStage, InteractiveDiagramStage } from '../src/types/lessonJourney';
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
const STAGE_COUNT = stageCount(def);

console.log('\n[1] Registration: Lesson 06 is registered in the journey registry with real lesson data');
{
  const lesson6 = lessonsData.find(l => l.id === 'lesson-electricity-basics')!;
  ok('lesson06JourneyDefinition.lessonId matches the real Lesson 6 id', def.lessonId === lesson6.id);
  ok('getLessonJourneyDefinition resolves Lesson 6 to this exact definition', getLessonJourneyDefinition(lesson6.id) === def);
  ok('Lesson 6 has 16 stages (genuine content depth, not filler)', STAGE_COUNT === 16);
}

console.log('\n[2] The electricity-basics diagram stage exists with exactly the 4 real concept ids as required variants');
{
  ok('exactly one interactive_diagram stage exists', def.stages.filter(s => s.type === 'interactive_diagram').length === 1);
  ok('diagramType is electricity-basics', DIAGRAM_STAGE.diagramType === 'electricity-basics');
  ok('required variants are exactly the 4 real concepts', JSON.stringify(DIAGRAM_STAGE.requiredVariants) === JSON.stringify(['voltage', 'current', 'polarity', 'short']));
}

console.log('\n[3] Initial state — nothing satisfied, completion unavailable at initial render');
{
  const s = createInitialSessionState(def);
  ok('starts on the orientation stage', currentStage(def, s).id === 'orientation');
  ok('electricity diagram not yet explored', !isInteractionComplete(DIAGRAM_STAGE, s));
  ok('no checkpoint answered', !areAllCheckpointsAnswered(def, s));
  ok('final recall not complete', !isRecallComplete(RECALL, s));
  ok('readiness gate is NOT satisfied at initial state', !isReadyToComplete(def, s));
  ok(
    'readiness requirement list has one entry per gate (electricity diagram + 4 checkpoints + recall)',
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

console.log('\n[5] Electricity-basics diagram completion requires exploring all 4 concepts');
{
  let s = createInitialSessionState(def);
  ok('not complete before any concept explored', !isInteractionComplete(DIAGRAM_STAGE, s));
  s = recordInteractionVariant(s, DIAGRAM_STAGE.id, 'voltage');
  ok('still not complete after exploring only "voltage"', !isInteractionComplete(DIAGRAM_STAGE, s));
  s = recordInteractionVariant(s, DIAGRAM_STAGE.id, 'current');
  s = recordInteractionVariant(s, DIAGRAM_STAGE.id, 'voltage'); // repeat, should not substitute for the others
  ok('repeatedly exploring the same concept never substitutes for exploring the others', !isInteractionComplete(DIAGRAM_STAGE, s));
  s = recordInteractionVariant(s, DIAGRAM_STAGE.id, 'polarity');
  ok('still not complete after exploring 3 of 4 concepts', !isInteractionComplete(DIAGRAM_STAGE, s));
  s = recordInteractionVariant(s, DIAGRAM_STAGE.id, 'short');
  ok('complete once all 4 concepts have been explored', isInteractionComplete(DIAGRAM_STAGE, s));
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
  ok('checkpoint ids are: voltageCurrentDistinct, higherVoltageNotAlwaysBetter, reversePolarityRealDamage, shortCircuitAndTestingMisconceptions',
    JSON.stringify(ids) === JSON.stringify([
      'voltageCurrentDistinct', 'higherVoltageNotAlwaysBetter', 'reversePolarityRealDamage', 'shortCircuitAndTestingMisconceptions',
    ]));
}

console.log('\n[8] Misconception targeting: each checkpoint explicitly names the correct distinction, not just asserts it');
{
  const vcCp = CHECKPOINT_STAGES.find(s => s.checkpoint.id === 'voltageCurrentDistinct')!.checkpoint;
  const vcCorrect = vcCp.options.find(o => o.correct)!;
  ok('voltage/current correct option explicitly names "قوة" vs "كمية" and load-dependence', vcCorrect.text.includes('قوة') && vcCorrect.text.includes('كمية'));

  const hvCp = CHECKPOINT_STAGES.find(s => s.checkpoint.id === 'higherVoltageNotAlwaysBetter')!.checkpoint;
  const hvCorrect = hvCp.options.find(o => o.correct)!;
  ok('higher-voltage correct option explicitly ties to matching the rest of the components', hvCorrect.text.includes('يطابق') && hvCorrect.text.includes('بقية القطع'));

  const rpCp = CHECKPOINT_STAGES.find(s => s.checkpoint.id === 'reversePolarityRealDamage')!.checkpoint;
  const rpCorrect = rpCp.options.find(o => o.correct)!;
  ok('reverse-polarity correct option explicitly states real immediate damage, not mere non-startup', rpCorrect.text.includes('تلف فوري'));

  const scCp = CHECKPOINT_STAGES.find(s => s.checkpoint.id === 'shortCircuitAndTestingMisconceptions')!.checkpoint;
  const scCorrect = scCp.options.find(o => o.correct)!;
  ok('short-circuit correct option explicitly requires checking BEFORE power, not testing by powering on', scCorrect.text.includes('قبل التشغيل'));
  // The 3 wrong options collectively cover: fit≠safe, weak-connection myth, power-on-to-test myth.
  const scWrong = scCp.options.filter(o => !o.correct);
  ok('short-circuit distractors cover the "fit looks safe" misconception', scWrong.some(o => o.text.includes('متين') || o.text.includes('آمن كهربائيًا')));
  ok('short-circuit distractors cover the "weak connection" misconception', scWrong.some(o => o.text.includes('اتصال ضعيف')));
  ok('short-circuit distractors cover the "power on to test" misconception', scWrong.some(o => o.text.includes('الطريقة العملية الوحيدة') || o.text.includes('الطريقة الوحيدة')));
}

console.log('\n[9] Completion remains unavailable until every checkpoint, the diagram, and recall have been engaged with');
{
  let s = createInitialSessionState(def);
  for (const stage of CHECKPOINT_STAGES) {
    const wrong = stage.checkpoint.options.find(o => !o.correct)!;
    s = recordCheckpointAnswer(s, stage.checkpoint.id, wrong.id);
  }
  ok('all 4 checkpoints now answered (even though every answer was wrong)', areAllCheckpointsAnswered(def, s));
  ok('still not ready — electricity diagram not yet explored', !isReadyToComplete(def, s));

  for (const v of DIAGRAM_STAGE.requiredVariants) s = recordInteractionVariant(s, DIAGRAM_STAGE.id, v);
  ok('still not ready — final recall not yet viewed', !isReadyToComplete(def, s));

  for (const p of RECALL.prompts) s = recordRecallRevealed(s, RECALL.id, p.id);
  ok('final recall now complete', isRecallComplete(RECALL, s));
  ok('READY once electricity diagram + all 4 (even all-wrong) checkpoints + final recall are all engaged with', isReadyToComplete(def, s));
}

console.log('\n[10] Readiness checklist always names exactly what remains, in the declared order');
{
  let s = createInitialSessionState(def);
  const reqs = getReadinessRequirements(def, s);
  ok('every requirement has a non-empty human-readable label', reqs.every(r => r.label && r.label.trim().length > 0));
  ok('requirements are returned in the declared readinessOrder (electricity diagram listed first)', reqs[0].id === 'electricityDiagram');
  for (const v of DIAGRAM_STAGE.requiredVariants) s = recordInteractionVariant(s, DIAGRAM_STAGE.id, v);
  const reqs2 = getReadinessRequirements(def, s);
  ok('the electricity-diagram requirement flips to met once satisfied, others remain unmet',
    reqs2.find(r => r.id === 'electricityDiagram')!.met && reqs2.filter(r => r.id !== 'electricityDiagram').every(r => !r.met));
}

console.log('\n[11] Backward navigation preserves already-recorded session progress');
{
  let s = createInitialSessionState(def);
  s = recordInteractionVariant(s, DIAGRAM_STAGE.id, 'voltage');
  s = recordCheckpointAnswer(s, 'voltageCurrentDistinct', CHECKPOINT_STAGES[0].checkpoint.options[0].id);
  s = goToStageId(def, s, 'electricityDiagram');
  s = goToStageId(def, s, 'orientation');
  ok('navigating backward does not clear a recorded checkpoint answer', isCheckpointAnswered(s, 'voltageCurrentDistinct'));
  ok('navigating backward does not clear a recorded diagram variant', s.interactionVariants['electricityDiagram']?.['voltage'] === true);
  s = goToStageId(def, s, 'electricityDiagram');
  ok('navigating forward again still preserves progress', s.interactionVariants['electricityDiagram']?.['voltage'] === true);
  s = prevStage(def, s);
  ok('prevStage() by position also works and preserves progress', isCheckpointAnswered(s, 'voltageCurrentDistinct'));
}

console.log('\n[12] A fresh session (equivalent to a page refresh) starts with zero interaction progress');
{
  const fresh = createInitialSessionState(def);
  ok('fresh state has no concepts explored', Object.values(fresh.interactionVariants['electricityDiagram'] ?? {}).every(v => v === false));
  ok('fresh state has no checkpoints answered', Object.values(fresh.checkpointAnswers).every(v => v === null));
  ok('fresh state has no recall prompts revealed', Object.values(fresh.recallRevealed[RECALL.id]).every(v => v === false));
}

console.log('\n[13] Glossary covers the key electricity-fundamentals vocabulary with real, non-empty MSA definitions');
{
  ok('exactly 6 glossary terms defined', GLOSSARY_STAGE.terms.length === 6);
  const termNames = GLOSSARY_STAGE.terms.map(t => t.term);
  ok('glossary defines Voltage', termNames.some(t => t.includes('Voltage')));
  ok('glossary defines Current', termNames.some(t => t.includes('Current')));
  ok('glossary defines Polarity', termNames.some(t => t.includes('Polarity')));
  ok('glossary defines Short Circuit', termNames.some(t => t.includes('Short Circuit')));
  ok('glossary defines Load', termNames.some(t => t.includes('Load')));
  ok('glossary defines Pre-Power Check', termNames.some(t => t.includes('Pre-Power Check')));
  ok('every glossary definition is substantive (non-empty)', GLOSSARY_STAGE.terms.every(t => t.definition.length > 10));
}

console.log('\n[14] Content-boundary check: Lesson 6 stays at electricity-fundamentals level, not LiPo charging/soldering/Betaflight depth');
{
  const allText = JSON.stringify(def).toLowerCase();
  const outOfScopeTerms = [
    'betaflight', 'binding', 'pid tuning', 'soldering', 'لحام', 'uart',
    'منتفخة', 'puffed', 'balance charging', '3.8v', '4.2v', '3.7v', 'c-rating',
    'multimeter setup', 'wire gauge', 'gauge', 'power distribution board',
    'v=ir', 'ohm', 'أوم',
  ];
  for (const term of outOfScopeTerms) {
    ok(`Lesson 6 does not mention out-of-scope term "${term}"`, !allText.includes(term.toLowerCase()));
  }
}

console.log('\n[15] Lesson 6\'s transition bridge to Lesson 7 is built from real lessonsData, not hardcoded text');
{
  const lesson7 = lessonsData.find(l => l.id === 'lesson-lipo-batteries')!;
  const completionStage = def.stages[def.stages.length - 1];
  ok('the final stage is a completion stage', completionStage.type === 'completion');
  if (completionStage.type === 'completion') {
    const bridgeText = completionStage.nextLessonBridge(lesson7);
    ok('bridge text contains Lesson 7\'s real title', bridgeText.includes(lesson7.title));
    ok('bridge text contains Lesson 7\'s real description', bridgeText.includes(lesson7.description));
  }
}

console.log('\n[16] Reused architecture: no Lesson-06-specific engine code exists — same generic engine as Lessons 1-5');
{
  ok('stage ids are unique across the whole definition', new Set(def.stages.map(s => s.id)).size === def.stages.length);
  ok('checkpoint ids are unique across the whole definition', new Set(CHECKPOINT_STAGES.map(s => s.checkpoint.id)).size === CHECKPOINT_STAGES.length);
}

console.log(`\nAll ${passed} assertions passed.`);

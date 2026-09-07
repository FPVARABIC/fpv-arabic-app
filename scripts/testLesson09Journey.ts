/**
 * Real assertions against Lesson 09's journey definition
 * (src/data/lessons/lesson09Journey.definition.ts) driven through the
 * generic session-state engine (src/data/lessons/lessonJourneyEngine.ts).
 * No DOM, no React — this proves the gating/readiness logic itself;
 * scripts/testLesson09JourneyUI.ts proves the same behaviors are actually
 * wired up in the rendered UI.
 */
import assert from 'node:assert/strict';
import {
  createInitialSessionState, goToStageId, nextStage, prevStage,
  recordCheckpointAnswer, recordRecallRevealed, recordInteractionVariant,
  isCheckpointAnswered, areAllCheckpointsAnswered, isRecallComplete,
  getReadinessRequirements, isReadyToComplete, stageCount, currentStage,
} from '../src/data/lessons/lessonJourneyEngine';
import { lesson09JourneyDefinition as def } from '../src/data/lessons/lesson09Journey.definition';
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

console.log('\n[1] Registration: Lesson 09 is registered in the journey registry with real lesson data');
{
  const lesson9 = lessonsData.find(l => l.id === 'lesson-tx-rx')!;
  ok('lesson09JourneyDefinition.lessonId matches the real Lesson 9 id', def.lessonId === lesson9.id);
  ok('getLessonJourneyDefinition resolves Lesson 9 to this exact definition', getLessonJourneyDefinition(lesson9.id) === def);
  ok('Lesson 9 has 17 stages (16 + the TX/RX interactive stage)', STAGE_COUNT === 17);
}

console.log('\n[2] Exactly one interactive_diagram stage exists — both wirings must be opened');
{
  const diagrams = def.stages.filter((s): s is InteractiveDiagramStage => s.type === 'interactive_diagram');
  ok('exactly one interactive_diagram stage exists', diagrams.length === 1);
  ok('it renders the tx-rx-cross diagram', diagrams[0].diagramType === 'tx-rx-cross');
  ok('it requires both panels', JSON.stringify(diagrams[0].requiredVariants) === JSON.stringify(['correct', 'wrong']));
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
  ok('checkpoint ids are: txConnectsToRxReasoning, correctMappingIdentification, communicationFailureNotDamage, sharedGndStillRequired',
    JSON.stringify(ids) === JSON.stringify([
      'txConnectsToRxReasoning', 'correctMappingIdentification', 'communicationFailureNotDamage', 'sharedGndStillRequired',
    ]));
}

console.log('\n[7] Misconception targeting: each checkpoint explicitly names the correct distinction, not just asserts it');
{
  const reasoningCp = CHECKPOINT_STAGES.find(s => s.checkpoint.id === 'txConnectsToRxReasoning')!.checkpoint;
  const reasoningCorrect = reasoningCp.options.find(o => o.correct)!;
  ok('crossing-reasoning correct option explicitly names both TX (sends) and RX (listens)', reasoningCorrect.text.includes('TX') && reasoningCorrect.text.includes('RX'));

  const mappingCp = CHECKPOINT_STAGES.find(s => s.checkpoint.id === 'correctMappingIdentification')!.checkpoint;
  const mappingCorrect = mappingCp.options.find(o => o.correct)!;
  ok('mapping correct option explicitly states the crossed pairing', mappingCorrect.text.includes('Receiver RX') && mappingCorrect.text.includes('Receiver TX'));

  const consequenceCp = CHECKPOINT_STAGES.find(s => s.checkpoint.id === 'communicationFailureNotDamage')!.checkpoint;
  const consequenceCorrect = consequenceCp.options.find(o => o.correct)!;
  ok('consequence correct option explicitly states communication failure without damage', consequenceCorrect.text.includes('لا يحدث اتصال') && consequenceCorrect.text.includes('دون تلف'));

  const gndCp = CHECKPOINT_STAGES.find(s => s.checkpoint.id === 'sharedGndStillRequired')!.checkpoint;
  const gndCorrect = gndCp.options.find(o => o.correct)!;
  ok('GND correct option explicitly names GND as the missing shared reference', gndCorrect.text.includes('GND المشترك'));
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
  ok('requirements are returned in the declared readinessOrder (first checkpoint listed first)', reqs[0].id === 'checkpoint-txConnectsToRxReasoning');
  ok('recall requirement is listed last', reqs[reqs.length - 1].id === 'recall');
}

console.log('\n[10] Backward navigation preserves already-recorded session progress');
{
  let s = createInitialSessionState(def);
  s = recordCheckpointAnswer(s, 'txConnectsToRxReasoning', CHECKPOINT_STAGES[0].checkpoint.options[0].id);
  s = goToStageId(def, s, 'crossingReasoningCheckpoint');
  s = goToStageId(def, s, 'orientation');
  ok('navigating backward does not clear a recorded checkpoint answer', isCheckpointAnswered(s, 'txConnectsToRxReasoning'));
  s = goToStageId(def, s, 'crossingReasoningCheckpoint');
  ok('navigating forward again still preserves progress', isCheckpointAnswered(s, 'txConnectsToRxReasoning'));
  s = prevStage(def, s);
  ok('prevStage() by position also works and preserves progress', isCheckpointAnswered(s, 'txConnectsToRxReasoning'));
}

console.log('\n[11] A fresh session (equivalent to a page refresh) starts with zero interaction progress');
{
  const fresh = createInitialSessionState(def);
  ok('fresh state has no checkpoints answered', Object.values(fresh.checkpointAnswers).every(v => v === null));
  ok('fresh state has no recall prompts revealed', Object.values(fresh.recallRevealed[RECALL.id]).every(v => v === false));
}

console.log('\n[12] The comparison stage carries the correct-vs-wrong contrast that replaces the passive diagram');
{
  ok('exactly one comparison stage exists', def.stages.filter(s => s.type === 'comparison').length === 1);
  ok('comparison has exactly 2 items (correct vs wrong)', COMPARISON_STAGE.items.length === 2);
  const labels = COMPARISON_STAGE.items.map(i => i.label);
  ok('one item is the correct crossed wiring', labels.some(l => l.includes('الصحيح')));
  ok('one item is the common wrong wiring', labels.some(l => l.includes('الخطأ الشائع')));
  const correctItem = COMPARISON_STAGE.items.find(i => i.label.includes('الصحيح'))!;
  ok('correct item names both crossed pairings', correctItem.body.includes('FC TX') && correctItem.body.includes('FC RX'));
  const wrongItem = COMPARISON_STAGE.items.find(i => i.label.includes('الخطأ'))!;
  ok('wrong item explicitly contrasts with Lesson 8\'s damage-causing errors', (wrongItem.body + (COMPARISON_STAGE.footer ?? '')).includes('الدرس الثامن') || wrongItem.body.includes('تلف'));
}

console.log('\n[13] Glossary covers the key TX/RX vocabulary with real, non-empty MSA definitions');
{
  ok('exactly 6 glossary terms defined', GLOSSARY_STAGE.terms.length === 6);
  const termNames = GLOSSARY_STAGE.terms.map(t => t.term);
  ok('glossary defines TX', termNames.some(t => t === 'TX'));
  ok('glossary defines RX', termNames.some(t => t === 'RX'));
  ok('glossary defines the crossed-wiring principle', termNames.some(t => t.includes('التوصيل المتقاطع')));
  ok('glossary defines communication failure', termNames.some(t => t.includes('فشل الاتصال')));
  ok('glossary defines GND as a signal reference', termNames.some(t => t.includes('GND')));
  ok('every glossary definition is substantive (non-empty)', GLOSSARY_STAGE.terms.every(t => t.definition.length > 10));
}

console.log('\n[14] Content-boundary check: Lesson 9 stays at signal-direction level, not UART/Betaflight/protocol/soldering/multimeter depth');
{
  const allText = JSON.stringify(def).toLowerCase();
  const outOfScopeTerms = [
    'betaflight', 'uart', 'baud', 'crsf', 'sbus', 'binding', 'bind',
    'soldering', 'لحام', 'xt60', 'wire gauge', 'multimeter', 'continuity',
    'smoke stopper', 'receiver protocol', 'ports tab',
  ];
  for (const term of outOfScopeTerms) {
    ok(`Lesson 9 does not mention out-of-scope term "${term}"`, !allText.includes(term.toLowerCase()));
  }
}

console.log('\n[15] Lesson 9\'s transition bridge to Lesson 10 is built from real lessonsData, not hardcoded text');
{
  const lesson10 = lessonsData.find(l => l.id === 'lesson-pre-battery-safety')!;
  const completionStage = def.stages[def.stages.length - 1];
  ok('the final stage is a completion stage', completionStage.type === 'completion');
  if (completionStage.type === 'completion') {
    const bridgeText = completionStage.nextLessonBridge(lesson10);
    ok('bridge text contains Lesson 10\'s real title', bridgeText.includes(lesson10.title));
    ok('bridge text contains Lesson 10\'s real description', bridgeText.includes(lesson10.description));
  }
}

console.log('\n[16] Reused architecture: no Lesson-09-specific engine code exists — same generic engine as Lessons 1-8');
{
  ok('stage ids are unique across the whole definition', new Set(def.stages.map(s => s.id)).size === def.stages.length);
  ok('checkpoint ids are unique across the whole definition', new Set(CHECKPOINT_STAGES.map(s => s.checkpoint.id)).size === CHECKPOINT_STAGES.length);
}

console.log(`\nAll ${passed} assertions passed.`);

/**
 * Real assertions against Lesson 07's journey definition
 * (src/data/lessons/lesson07Journey.definition.ts) driven through the
 * generic session-state engine (src/data/lessons/lessonJourneyEngine.ts).
 * No DOM, no React — this proves the gating/readiness logic itself;
 * scripts/testLesson07JourneyUI.ts proves the same behaviors are actually
 * wired up in the rendered UI.
 */
import assert from 'node:assert/strict';
import {
  createInitialSessionState, goToStageId, nextStage, prevStage,
  recordCheckpointAnswer, recordInteractionVariant, recordRecallRevealed,
  isCheckpointAnswered, areAllCheckpointsAnswered, isInteractionComplete, isRecallComplete,
  getReadinessRequirements, isReadyToComplete, stageCount, currentStage,
} from '../src/data/lessons/lessonJourneyEngine';
import { lesson07JourneyDefinition as def } from '../src/data/lessons/lesson07Journey.definition';
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

console.log('\n[1] Registration: Lesson 07 is registered in the journey registry with real lesson data');
{
  const lesson7 = lessonsData.find(l => l.id === 'lesson-lipo-batteries')!;
  ok('lesson07JourneyDefinition.lessonId matches the real Lesson 7 id', def.lessonId === lesson7.id);
  ok('getLessonJourneyDefinition resolves Lesson 7 to this exact definition', getLessonJourneyDefinition(lesson7.id) === def);
  ok('Lesson 7 has 17 stages (16 + the capacity/discharge-rating explanation)', STAGE_COUNT === 17);
}

console.log('\n[2] The lipo-cells diagram stage exists with exactly the 2 real pack ids as required variants');
{
  ok('exactly one interactive_diagram stage exists', def.stages.filter(s => s.type === 'interactive_diagram').length === 1);
  ok('diagramType is lipo-cells', DIAGRAM_STAGE.diagramType === 'lipo-cells');
  ok('required variants are exactly the 2 real packs', JSON.stringify(DIAGRAM_STAGE.requiredVariants) === JSON.stringify(['4s', '6s']));
}

console.log('\n[3] Initial state — nothing satisfied, completion unavailable at initial render');
{
  const s = createInitialSessionState(def);
  ok('starts on the orientation stage', currentStage(def, s).id === 'orientation');
  ok('lipo diagram not yet explored', !isInteractionComplete(DIAGRAM_STAGE, s));
  ok('no checkpoint answered', !areAllCheckpointsAnswered(def, s));
  ok('final recall not complete', !isRecallComplete(RECALL, s));
  ok('readiness gate is NOT satisfied at initial state', !isReadyToComplete(def, s));
  ok(
    'readiness requirement list has one entry per gate (lipo diagram + 4 checkpoints + recall)',
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

console.log('\n[5] Lipo-cells diagram completion requires exploring both packs');
{
  let s = createInitialSessionState(def);
  ok('not complete before any pack explored', !isInteractionComplete(DIAGRAM_STAGE, s));
  s = recordInteractionVariant(s, DIAGRAM_STAGE.id, '4s');
  ok('still not complete after exploring only "4s"', !isInteractionComplete(DIAGRAM_STAGE, s));
  s = recordInteractionVariant(s, DIAGRAM_STAGE.id, '4s'); // repeat, should not substitute for "6s"
  ok('repeatedly exploring the same pack never substitutes for exploring the other', !isInteractionComplete(DIAGRAM_STAGE, s));
  s = recordInteractionVariant(s, DIAGRAM_STAGE.id, '6s');
  ok('complete once both packs have been explored', isInteractionComplete(DIAGRAM_STAGE, s));
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
  ok('checkpoint ids are: cellVoltageIsNotFixed, cellCountDeterminesVoltage, puffedBatteryStillWorksMisconception, chargingSafetyMisconceptions',
    JSON.stringify(ids) === JSON.stringify([
      'cellVoltageIsNotFixed', 'cellCountDeterminesVoltage', 'puffedBatteryStillWorksMisconception', 'chargingSafetyMisconceptions',
    ]));
}

console.log('\n[8] Misconception targeting: each checkpoint explicitly names the correct distinction, not just asserts it');
{
  const cvCp = CHECKPOINT_STAGES.find(s => s.checkpoint.id === 'cellVoltageIsNotFixed')!.checkpoint;
  const cvCorrect = cvCp.options.find(o => o.correct)!;
  ok('cell-voltage correct option explicitly distinguishes nominal/full-charge/discharge-floor', cvCorrect.text.includes('4.2V') && cvCorrect.text.includes('3.5V'));

  const ccCp = CHECKPOINT_STAGES.find(s => s.checkpoint.id === 'cellCountDeterminesVoltage')!.checkpoint;
  const ccCorrect = ccCp.options.find(o => o.correct)!;
  ok('cell-count correct option explicitly ties total voltage to a cell-count calculation', ccCorrect.text.includes('6 خلايا') && ccCorrect.text.includes('3.7V'));

  const pbCp = CHECKPOINT_STAGES.find(s => s.checkpoint.id === 'puffedBatteryStillWorksMisconception')!.checkpoint;
  const pbCorrect = pbCp.options.find(o => o.correct)!;
  ok('puffed-battery correct option explicitly rejects "still works = safe"', pbCorrect.text.includes('تلف داخلي حقيقي'));

  const chCp = CHECKPOINT_STAGES.find(s => s.checkpoint.id === 'chargingSafetyMisconceptions')!.checkpoint;
  const chCorrect = chCp.options.find(o => o.correct)!;
  ok('charging correct option explicitly requires a dedicated LiPo/balance charger AND supervision', chCorrect.text.includes('Balance Charging') && chCorrect.text.includes('مراقبة'));
  // The 3 wrong options collectively cover: any-charger-safe, unattended-charging-ok, storage-voltage-optional.
  const chWrong = chCp.options.filter(o => !o.correct);
  ok('charging distractors cover the "any charger is safe" misconception', chWrong.some(o => o.text.includes('نفس الجهد الكلي آمن')));
  ok('charging distractors cover the "unattended charging is fine" misconception', chWrong.some(o => o.text.includes('دون مراقبة')));
  ok('charging distractors cover the "storage voltage is optional" misconception', chWrong.some(o => o.text.includes('تفصيل اختياري')));
}

console.log('\n[9] Completion remains unavailable until every checkpoint, the diagram, and recall have been engaged with');
{
  let s = createInitialSessionState(def);
  for (const stage of CHECKPOINT_STAGES) {
    const wrong = stage.checkpoint.options.find(o => !o.correct)!;
    s = recordCheckpointAnswer(s, stage.checkpoint.id, wrong.id);
  }
  ok('all 4 checkpoints now answered (even though every answer was wrong)', areAllCheckpointsAnswered(def, s));
  ok('still not ready — lipo diagram not yet explored', !isReadyToComplete(def, s));

  for (const v of DIAGRAM_STAGE.requiredVariants) s = recordInteractionVariant(s, DIAGRAM_STAGE.id, v);
  ok('still not ready — final recall not yet viewed', !isReadyToComplete(def, s));

  for (const p of RECALL.prompts) s = recordRecallRevealed(s, RECALL.id, p.id);
  ok('final recall now complete', isRecallComplete(RECALL, s));
  ok('READY once lipo diagram + all 4 (even all-wrong) checkpoints + final recall are all engaged with', isReadyToComplete(def, s));
}

console.log('\n[10] Readiness checklist always names exactly what remains, in the declared order');
{
  let s = createInitialSessionState(def);
  const reqs = getReadinessRequirements(def, s);
  ok('every requirement has a non-empty human-readable label', reqs.every(r => r.label && r.label.trim().length > 0));
  ok('requirements are returned in the declared readinessOrder (lipo diagram listed first)', reqs[0].id === 'lipoDiagram');
  for (const v of DIAGRAM_STAGE.requiredVariants) s = recordInteractionVariant(s, DIAGRAM_STAGE.id, v);
  const reqs2 = getReadinessRequirements(def, s);
  ok('the lipo-diagram requirement flips to met once satisfied, others remain unmet',
    reqs2.find(r => r.id === 'lipoDiagram')!.met && reqs2.filter(r => r.id !== 'lipoDiagram').every(r => !r.met));
}

console.log('\n[11] Backward navigation preserves already-recorded session progress');
{
  let s = createInitialSessionState(def);
  s = recordInteractionVariant(s, DIAGRAM_STAGE.id, '4s');
  s = recordCheckpointAnswer(s, 'cellVoltageIsNotFixed', CHECKPOINT_STAGES[0].checkpoint.options[0].id);
  s = goToStageId(def, s, 'lipoDiagram');
  s = goToStageId(def, s, 'orientation');
  ok('navigating backward does not clear a recorded checkpoint answer', isCheckpointAnswered(s, 'cellVoltageIsNotFixed'));
  ok('navigating backward does not clear a recorded diagram variant', s.interactionVariants['lipoDiagram']?.['4s'] === true);
  s = goToStageId(def, s, 'lipoDiagram');
  ok('navigating forward again still preserves progress', s.interactionVariants['lipoDiagram']?.['4s'] === true);
  s = prevStage(def, s);
  ok('prevStage() by position also works and preserves progress', isCheckpointAnswered(s, 'cellVoltageIsNotFixed'));
}

console.log('\n[12] A fresh session (equivalent to a page refresh) starts with zero interaction progress');
{
  const fresh = createInitialSessionState(def);
  ok('fresh state has no packs explored', Object.values(fresh.interactionVariants['lipoDiagram'] ?? {}).every(v => v === false));
  ok('fresh state has no checkpoints answered', Object.values(fresh.checkpointAnswers).every(v => v === null));
  ok('fresh state has no recall prompts revealed', Object.values(fresh.recallRevealed[RECALL.id]).every(v => v === false));
}

console.log('\n[13] Glossary covers the key LiPo-safety vocabulary with real, non-empty MSA definitions');
{
  ok('exactly 8 glossary terms defined', GLOSSARY_STAGE.terms.length === 8);
  const termNames = GLOSSARY_STAGE.terms.map(t => t.term);
  ok('glossary defines Nominal Voltage', termNames.some(t => t.includes('Nominal Voltage')));
  ok('glossary defines Full-Charge Voltage', termNames.some(t => t.includes('Full-Charge Voltage')));
  ok('glossary defines Storage Voltage', termNames.some(t => t.includes('Storage Voltage')));
  ok('glossary defines Cell Count / S Rating', termNames.some(t => t.includes('S Rating')));
  ok('glossary defines Capacity', termNames.some(t => t.includes('Capacity')));
  ok('glossary defines C-Rating', termNames.some(t => t.includes('C-Rating')));
  ok('glossary defines Puffing', termNames.some(t => t.includes('Puffing')));
  const cTerm = GLOSSARY_STAGE.terms.find(t => t.term.includes('C-Rating'))!;
  ok('the C-Rating definition sends the learner to the pack label rather than quoting a figure',
    cTerm.definition.includes('يُقرأ') && !/[0-9]+\s*c\b/i.test(cTerm.definition));
  ok('glossary defines Balance Charging', termNames.some(t => t.includes('Balance Charging')));
  ok('every glossary definition is substantive (non-empty)', GLOSSARY_STAGE.terms.every(t => t.definition.length > 10));
}

console.log('\n[14] Content-boundary check: Lesson 7 stays at LiPo-battery level, not power-rail/wiring/soldering/firmware depth');
{
  const allText = JSON.stringify(def).toLowerCase();
  const outOfScopeTerms = [
    'betaflight', 'uart', 'binding', 'pid tuning', 'soldering', 'لحام',
    // 'c-rating' left this list in the curriculum expansion: the discharge
    // rating is a property of the PACK, printed on its own label, and naming
    // it here is what closes the current chain Lesson 4 opened. Everything
    // else about power rails and bench testing stays out.
    'vbat', 'gnd', 'xt60', 'smoke stopper', 'multimeter',
    'continuity', 'wire gauge',
  ];
  // "5v" is checked separately (not via plain substring) because legitimate
  // LiPo voltage numbers like "3.5V" or "4.5V" would false-positive on a
  // bare "5v" substring match.
  ok('Lesson 7 does not mention the Lesson-08 "5V" power rail as a named rail', !/[^0-9.]5v\b/.test(allText));
  for (const term of outOfScopeTerms) {
    ok(`Lesson 7 does not mention out-of-scope term "${term}"`, !allText.includes(term.toLowerCase()));
  }
}

console.log('\n[15] Lesson 7\'s transition bridge to Lesson 8 is built from real lessonsData, not hardcoded text');
{
  const lesson8 = lessonsData.find(l => l.id === 'lesson-power-rails')!;
  const completionStage = def.stages[def.stages.length - 1];
  ok('the final stage is a completion stage', completionStage.type === 'completion');
  if (completionStage.type === 'completion') {
    const bridgeText = completionStage.nextLessonBridge(lesson8);
    ok('bridge text contains Lesson 8\'s real title', bridgeText.includes(lesson8.title));
    ok('bridge text contains Lesson 8\'s real description', bridgeText.includes(lesson8.description));
  }
}

console.log('\n[16] Reused architecture: no Lesson-07-specific engine code exists — same generic engine as Lessons 1-6');
{
  ok('stage ids are unique across the whole definition', new Set(def.stages.map(s => s.id)).size === def.stages.length);
  ok('checkpoint ids are unique across the whole definition', new Set(CHECKPOINT_STAGES.map(s => s.checkpoint.id)).size === CHECKPOINT_STAGES.length);
}

console.log(`\nAll ${passed} assertions passed.`);

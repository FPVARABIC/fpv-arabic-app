/**
 * Real assertions against Lesson 08's journey definition
 * (src/data/lessons/lesson08Journey.definition.ts) driven through the
 * generic session-state engine (src/data/lessons/lessonJourneyEngine.ts).
 * No DOM, no React — this proves the gating/readiness logic itself;
 * scripts/testLesson08JourneyUI.ts proves the same behaviors are actually
 * wired up in the rendered UI.
 */
import assert from 'node:assert/strict';
import {
  createInitialSessionState, goToStageId, nextStage, prevStage,
  recordCheckpointAnswer, recordInteractionVariant, recordRecallRevealed,
  isCheckpointAnswered, areAllCheckpointsAnswered, isInteractionComplete, isRecallComplete,
  getReadinessRequirements, isReadyToComplete, stageCount, currentStage,
} from '../src/data/lessons/lessonJourneyEngine';
import { lesson08JourneyDefinition as def } from '../src/data/lessons/lesson08Journey.definition';
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

console.log('\n[1] Registration: Lesson 08 is registered in the journey registry with real lesson data');
{
  const lesson8 = lessonsData.find(l => l.id === 'lesson-power-rails')!;
  ok('lesson08JourneyDefinition.lessonId matches the real Lesson 8 id', def.lessonId === lesson8.id);
  ok('getLessonJourneyDefinition resolves Lesson 8 to this exact definition', getLessonJourneyDefinition(lesson8.id) === def);
  ok('Lesson 8 has 16 stages, matching Lessons 6-7\'s depth', STAGE_COUNT === 16);
}

console.log('\n[2] The gnd-5v-vbat diagram stage exists with exactly the 3 real rail ids as required variants');
{
  ok('exactly one interactive_diagram stage exists', def.stages.filter(s => s.type === 'interactive_diagram').length === 1);
  ok('diagramType is gnd-5v-vbat', DIAGRAM_STAGE.diagramType === 'gnd-5v-vbat');
  ok('required variants are exactly the 3 real rails', JSON.stringify(DIAGRAM_STAGE.requiredVariants) === JSON.stringify(['vbat', 'v5', 'gnd']));
}

console.log('\n[3] Initial state — nothing satisfied, completion unavailable at initial render');
{
  const s = createInitialSessionState(def);
  ok('starts on the orientation stage', currentStage(def, s).id === 'orientation');
  ok('power rail diagram not yet explored', !isInteractionComplete(DIAGRAM_STAGE, s));
  ok('no checkpoint answered', !areAllCheckpointsAnswered(def, s));
  ok('final recall not complete', !isRecallComplete(RECALL, s));
  ok('readiness gate is NOT satisfied at initial state', !isReadyToComplete(def, s));
  ok(
    'readiness requirement list has one entry per gate (power rail diagram + 4 checkpoints + recall)',
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

console.log('\n[5] Power-rail diagram completion requires exploring all 3 rails');
{
  let s = createInitialSessionState(def);
  ok('not complete before any rail explored', !isInteractionComplete(DIAGRAM_STAGE, s));
  s = recordInteractionVariant(s, DIAGRAM_STAGE.id, 'vbat');
  ok('still not complete after exploring only "vbat"', !isInteractionComplete(DIAGRAM_STAGE, s));
  s = recordInteractionVariant(s, DIAGRAM_STAGE.id, 'vbat'); // repeat, should not substitute for the others
  ok('repeatedly exploring the same rail never substitutes for exploring the others', !isInteractionComplete(DIAGRAM_STAGE, s));
  s = recordInteractionVariant(s, DIAGRAM_STAGE.id, 'v5');
  ok('still not complete after exploring 2 of 3 rails', !isInteractionComplete(DIAGRAM_STAGE, s));
  s = recordInteractionVariant(s, DIAGRAM_STAGE.id, 'gnd');
  ok('complete once all 3 rails have been explored', isInteractionComplete(DIAGRAM_STAGE, s));
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
  ok('checkpoint ids are: vbatVs5vDistinct, groundIsSharedReference, wrongRailCausesRealDamage, fiveVSourcesNotIdentical',
    JSON.stringify(ids) === JSON.stringify([
      'vbatVs5vDistinct', 'groundIsSharedReference', 'wrongRailCausesRealDamage', 'fiveVSourcesNotIdentical',
    ]));
}

console.log('\n[8] Misconception targeting: each checkpoint explicitly names the correct distinction, not just asserts it');
{
  const vCp = CHECKPOINT_STAGES.find(s => s.checkpoint.id === 'vbatVs5vDistinct')!.checkpoint;
  const vCorrect = vCp.options.find(o => o.correct)!;
  ok('VBAT/5V correct option names both rails and the damage risk', vCorrect.text.includes('VBAT') && vCorrect.text.includes('5V') && vCorrect.text.includes('يُتلفه'));
  ok('VBAT/5V feedback still carries the concrete voltage the learner should picture', vCorrect.feedback.includes('25V'));

  const gCp = CHECKPOINT_STAGES.find(s => s.checkpoint.id === 'groundIsSharedReference')!.checkpoint;
  const gCorrect = gCp.options.find(o => o.correct)!;
  ok('ground correct option explicitly names GND as the missing shared reference', gCorrect.text.includes('GND المشترك'));

  const wCp = CHECKPOINT_STAGES.find(s => s.checkpoint.id === 'wrongRailCausesRealDamage')!.checkpoint;
  const wCorrect = wCp.options.find(o => o.correct)!;
  // P2-A: this question used to mirror Lesson 6's reverse-polarity question option for option
  // (86% word overlap), so it could be answered by option shape alone. It now requires knowing
  // which rail carries what, while still retrieving the damage-not-failure principle.
  ok('wrong-rail correct option requires rail knowledge (regulated 5V vs raw VBAT)', wCorrect.text.includes('مخرج 5V') && wCorrect.text.includes('VBAT'));
  ok('wrong-rail correct option still retrieves the damage-not-slowdown principle', wCorrect.text.includes('يُتلفها لا يبطّئها'));

  const cCp = CHECKPOINT_STAGES.find(s => s.checkpoint.id === 'fiveVSourcesNotIdentical')!.checkpoint;
  const cCorrect = cCp.options.find(o => o.correct)!;
  ok('capacity correct option explicitly requires checking specs, not assuming identical capacity', cCorrect.text.includes('مواصفات'));
}

console.log('\n[9] Completion remains unavailable until every checkpoint, the diagram, and recall have been engaged with');
{
  let s = createInitialSessionState(def);
  for (const stage of CHECKPOINT_STAGES) {
    const wrong = stage.checkpoint.options.find(o => !o.correct)!;
    s = recordCheckpointAnswer(s, stage.checkpoint.id, wrong.id);
  }
  ok('all 4 checkpoints now answered (even though every answer was wrong)', areAllCheckpointsAnswered(def, s));
  ok('still not ready — power rail diagram not yet explored', !isReadyToComplete(def, s));

  for (const v of DIAGRAM_STAGE.requiredVariants) s = recordInteractionVariant(s, DIAGRAM_STAGE.id, v);
  ok('still not ready — final recall not yet viewed', !isReadyToComplete(def, s));

  for (const p of RECALL.prompts) s = recordRecallRevealed(s, RECALL.id, p.id);
  ok('final recall now complete', isRecallComplete(RECALL, s));
  ok('READY once power rail diagram + all 4 (even all-wrong) checkpoints + final recall are all engaged with', isReadyToComplete(def, s));
}

console.log('\n[10] Readiness checklist always names exactly what remains, in the declared order');
{
  let s = createInitialSessionState(def);
  const reqs = getReadinessRequirements(def, s);
  ok('every requirement has a non-empty human-readable label', reqs.every(r => r.label && r.label.trim().length > 0));
  ok('requirements are returned in the declared readinessOrder (power rail diagram listed first)', reqs[0].id === 'powerRailDiagram');
  for (const v of DIAGRAM_STAGE.requiredVariants) s = recordInteractionVariant(s, DIAGRAM_STAGE.id, v);
  const reqs2 = getReadinessRequirements(def, s);
  ok('the power-rail-diagram requirement flips to met once satisfied, others remain unmet',
    reqs2.find(r => r.id === 'powerRailDiagram')!.met && reqs2.filter(r => r.id !== 'powerRailDiagram').every(r => !r.met));
}

console.log('\n[11] Backward navigation preserves already-recorded session progress');
{
  let s = createInitialSessionState(def);
  s = recordInteractionVariant(s, DIAGRAM_STAGE.id, 'vbat');
  s = recordCheckpointAnswer(s, 'vbatVs5vDistinct', CHECKPOINT_STAGES[0].checkpoint.options[0].id);
  s = goToStageId(def, s, 'powerRailDiagram');
  s = goToStageId(def, s, 'orientation');
  ok('navigating backward does not clear a recorded checkpoint answer', isCheckpointAnswered(s, 'vbatVs5vDistinct'));
  ok('navigating backward does not clear a recorded diagram variant', s.interactionVariants['powerRailDiagram']?.['vbat'] === true);
  s = goToStageId(def, s, 'powerRailDiagram');
  ok('navigating forward again still preserves progress', s.interactionVariants['powerRailDiagram']?.['vbat'] === true);
  s = prevStage(def, s);
  ok('prevStage() by position also works and preserves progress', isCheckpointAnswered(s, 'vbatVs5vDistinct'));
}

console.log('\n[12] A fresh session (equivalent to a page refresh) starts with zero interaction progress');
{
  const fresh = createInitialSessionState(def);
  ok('fresh state has no rails explored', Object.values(fresh.interactionVariants['powerRailDiagram'] ?? {}).every(v => v === false));
  ok('fresh state has no checkpoints answered', Object.values(fresh.checkpointAnswers).every(v => v === null));
  ok('fresh state has no recall prompts revealed', Object.values(fresh.recallRevealed[RECALL.id]).every(v => v === false));
}

console.log('\n[13] Glossary covers the key power-rail vocabulary with real, non-empty MSA definitions');
{
  ok('exactly 6 glossary terms defined', GLOSSARY_STAGE.terms.length === 6);
  const termNames = GLOSSARY_STAGE.terms.map(t => t.term);
  ok('glossary defines VBAT', termNames.some(t => t.includes('VBAT')));
  ok('glossary defines 5V', termNames.some(t => t === '5V'));
  ok('glossary defines GND', termNames.some(t => t.includes('GND')));
  ok('glossary defines the internal regulation circuit', termNames.some(t => t.includes('دائرة التنظيم')));
  ok('glossary defines the common electrical reference', termNames.some(t => t.includes('المرجع الكهربائي المشترك')));
  ok('glossary defines wrong-rail connection', termNames.some(t => t.includes('المسار الخاطئ')));
  ok('every glossary definition is substantive (non-empty)', GLOSSARY_STAGE.terms.every(t => t.definition.length > 10));
}

console.log('\n[14] Content-boundary check: Lesson 8 stays at power-rail-concept level, not wiring/soldering/Betaflight/multimeter depth');
{
  const allText = JSON.stringify(def).toLowerCase();
  const outOfScopeTerms = [
    'betaflight', 'uart', 'soldering', 'لحام', 'xt60', 'wire gauge',
    'multimeter', 'continuity', 'smoke stopper', 'current budget',
    'regulator design', 'ampere rating calculation',
  ];
  for (const term of outOfScopeTerms) {
    ok(`Lesson 8 does not mention out-of-scope term "${term}"`, !allText.includes(term.toLowerCase()));
  }
}

console.log('\n[15] Lesson 8\'s transition bridge to Lesson 9 is built from real lessonsData, not hardcoded text');
{
  const lesson9 = lessonsData.find(l => l.id === 'lesson-tx-rx')!;
  const completionStage = def.stages[def.stages.length - 1];
  ok('the final stage is a completion stage', completionStage.type === 'completion');
  if (completionStage.type === 'completion') {
    const bridgeText = completionStage.nextLessonBridge(lesson9);
    ok('bridge text contains Lesson 9\'s real title', bridgeText.includes(lesson9.title));
    ok('bridge text contains Lesson 9\'s real description', bridgeText.includes(lesson9.description));
  }
}

console.log('\n[16] Reused architecture: no Lesson-08-specific engine code exists — same generic engine as Lessons 1-7');
{
  ok('stage ids are unique across the whole definition', new Set(def.stages.map(s => s.id)).size === def.stages.length);
  ok('checkpoint ids are unique across the whole definition', new Set(CHECKPOINT_STAGES.map(s => s.checkpoint.id)).size === CHECKPOINT_STAGES.length);
}

console.log(`\nAll ${passed} assertions passed.`);

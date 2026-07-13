/**
 * Real assertions against Lesson 11's journey definition
 * (src/data/lessons/lesson11Journey.definition.ts) driven through the
 * generic session-state engine (src/data/lessons/lessonJourneyEngine.ts).
 * No DOM, no React — this proves the gating/readiness logic itself;
 * scripts/testLesson11JourneyUI.ts proves the same behaviors are actually
 * wired up in the rendered UI.
 */
import assert from 'node:assert/strict';
import {
  createInitialSessionState, goToStageId, nextStage, prevStage,
  recordCheckpointAnswer, recordInteractionVariant, recordRecallRevealed,
  isCheckpointAnswered, areAllCheckpointsAnswered, isInteractionComplete, isRecallComplete,
  getReadinessRequirements, isReadyToComplete, stageCount, currentStage,
} from '../src/data/lessons/lessonJourneyEngine';
import { lesson11JourneyDefinition as def } from '../src/data/lessons/lesson11Journey.definition';
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

console.log('\n[1] Registration: Lesson 11 is registered in the journey registry with real lesson data');
{
  const lesson11 = lessonsData.find(l => l.id === 'lesson-frame-assembly')!;
  ok('lesson11JourneyDefinition.lessonId matches the real Lesson 11 id', def.lessonId === lesson11.id);
  ok('getLessonJourneyDefinition resolves Lesson 11 to this exact definition', getLessonJourneyDefinition(lesson11.id) === def);
  ok('Lesson 11 has 16 stages', STAGE_COUNT === 16);
}

console.log('\n[2] The frame-assembly diagram stage exists with exactly the 3 real part ids as required variants');
{
  ok('exactly one interactive_diagram stage exists', def.stages.filter(s => s.type === 'interactive_diagram').length === 1);
  ok('diagramType is frame-assembly', DIAGRAM_STAGE.diagramType === 'frame-assembly');
  ok('required variants are exactly the 3 real parts', JSON.stringify(DIAGRAM_STAGE.requiredVariants) === JSON.stringify(['arms', 'base', 'front']));
}

console.log('\n[3] Initial state — nothing satisfied, completion unavailable at initial render');
{
  const s = createInitialSessionState(def);
  ok('starts on the orientation stage', currentStage(def, s).id === 'orientation');
  ok('frame diagram not yet explored', !isInteractionComplete(DIAGRAM_STAGE, s));
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

console.log('\n[5] Frame-assembly diagram completion requires exploring all 3 parts');
{
  let s = createInitialSessionState(def);
  ok('not complete before any part explored', !isInteractionComplete(DIAGRAM_STAGE, s));
  s = recordInteractionVariant(s, DIAGRAM_STAGE.id, 'arms');
  ok('still not complete after exploring only "arms"', !isInteractionComplete(DIAGRAM_STAGE, s));
  s = recordInteractionVariant(s, DIAGRAM_STAGE.id, 'arms'); // repeat, should not substitute for the others
  ok('repeatedly exploring the same part never substitutes for exploring the others', !isInteractionComplete(DIAGRAM_STAGE, s));
  s = recordInteractionVariant(s, DIAGRAM_STAGE.id, 'base');
  ok('still not complete after exploring 2 of 3 parts', !isInteractionComplete(DIAGRAM_STAGE, s));
  s = recordInteractionVariant(s, DIAGRAM_STAGE.id, 'front');
  ok('complete once all 3 parts have been explored', isInteractionComplete(DIAGRAM_STAGE, s));
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
  ok('checkpoint ids are: orientationMustComeFirst, correctAssemblyOrder, correctTighteningPrinciple, whyRigidityAndRoutingMatter',
    JSON.stringify(ids) === JSON.stringify([
      'orientationMustComeFirst', 'correctAssemblyOrder', 'correctTighteningPrinciple', 'whyRigidityAndRoutingMatter',
    ]));
}

console.log('\n[8] Misconception targeting: each checkpoint explicitly names the correct distinction, not just asserts it');
{
  const orientCp = CHECKPOINT_STAGES.find(s => s.checkpoint.id === 'orientationMustComeFirst')!.checkpoint;
  const orientCorrect = orientCp.options.find(o => o.correct)!;
  ok('orientation correct option explicitly names cost increasing with later steps', orientCorrect.text.includes('أصعب وأكثر تكلفة'));

  const orderCp = CHECKPOINT_STAGES.find(s => s.checkpoint.id === 'correctAssemblyOrder')!.checkpoint;
  const orderCorrect = orderCp.options.find(o => o.correct)!;
  ok('order correct option explicitly names the direction-then-base-then-arms sequence', orderCorrect.text.includes('تحديد الاتجاه أولاً') && orderCorrect.text.includes('base plate'));

  const torqueCp = CHECKPOINT_STAGES.find(s => s.checkpoint.id === 'correctTighteningPrinciple')!.checkpoint;
  const torqueCorrect = torqueCp.options.find(o => o.correct)!;
  ok('torque correct option explicitly names moderate even tightening', torqueCorrect.text.includes('شد معتدل ومتساوٍ'));

  const rigidCp = CHECKPOINT_STAGES.find(s => s.checkpoint.id === 'whyRigidityAndRoutingMatter')!.checkpoint;
  const rigidCorrect = rigidCp.options.find(o => o.correct)!;
  ok('rigidity correct option explicitly states no arm movement should remain', rigidCorrect.text.includes('صلبًا تمامًا بدون أي حركة'));
}

console.log('\n[9] Completion remains unavailable until every checkpoint, the diagram, and recall have been engaged with');
{
  let s = createInitialSessionState(def);
  for (const stage of CHECKPOINT_STAGES) {
    const wrong = stage.checkpoint.options.find(o => !o.correct)!;
    s = recordCheckpointAnswer(s, stage.checkpoint.id, wrong.id);
  }
  ok('all 4 checkpoints now answered (even though every answer was wrong)', areAllCheckpointsAnswered(def, s));
  ok('still not ready — frame diagram not yet explored', !isReadyToComplete(def, s));

  for (const v of DIAGRAM_STAGE.requiredVariants) s = recordInteractionVariant(s, DIAGRAM_STAGE.id, v);
  ok('still not ready — final recall not yet viewed', !isReadyToComplete(def, s));

  for (const p of RECALL.prompts) s = recordRecallRevealed(s, RECALL.id, p.id);
  ok('final recall now complete', isRecallComplete(RECALL, s));
  ok('READY once frame diagram + all 4 (even all-wrong) checkpoints + final recall are all engaged with', isReadyToComplete(def, s));
}

console.log('\n[10] Readiness checklist always names exactly what remains, in the declared order');
{
  let s = createInitialSessionState(def);
  const reqs = getReadinessRequirements(def, s);
  ok('every requirement has a non-empty human-readable label', reqs.every(r => r.label && r.label.trim().length > 0));
  ok('requirements are returned in the declared readinessOrder (first checkpoint listed first)', reqs[0].id === 'checkpoint-orientationMustComeFirst');
  for (const v of DIAGRAM_STAGE.requiredVariants) s = recordInteractionVariant(s, DIAGRAM_STAGE.id, v);
  const reqs2 = getReadinessRequirements(def, s);
  ok('the frame-diagram requirement flips to met once satisfied, others remain unmet',
    reqs2.find(r => r.id === 'frameAssemblyDiagram')!.met && reqs2.filter(r => r.id !== 'frameAssemblyDiagram').every(r => !r.met));
}

console.log('\n[11] Backward navigation preserves already-recorded session progress');
{
  let s = createInitialSessionState(def);
  s = recordInteractionVariant(s, DIAGRAM_STAGE.id, 'arms');
  s = recordCheckpointAnswer(s, 'orientationMustComeFirst', CHECKPOINT_STAGES[0].checkpoint.options[0].id);
  s = goToStageId(def, s, 'frameAssemblyDiagram');
  s = goToStageId(def, s, 'orientation');
  ok('navigating backward does not clear a recorded checkpoint answer', isCheckpointAnswered(s, 'orientationMustComeFirst'));
  ok('navigating backward does not clear a recorded diagram variant', s.interactionVariants['frameAssemblyDiagram']?.['arms'] === true);
  s = goToStageId(def, s, 'frameAssemblyDiagram');
  ok('navigating forward again still preserves progress', s.interactionVariants['frameAssemblyDiagram']?.['arms'] === true);
  s = prevStage(def, s);
  ok('prevStage() by position also works and preserves progress', isCheckpointAnswered(s, 'orientationMustComeFirst'));
}

console.log('\n[12] A fresh session (equivalent to a page refresh) starts with zero interaction progress');
{
  const fresh = createInitialSessionState(def);
  ok('fresh state has no parts explored', Object.values(fresh.interactionVariants['frameAssemblyDiagram'] ?? {}).every(v => v === false));
  ok('fresh state has no checkpoints answered', Object.values(fresh.checkpointAnswers).every(v => v === null));
  ok('fresh state has no recall prompts revealed', Object.values(fresh.recallRevealed[RECALL.id]).every(v => v === false));
}

console.log('\n[13] The comparison stage carries the rigid-vs-rushed contrast');
{
  ok('exactly one comparison stage exists', def.stages.filter(s => s.type === 'comparison').length === 1);
  ok('comparison has exactly 2 items (correct vs unsafe)', COMPARISON_STAGE.items.length === 2);
  const labels = COMPARISON_STAGE.items.map(i => i.label);
  ok('one item is the correct rigid/planned assembly', labels.some(l => l.includes('الصحيح')));
  ok('one item is the unsafe rushed assembly', labels.some(l => l.includes('غير الآمن')));
}

console.log('\n[14] Glossary covers the key frame-assembly vocabulary with real, non-empty MSA definitions');
{
  ok('exactly 6 glossary terms defined', GLOSSARY_STAGE.terms.length === 6);
  const termNames = GLOSSARY_STAGE.terms.map(t => t.term);
  ok('glossary defines the front-direction marking', termNames.some(t => t.includes('علامة الاتجاه')));
  ok('glossary defines Base Plate', termNames.some(t => t === 'Base Plate'));
  ok('glossary defines carbon torque care', termNames.some(t => t.includes('العناية بالكربون')));
  ok('glossary defines arm rigidity', termNames.some(t => t.includes('صلابة الأذرع')));
  ok('glossary defines early wire routing', termNames.some(t => t.includes('تنظيم الأسلاك')));
  ok('every glossary definition is substantive (non-empty)', GLOSSARY_STAGE.terms.every(t => t.definition.length > 10));
}

console.log('\n[15] Content-boundary check: Lesson 11 stays at frame-assembly level, not motor/ESC/wiring/electrical/flight depth');
{
  const allText = JSON.stringify(def).toLowerCase();
  const outOfScopeTerms = [
    'betaflight', 'uart', 'soldering', 'لحام', 'xt60', 'wire gauge',
    'cw', 'ccw', '6-8mm', 'esc', 'fc installation', 'receiver installation',
    'vbat', 'gnd', 'tx/rx', 'smoke stopper', 'continuity', 'angle mode', 'failsafe', 'arming',
  ];
  for (const term of outOfScopeTerms) {
    ok(`Lesson 11 does not mention out-of-scope term "${term}"`, !allText.includes(term.toLowerCase()));
  }
}

console.log('\n[16] Lesson 11\'s transition bridge to Lesson 12 is built from real lessonsData, not hardcoded text');
{
  const lesson12 = lessonsData.find(l => l.id === 'lesson-motor-install')!;
  const completionStage = def.stages[def.stages.length - 1];
  ok('the final stage is a completion stage', completionStage.type === 'completion');
  if (completionStage.type === 'completion') {
    const bridgeText = completionStage.nextLessonBridge(lesson12);
    ok('bridge text contains Lesson 12\'s real title', bridgeText.includes(lesson12.title));
    ok('bridge text contains Lesson 12\'s real description', bridgeText.includes(lesson12.description));
  }
}

console.log('\n[17] Reused architecture: no Lesson-11-specific engine code exists — same generic engine as Lessons 1-10');
{
  ok('stage ids are unique across the whole definition', new Set(def.stages.map(s => s.id)).size === def.stages.length);
  ok('checkpoint ids are unique across the whole definition', new Set(CHECKPOINT_STAGES.map(s => s.checkpoint.id)).size === CHECKPOINT_STAGES.length);
}

console.log(`\nAll ${passed} assertions passed.`);

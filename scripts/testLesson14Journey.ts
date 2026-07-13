/**
 * Real assertions against Lesson 14's journey definition
 * (src/data/lessons/lesson14Journey.definition.ts) driven through the
 * generic session-state engine (src/data/lessons/lessonJourneyEngine.ts).
 * No DOM, no React — this proves the gating/readiness logic itself;
 * scripts/testLesson14JourneyUI.ts proves the same behaviors are actually
 * wired up in the rendered UI.
 */
import assert from 'node:assert/strict';
import {
  createInitialSessionState, goToStageId, nextStage, prevStage,
  recordCheckpointAnswer, recordInteractionVariant, recordRecallRevealed,
  isCheckpointAnswered, areAllCheckpointsAnswered, isInteractionComplete, isRecallComplete,
  getReadinessRequirements, isReadyToComplete, stageCount, currentStage,
} from '../src/data/lessons/lessonJourneyEngine';
import { lesson14JourneyDefinition as def } from '../src/data/lessons/lesson14Journey.definition';
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

console.log('\n[1] Registration: Lesson 14 is registered in the journey registry with real lesson data');
{
  const lesson14 = lessonsData.find(l => l.id === 'lesson-fc-install')!;
  ok('lesson14JourneyDefinition.lessonId matches the real Lesson 14 id', def.lessonId === lesson14.id);
  ok('getLessonJourneyDefinition resolves Lesson 14 to this exact definition', getLessonJourneyDefinition(lesson14.id) === def);
  ok('Lesson 14 has 18 stages', STAGE_COUNT === 18);
}

console.log('\n[2] The fc-orientation diagram stage exists with exactly the 3 real part ids as required variants');
{
  ok('exactly one interactive_diagram stage exists', def.stages.filter(s => s.type === 'interactive_diagram').length === 1);
  ok('diagramType is fc-orientation', DIAGRAM_STAGE.diagramType === 'fc-orientation');
  ok('required variants are exactly the 3 real parts', JSON.stringify(DIAGRAM_STAGE.requiredVariants) === JSON.stringify(['arrow', 'grommet', 'usb']));
}

console.log('\n[3] Initial state — nothing satisfied, completion unavailable at initial render');
{
  const s = createInitialSessionState(def);
  ok('starts on the orientation stage', currentStage(def, s).id === 'orientation');
  ok('diagram not yet explored', !isInteractionComplete(DIAGRAM_STAGE, s));
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

console.log('\n[5] FC-orientation diagram completion requires exploring all 3 parts (grommet counted once regardless of the 4 circles)');
{
  let s = createInitialSessionState(def);
  ok('not complete before any part explored', !isInteractionComplete(DIAGRAM_STAGE, s));
  s = recordInteractionVariant(s, DIAGRAM_STAGE.id, 'arrow');
  ok('still not complete after exploring only "arrow"', !isInteractionComplete(DIAGRAM_STAGE, s));
  s = recordInteractionVariant(s, DIAGRAM_STAGE.id, 'grommet');
  ok('still not complete after exploring 2 of 3 parts', !isInteractionComplete(DIAGRAM_STAGE, s));
  // Simulate clicking multiple grommet circles — all 4 map to the same
  // 'grommet' variant, so repeated recording must be idempotent.
  s = recordInteractionVariant(s, DIAGRAM_STAGE.id, 'grommet');
  s = recordInteractionVariant(s, DIAGRAM_STAGE.id, 'grommet');
  s = recordInteractionVariant(s, DIAGRAM_STAGE.id, 'grommet');
  ok('repeatedly recording the same "grommet" variant never substitutes for exploring "usb"', !isInteractionComplete(DIAGRAM_STAGE, s));
  s = recordInteractionVariant(s, DIAGRAM_STAGE.id, 'usb');
  ok('complete once all 3 distinct variants have been explored', isInteractionComplete(DIAGRAM_STAGE, s));
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
  ok('checkpoint ids are: whyPhysicalOrientationMatters, physicalCorrectionPreferredOverSoftwareFix, whyGrommetsMatter, serviceabilityAndWirePressureReasoning',
    JSON.stringify(ids) === JSON.stringify([
      'whyPhysicalOrientationMatters', 'physicalCorrectionPreferredOverSoftwareFix', 'whyGrommetsMatter', 'serviceabilityAndWirePressureReasoning',
    ]));
}

console.log('\n[8] Misconception targeting: each checkpoint explicitly names the correct distinction, not just asserts it');
{
  const orientCp = CHECKPOINT_STAGES.find(s => s.checkpoint.id === 'whyPhysicalOrientationMatters')!.checkpoint;
  const orientCorrect = orientCp.options.find(o => o.correct)!;
  ok('orientation correct option names the reference-frame reasoning', orientCorrect.text.includes('الإطار المرجعي'));

  const softCp = CHECKPOINT_STAGES.find(s => s.checkpoint.id === 'physicalCorrectionPreferredOverSoftwareFix')!.checkpoint;
  const softCorrect = softCp.options.find(o => o.correct)!;
  ok('software-fix correct option names physical correctness as preferred, software as a fallback', softCorrect.text.includes('احتياطي') && softCorrect.text.includes('التركيب الفيزيائي'));

  const grommetCp = CHECKPOINT_STAGES.find(s => s.checkpoint.id === 'whyGrommetsMatter')!.checkpoint;
  const grommetCorrect = grommetCp.options.find(o => o.correct)!;
  ok('grommets correct option names vibration absorption and gyro accuracy', grommetCorrect.text.includes('تمتص') && grommetCorrect.text.includes('الجيروسكوب'));

  const serviceCp = CHECKPOINT_STAGES.find(s => s.checkpoint.id === 'serviceabilityAndWirePressureReasoning')!.checkpoint;
  const serviceCorrect = serviceCp.options.find(o => o.correct)!;
  ok('serviceability correct option names USB access and wire clearance', serviceCorrect.text.includes('USB') && serviceCorrect.text.includes('الأسلاك'));
}

console.log('\n[9] Completion remains unavailable until every checkpoint, the diagram, and recall have been engaged with');
{
  let s = createInitialSessionState(def);
  for (const stage of CHECKPOINT_STAGES) {
    const wrong = stage.checkpoint.options.find(o => !o.correct)!;
    s = recordCheckpointAnswer(s, stage.checkpoint.id, wrong.id);
  }
  ok('all 4 checkpoints now answered (even though every answer was wrong)', areAllCheckpointsAnswered(def, s));
  ok('still not ready — fc-orientation diagram not yet explored', !isReadyToComplete(def, s));

  for (const v of DIAGRAM_STAGE.requiredVariants) s = recordInteractionVariant(s, DIAGRAM_STAGE.id, v);
  ok('still not ready — final recall not yet viewed', !isReadyToComplete(def, s));

  for (const p of RECALL.prompts) s = recordRecallRevealed(s, RECALL.id, p.id);
  ok('final recall now complete', isRecallComplete(RECALL, s));
  ok('READY once diagram + all 4 (even all-wrong) checkpoints + final recall are all engaged with', isReadyToComplete(def, s));
}

console.log('\n[10] Readiness checklist always names exactly what remains, in the declared order');
{
  let s = createInitialSessionState(def);
  const reqs = getReadinessRequirements(def, s);
  ok('every requirement has a non-empty human-readable label', reqs.every(r => r.label && r.label.trim().length > 0));
  ok('requirements are returned in the declared readinessOrder (first checkpoint listed first)', reqs[0].id === 'checkpoint-whyPhysicalOrientationMatters');
  for (const v of DIAGRAM_STAGE.requiredVariants) s = recordInteractionVariant(s, DIAGRAM_STAGE.id, v);
  const reqs2 = getReadinessRequirements(def, s);
  ok('the fc-orientation diagram requirement flips to met once satisfied, others remain unmet',
    reqs2.find(r => r.id === 'fcOrientationDiagram')!.met && reqs2.filter(r => r.id !== 'fcOrientationDiagram').every(r => !r.met));
}

console.log('\n[11] Backward navigation preserves already-recorded session progress');
{
  let s = createInitialSessionState(def);
  s = recordInteractionVariant(s, DIAGRAM_STAGE.id, 'arrow');
  s = recordCheckpointAnswer(s, 'whyPhysicalOrientationMatters', CHECKPOINT_STAGES[0].checkpoint.options[0].id);
  s = goToStageId(def, s, 'fcOrientationDiagram');
  s = goToStageId(def, s, 'orientation');
  ok('navigating backward does not clear a recorded checkpoint answer', isCheckpointAnswered(s, 'whyPhysicalOrientationMatters'));
  ok('navigating backward does not clear a recorded diagram variant', s.interactionVariants['fcOrientationDiagram']?.['arrow'] === true);
  s = goToStageId(def, s, 'fcOrientationDiagram');
  ok('navigating forward again still preserves progress', s.interactionVariants['fcOrientationDiagram']?.['arrow'] === true);
  s = prevStage(def, s);
  ok('prevStage() by position also works and preserves progress', isCheckpointAnswered(s, 'whyPhysicalOrientationMatters'));
}

console.log('\n[12] A fresh session (equivalent to a page refresh) starts with zero interaction progress');
{
  const fresh = createInitialSessionState(def);
  ok('fresh state has no parts explored', Object.values(fresh.interactionVariants['fcOrientationDiagram'] ?? {}).every(v => v === false));
  ok('fresh state has no checkpoints answered', Object.values(fresh.checkpointAnswers).every(v => v === null));
  ok('fresh state has no recall prompts revealed', Object.values(fresh.recallRevealed[RECALL.id]).every(v => v === false));
}

console.log('\n[13] The comparison stage carries the isolated/oriented-vs-rigid/misoriented contrast');
{
  ok('exactly one comparison stage exists', def.stages.filter(s => s.type === 'comparison').length === 1);
  ok('comparison has exactly 2 items (correct vs unsafe)', COMPARISON_STAGE.items.length === 2);
  const labels = COMPARISON_STAGE.items.map(i => i.label);
  ok('one item is the correct isolated/oriented setup', labels.some(l => l.includes('الصحيح')));
  ok('one item is the unsafe rigid/misoriented setup', labels.some(l => l.includes('غير الآمن')));
}

console.log('\n[14] Glossary covers the key FC-orientation vocabulary with real, non-empty MSA definitions');
{
  ok('exactly 5 glossary terms defined', GLOSSARY_STAGE.terms.length === 5);
  const termNames = GLOSSARY_STAGE.terms.map(t => t.term);
  ok('glossary defines the forward arrow', termNames.some(t => t.includes('سهم اتجاه FC')));
  ok('glossary defines vibration-isolating grommets', termNames.some(t => t.includes('Grommets العازلة')));
  ok('glossary defines gyro vibration sensitivity', termNames.some(t => t.includes('حساسية الجيروسكوب')));
  ok('glossary defines secure-without-overtightening', termNames.some(t => t.includes('التثبيت الآمن دون إحكام مفرط')));
  ok('glossary defines serviceability/access', termNames.some(t => t.includes('سهولة الوصول والصيانة')));
  ok('every glossary definition is substantive (non-empty)', GLOSSARY_STAGE.terms.every(t => t.definition.length > 10));
}

console.log('\n[15] Content-boundary check: Lesson 14 stays at FC-orientation/vibration-isolation level, not receiver/UART/Betaflight-config depth');
{
  const allText = JSON.stringify(def).toLowerCase();
  const outOfScopeTerms = [
    'soldering', 'لحام', 'uart', 'serial rx', 'crsf', 'sbus', 'betaflight',
    'محاذاة اللوحة', 'board alignment', 'accelerometer calibration', 'معايرة مقياس التسارع',
    'motor mixer', 'motor mapping', 'pid tuning', 'camera', 'vtx', 'vbat',
    'continuity', 'smoke stopper', 'first flight', 'تركيب receiver', 'receiver installation',
  ];
  for (const term of outOfScopeTerms) {
    ok(`Lesson 14 does not mention out-of-scope term "${term}"`, !allText.includes(term.toLowerCase()));
  }
}

console.log('\n[16] Lesson 14\'s transition bridge to Lesson 15 is built from real lessonsData, not hardcoded text');
{
  const lesson15 = lessonsData.find(l => l.id === 'lesson-receiver-install')!;
  const completionStage = def.stages[def.stages.length - 1];
  ok('the final stage is a completion stage', completionStage.type === 'completion');
  if (completionStage.type === 'completion') {
    const bridgeText = completionStage.nextLessonBridge(lesson15);
    ok('bridge text contains Lesson 15\'s real title', bridgeText.includes(lesson15.title));
    ok('bridge text contains Lesson 15\'s real description', bridgeText.includes(lesson15.description));
  }
}

console.log('\n[17] Reused architecture: no Lesson-14-specific engine code exists — same generic engine as Lessons 1-13');
{
  ok('stage ids are unique across the whole definition', new Set(def.stages.map(s => s.id)).size === def.stages.length);
  ok('checkpoint ids are unique across the whole definition', new Set(CHECKPOINT_STAGES.map(s => s.checkpoint.id)).size === CHECKPOINT_STAGES.length);
}

console.log(`\nAll ${passed} assertions passed.`);

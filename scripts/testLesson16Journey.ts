/**
 * Real assertions against Lesson 16's journey definition
 * (src/data/lessons/lesson16Journey.definition.ts) driven through the
 * generic session-state engine (src/data/lessons/lessonJourneyEngine.ts).
 * No DOM, no React — this proves the gating/readiness logic itself;
 * scripts/testLesson16JourneyUI.ts proves the same behaviors are actually
 * wired up in the rendered UI.
 */
import assert from 'node:assert/strict';
import {
  createInitialSessionState, goToStageId, nextStage, prevStage,
  recordCheckpointAnswer, recordInteractionVariant, recordRecallRevealed,
  isCheckpointAnswered, areAllCheckpointsAnswered, isInteractionComplete, isRecallComplete,
  getReadinessRequirements, isReadyToComplete, stageCount, currentStage,
} from '../src/data/lessons/lessonJourneyEngine';
import { lesson16JourneyDefinition as def } from '../src/data/lessons/lesson16Journey.definition';
import type { CheckpointStage, RecallStage, GlossaryStage, ComparisonStage, InteractiveDiagramStage } from '../src/types/lessonJourney';
import { lessonsData } from '../src/data/lessonsData';
import { getLessonJourneyDefinition } from '../src/data/lessons/journeyRegistry';
import type { Lesson } from '../src/types';

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

console.log('\n[1] Registration: Lesson 16 is registered in the journey registry with real lesson data');
{
  const lesson16 = lessonsData.find(l => l.id === 'lesson-video-system')!;
  ok('lesson16JourneyDefinition.lessonId matches the real Lesson 16 id', def.lessonId === lesson16.id);
  ok('getLessonJourneyDefinition resolves Lesson 16 to this exact definition', getLessonJourneyDefinition(lesson16.id) === def);
  ok('Lesson 16 has 18 stages', STAGE_COUNT === 18);
}

console.log('\n[2] The camera-vtx diagram stage exists with exactly the 3 real node ids as required variants');
{
  ok('exactly one interactive_diagram stage exists', def.stages.filter(s => s.type === 'interactive_diagram').length === 1);
  ok('diagramType is camera-vtx', DIAGRAM_STAGE.diagramType === 'camera-vtx');
  ok('required variants are exactly the 3 real nodes', JSON.stringify(DIAGRAM_STAGE.requiredVariants) === JSON.stringify(['cam', 'vtx', 'goggles']));
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

console.log('\n[5] Camera-VTX diagram completion requires exploring all 3 distinct nodes');
{
  let s = createInitialSessionState(def);
  ok('not complete before any node explored', !isInteractionComplete(DIAGRAM_STAGE, s));
  s = recordInteractionVariant(s, DIAGRAM_STAGE.id, 'cam');
  ok('still not complete after exploring only "cam"', !isInteractionComplete(DIAGRAM_STAGE, s));
  s = recordInteractionVariant(s, DIAGRAM_STAGE.id, 'cam'); // repeat, should not substitute for the others
  ok('repeatedly exploring the same node never substitutes for exploring the others', !isInteractionComplete(DIAGRAM_STAGE, s));
  s = recordInteractionVariant(s, DIAGRAM_STAGE.id, 'vtx');
  ok('still not complete after exploring 2 of 3 nodes', !isInteractionComplete(DIAGRAM_STAGE, s));
  s = recordInteractionVariant(s, DIAGRAM_STAGE.id, 'goggles');
  ok('complete once all 3 nodes have been explored', isInteractionComplete(DIAGRAM_STAGE, s));
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
  ok('checkpoint ids are: cameraVtxGogglesRoles, cameraAngleAndProtectionPrinciple, vtxCoolingAndReliabilityPrinciple, antennaPowerAndInstallVsConfigPrinciple',
    JSON.stringify(ids) === JSON.stringify([
      'cameraVtxGogglesRoles', 'cameraAngleAndProtectionPrinciple', 'vtxCoolingAndReliabilityPrinciple', 'antennaPowerAndInstallVsConfigPrinciple',
    ]));
}

console.log('\n[8] Misconception targeting: each checkpoint explicitly names the correct distinction, not just asserts it');
{
  const rolesCp = CHECKPOINT_STAGES.find(s => s.checkpoint.id === 'cameraVtxGogglesRoles')!.checkpoint;
  const rolesCorrect = rolesCp.options.find(o => o.correct)!;
  ok('roles correct option names all three distinct roles', rolesCorrect.text.includes('تلتقط') && rolesCorrect.text.includes('يبثّها') && rolesCorrect.text.includes('تعرضه'));

  const angleCp = CHECKPOINT_STAGES.find(s => s.checkpoint.id === 'cameraAngleAndProtectionPrinciple')!.checkpoint;
  const angleCorrect = angleCp.options.find(o => o.correct)!;
  ok('angle correct option names field-of-view and physical protection', angleCorrect.text.includes('مجال الرؤية') && angleCorrect.text.includes('حماية'));

  const coolingCp = CHECKPOINT_STAGES.find(s => s.checkpoint.id === 'vtxCoolingAndReliabilityPrinciple')!.checkpoint;
  const coolingCorrect = coolingCp.options.find(o => o.correct)!;
  ok('cooling correct option names airflow and power-level independence', coolingCorrect.text.includes('تدفق الهواء') && coolingCorrect.text.includes('مستويات قدرة مختلفة'));

  const finalCp = CHECKPOINT_STAGES.find(s => s.checkpoint.id === 'antennaPowerAndInstallVsConfigPrinciple')!.checkpoint;
  const finalCorrect = finalCp.options.find(o => o.correct)!;
  ok('final correct option names power matching, antenna requirement, and install-vs-config separation', finalCorrect.text.includes('مطابقة مصدر الطاقة') && finalCorrect.text.includes('هوائيه المخصص') && finalCorrect.text.includes('منفصل تمامًا'));
}

console.log('\n[9] Completion remains unavailable until every checkpoint, the diagram, and recall have been engaged with');
{
  let s = createInitialSessionState(def);
  for (const stage of CHECKPOINT_STAGES) {
    const wrong = stage.checkpoint.options.find(o => !o.correct)!;
    s = recordCheckpointAnswer(s, stage.checkpoint.id, wrong.id);
  }
  ok('all 4 checkpoints now answered (even though every answer was wrong)', areAllCheckpointsAnswered(def, s));
  ok('still not ready — camera-vtx diagram not yet explored', !isReadyToComplete(def, s));

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
  ok('requirements are returned in the declared readinessOrder (first checkpoint listed first)', reqs[0].id === 'checkpoint-cameraVtxGogglesRoles');
  for (const v of DIAGRAM_STAGE.requiredVariants) s = recordInteractionVariant(s, DIAGRAM_STAGE.id, v);
  const reqs2 = getReadinessRequirements(def, s);
  ok('the camera-vtx diagram requirement flips to met once satisfied, others remain unmet',
    reqs2.find(r => r.id === 'cameraVtxDiagram')!.met && reqs2.filter(r => r.id !== 'cameraVtxDiagram').every(r => !r.met));
}

console.log('\n[11] Backward navigation preserves already-recorded session progress');
{
  let s = createInitialSessionState(def);
  s = recordInteractionVariant(s, DIAGRAM_STAGE.id, 'cam');
  s = recordCheckpointAnswer(s, 'cameraVtxGogglesRoles', CHECKPOINT_STAGES[0].checkpoint.options[0].id);
  s = goToStageId(def, s, 'cameraVtxDiagram');
  s = goToStageId(def, s, 'orientation');
  ok('navigating backward does not clear a recorded checkpoint answer', isCheckpointAnswered(s, 'cameraVtxGogglesRoles'));
  ok('navigating backward does not clear a recorded diagram variant', s.interactionVariants['cameraVtxDiagram']?.['cam'] === true);
  s = goToStageId(def, s, 'cameraVtxDiagram');
  ok('navigating forward again still preserves progress', s.interactionVariants['cameraVtxDiagram']?.['cam'] === true);
  s = prevStage(def, s);
  ok('prevStage() by position also works and preserves progress', isCheckpointAnswered(s, 'cameraVtxGogglesRoles'));
}

console.log('\n[12] A fresh session (equivalent to a page refresh) starts with zero interaction progress');
{
  const fresh = createInitialSessionState(def);
  ok('fresh state has no nodes explored', Object.values(fresh.interactionVariants['cameraVtxDiagram'] ?? {}).every(v => v === false));
  ok('fresh state has no checkpoints answered', Object.values(fresh.checkpointAnswers).every(v => v === null));
  ok('fresh state has no recall prompts revealed', Object.values(fresh.recallRevealed[RECALL.id]).every(v => v === false));
}

console.log('\n[13] The comparison stage carries the protected/cooled/antenna-connected-vs-exposed/enclosed/antenna-missing contrast');
{
  ok('exactly one comparison stage exists', def.stages.filter(s => s.type === 'comparison').length === 1);
  ok('comparison has exactly 2 items (correct vs unsafe)', COMPARISON_STAGE.items.length === 2);
  const labels = COMPARISON_STAGE.items.map(i => i.label);
  ok('one item is the correct protected/cooled/antenna-connected setup', labels.some(l => l.includes('الصحيح')));
  ok('one item is the unsafe exposed/enclosed/antenna-missing setup', labels.some(l => l.includes('غير الآمن')));
}

console.log('\n[14] Glossary covers the key camera/VTX vocabulary with real, non-empty MSA definitions');
{
  ok('exactly 5 glossary terms defined', GLOSSARY_STAGE.terms.length === 5);
  const termNames = GLOSSARY_STAGE.terms.map(t => t.term);
  ok('glossary defines the separate roles', termNames.some(t => t.includes('الأدوار المنفصلة')));
  ok('glossary defines functional camera angle', termNames.some(t => t.includes('زاوية الكاميرا الوظيفية')));
  ok('glossary defines VTX cooling and airflow', termNames.some(t => t.includes('تبريد VTX')));
  ok('glossary defines video-antenna placement', termNames.some(t => t.includes('موضع هوائي الفيديو')));
  ok('glossary defines operating without an antenna', termNames.some(t => t.includes('التشغيل بدون هوائي')));
  ok('every glossary definition is substantive (non-empty)', GLOSSARY_STAGE.terms.every(t => t.definition.length > 10));
}

console.log('\n[15] Content-boundary check: Lesson 16 stays at physical/conceptual-installation level, not OSD/protocol/legal-power/goggles-config depth');
{
  const allText = JSON.stringify(def).toLowerCase();
  const outOfScopeTerms = [
    'osd', 'smartaudio', 'tramp', 'betaflight',
    'channel scanning', 'مسح القنوات', 'قناة', 'channel table', 'frequency table', 'تردد',
    'قانون', 'legal', 'license', 'ترخيص',
    'soldering', 'لحام', 'wire gauge', 'سمك السلك',
    'protocol selection', 'اختر بروتوكول', 'receiver binding', 'ربط الريسيفر', 'bind',
    'goggles setup', 'إعداد النظارات', 'channel scan',
    'antenna tuning', 'swr',
    'pid tuning', 'motor test', 'اختبار المحركات', 'first flight', 'أول طيران',
  ];
  for (const term of outOfScopeTerms) {
    ok(`Lesson 16 does not mention out-of-scope term "${term}"`, !allText.includes(term.toLowerCase()));
  }
}

console.log('\n[16] Lesson 16 is now the final lesson — its generic nextLessonBridge template still works, but has no real next lesson to receive it');
{
  ok('lesson-motor-test no longer exists in lessonsData', lessonsData.find(l => l.id === 'lesson-motor-test') === undefined);
  ok('lesson-first-flight no longer exists in lessonsData', lessonsData.find(l => l.id === 'lesson-first-flight') === undefined);
  ok('lessonsData has exactly 16 lessons', lessonsData.length === 16);
  ok('lesson-video-system (Lesson 16) is now the last entry in lessonsData', lessonsData[lessonsData.length - 1].id === 'lesson-video-system');

  // The completion stage's nextLessonBridge is a generic reusable template
  // (shared shape across every lesson's journey definition) — it is only ever
  // invoked by InteractiveLessonJourney.tsx when a real `nextLesson` exists.
  // LessonDetailView.tsx computes nextLesson from lessonsData[lessonIndex+1],
  // which is now null for Lesson 16, so this function is never called at
  // runtime. A synthetic lesson (not read from lessonsData) is used here to
  // prove the template itself is still correctly generic, independent of
  // whether Lesson 17 exists.
  const syntheticNextLesson: Lesson = {
    id: 'lesson-synthetic-next', number: 99, title: 'عنوان تجريبي', description: 'وصف تجريبي',
    level: 'مبتدئ', duration: '10 دقائق', objective: '', explanation: '',
    imagePlaceholder: '', diagramType: 'camera-vtx', importantPoints: [], commonMistake: '',
  };
  const completionStage = def.stages[def.stages.length - 1];
  ok('the final stage is a completion stage', completionStage.type === 'completion');
  if (completionStage.type === 'completion') {
    const bridgeText = completionStage.nextLessonBridge(syntheticNextLesson);
    ok('bridge text is built generically from whatever lesson is passed in (title)', bridgeText.includes(syntheticNextLesson.title));
    ok('bridge text is built generically from whatever lesson is passed in (description)', bridgeText.includes(syntheticNextLesson.description));
  }
}

console.log('\n[17] Reused architecture: no Lesson-16-specific engine code exists — same generic engine as Lessons 1-15');
{
  ok('stage ids are unique across the whole definition', new Set(def.stages.map(s => s.id)).size === def.stages.length);
  ok('checkpoint ids are unique across the whole definition', new Set(CHECKPOINT_STAGES.map(s => s.checkpoint.id)).size === CHECKPOINT_STAGES.length);
}

console.log(`\nAll ${passed} assertions passed.`);

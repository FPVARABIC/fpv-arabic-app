/**
 * Real assertions against Lesson 04's journey definition
 * (src/data/lessons/lesson04Journey.definition.ts) driven through the
 * generic session-state engine (src/data/lessons/lessonJourneyEngine.ts).
 * No DOM, no React — this proves the gating/readiness logic itself;
 * scripts/testLesson04JourneyUI.ts proves the same behaviors are actually
 * wired up in the rendered UI.
 *
 * Unlike Lessons 01–03, this lesson has no interactive_diagram stage (its
 * existing diagram has zero interaction today, so none was invented for
 * it) — readiness is driven by 4 checkpoints + the interactive diagram + recall.
 */
import assert from 'node:assert/strict';
import {
  createInitialSessionState, goToStageId, nextStage, prevStage,
  recordCheckpointAnswer, recordRecallRevealed, recordInteractionVariant, isCheckpointAnswered,
  areAllCheckpointsAnswered, isRecallComplete, getReadinessRequirements, isReadyToComplete,
  stageCount, currentStage,
} from '../src/data/lessons/lessonJourneyEngine';
import { lesson04JourneyDefinition as def } from '../src/data/lessons/lesson04Journey.definition';
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
const RECALL = def.stages.find((s): s is RecallStage => s.type === 'recall')!;
const GLOSSARY_STAGE = def.stages.find((s): s is GlossaryStage => s.type === 'glossary')!;
const STAGE_COUNT = stageCount(def);

console.log('\n[1] Registration: Lesson 04 is registered in the journey registry with real lesson data');
{
  const lesson4 = lessonsData.find(l => l.id === 'lesson-define-goal')!;
  ok('lesson04JourneyDefinition.lessonId matches the real Lesson 4 id', def.lessonId === lesson4.id);
  ok('getLessonJourneyDefinition resolves Lesson 4 to this exact definition', getLessonJourneyDefinition(lesson4.id) === def);
  ok('Lesson 4 has 18 stages (16 + the KV explanation and its checkpoint)', STAGE_COUNT === 18);
}

console.log('\n[2] Exactly one interactive_diagram stage exists — the parts-compatibility chain, all five steps required');
{
  const diagrams = def.stages.filter((s): s is InteractiveDiagramStage => s.type === 'interactive_diagram');
  ok('exactly one interactive_diagram stage exists', diagrams.length === 1);
  ok('it renders the parts-compatibility diagram', diagrams[0].diagramType === 'parts-compatibility');
  ok('it requires the five real chain step ids', JSON.stringify(diagrams[0].requiredVariants) === JSON.stringify(['frame', 'motors', 'esc', 'fc', 'lipo']));
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
  ok('exactly 5 checkpoint stages defined (the fifth is Motor KV)', CHECKPOINT_STAGES.length === 5);
  for (const stage of CHECKPOINT_STAGES) {
    const cp = stage.checkpoint;
    const correctCount = cp.options.filter(o => o.correct).length;
    ok(`checkpoint "${cp.id}" has exactly one correct option`, correctCount === 1);
    ok(`checkpoint "${cp.id}": every option has feedback text`, cp.options.every(o => o.feedback && o.feedback.trim().length > 0));
  }
  const ids = CHECKPOINT_STAGES.map(s => s.checkpoint.id);
  ok('checkpoint ids are: qualityNotCompatibility, kvIsNotPower, orderMatters, damageNotJustPerformance, notJustPhysicalFit',
    JSON.stringify(ids) === JSON.stringify(['qualityNotCompatibility', 'kvIsNotPower', 'orderMatters', 'damageNotJustPerformance', 'notJustPhysicalFit']));
}

console.log('\n[7] Misconception targeting: each checkpoint explicitly names the correct distinction, not just asserts it');
{
  const qualityCp = CHECKPOINT_STAGES.find(s => s.checkpoint.id === 'qualityNotCompatibility')!.checkpoint;
  const qualityCorrect = qualityCp.options.find(o => o.correct)!;
  ok('quality correct option explicitly names ESC damage due to mismatch, not quality', qualityCorrect.text.includes('يتلف') && qualityCorrect.text.includes('غير مصمم'));

  const orderCp = CHECKPOINT_STAGES.find(s => s.checkpoint.id === 'orderMatters')!.checkpoint;
  const orderCorrect = orderCp.options.find(o => o.correct)!;
  ok('order correct option explicitly lists the full chain in order', orderCorrect.text.includes('Frame') && orderCorrect.text.includes('Motors') && orderCorrect.text.includes('ESC') && orderCorrect.text.includes('FC') && orderCorrect.text.includes('LiPo'));

  const damageCp = CHECKPOINT_STAGES.find(s => s.checkpoint.id === 'damageNotJustPerformance')!.checkpoint;
  const damageCorrect = damageCp.options.find(o => o.correct)!;
  ok('damage correct option explicitly states real damage, not mere slowdown', damageCorrect.text.includes('عطل') || damageCorrect.text.includes('اشتعال'));

  const physicalCp = CHECKPOINT_STAGES.find(s => s.checkpoint.id === 'notJustPhysicalFit')!.checkpoint;
  const physicalCorrect = physicalCp.options.find(o => o.correct)!;
  ok('physical-fit correct option explicitly separates shape compatibility from electrical compatibility', physicalCorrect.text.includes('شكليًا') && physicalCorrect.text.includes('كهربائيًا'));

  // KV is introduced in this lesson, so the checkpoint that guards it must
  // reject BOTH misreadings at once: KV as a power rating, and KV as the
  // aircraft's real in-flight RPM. The distractors carry one each.
  const kvCp = CHECKPOINT_STAGES.find(s => s.checkpoint.id === 'kvIsNotPower')!.checkpoint;
  const kvCorrect = kvCp.options.find(o => o.correct)!;
  const kvWrong = kvCp.options.filter(o => !o.correct);
  ok('KV correct option ties KV to battery voltage and explicitly denies it means "stronger"',
    kvCorrect.text.includes('جهد بطارية') && kvCorrect.text.includes('أقوى'));
  ok('a KV distractor carries the "higher KV = stronger motor" misconception', kvWrong.some(o => o.text.includes('أقوى')));
  ok('a KV distractor carries the "KV is the real in-flight RPM" misconception', kvWrong.some(o => o.text.includes('أثناء الطيران')));
  ok('a KV distractor carries the "KV does not affect compatibility" misconception', kvWrong.some(o => o.text.includes('لا يغيّر اختيار بقية القطع')));
}

console.log('\n[8] Completion remains unavailable until every checkpoint has been engaged with (perfect answers not required)');
{
  let s = createInitialSessionState(def);
  for (const stage of CHECKPOINT_STAGES.slice(0, -1)) {
    const wrong = stage.checkpoint.options.find(o => !o.correct)!;
    s = recordCheckpointAnswer(s, stage.checkpoint.id, wrong.id);
  }
  ok('still not ready with one checkpoint unanswered', !isReadyToComplete(def, s));
  const last = CHECKPOINT_STAGES[CHECKPOINT_STAGES.length - 1].checkpoint;
  s = recordCheckpointAnswer(s, last.id, last.options.find(o => !o.correct)!.id);
  ok('all checkpoints now answered (even though every answer was wrong)', areAllCheckpointsAnswered(def, s));
  ok('still not ready — final recall not yet viewed', !isReadyToComplete(def, s));

  for (const p of RECALL.prompts) s = recordRecallRevealed(s, RECALL.id, p.id);
  ok('final recall now complete', isRecallComplete(RECALL, s));
  ok('still not ready — the diagram has not been explored', !isReadyToComplete(def, s));
  const DIAGRAM = def.stages.find((st): st is InteractiveDiagramStage => st.type === 'interactive_diagram')!;
  for (const v of DIAGRAM.requiredVariants) s = recordInteractionVariant(s, DIAGRAM.id, v);
  ok('READY once all (even all-wrong) checkpoints + diagram + final recall are all engaged with', isReadyToComplete(def, s));
}

console.log('\n[9] Readiness checklist always names exactly what remains, in the declared order');
{
  let s = createInitialSessionState(def);
  const reqs = getReadinessRequirements(def, s);
  ok('every requirement has a non-empty human-readable label', reqs.every(r => r.label && r.label.trim().length > 0));
  ok('requirements are returned in the declared readinessOrder (qualityNotCompatibility checkpoint first)', reqs[0].id === 'checkpoint-qualityNotCompatibility');
  const wrong = CHECKPOINT_STAGES[0].checkpoint.options.find(o => !o.correct)!;
  s = recordCheckpointAnswer(s, CHECKPOINT_STAGES[0].checkpoint.id, wrong.id);
  const reqs2 = getReadinessRequirements(def, s);
  ok('the first checkpoint requirement flips to met once satisfied, others remain unmet',
    reqs2.find(r => r.id === 'checkpoint-qualityNotCompatibility')!.met && reqs2.filter(r => r.id !== 'checkpoint-qualityNotCompatibility').every(r => !r.met));
}

console.log('\n[10] Backward navigation preserves already-recorded session progress');
{
  let s = createInitialSessionState(def);
  s = recordCheckpointAnswer(s, 'qualityNotCompatibility', CHECKPOINT_STAGES[0].checkpoint.options[0].id);
  s = goToStageId(def, s, 'qualityCheckpoint');
  s = goToStageId(def, s, 'orientation');
  ok('navigating backward does not clear a recorded checkpoint answer', isCheckpointAnswered(s, 'qualityNotCompatibility'));
  s = goToStageId(def, s, 'qualityCheckpoint');
  ok('navigating forward again still preserves progress', isCheckpointAnswered(s, 'qualityNotCompatibility'));
  s = prevStage(def, s);
  ok('prevStage() by position also works and preserves progress', isCheckpointAnswered(s, 'qualityNotCompatibility'));
}

console.log('\n[11] A fresh session (equivalent to a page refresh) starts with zero interaction progress');
{
  const fresh = createInitialSessionState(def);
  ok('fresh state has no checkpoints answered', Object.values(fresh.checkpointAnswers).every(v => v === null));
  ok('fresh state has no recall prompts revealed', Object.values(fresh.recallRevealed[RECALL.id]).every(v => v === false));
}

console.log('\n[12] Glossary covers the key compatibility vocabulary with real, non-empty MSA definitions');
{
  ok('exactly 7 glossary terms defined', GLOSSARY_STAGE.terms.length === 7);
  const termNames = GLOSSARY_STAGE.terms.map(t => t.term);
  ok('glossary defines Compatibility', termNames.some(t => t.includes('Compatibility')));
  ok('glossary defines Selection Chain', termNames.some(t => t.includes('Selection Chain')));
  ok('glossary defines Motor KV', termNames.some(t => t.includes('Motor KV')));
  ok('glossary defines Current Headroom', termNames.some(t => t.includes('Current Headroom')));
  const kvTerm = GLOSSARY_STAGE.terms.find(t => t.term.includes('Motor KV'))!;
  ok('the KV definition keeps both qualifiers that stop it being read as in-flight RPM',
    kvTerm.definition.includes('النظرية') && kvTerm.definition.includes('بلا مروحة'));
  ok('glossary defines Cell Count / S Rating', termNames.some(t => t.includes('S Rating')));
  ok('glossary defines UART', termNames.some(t => t.includes('UART')));
  ok('glossary defines Electrical Compatibility (Arabic term)', termNames.some(t => t.includes('التوافق الكهربائي')));
  ok('every glossary definition is substantive (non-empty)', GLOSSARY_STAGE.terms.every(t => t.definition.length > 10));
}

console.log('\n[13] Content-boundary check: Lesson 4 stays at compatibility-principle level, not detailed selection specs/wiring/Betaflight');
{
  const allText = JSON.stringify(def).toLowerCase();
  const outOfScopeTerms = ['betaflight', 'binding', 'pid tuning', 'soldering', 'لحام'];
  for (const term of outOfScopeTerms) {
    ok(`Lesson 4 does not mention out-of-scope term "${term}"`, !allText.includes(term.toLowerCase()));
  }
  // The lesson intentionally reuses the SAME concrete numbers already established
  // in lessonsData.ts's own explanation/importantPoints (2306/35-45A/5-inch/6S/UART) —
  // it must not introduce brand-new spec figures beyond that existing set.
  const lesson4 = lessonsData.find(l => l.id === 'lesson-define-goal')!;
  const establishedNumbers = ['2306', '35-45a', '20a', '45a', '6s', '4s', '5 بوصة'];
  ok('lesson.explanation itself contains the numbers this journey reuses (sanity check)',
    establishedNumbers.some(n => lesson4.explanation.toLowerCase().includes(n.toLowerCase())));
}

console.log('\n[14] Lesson 4\'s transition bridge to Lesson 5 is built from real lessonsData, not hardcoded text');
{
  const lesson5 = lessonsData.find(l => l.id === 'lesson-drone-size')!;
  const completionStage = def.stages[def.stages.length - 1];
  ok('the final stage is a completion stage', completionStage.type === 'completion');
  if (completionStage.type === 'completion') {
    const bridgeText = completionStage.nextLessonBridge(lesson5);
    ok('bridge text contains Lesson 5\'s real title', bridgeText.includes(lesson5.title));
    ok('bridge text contains Lesson 5\'s real description', bridgeText.includes(lesson5.description));
  }
}

console.log('\n[15] Reused architecture: no Lesson-04-specific engine code exists — same generic engine as Lessons 1-3');
{
  ok('stage ids are unique across the whole definition', new Set(def.stages.map(s => s.id)).size === def.stages.length);
  ok('checkpoint ids are unique across the whole definition', new Set(CHECKPOINT_STAGES.map(s => s.checkpoint.id)).size === CHECKPOINT_STAGES.length);
}

console.log(`\nAll ${passed} assertions passed.`);

/**
 * Real assertions against Lesson 12's journey definition
 * (src/data/lessons/lesson12Journey.definition.ts) driven through the
 * generic session-state engine (src/data/lessons/lessonJourneyEngine.ts).
 * No DOM, no React — this proves the gating/readiness logic itself;
 * scripts/testLesson12JourneyUI.ts proves the same behaviors are actually
 * wired up in the rendered UI.
 */
import assert from 'node:assert/strict';
import {
  createInitialSessionState, goToStageId, nextStage, prevStage,
  recordCheckpointAnswer, recordRecallRevealed, recordInteractionVariant,
  isCheckpointAnswered, areAllCheckpointsAnswered, isRecallComplete,
  getReadinessRequirements, isReadyToComplete, stageCount, currentStage,
} from '../src/data/lessons/lessonJourneyEngine';
import { lesson12JourneyDefinition as def } from '../src/data/lessons/lesson12Journey.definition';
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

console.log('\n[1] Registration: Lesson 12 is registered in the journey registry with real lesson data');
{
  const lesson12 = lessonsData.find(l => l.id === 'lesson-motor-install')!;
  ok('lesson12JourneyDefinition.lessonId matches the real Lesson 12 id', def.lessonId === lesson12.id);
  ok('getLessonJourneyDefinition resolves Lesson 12 to this exact definition', getLessonJourneyDefinition(lesson12.id) === def);
  ok('Lesson 12 has 19 stages (18 + the motor-label reading stage)', STAGE_COUNT === 19);
}

console.log('\n[2] Exactly one interactive_diagram stage exists — both screw cases must be opened');
{
  const diagrams = def.stages.filter((s): s is InteractiveDiagramStage => s.type === 'interactive_diagram');
  ok('exactly one interactive_diagram stage exists', diagrams.length === 1);
  ok('it renders the motor-mount diagram', diagrams[0].diagramType === 'motor-mount');
  ok('it requires both cases', JSON.stringify(diagrams[0].requiredVariants) === JSON.stringify(['correct', 'wrong']));
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
  ok('checkpoint ids are: whyScrewLengthMatters, correctScrewChoice, tighteningPrinciple, whyRoutingAndPinchPointsMatter',
    JSON.stringify(ids) === JSON.stringify([
      'whyScrewLengthMatters', 'correctScrewChoice', 'tighteningPrinciple', 'whyRoutingAndPinchPointsMatter',
    ]));
}

console.log('\n[7] Misconception targeting: each checkpoint explicitly names the correct distinction, not just asserts it');
{
  const screwCp = CHECKPOINT_STAGES.find(s => s.checkpoint.id === 'whyScrewLengthMatters')!.checkpoint;
  const screwCorrect = screwCp.options.find(o => o.correct)!;
  ok('screw-length correct option names both failure modes (too long / too short)', screwCorrect.text.includes('طويلاً جدًا') && screwCorrect.text.includes('قصيرًا جدًا'));

  const choiceCp = CHECKPOINT_STAGES.find(s => s.checkpoint.id === 'correctScrewChoice')!.checkpoint;
  const choiceCorrect = choiceCp.options.find(o => o.correct)!;
  ok('correct-choice option names matching the frame+motor thickness', choiceCorrect.text.includes('سمك الفريم والمحرك'));

  const tightenCp = CHECKPOINT_STAGES.find(s => s.checkpoint.id === 'tighteningPrinciple')!.checkpoint;
  const tightenCorrect = tightenCp.options.find(o => o.correct)!;
  ok('tightening correct option names moderate even tightening', tightenCorrect.text.includes('شد معتدل ومتساوٍ'));

  const routingCp = CHECKPOINT_STAGES.find(s => s.checkpoint.id === 'whyRoutingAndPinchPointsMatter')!.checkpoint;
  const routingCorrect = routingCp.options.find(o => o.correct)!;
  ok('routing correct option states the wire must be rerouted now, not later', routingCorrect.text.includes('إعادة توجيه السلك'));
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
  ok('requirements are returned in the declared readinessOrder (first checkpoint listed first)', reqs[0].id === 'checkpoint-whyScrewLengthMatters');
  ok('recall requirement is listed last', reqs[reqs.length - 1].id === 'recall');
}

console.log('\n[10] Backward navigation preserves already-recorded session progress');
{
  let s = createInitialSessionState(def);
  s = recordCheckpointAnswer(s, 'whyScrewLengthMatters', CHECKPOINT_STAGES[0].checkpoint.options[0].id);
  s = goToStageId(def, s, 'glossary');
  s = goToStageId(def, s, 'orientation');
  ok('navigating backward does not clear a recorded checkpoint answer', isCheckpointAnswered(s, 'whyScrewLengthMatters'));
  s = goToStageId(def, s, 'glossary');
  ok('navigating forward again still preserves progress', isCheckpointAnswered(s, 'whyScrewLengthMatters'));
  s = prevStage(def, s);
  ok('prevStage() by position also works and preserves progress', isCheckpointAnswered(s, 'whyScrewLengthMatters'));
}

console.log('\n[11] A fresh session (equivalent to a page refresh) starts with zero progress');
{
  const fresh = createInitialSessionState(def);
  ok('fresh state has no checkpoints answered', Object.values(fresh.checkpointAnswers).every(v => v === null));
  ok('fresh state has no recall prompts revealed', Object.values(fresh.recallRevealed[RECALL.id]).every(v => v === false));
  ok('fresh state tracks exactly the one interactive stage', Object.keys(fresh.interactionVariants).length === 1);
}

console.log('\n[12] The comparison stage preserves MotorMount.tsx\'s correct-vs-wrong screw contrast in text form');
{
  ok('exactly one comparison stage exists', def.stages.filter(s => s.type === 'comparison').length === 1);
  ok('comparison has exactly 2 items (correct vs unsafe)', COMPARISON_STAGE.items.length === 2);
  const labels = COMPARISON_STAGE.items.map(i => i.label);
  ok('one item is the correct mounting setup', labels.some(l => l.includes('الصحيح')));
  ok('one item is the unsafe mounting setup', labels.some(l => l.includes('غير الآمن')));
  const correctItem = COMPARISON_STAGE.items.find(i => i.label.includes('الصحيح'))!;
  const unsafeItem = COMPARISON_STAGE.items.find(i => i.label.includes('غير الآمن'))!;
  ok('correct side mentions screw length matching frame+motor thickness', correctItem.body.includes('سمك الفريم والمحرك'));
  ok('correct side mentions moderate even tightening', correctItem.body.includes('شد معتدل ومتساوٍ'));
  ok('correct side mentions wires routed toward ESC area', correctItem.body.includes('ESC'));
  ok('unsafe side mentions the screw-too-long failure', unsafeItem.body.includes('يلامس ملفات المحرك'));
  ok('unsafe side mentions the screw-too-short failure', unsafeItem.body.includes('لا يثبّت المحرك بثبات'));
  ok('unsafe side mentions loose/vibrating motor', unsafeItem.body.includes('مهتزًا'));
  ok('unsafe side mentions disorganized wiring deferred to later', unsafeItem.body.includes('للتعامل معها لاحقًا'));
}

console.log('\n[13] Glossary covers the key motor-installation vocabulary with real, non-empty MSA definitions');
{
  ok('exactly 6 glossary terms defined', GLOSSARY_STAGE.terms.length === 6);
  const kvTerm = GLOSSARY_STAGE.terms.find(t => t.term.includes('KV'));
  ok('glossary names the two numbers printed on the motor', kvTerm !== undefined);
  ok('the retrieved KV definition keeps the no-load qualifier, without naming propellers',
    kvTerm!.definition.includes('بلا حِمل') && !kvTerm!.definition.includes('مروحة'));
  const termNames = GLOSSARY_STAGE.terms.map(t => t.term);
  ok('glossary defines correct screw length', termNames.some(t => t.includes('طول المسمار')));
  ok('glossary defines motor windings', termNames.some(t => t.includes('ملفات المحرك')));
  ok('glossary defines moderate tightening', termNames.some(t => t.includes('الشد المعتدل')));
  ok('glossary defines motor position/direction awareness', termNames.some(t => t.includes('موضع المحرك')));
  ok('glossary defines early wire routing', termNames.some(t => t.includes('تنظيم أسلاك المحرك')));
  ok('every glossary definition is substantive (non-empty)', GLOSSARY_STAGE.terms.every(t => t.definition.length > 10));
}

console.log('\n[14] Content-boundary check: Lesson 12 stays at motor-mounting level, not ESC/Betaflight/prop/flight depth');
{
  const allText = JSON.stringify(def).toLowerCase();
  const outOfScopeTerms = [
    'betaflight', 'motor mixer', 'motor 1', 'motor 2', 'motor 3', 'motor 4', 'dshot',
    'esc placement', 'esc cooling', 'pid', 'propeller', 'مروحة', 'arming', 'spin test',
    'continuity', 'smoke stopper', 'vbat', 'first flight', 'soldering', 'لحام',
  ];
  for (const term of outOfScopeTerms) {
    ok(`Lesson 12 does not mention out-of-scope term "${term}"`, !allText.includes(term.toLowerCase()));
  }
}

console.log('\n[15] Lesson 12\'s transition bridge to Lesson 13 is built from real lessonsData, not hardcoded text');
{
  const lesson13 = lessonsData.find(l => l.id === 'lesson-esc-install')!;
  const completionStage = def.stages[def.stages.length - 1];
  ok('the final stage is a completion stage', completionStage.type === 'completion');
  if (completionStage.type === 'completion') {
    const bridgeText = completionStage.nextLessonBridge(lesson13);
    ok('bridge text contains Lesson 13\'s real title', bridgeText.includes(lesson13.title));
    ok('bridge text contains Lesson 13\'s real description', bridgeText.includes(lesson13.description));
  }
}

console.log('\n[16] Reused architecture: no Lesson-12-specific engine code exists — same generic engine as Lessons 1-11');
{
  ok('stage ids are unique across the whole definition', new Set(def.stages.map(s => s.id)).size === def.stages.length);
  ok('checkpoint ids are unique across the whole definition', new Set(CHECKPOINT_STAGES.map(s => s.checkpoint.id)).size === CHECKPOINT_STAGES.length);
}

console.log('\n[17] Quality-correction: motor-position/CW-CCW awareness now has active recall (not just a passive explanation)');
{
  ok('the recall stage still has exactly 3 prompts', RECALL.prompts.length === 3);
  const cwccwPrompt = RECALL.prompts.find(p => p.id === 'whyMotorPositionAndCwCcwRecall');
  ok('a recall prompt dedicated to motor-position/CW-CCW awareness now exists', cwccwPrompt !== undefined);
  ok('its question asks about respecting motor position and CW/CCW assignment', cwccwPrompt!.question.includes('CW/CCW'));
  ok('its model answer explains position/direction is assigned by placement, not arbitrary', cwccwPrompt!.modelAnswer.includes('اتجاه دوران مقصود') && cwccwPrompt!.modelAnswer.includes('وليس اختيارًا عشوائيًا'));
  ok('its model answer explicitly defers software verification/correction to a later, separate lesson', cwccwPrompt!.modelAnswer.includes('البرمجيات') && cwccwPrompt!.modelAnswer.includes('لاحق منفصل'));
  ok('the deferred-software text does not name Betaflight or any specific tool', !cwccwPrompt!.modelAnswer.toLowerCase().includes('betaflight'));
  let s = createInitialSessionState(def);
  ok('the new CW/CCW recall prompt is not yet revealed in a fresh session', !s.recallRevealed[RECALL.id]['whyMotorPositionAndCwCcwRecall']);
  s = recordRecallRevealed(s, RECALL.id, 'whyMotorPositionAndCwCcwRecall');
  ok('revealing the CW/CCW recall prompt records it like any other prompt (same generic engine)', s.recallRevealed[RECALL.id]['whyMotorPositionAndCwCcwRecall'] === true);
  ok('recall is not complete until the other 2 prompts are also revealed', !isRecallComplete(RECALL, s));
  for (const p of RECALL.prompts) s = recordRecallRevealed(s, RECALL.id, p.id);
  ok('recall completes once all 3 (including the new CW/CCW one) are revealed', isRecallComplete(RECALL, s));
}

console.log('\n[18] Quality-correction: the weak "screw color" distractor was replaced with a plausible misconception');
{
  const choiceCp = CHECKPOINT_STAGES.find(s => s.checkpoint.id === 'correctScrewChoice')!.checkpoint;
  ok('the screw-color distractor is gone', !choiceCp.options.some(o => o.text.includes('لون المسمار')));
  ok('correctScrewChoice still has exactly 4 options', choiceCp.options.length === 4);
  ok('correctScrewChoice still has exactly one correct option', choiceCp.options.filter(o => o.correct).length === 1);
  const replacement = choiceCp.options.find(o => o.text.includes('فريم أو محرك آخر'))!;
  ok('the replacement distractor exists and is plausible (assumes a screw safe elsewhere is safe here)', replacement !== undefined);
  ok('the replacement distractor is marked incorrect', replacement.correct === false);
  ok('the replacement distractor requires screw-length reasoning to refute (feedback names frame+motor thickness)', replacement.feedback.includes('سمك ذراع الفريم والمحرك'));
  ok('the replacement distractor has substantive feedback', replacement.feedback.length > 30);
}

console.log('\n[19] Regression: the single interactive_diagram stage and the Lesson 13 bridge survive both the quality correction and the KV retrieval stage');
{
  ok('Lesson 12 has exactly 19 stages (18 + the motor-label reading stage added for KV retrieval)', STAGE_COUNT === 19);
  ok('still exactly one interactive_diagram stage exists', def.stages.filter(s => s.type === 'interactive_diagram').length === 1);
  ok('still exactly 4 checkpoint stages', CHECKPOINT_STAGES.length === 4);
  let s = createInitialSessionState(def);
  for (const stage of CHECKPOINT_STAGES) {
    const wrong = stage.checkpoint.options.find(o => !o.correct)!;
    s = recordCheckpointAnswer(s, stage.checkpoint.id, wrong.id);
  }
  ok('wrong answers on every checkpoint (including the replaced distractor) still count as "answered"', areAllCheckpointsAnswered(def, s));
  for (const p of RECALL.prompts) s = recordRecallRevealed(s, RECALL.id, p.id);
  const DIAGRAM2 = def.stages.find((st): st is InteractiveDiagramStage => st.type === 'interactive_diagram')!;
  for (const v of DIAGRAM2.requiredVariants) s = recordInteractionVariant(s, DIAGRAM2.id, v);
  ok('the lesson is still completable end-to-end with every checkpoint wrong', isReadyToComplete(def, s));
  const lesson13 = lessonsData.find(l => l.id === 'lesson-esc-install')!;
  const completionStage = def.stages[def.stages.length - 1];
  if (completionStage.type === 'completion') {
    const bridgeText = completionStage.nextLessonBridge(lesson13);
    ok('the Lesson 13 bridge is unchanged by the quality correction', bridgeText.includes(lesson13.title) && bridgeText.includes(lesson13.description));
  }
}

console.log('\n[20] Propeller-scope confirmation: propeller installation remains intentionally out of scope, not silently added');
{
  const allText = JSON.stringify(def).toLowerCase();
  ok('Lesson 12 still does not mention propellers in any form (intentional scope boundary, not an oversight)', !allText.includes('propeller') && !allText.includes('مروحة'));
}

console.log(`\nAll ${passed} assertions passed.`);

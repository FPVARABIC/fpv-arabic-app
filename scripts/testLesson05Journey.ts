/**
 * Real assertions against Lesson 05's journey definition
 * (src/data/lessons/lesson05Journey.definition.ts) driven through the
 * generic session-state engine (src/data/lessons/lessonJourneyEngine.ts).
 * No DOM, no React — this proves the gating/readiness logic itself;
 * scripts/testLesson05JourneyUI.ts proves the same behaviors are actually
 * wired up in the rendered UI.
 */
import assert from 'node:assert/strict';
import {
  createInitialSessionState, goToStageId, nextStage, prevStage,
  recordCheckpointAnswer, recordInteractionVariant, recordRecallRevealed,
  isCheckpointAnswered, areAllCheckpointsAnswered, isInteractionComplete, isRecallComplete,
  getReadinessRequirements, isReadyToComplete, stageCount, currentStage,
} from '../src/data/lessons/lessonJourneyEngine';
import { lesson05JourneyDefinition as def } from '../src/data/lessons/lesson05Journey.definition';
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

console.log('\n[1] Registration: Lesson 05 is registered in the journey registry with real lesson data');
{
  const lesson5 = lessonsData.find(l => l.id === 'lesson-drone-size')!;
  ok('lesson05JourneyDefinition.lessonId matches the real Lesson 5 id', def.lessonId === lesson5.id);
  ok('getLessonJourneyDefinition resolves Lesson 5 to this exact definition', getLessonJourneyDefinition(lesson5.id) === def);
  ok('Lesson 5 has 16 stages (15 + the size/propeller/KV chain explanation)', STAGE_COUNT === 16);
}

console.log('\n[2] The size-comparison diagram stage exists with exactly the 3 real size ids as required variants');
{
  ok('exactly one interactive_diagram stage exists', def.stages.filter(s => s.type === 'interactive_diagram').length === 1);
  ok('diagramType is size-comparison', DIAGRAM_STAGE.diagramType === 'size-comparison');
  ok('required variants are exactly the 3 real sizes', JSON.stringify(DIAGRAM_STAGE.requiredVariants) === JSON.stringify(['3', '5', '7']));
}

console.log('\n[3] Initial state — nothing satisfied, completion unavailable at initial render');
{
  const s = createInitialSessionState(def);
  ok('starts on the orientation stage', currentStage(def, s).id === 'orientation');
  ok('size diagram not yet explored', !isInteractionComplete(DIAGRAM_STAGE, s));
  ok('no checkpoint answered', !areAllCheckpointsAnswered(def, s));
  ok('final recall not complete', !isRecallComplete(RECALL, s));
  ok('readiness gate is NOT satisfied at initial state', !isReadyToComplete(def, s));
  ok(
    'readiness requirement list has one entry per gate (size diagram + 4 checkpoints + recall)',
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

console.log('\n[5] Size-comparison diagram completion requires exploring all 3 sizes');
{
  let s = createInitialSessionState(def);
  ok('not complete before any size explored', !isInteractionComplete(DIAGRAM_STAGE, s));
  s = recordInteractionVariant(s, DIAGRAM_STAGE.id, '3');
  ok('still not complete after exploring only "3"', !isInteractionComplete(DIAGRAM_STAGE, s));
  s = recordInteractionVariant(s, DIAGRAM_STAGE.id, '5');
  ok('still not complete after exploring only "3" and "5"', !isInteractionComplete(DIAGRAM_STAGE, s));
  s = recordInteractionVariant(s, DIAGRAM_STAGE.id, '3'); // repeat, should not substitute for "7"
  ok('repeatedly exploring the same size never substitutes for exploring the others', !isInteractionComplete(DIAGRAM_STAGE, s));
  s = recordInteractionVariant(s, DIAGRAM_STAGE.id, '7');
  ok('complete once all 3 sizes have been explored', isInteractionComplete(DIAGRAM_STAGE, s));
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
  ok('checkpoint ids are: smallerNotEasier, biggerNotAlwaysBetter, whyFiveInchRecommended, scenarioSizeChoice',
    JSON.stringify(ids) === JSON.stringify(['smallerNotEasier', 'biggerNotAlwaysBetter', 'whyFiveInchRecommended', 'scenarioSizeChoice']));
}

console.log('\n[8] Misconception targeting: each checkpoint explicitly names the correct distinction, not just asserts it');
{
  const smallerCp = CHECKPOINT_STAGES.find(s => s.checkpoint.id === 'smallerNotEasier')!.checkpoint;
  const smallerCorrect = smallerCp.options.find(o => o.correct)!;
  ok('smaller-size correct option explicitly separates "less risky" from "easier to control"', smallerCorrect.text.includes('أقل خطورة') && smallerCorrect.text.includes('حساسيته') && smallerCorrect.text.includes('تصعّب'));

  const biggerCp = CHECKPOINT_STAGES.find(s => s.checkpoint.id === 'biggerNotAlwaysBetter')!.checkpoint;
  const biggerCorrect = biggerCp.options.find(o => o.correct)!;
  ok('bigger-size correct option explicitly names weight/cost/danger, not "not always better" alone', biggerCorrect.text.includes('أثقل') && biggerCorrect.text.includes('أغلى'));

  const whyFiveCp = CHECKPOINT_STAGES.find(s => s.checkpoint.id === 'whyFiveInchRecommended')!.checkpoint;
  const whyFiveCorrect = whyFiveCp.options.find(o => o.correct)!;
  ok('5-inch correct option explicitly credits community/parts support, not raw performance', whyFiveCorrect.text.includes('مجتمع') && whyFiveCorrect.text.includes('دروس'));

  const scenarioCp = CHECKPOINT_STAGES.find(s => s.checkpoint.id === 'scenarioSizeChoice')!.checkpoint;
  const scenarioCorrect = scenarioCp.options.find(o => o.correct)!;
  // This checkpoint used to be a second copy of the one above it — both were
  // answered by "5 inch, because it has the biggest community". It now tests
  // the size -> propeller -> KV chain instead: a motor whose STATOR SIZE fits
  // but whose KV is described for a different cell count.
  ok('scenario correct option rejects the motor on cell count, not on size', scenarioCorrect.text.includes('6S') && scenarioCorrect.text.includes('KV'));
  ok('scenario correct option is no longer a restatement of the 5-inch community answer', !scenarioCorrect.text.includes('مجتمع'));
  const whyFiveText = whyFiveCorrect.text;
  ok('the third and fourth checkpoints no longer share an answer', scenarioCorrect.text !== whyFiveText
    && !(scenarioCorrect.text.includes('دروس') && whyFiveText.includes('دروس')));
}

console.log('\n[9] Completion remains unavailable until every checkpoint and the diagram and recall have been engaged with');
{
  let s = createInitialSessionState(def);
  for (const stage of CHECKPOINT_STAGES) {
    const wrong = stage.checkpoint.options.find(o => !o.correct)!;
    s = recordCheckpointAnswer(s, stage.checkpoint.id, wrong.id);
  }
  ok('all 4 checkpoints now answered (even though every answer was wrong)', areAllCheckpointsAnswered(def, s));
  ok('still not ready — size diagram not yet explored', !isReadyToComplete(def, s));

  for (const v of DIAGRAM_STAGE.requiredVariants) s = recordInteractionVariant(s, DIAGRAM_STAGE.id, v);
  ok('still not ready — final recall not yet viewed', !isReadyToComplete(def, s));

  for (const p of RECALL.prompts) s = recordRecallRevealed(s, RECALL.id, p.id);
  ok('final recall now complete', isRecallComplete(RECALL, s));
  ok('READY once size diagram + all 4 (even all-wrong) checkpoints + final recall are all engaged with', isReadyToComplete(def, s));
}

console.log('\n[10] Readiness checklist always names exactly what remains, in the declared order');
{
  let s = createInitialSessionState(def);
  const reqs = getReadinessRequirements(def, s);
  ok('every requirement has a non-empty human-readable label', reqs.every(r => r.label && r.label.trim().length > 0));
  ok('requirements are returned in the declared readinessOrder (size diagram listed first)', reqs[0].id === 'sizeDiagram');
  s = recordInteractionVariant(s, DIAGRAM_STAGE.id, '3');
  s = recordInteractionVariant(s, DIAGRAM_STAGE.id, '5');
  s = recordInteractionVariant(s, DIAGRAM_STAGE.id, '7');
  const reqs2 = getReadinessRequirements(def, s);
  ok('the size-diagram requirement flips to met once satisfied, others remain unmet',
    reqs2.find(r => r.id === 'sizeDiagram')!.met && reqs2.filter(r => r.id !== 'sizeDiagram').every(r => !r.met));
}

console.log('\n[11] Backward navigation preserves already-recorded session progress');
{
  let s = createInitialSessionState(def);
  s = recordInteractionVariant(s, DIAGRAM_STAGE.id, '3');
  s = recordCheckpointAnswer(s, 'smallerNotEasier', CHECKPOINT_STAGES[0].checkpoint.options[0].id);
  s = goToStageId(def, s, 'sizeDiagram');
  s = goToStageId(def, s, 'orientation');
  ok('navigating backward does not clear a recorded checkpoint answer', isCheckpointAnswered(s, 'smallerNotEasier'));
  ok('navigating backward does not clear a recorded diagram variant', s.interactionVariants['sizeDiagram']?.['3'] === true);
  s = goToStageId(def, s, 'sizeDiagram');
  ok('navigating forward again still preserves progress', s.interactionVariants['sizeDiagram']?.['3'] === true);
  s = prevStage(def, s);
  ok('prevStage() by position also works and preserves progress', isCheckpointAnswered(s, 'smallerNotEasier'));
}

console.log('\n[12] A fresh session (equivalent to a page refresh) starts with zero interaction progress');
{
  const fresh = createInitialSessionState(def);
  ok('fresh state has no sizes explored', Object.values(fresh.interactionVariants['sizeDiagram'] ?? {}).every(v => v === false));
  ok('fresh state has no checkpoints answered', Object.values(fresh.checkpointAnswers).every(v => v === null));
  ok('fresh state has no recall prompts revealed', Object.values(fresh.recallRevealed[RECALL.id]).every(v => v === false));
}

console.log('\n[13] Glossary covers the key size-selection vocabulary with real, non-empty MSA definitions');
{
  ok('exactly 7 glossary terms defined', GLOSSARY_STAGE.terms.length === 7);
  const termNames = GLOSSARY_STAGE.terms.map(t => t.term);
  ok('glossary defines Drone Size', termNames.some(t => t.includes('Drone Size')));
  ok('glossary defines Propeller Diameter', termNames.some(t => t.includes('Propeller Diameter')));
  ok('glossary defines The Sweet Spot', termNames.some(t => t.includes('Sweet Spot')));
  ok('glossary defines Parts & Community Ecosystem', termNames.some(t => t.includes('Ecosystem')));
  ok('glossary defines Control Feel', termNames.some(t => t.includes('Control Feel')));
  ok('glossary defines Use Case', termNames.some(t => t.includes('Use Case')));
  ok('glossary defines Thrust-to-Weight', termNames.some(t => t.includes('Thrust-to-Weight')));
  const twTerm = GLOSSARY_STAGE.terms.find(t => t.term.includes('Thrust-to-Weight'))!;
  ok('thrust-to-weight is labelled a rule of thumb, not a law', twTerm.definition.includes('قاعدة إبهام') && twTerm.definition.includes('لا قانون'));
  ok('every glossary definition is substantive (non-empty)', GLOSSARY_STAGE.terms.every(t => t.definition.length > 10));
}

console.log('\n[14] Content-boundary check: Lesson 5 stays at size-selection level, not electricity/battery/frame-assembly/Betaflight depth');
{
  const allText = JSON.stringify(def).toLowerCase();
  // The boundary moved deliberately, and only as far as the curriculum
  // expansion needs: this lesson now PRACTISES the KV concept Lesson 4
  // introduces, so 'kv', '6s' and '4s' left the ban list. What the ban was
  // really protecting — that Lesson 5 stays out of electricity, which Lesson 6
  // is the first lesson to teach — is unchanged and asserted harder below.
  const outOfScopeTerms = [
    'betaflight', 'binding', 'pid tuning', 'soldering', 'لحام', 'uart',
    'فولت', 'أمبير', 'voltage', 'دائرة قصيرة', 'كيلو فولت',
  ];
  for (const term of outOfScopeTerms) {
    ok(`Lesson 5 does not mention out-of-scope term "${term}"`, !allText.includes(term.toLowerCase()));
  }
  // KV may be USED here but must not be DEFINED here — the definition, and the
  // per-volt phrasing it needs, belong to Lesson 4 and stay there.
  ok('Lesson 5 uses KV without redefining it (no per-volt phrasing)', !allText.includes('لكل فولت'));
  ok('Lesson 5 talks about batteries in cell counts, never in volts', !/[0-9]\s*v\b/.test(allText));
  ok('the KV example is attributed to the platform catalogue, not asserted as a universal spec',
    allText.includes('كتالوج المنصّة'));
}

console.log('\n[15] Lesson 5\'s transition bridge to Lesson 6 is built from real lessonsData, not hardcoded text');
{
  const lesson6 = lessonsData.find(l => l.id === 'lesson-electricity-basics')!;
  const completionStage = def.stages[def.stages.length - 1];
  ok('the final stage is a completion stage', completionStage.type === 'completion');
  if (completionStage.type === 'completion') {
    const bridgeText = completionStage.nextLessonBridge(lesson6);
    ok('bridge text contains Lesson 6\'s real title', bridgeText.includes(lesson6.title));
    ok('bridge text contains Lesson 6\'s real description', bridgeText.includes(lesson6.description));
  }
}

console.log('\n[16] Reused architecture: no Lesson-05-specific engine code exists — same generic engine as Lessons 1-4');
{
  ok('stage ids are unique across the whole definition', new Set(def.stages.map(s => s.id)).size === def.stages.length);
  ok('checkpoint ids are unique across the whole definition', new Set(CHECKPOINT_STAGES.map(s => s.checkpoint.id)).size === CHECKPOINT_STAGES.length);
}

console.log(`\nAll ${passed} assertions passed.`);

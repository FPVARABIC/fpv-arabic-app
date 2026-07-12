/**
 * Real assertions proving src/data/lessons/lessonJourneyEngine.ts is a
 * genuinely generic engine — driven entirely by whatever
 * LessonJourneyDefinition it is given, with no Lesson-01-specific stage ids,
 * checkpoint ids, or requirement ids hardcoded anywhere in the engine.
 *
 * Uses a synthetic, throwaway definition with deliberately different stage
 * ids / checkpoint ids / requirement structure than Lesson 01's, so a
 * regression that secretly still depends on Lesson-01-shaped data would fail
 * here even if scripts/testLesson01Journey.ts still passed.
 */
import assert from 'node:assert/strict';
import {
  createInitialSessionState, currentStage, stageCount, nextStage, prevStage,
  goToStageIndex, goToStageId, stageIndexById,
  recordCheckpointAnswer, recordInteractionVariant, recordRecallRevealed,
  isCheckpointAnswered, areAllCheckpointsAnswered, isInteractionComplete, isRecallComplete,
  getReadinessRequirements, isReadyToComplete,
} from '../src/data/lessons/lessonJourneyEngine';
import type { LessonJourneyDefinition } from '../src/types/lessonJourney';

let passed = 0;
function ok(label: string, cond: boolean) {
  assert.ok(cond, `FAILED: ${label}`);
  console.log(`  ok — ${label}`);
  passed++;
}

// A synthetic 5-stage definition with ids that share nothing with Lesson 01's.
const SYNTHETIC: LessonJourneyDefinition = {
  lessonId: 'synthetic-test-lesson',
  readinessOrder: ['requirement-check-alpha', 'diagram-beta', 'recall-gamma'],
  stages: [
    { id: 'intro-stage', type: 'orientation', title: 'Intro', body: 'Body text.' },
    {
      id: 'quiz-stage',
      type: 'checkpoint',
      title: 'Quiz',
      checkpoint: {
        id: 'check-alpha',
        question: 'Which is correct?',
        options: [
          { id: 'x', correct: false, text: 'Wrong', feedback: 'Not quite, because reasons.' },
          { id: 'y', correct: true, text: 'Right', feedback: 'Correct, because reasons.' },
        ],
      },
    },
    {
      id: 'diagram-stage',
      type: 'interactive_diagram',
      title: 'Diagram',
      diagramType: 'quad-x-layout',
      instructions: 'Explore both variants.',
      requiredVariants: ['north', 'south'],
      requirementLabel: 'Explore both variants',
      hints: { none: 'Nothing explored yet.', partial: { north: 'Try south now.', south: 'Try north now.' } },
    },
    {
      id: 'recall-stage',
      type: 'recall',
      title: 'Recall',
      intro: 'Recall intro.',
      requirementLabel: 'Review the recall prompt',
      prompts: [{ id: 'prompt-1', question: 'What did you learn?', modelAnswer: 'The answer.' }],
    },
    { id: 'done-stage', type: 'completion', title: 'Done', summary: 'Summary.', nextLessonBridge: () => 'Bridge text.' },
  ],
};
// Requirement ids referenced by readinessOrder must match what the engine derives:
// checkpoint -> `checkpoint-${checkpoint.id}`, others -> stage.id. Adjust the
// synthetic readinessOrder to the real derived ids so the ordering test below
// is meaningful rather than accidentally empty.
SYNTHETIC.readinessOrder = ['diagram-stage', 'checkpoint-check-alpha', 'recall-stage'];

console.log('\n[1] A journey definition drives readiness without any Lesson-01 hardcoding');
{
  const s = createInitialSessionState(SYNTHETIC);
  ok('starts on the first stage by array position, not a magic number', currentStage(SYNTHETIC, s).id === 'intro-stage');
  ok('stageCount reflects the given definition (5), not Lesson 01\'s 15', stageCount(SYNTHETIC) === 5);
  ok('not ready initially', !isReadyToComplete(SYNTHETIC, s));
  const reqs = getReadinessRequirements(SYNTHETIC, s);
  ok('exactly 3 requirements derived (1 checkpoint + 1 diagram + 1 recall)', reqs.length === 3);
  ok('every requirement unmet initially', reqs.every(r => !r.met));
}

console.log('\n[2] Requirement ids map to stages correctly, independent of Lesson 01\'s naming');
{
  const s = createInitialSessionState(SYNTHETIC);
  const reqs = getReadinessRequirements(SYNTHETIC, s);
  const checkpointReq = reqs.find(r => r.id === 'checkpoint-check-alpha');
  const diagramReq = reqs.find(r => r.id === 'diagram-stage');
  const recallReq = reqs.find(r => r.id === 'recall-stage');
  ok('checkpoint requirement id is derived as `checkpoint-<checkpoint.id>`', checkpointReq !== undefined);
  ok('checkpoint requirement label is derived from the checkpoint question text', checkpointReq!.label.includes('Which is correct?'));
  ok('interactive_diagram requirement id equals the stage id', diagramReq !== undefined && diagramReq.jumpStageId === 'diagram-stage');
  ok('recall requirement id equals the stage id', recallReq !== undefined && recallReq.jumpStageId === 'recall-stage');
}

console.log('\n[3] Missing requirements are listed and jump targets are derived from definition data (not hardcoded)');
{
  let s = createInitialSessionState(SYNTHETIC);
  s = recordInteractionVariant(s, 'diagram-stage', 'north');
  s = recordInteractionVariant(s, 'diagram-stage', 'south');
  const reqs = getReadinessRequirements(SYNTHETIC, s);
  const unmet = reqs.filter(r => !r.met);
  ok('exactly 2 requirements remain unmet (checkpoint + recall)', unmet.length === 2);
  ok('every unmet requirement carries a jumpStageId that is a real stage id in this definition', unmet.every(r => SYNTHETIC.stages.some(st => st.id === r.jumpStageId)));
  const jumpedTo = goToStageId(SYNTHETIC, s, unmet[0].jumpStageId);
  ok('jumping via a requirement\'s own jumpStageId actually navigates there', currentStage(SYNTHETIC, jumpedTo).id === unmet[0].jumpStageId);
}

console.log('\n[4] readinessOrder controls display order and is definition-owned, not engine-owned');
{
  const s = createInitialSessionState(SYNTHETIC);
  const reqs = getReadinessRequirements(SYNTHETIC, s);
  ok('requirements are returned in the definition\'s declared readinessOrder', reqs.map(r => r.id).join(',') === 'diagram-stage,checkpoint-check-alpha,recall-stage');

  const noOrderDef: LessonJourneyDefinition = { ...SYNTHETIC, readinessOrder: undefined };
  const reqsNoOrder = getReadinessRequirements(noOrderDef, s);
  ok('omitting readinessOrder falls back to stage traversal order', reqsNoOrder.map(r => r.id).join(',') === 'checkpoint-check-alpha,diagram-stage,recall-stage');
}

console.log('\n[5] Different checkpoint/activity ids than Lesson 01 work correctly end-to-end');
{
  let s = createInitialSessionState(SYNTHETIC);
  ok('checkpoint unanswered initially', !isCheckpointAnswered(s, 'check-alpha'));
  s = recordCheckpointAnswer(s, 'check-alpha', 'x'); // wrong answer
  ok('a wrong answer still counts as answered', isCheckpointAnswered(s, 'check-alpha'));
  ok('areAllCheckpointsAnswered reflects the single synthetic checkpoint', areAllCheckpointsAnswered(SYNTHETIC, s));

  const diagramStage = SYNTHETIC.stages.find(st => st.id === 'diagram-stage')!;
  if (diagramStage.type === 'interactive_diagram') {
    ok('diagram not complete before any variant recorded', !isInteractionComplete(diagramStage, s));
    s = recordInteractionVariant(s, 'diagram-stage', 'north');
    ok('still not complete with only one of two required variants', !isInteractionComplete(diagramStage, s));
    s = recordInteractionVariant(s, 'diagram-stage', 'south');
    ok('complete once both custom-named variants are recorded', isInteractionComplete(diagramStage, s));
  }

  const recallStage = SYNTHETIC.stages.find(st => st.id === 'recall-stage')!;
  if (recallStage.type === 'recall') {
    ok('recall not complete before reveal', !isRecallComplete(recallStage, s));
    s = recordRecallRevealed(s, 'recall-stage', 'prompt-1');
    ok('recall complete once its one prompt is revealed', isRecallComplete(recallStage, s));
  }

  ok('fully ready once the synthetic definition\'s own requirements are all met', isReadyToComplete(SYNTHETIC, s));
}

console.log('\n[6] Invalid stage navigation is safely rejected (state unchanged), never throws or wraps around');
{
  const s = createInitialSessionState(SYNTHETIC);
  const negative = goToStageIndex(SYNTHETIC, s, -1);
  ok('negative index navigation is rejected (state unchanged)', negative === s);
  const tooFar = goToStageIndex(SYNTHETIC, s, 999);
  ok('out-of-range index navigation is rejected (state unchanged)', tooFar === s);
  const unknownId = goToStageId(SYNTHETIC, s, 'no-such-stage');
  ok('unknown stage id navigation is rejected (state unchanged)', unknownId === s);
  ok('stageIndexById returns -1 for an unknown id rather than throwing', stageIndexById(SYNTHETIC, 'no-such-stage') === -1);

  let atStart = createInitialSessionState(SYNTHETIC);
  atStart = prevStage(SYNTHETIC, atStart);
  ok('prevStage() at the first stage clamps rather than going negative', atStart.currentStageIndex === 0);
  let atEnd = createInitialSessionState(SYNTHETIC);
  for (let i = 0; i < 20; i++) atEnd = nextStage(SYNTHETIC, atEnd);
  ok('nextStage() repeatedly past the last stage clamps rather than overflowing', atEnd.currentStageIndex === SYNTHETIC.stages.length - 1);
}

console.log('\n[7] An empty/malformed definition is handled safely rather than throwing');
{
  const empty: LessonJourneyDefinition = { lessonId: 'empty-test', stages: [] };
  const s = createInitialSessionState(empty);
  ok('an empty definition produces empty tracking maps without throwing', Object.keys(s.checkpointAnswers).length === 0);
  ok('readiness on an empty definition has no requirements and is trivially ready', getReadinessRequirements(empty, s).length === 0 && isReadyToComplete(empty, s));
  ok('stageCount of an empty definition is 0', stageCount(empty) === 0);
}

console.log(`\nAll ${passed} assertions passed.`);

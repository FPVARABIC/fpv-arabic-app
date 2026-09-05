/**
 * Generic interactive-lesson-journey session-state engine.
 *
 * Pure, framework-agnostic, and driven entirely by a LessonJourneyDefinition
 * (src/types/lessonJourney.ts) — no lesson-specific stage constants live here.
 * The state is plain data and fully serialisable; persisting it is the job of
 * `lessonJourneyPersistence.ts`, which the renderers call. The existing
 * completedLessons storage (useProgress/ProgressContext) is untouched and
 * remains the record that a lesson was completed.
 *
 * Exercised with plain assertions in scripts/testLessonJourneyEngine.ts and
 * the per-lesson scripts/testLessonNNJourney.ts, the same way the rest of
 * this repo tests pure logic.
 */
import type {
  LessonJourneyDefinition, JourneyStage, JourneyRequirement,
  CheckpointStage, InteractiveDiagramStage, RecallStage,
} from '../../types/lessonJourney';

export interface JourneySessionState {
  currentStageIndex: number;
  /** checkpointId -> the option currently selected (the learner may change it). */
  checkpointAnswers: Record<string, string | null>;
  /**
   * checkpointId -> the FIRST option the learner ever chose. Never overwritten,
   * so a quiz result can honestly say «3 of 4 on the first try» even after
   * every wrong answer has since been corrected. Cleared only by
   * `resetCheckpoints`.
   */
  checkpointFirstAnswers: Record<string, string | null>;
  /** stageId -> variant -> whether that variant has been recorded at least once. */
  interactionVariants: Record<string, Record<string, boolean>>;
  /** stageId -> promptId -> whether that recall prompt has been revealed. */
  recallRevealed: Record<string, Record<string, boolean>>;
}

export function createInitialSessionState(definition: LessonJourneyDefinition): JourneySessionState {
  const checkpointAnswers: Record<string, string | null> = {};
  const checkpointFirstAnswers: Record<string, string | null> = {};
  const interactionVariants: Record<string, Record<string, boolean>> = {};
  const recallRevealed: Record<string, Record<string, boolean>> = {};
  for (const stage of definition.stages) {
    if (stage.type === 'checkpoint') {
      checkpointAnswers[stage.checkpoint.id] = null;
      checkpointFirstAnswers[stage.checkpoint.id] = null;
    } else if (stage.type === 'interactive_diagram') {
      interactionVariants[stage.id] = Object.fromEntries(stage.requiredVariants.map(v => [v, false]));
    } else if (stage.type === 'recall') {
      recallRevealed[stage.id] = Object.fromEntries(stage.prompts.map(p => [p.id, false]));
    }
  }
  return { currentStageIndex: 0, checkpointAnswers, checkpointFirstAnswers, interactionVariants, recallRevealed };
}

export function stageCount(definition: LessonJourneyDefinition): number {
  return definition.stages.length;
}

export function currentStage(definition: LessonJourneyDefinition, state: JourneySessionState): JourneyStage {
  return definition.stages[state.currentStageIndex];
}

export function stageIndexById(definition: LessonJourneyDefinition, stageId: string): number {
  return definition.stages.findIndex(s => s.id === stageId);
}

/** Out-of-range navigation is rejected outright (state is returned unchanged). */
export function goToStageIndex(
  definition: LessonJourneyDefinition, state: JourneySessionState, index: number,
): JourneySessionState {
  if (index < 0 || index >= definition.stages.length) return state;
  return { ...state, currentStageIndex: index };
}

export function goToStageId(
  definition: LessonJourneyDefinition, state: JourneySessionState, stageId: string,
): JourneySessionState {
  const idx = stageIndexById(definition, stageId);
  if (idx < 0) return state;
  return goToStageIndex(definition, state, idx);
}

export function nextStage(definition: LessonJourneyDefinition, state: JourneySessionState): JourneySessionState {
  return goToStageIndex(definition, state, Math.min(state.currentStageIndex + 1, definition.stages.length - 1));
}

export function prevStage(definition: LessonJourneyDefinition, state: JourneySessionState): JourneySessionState {
  return goToStageIndex(definition, state, Math.max(state.currentStageIndex - 1, 0));
}

export function recordCheckpointAnswer(
  state: JourneySessionState, checkpointId: string, optionId: string,
): JourneySessionState {
  const first = state.checkpointFirstAnswers ?? {};
  return {
    ...state,
    checkpointAnswers: { ...state.checkpointAnswers, [checkpointId]: optionId },
    checkpointFirstAnswers: { ...first, [checkpointId]: first[checkpointId] ?? optionId },
  };
}

export function recordInteractionVariant(
  state: JourneySessionState, stageId: string, variant: string,
): JourneySessionState {
  return {
    ...state,
    interactionVariants: {
      ...state.interactionVariants,
      [stageId]: { ...state.interactionVariants[stageId], [variant]: true },
    },
  };
}

export function recordRecallRevealed(
  state: JourneySessionState, stageId: string, promptId: string,
): JourneySessionState {
  return {
    ...state,
    recallRevealed: {
      ...state.recallRevealed,
      [stageId]: { ...state.recallRevealed[stageId], [promptId]: true },
    },
  };
}

export function isCheckpointAnswered(state: JourneySessionState, checkpointId: string): boolean {
  return state.checkpointAnswers[checkpointId] != null;
}

export function areAllCheckpointsAnswered(definition: LessonJourneyDefinition, state: JourneySessionState): boolean {
  return definition.stages
    .filter((s): s is CheckpointStage => s.type === 'checkpoint')
    .every(s => isCheckpointAnswered(state, s.checkpoint.id));
}

export function isInteractionComplete(stage: InteractiveDiagramStage, state: JourneySessionState): boolean {
  const recorded = state.interactionVariants[stage.id] || {};
  return stage.requiredVariants.every(v => recorded[v]);
}

export function isRecallComplete(stage: RecallStage, state: JourneySessionState): boolean {
  const recorded = state.recallRevealed[stage.id] || {};
  return stage.prompts.every(p => recorded[p.id]);
}

/** Human-readable checklist for "show clearly what remains" (never a bare disabled button). */
export function getReadinessRequirements(
  definition: LessonJourneyDefinition, state: JourneySessionState,
): JourneyRequirement[] {
  const byId = new Map<string, JourneyRequirement>();
  for (const stage of definition.stages) {
    if (stage.type === 'checkpoint') {
      byId.set(`checkpoint-${stage.checkpoint.id}`, {
        id: `checkpoint-${stage.checkpoint.id}`,
        label: `الإجابة على سؤال: ${stage.checkpoint.question}`,
        met: isCheckpointAnswered(state, stage.checkpoint.id),
        jumpStageId: stage.id,
      });
    } else if (stage.type === 'interactive_diagram') {
      byId.set(stage.id, {
        id: stage.id,
        label: stage.requirementLabel,
        met: isInteractionComplete(stage, state),
        jumpStageId: stage.id,
      });
    } else if (stage.type === 'recall') {
      byId.set(stage.id, {
        id: stage.id,
        label: stage.requirementLabel,
        met: isRecallComplete(stage, state),
        jumpStageId: stage.id,
      });
    }
  }
  const order = definition.readinessOrder ?? [...byId.keys()];
  return order.map(id => byId.get(id)).filter((r): r is JourneyRequirement => r !== undefined);
}

/** The single master gate: is this lesson's completion action allowed to fire? */
export function isReadyToComplete(definition: LessonJourneyDefinition, state: JourneySessionState): boolean {
  return getReadinessRequirements(definition, state).every(r => r.met);
}

// ── Quiz result and retry ─────────────────────────────────────────────────────

export interface QuizMissedItem {
  checkpointId: string;
  /** Stage id, so a result card can offer «go back to this question». */
  stageId: string;
  question: string;
}

export interface QuizResult {
  total: number;
  answered: number;
  /** Correct as currently selected — what the readiness gate cares about. */
  correctNow: number;
  /** Correct on the very first choice — what the learner actually knew. */
  correctFirstTry: number;
  missedFirstTry: QuizMissedItem[];
}

/**
 * The lesson's quiz, scored two ways. `correctFirstTry` is the honest number;
 * `correctNow` is what the learner has since fixed. Neither gates anything —
 * the gate is `isReadyToComplete`, which only asks that each checkpoint has
 * been engaged with.
 */
export function quizResult(definition: LessonJourneyDefinition, state: JourneySessionState): QuizResult {
  const stages = definition.stages.filter((s): s is CheckpointStage => s.type === 'checkpoint');
  const first = state.checkpointFirstAnswers ?? {};
  let answered = 0, correctNow = 0, correctFirstTry = 0;
  const missedFirstTry: QuizMissedItem[] = [];
  for (const stage of stages) {
    const cp = stage.checkpoint;
    const now = state.checkpointAnswers[cp.id];
    const firstChoice = first[cp.id];
    if (now != null) answered++;
    if (now != null && cp.options.find(o => o.id === now)?.correct) correctNow++;
    if (firstChoice != null) {
      if (cp.options.find(o => o.id === firstChoice)?.correct) correctFirstTry++;
      else missedFirstTry.push({ checkpointId: cp.id, stageId: stage.id, question: cp.question });
    }
  }
  return { total: stages.length, answered, correctNow, correctFirstTry, missedFirstTry };
}

/**
 * «أعِد الاختبار»: forget every checkpoint answer — current and first — and
 * stand on the first checkpoint stage. Everything else (diagram explorations,
 * recall reveals) is kept: the learner asked to retake the quiz, not the lesson.
 */
export function resetCheckpoints(definition: LessonJourneyDefinition, state: JourneySessionState): JourneySessionState {
  const checkpointAnswers: Record<string, string | null> = {};
  const checkpointFirstAnswers: Record<string, string | null> = {};
  for (const stage of definition.stages) {
    if (stage.type === 'checkpoint') {
      checkpointAnswers[stage.checkpoint.id] = null;
      checkpointFirstAnswers[stage.checkpoint.id] = null;
    }
  }
  const firstCheckpointIndex = definition.stages.findIndex(s => s.type === 'checkpoint');
  return {
    ...state,
    checkpointAnswers,
    checkpointFirstAnswers,
    currentStageIndex: firstCheckpointIndex === -1 ? state.currentStageIndex : firstCheckpointIndex,
  };
}

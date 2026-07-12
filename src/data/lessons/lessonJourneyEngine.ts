/**
 * Generic interactive-lesson-journey session-state engine.
 *
 * Pure, framework-agnostic, and driven entirely by a LessonJourneyDefinition
 * (src/types/lessonJourney.ts) — no lesson-specific stage constants live here.
 * React-state-only for the duration of a single lesson visit: nothing here is
 * persisted to localStorage/Firestore. The existing completedLessons storage
 * (useProgress/ProgressContext) is untouched and remains the only durable
 * record that a lesson was completed.
 *
 * Exercised with plain assertions in scripts/testLessonJourneyEngine.ts and
 * scripts/testLesson01Journey.ts, the same way the rest of this repo tests
 * pure logic.
 */
import type {
  LessonJourneyDefinition, JourneyStage, JourneyRequirement,
  CheckpointStage, InteractiveDiagramStage, RecallStage,
} from '../../types/lessonJourney';

export interface JourneySessionState {
  currentStageIndex: number;
  checkpointAnswers: Record<string, string | null>;
  /** stageId -> variant -> whether that variant has been recorded at least once. */
  interactionVariants: Record<string, Record<string, boolean>>;
  /** stageId -> promptId -> whether that recall prompt has been revealed. */
  recallRevealed: Record<string, Record<string, boolean>>;
}

export function createInitialSessionState(definition: LessonJourneyDefinition): JourneySessionState {
  const checkpointAnswers: Record<string, string | null> = {};
  const interactionVariants: Record<string, Record<string, boolean>> = {};
  const recallRevealed: Record<string, Record<string, boolean>> = {};
  for (const stage of definition.stages) {
    if (stage.type === 'checkpoint') {
      checkpointAnswers[stage.checkpoint.id] = null;
    } else if (stage.type === 'interactive_diagram') {
      interactionVariants[stage.id] = Object.fromEntries(stage.requiredVariants.map(v => [v, false]));
    } else if (stage.type === 'recall') {
      recallRevealed[stage.id] = Object.fromEntries(stage.prompts.map(p => [p.id, false]));
    }
  }
  return { currentStageIndex: 0, checkpointAnswers, interactionVariants, recallRevealed };
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
  return { ...state, checkpointAnswers: { ...state.checkpointAnswers, [checkpointId]: optionId } };
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

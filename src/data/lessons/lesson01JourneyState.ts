/**
 * Lesson 01 — pure session-progression state machine.
 *
 * React-state-only for the duration of a single lesson visit: nothing here
 * is persisted to localStorage/Firestore. The existing completedLessons
 * storage (useProgress/ProgressContext) is untouched and remains the only
 * durable record that Lesson 01 was completed.
 *
 * Kept framework-agnostic (no React import) so the readiness/gating logic
 * can be exercised with plain assertions, the same way the rest of this
 * repo tests pure logic (see scripts/testLesson01Journey.ts).
 */

import { CHECKPOINTS, RECALL_PROMPTS, type Checkpoint } from './lesson01JourneyContent';

export const STAGE_COUNT = 15;

export const STAGE = {
  ORIENTATION: 1,
  DEFINITION: 2,
  DEFINITION_CHECKPOINT: 3,
  CLASSIFICATION: 4,
  CLASSIFICATION_CHECKPOINT: 5,
  MOTOR_PURPOSE: 6,
  X_LAYOUT: 7,
  MOVEMENT_EXPLANATION: 8,
  REAR_MOTOR_SCENARIO: 9,
  MOVEMENT_CHECKPOINT: 10,
  FPV_COMPARISON: 11,
  MISCONCEPTION_CHECKPOINT: 12,
  GLOSSARY: 13,
  FINAL_RECALL: 14,
  READINESS_GATE: 15,
} as const;

export type CheckpointId = Checkpoint['id'];

export interface Lesson01JourneyState {
  currentStage: number;
  motorsExplored: { cw: boolean; ccw: boolean };
  checkpointAnswers: Record<CheckpointId, string | null>;
  recallRevealed: Record<string, boolean>;
}

export function createInitialJourneyState(): Lesson01JourneyState {
  return {
    currentStage: STAGE.ORIENTATION,
    motorsExplored: { cw: false, ccw: false },
    checkpointAnswers: {
      definition: null,
      classification: null,
      movementPrediction: null,
      fpvDistinction: null,
    },
    recallRevealed: Object.fromEntries(RECALL_PROMPTS.map(p => [p.id, false])),
  };
}

export function goToStage(state: Lesson01JourneyState, stage: number): Lesson01JourneyState {
  if (stage < 1 || stage > STAGE_COUNT) return state;
  return { ...state, currentStage: stage };
}

export function recordMotorExplored(state: Lesson01JourneyState, cw: boolean): Lesson01JourneyState {
  return {
    ...state,
    motorsExplored: {
      cw: state.motorsExplored.cw || cw,
      ccw: state.motorsExplored.ccw || !cw,
    },
  };
}

export function recordCheckpointAnswer(
  state: Lesson01JourneyState,
  checkpointId: CheckpointId,
  optionId: string,
): Lesson01JourneyState {
  return {
    ...state,
    checkpointAnswers: { ...state.checkpointAnswers, [checkpointId]: optionId },
  };
}

export function recordRecallRevealed(state: Lesson01JourneyState, promptId: string): Lesson01JourneyState {
  return {
    ...state,
    recallRevealed: { ...state.recallRevealed, [promptId]: true },
  };
}

export function isXLayoutComplete(state: Lesson01JourneyState): boolean {
  return state.motorsExplored.cw && state.motorsExplored.ccw;
}

export function isCheckpointAnswered(state: Lesson01JourneyState, id: CheckpointId): boolean {
  return state.checkpointAnswers[id] !== null;
}

export function areAllCheckpointsAnswered(state: Lesson01JourneyState): boolean {
  return CHECKPOINTS.every(cp => isCheckpointAnswered(state, cp.id));
}

export function isFinalRecallComplete(state: Lesson01JourneyState): boolean {
  return RECALL_PROMPTS.every(p => state.recallRevealed[p.id] === true);
}

export interface ReadinessRequirement {
  id: string;
  label: string;
  met: boolean;
}

/** Human-readable checklist for "show clearly what remains" (never a bare disabled button). */
export function getReadinessRequirements(state: Lesson01JourneyState): ReadinessRequirement[] {
  return [
    { id: 'xLayout', label: 'استكشاف اتجاه دوران المحركات (تخطيط X التفاعلي)', met: isXLayoutComplete(state) },
    ...CHECKPOINTS.map(cp => ({
      id: `checkpoint-${cp.id}`,
      label: `الإجابة على سؤال: ${cp.question}`,
      met: isCheckpointAnswered(state, cp.id),
    })),
    { id: 'finalRecall', label: 'مراجعة أسئلة الاسترجاع النهائي الثلاثة', met: isFinalRecallComplete(state) },
  ];
}

/** The single master gate: is Lesson 01's completion action allowed to fire? */
export function isReadyToComplete(state: Lesson01JourneyState): boolean {
  return getReadinessRequirements(state).every(r => r.met);
}

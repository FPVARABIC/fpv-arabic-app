/**
 * Persistence for a lesson journey's session state.
 *
 * WHAT WAS WRONG
 * --------------
 * `InteractiveLessonJourney` held everything in `useState`. A learner sixteen
 * stages in — four checkpoints answered, the diagram explored, the recall
 * prompts revealed — lost all of it on a reload, a background tab reclaim, or
 * a tap on the reminder that invited them back and then reopened stage one.
 * The one value that survived was the completion flag.
 *
 * WHAT THIS DOES
 * --------------
 * Turns a `JourneySessionState` into a small, versioned, JSON-safe record and
 * back. The store itself (localStorage on both surfaces) is the caller's; this
 * module never touches `window`, so it runs under Node in the test scripts.
 *
 * WHY THE STAGE IS STORED BY ID, NOT INDEX
 * ----------------------------------------
 * Enrichment inserts stages, and a future edit may add or reorder one. A saved
 * index would then point at a different stage than the learner left. An id
 * survives all of that; an unknown id falls back to the start, which is the
 * honest outcome when a stage has been removed.
 *
 * WHY RESTORE VALIDATES EVERY KEY
 * -------------------------------
 * The record comes from storage the page does not control. A checkpoint that
 * no longer exists, a variant a diagram stopped emitting, a prompt that was
 * renamed — each is dropped against the CURRENT definition, so the restored
 * state can never claim a requirement the engine cannot see.
 *
 * Pure. Exercised by `scripts/testLessonJourneyPersistence.ts`.
 */
import type { LessonJourneyDefinition } from '../../types/lessonJourney';
import {
  createInitialSessionState, stageIndexById, type JourneySessionState,
} from './lessonJourneyEngine';

export const LESSON_JOURNEY_PROGRESS_VERSION = 1 as const;

export interface PersistedJourneyState {
  v: typeof LESSON_JOURNEY_PROGRESS_VERSION;
  stageId: string;
  checkpointAnswers: Record<string, string | null>;
  checkpointFirstAnswers: Record<string, string | null>;
  interactionVariants: Record<string, Record<string, boolean>>;
  recallRevealed: Record<string, Record<string, boolean>>;
  /** Epoch ms. Lets an index page say which lesson was touched most recently. */
  updatedAt: number;
}

/** The whole store: one record per lesson id. */
export type PersistedJourneyMap = Record<string, PersistedJourneyState>;

export function serializeJourneyState(
  definition: LessonJourneyDefinition, state: JourneySessionState, now: number,
): PersistedJourneyState {
  const stage = definition.stages[state.currentStageIndex] ?? definition.stages[0];
  return {
    v: LESSON_JOURNEY_PROGRESS_VERSION,
    stageId: stage?.id ?? '',
    checkpointAnswers: { ...state.checkpointAnswers },
    checkpointFirstAnswers: { ...(state.checkpointFirstAnswers ?? {}) },
    interactionVariants: Object.fromEntries(
      Object.entries(state.interactionVariants).map(([k, v]) => [k, { ...v }]),
    ),
    recallRevealed: Object.fromEntries(
      Object.entries(state.recallRevealed).map(([k, v]) => [k, { ...v }]),
    ),
    updatedAt: now,
  };
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function isOptionMap(x: unknown): x is Record<string, string | null> {
  return isRecord(x) && Object.values(x).every(v => v === null || typeof v === 'string');
}

function isFlagMap(x: unknown): x is Record<string, Record<string, boolean>> {
  return isRecord(x) && Object.values(x).every(v => isRecord(v) && Object.values(v).every(b => typeof b === 'boolean'));
}

/**
 * Rebuild a session from a stored record, against the definition as it is
 * NOW. Returns null when the record is not one of ours (wrong shape, wrong
 * version) so the caller starts fresh instead of guessing.
 */
export function restoreJourneyState(
  definition: LessonJourneyDefinition, raw: unknown,
): JourneySessionState | null {
  if (!isRecord(raw) || raw.v !== LESSON_JOURNEY_PROGRESS_VERSION) return null;
  if (typeof raw.stageId !== 'string') return null;

  const fresh = createInitialSessionState(definition);
  const state: JourneySessionState = {
    ...fresh,
    checkpointAnswers: { ...fresh.checkpointAnswers },
    checkpointFirstAnswers: { ...fresh.checkpointFirstAnswers },
    interactionVariants: Object.fromEntries(
      Object.entries(fresh.interactionVariants).map(([k, v]) => [k, { ...v }]),
    ),
    recallRevealed: Object.fromEntries(
      Object.entries(fresh.recallRevealed).map(([k, v]) => [k, { ...v }]),
    ),
  };

  const idx = stageIndexById(definition, raw.stageId);
  state.currentStageIndex = idx === -1 ? 0 : idx;

  if (isOptionMap(raw.checkpointAnswers)) {
    for (const id of Object.keys(state.checkpointAnswers)) {
      if (id in raw.checkpointAnswers) state.checkpointAnswers[id] = raw.checkpointAnswers[id];
    }
  }
  if (isOptionMap(raw.checkpointFirstAnswers)) {
    for (const id of Object.keys(state.checkpointFirstAnswers)) {
      if (id in raw.checkpointFirstAnswers) state.checkpointFirstAnswers[id] = raw.checkpointFirstAnswers[id];
    }
  }
  if (isFlagMap(raw.interactionVariants)) {
    for (const stageId of Object.keys(state.interactionVariants)) {
      const saved = raw.interactionVariants[stageId];
      if (!saved) continue;
      for (const variant of Object.keys(state.interactionVariants[stageId])) {
        if (saved[variant] === true) state.interactionVariants[stageId][variant] = true;
      }
    }
  }
  if (isFlagMap(raw.recallRevealed)) {
    for (const stageId of Object.keys(state.recallRevealed)) {
      const saved = raw.recallRevealed[stageId];
      if (!saved) continue;
      for (const promptId of Object.keys(state.recallRevealed[stageId])) {
        if (saved[promptId] === true) state.recallRevealed[stageId][promptId] = true;
      }
    }
  }
  return state;
}

/** Parse the whole store. Anything that is not a map of records is treated as empty. */
export function parsePersistedJourneyMap(rawJson: string | null | undefined): PersistedJourneyMap {
  if (!rawJson) return {};
  try {
    const parsed: unknown = JSON.parse(rawJson);
    if (!isRecord(parsed)) return {};
    const out: PersistedJourneyMap = {};
    for (const [lessonId, rec] of Object.entries(parsed)) {
      if (isRecord(rec) && rec.v === LESSON_JOURNEY_PROGRESS_VERSION && typeof rec.stageId === 'string') {
        out[lessonId] = rec as unknown as PersistedJourneyState;
      }
    }
    return out;
  } catch {
    return {};
  }
}

export interface JourneyProgressSummary {
  /** True once the learner has done anything beyond looking at stage one. */
  started: boolean;
  stageNumber: number;
  stageCount: number;
}

/**
 * What an index card needs: has this lesson been started, and how far along.
 * Computed against the current definition so a stale stage id reads as stage 1.
 */
export function summarizeJourneyProgress(
  definition: LessonJourneyDefinition, persisted: PersistedJourneyState | undefined,
): JourneyProgressSummary {
  const stageCount = definition.stages.length;
  if (!persisted) return { started: false, stageNumber: 1, stageCount };
  const idx = stageIndexById(definition, persisted.stageId);
  const stageNumber = (idx === -1 ? 0 : idx) + 1;
  const touched =
    Object.values(persisted.checkpointAnswers ?? {}).some(v => v != null)
    || Object.values(persisted.interactionVariants ?? {}).some(m => Object.values(m).some(Boolean))
    || Object.values(persisted.recallRevealed ?? {}).some(m => Object.values(m).some(Boolean));
  return { started: touched || stageNumber > 1, stageNumber, stageCount };
}

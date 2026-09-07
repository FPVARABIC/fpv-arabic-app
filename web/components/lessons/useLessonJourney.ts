import { useCallback, useEffect, useRef, useState } from 'react';
import type { Lesson } from '@core/types';
import type { LessonJourneyDefinition } from '@core/types/lessonJourney';
import {
  createInitialSessionState, nextStage, prevStage, goToStageId,
  recordCheckpointAnswer, recordInteractionVariant, recordRecallRevealed,
  resetCheckpoints, isReadyToComplete, type JourneySessionState,
} from '@core/data/lessons/lessonJourneyEngine';
import {
  serializeJourneyState, restoreJourneyState,
} from '@core/data/lessons/lessonJourneyPersistence';
import {
  readJourney, writeJourney, readCompletedLessons, markLessonCompleted, markLessonOpened,
} from '@/lib/lessonProgress';

/**
 * One lesson's session, wired to the browser.
 *
 * The engine is pure and knows nothing about storage. This hook is the seam:
 * it restores the saved record on first render (the component is client-only,
 * so the read happens where localStorage exists), writes every change back,
 * and exposes the engine's transitions as callbacks.
 *
 * WHY WRITE ON EVERY CHANGE
 * -------------------------
 * The failure this replaces was total loss on any exit. A debounce would
 * reopen a small window of it — the tab reclaimed between the answer and the
 * write. The record is a few hundred bytes; writing it on each transition
 * costs nothing a person can notice.
 */
export function useLessonJourney(lesson: Lesson, definition: LessonJourneyDefinition) {
  const [state, setState] = useState<JourneySessionState>(() => {
    const saved = readJourney(lesson.id);
    return (saved && restoreJourneyState(definition, saved)) ?? createInitialSessionState(definition);
  });
  const [completed, setCompleted] = useState<string[]>(() => readCompletedLessons());

  // The lesson counts as «last opened» from the moment it renders; the
  // reminder and the resume card read this.
  useEffect(() => { markLessonOpened(lesson.id); }, [lesson.id]);

  // Persist after every transition. The first run re-writes what was just
  // restored, which is harmless and keeps `updatedAt` honest.
  const definitionRef = useRef(definition);
  useEffect(() => { definitionRef.current = definition; }, [definition]);
  useEffect(() => {
    writeJourney(lesson.id, serializeJourneyState(definitionRef.current, state, Date.now()));
  }, [lesson.id, state]);

  const next = useCallback(() => setState(s => nextStage(definition, s)), [definition]);
  const prev = useCallback(() => setState(s => prevStage(definition, s)), [definition]);
  const goto = useCallback((stageId: string) => setState(s => goToStageId(definition, s, stageId)), [definition]);
  const answer = useCallback((checkpointId: string, optionId: string) =>
    setState(s => recordCheckpointAnswer(s, checkpointId, optionId)), []);
  const explore = useCallback((stageId: string, variant: string) =>
    setState(s => recordInteractionVariant(s, stageId, variant)), []);
  const reveal = useCallback((stageId: string, promptId: string) =>
    setState(s => recordRecallRevealed(s, stageId, promptId)), []);
  const retryQuiz = useCallback(() => setState(s => resetCheckpoints(definition, s)), [definition]);

  const isDone = completed.includes(lesson.id);
  const complete = useCallback(() => {
    if (!isReadyToComplete(definition, state)) return;
    setCompleted(markLessonCompleted(lesson.id));
  }, [definition, state, lesson.id]);

  return { state, isDone, next, prev, goto, answer, explore, reveal, retryQuiz, complete };
}

'use client';

/**
 * The web's binding of lesson progress to the browser.
 *
 * WHAT LIVES WHERE
 * ----------------
 *   fpv_progress_lessons          string[]  — completed lesson ids. The SAME
 *                                             key the phone app writes, so a
 *                                             completion on one surface counts
 *                                             on the other when they share an
 *                                             origin.
 *   fpv_last_opened               { lessonId?, roadmapStepId? } — same as phone.
 *   fpv_lesson_journey_progress   PersistedJourneyMap — one record per lesson:
 *                                             stage, answers, explorations,
 *                                             reveals. New in the rebuild; the
 *                                             thing that was never saved before.
 *
 * WHY EVERY READ IS GUARDED
 * -------------------------
 * `localStorage` can be absent (server render, a thumbnail capture), can throw
 * (private mode on some engines, a quota), or can hold text somebody else's
 * code wrote. Every function here returns a sane default instead of failing,
 * and the parsers in the shared core validate shape before anything is trusted.
 *
 * No React in here — plain functions the components call from effects.
 */
import { STORAGE_KEYS } from '@core/utils/storageKeys';
import type { LastOpenedState } from '@core/types';
import {
  parsePersistedJourneyMap, type PersistedJourneyMap, type PersistedJourneyState,
} from '@core/data/lessons/lessonJourneyPersistence';

function storage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function readJson<T>(key: string, fallback: T, guard: (x: unknown) => x is T): T {
  const s = storage();
  if (!s) return fallback;
  try {
    const raw = s.getItem(key);
    if (raw == null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return guard(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  const s = storage();
  if (!s) return;
  try { s.setItem(key, JSON.stringify(value)); } catch { /* quota or blocked — progress stays in memory */ }
}

const isStringArray = (x: unknown): x is string[] => Array.isArray(x) && x.every(v => typeof v === 'string');
const isLastOpened = (x: unknown): x is LastOpenedState =>
  typeof x === 'object' && x !== null && !Array.isArray(x);

// ── Completion ────────────────────────────────────────────────────────────────

export function readCompletedLessons(): string[] {
  return readJson<string[]>(STORAGE_KEYS.PROGRESS_LESSONS, [], isStringArray);
}

export function markLessonCompleted(lessonId: string): string[] {
  const current = readCompletedLessons();
  if (current.includes(lessonId)) return current;
  const next = [...current, lessonId];
  writeJson(STORAGE_KEYS.PROGRESS_LESSONS, next);
  return next;
}

// ── Last opened ───────────────────────────────────────────────────────────────

export function readLastOpened(): LastOpenedState {
  return readJson<LastOpenedState>(STORAGE_KEYS.LAST_OPENED, {}, isLastOpened);
}

export function markLessonOpened(lessonId: string): void {
  writeJson(STORAGE_KEYS.LAST_OPENED, { ...readLastOpened(), lessonId });
}

// ── Journey state ─────────────────────────────────────────────────────────────

export function readJourneyMap(): PersistedJourneyMap {
  const s = storage();
  if (!s) return {};
  try { return parsePersistedJourneyMap(s.getItem(STORAGE_KEYS.LESSON_JOURNEY_PROGRESS)); } catch { return {}; }
}

export function readJourney(lessonId: string): PersistedJourneyState | undefined {
  return readJourneyMap()[lessonId];
}

export function writeJourney(lessonId: string, record: PersistedJourneyState): void {
  writeJson(STORAGE_KEYS.LESSON_JOURNEY_PROGRESS, { ...readJourneyMap(), [lessonId]: record });
}

export function clearJourney(lessonId: string): void {
  const map = readJourneyMap();
  if (!(lessonId in map)) return;
  const { [lessonId]: _dropped, ...rest } = map;
  void _dropped;
  writeJson(STORAGE_KEYS.LESSON_JOURNEY_PROGRESS, rest);
}

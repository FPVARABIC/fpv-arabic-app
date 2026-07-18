import { useEffect, useMemo, useState } from 'react';
import { useProgressContext } from '../../../contexts/ProgressContext';
import { useLocalStorage } from '../../../hooks/useLocalStorage';
import { STORAGE_KEYS } from '../../../utils/storageKeys';
import { lessonsData } from '../../../data/lessonsData';

// Don't resurface more than once per day — a reminder that reappears on
// every single app open is a nag, not a helpful nudge.
const REMINDER_THROTTLE_MS = 24 * 60 * 60 * 1000;

export interface LessonReminder {
  lessonId: string;
  lessonTitle: string;
}

export interface UseLessonReminderResult {
  reminder: LessonReminder | null;
  dismiss: () => void;
}

// Notifications Phase 1, type 4 (lesson-progress reminders) — fully local,
// Firestore-independent by design: no notification doc, no Rules, no
// network call at all. Derived entirely from data this app already tracks
// in localStorage (useProgress.ts's lastOpened.lessonId / completedLessons)
// — the exact same source every other progress feature in this app already
// reads. "Mid-lesson" is simply: the last-opened lesson exists and isn't in
// the completed set yet.
export const useLessonReminder = (): UseLessonReminderResult => {
  const { lastOpened, completedLessons } = useProgressContext();
  const [lastShownAt, setLastShownAt] = useLocalStorage<number>(STORAGE_KEYS.LESSON_REMINDER_LAST_SHOWN, 0);

  // Date.now() must never be called during render (React purity rule) —
  // captured once per mount into state from an effect instead, mirroring
  // CommentsList.tsx's topSortComputedAt pattern. A once-per-mount "now" is
  // all a 24-hour throttle needs; it doesn't need a live-updating clock.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); }, []);

  const reminder = useMemo<LessonReminder | null>(() => {
    if (now === null) return null;
    const lessonId = lastOpened.lessonId;
    if (!lessonId) return null;
    if (completedLessons.includes(lessonId)) return null; // already finished — nothing to remind about
    if (now - lastShownAt < REMINDER_THROTTLE_MS) return null;
    const lesson = lessonsData.find(l => l.id === lessonId);
    if (!lesson) return null; // stale/renamed lesson id — nothing real to point at
    return { lessonId, lessonTitle: lesson.title };
  }, [now, lastOpened.lessonId, completedLessons, lastShownAt]);

  // Called once the reminder has been shown/dismissed — resets the
  // throttle window so it doesn't reappear for another day, but leaves
  // lastOpened/completedLessons themselves untouched (this is purely a
  // "don't nag" timer, not a completion signal).
  const dismiss = () => setLastShownAt(Date.now());

  return { reminder, dismiss };
};

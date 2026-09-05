/**
 * The beginner path's four stations, and the grouping the index pages use.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * `LessonsView` (phone) used to group lessons with `lessonsData.slice(0, 5)`,
 * `.slice(5, 10)` and `.slice(10, 16)`. Adding lesson 17 would have dropped it
 * from the list entirely, and reordering any lesson would have moved it to the
 * wrong station with no compile error and no test to catch it. A lesson now
 * declares its own `track`, and both surfaces group by that.
 *
 * Pure data and pure functions: no React, no router. Consumed by
 * `src/views/LessonsView.tsx` and `web/app/lessons/page.tsx`.
 */
import type { Lesson, LessonTrackId } from '../../types';

export interface LessonTrack {
  id: LessonTrackId;
  titleAr: string;
  subtitleAr: string;
}

/** In path order. The index renders stations in this order, never by lookup. */
export const LESSON_TRACKS: readonly LessonTrack[] = [
  { id: 'basics', titleAr: 'الأساسيات', subtitleAr: 'افهم الفكرة والقطع قبل الشراء' },
  { id: 'power-safety', titleAr: 'الكهرباء والسلامة', subtitleAr: 'تعلّم الطاقة والتوصيل الآمن قبل البطارية' },
  { id: 'assembly', titleAr: 'التركيب', subtitleAr: 'ركّب القطع خطوة بخطوة' },
  { id: 'flight', titleAr: 'الطيران', subtitleAr: 'من العصا إلى أول تحليق' },
];

export interface LessonTrackGroup extends LessonTrack {
  lessons: Lesson[];
}

/**
 * Lessons grouped by station, in station order, each station's lessons in
 * `number` order. A station with no lessons is omitted rather than rendered
 * empty — an empty heading is a bug report, not a section.
 */
export function groupLessonsByTrack(lessons: readonly Lesson[]): LessonTrackGroup[] {
  return LESSON_TRACKS
    .map(track => ({
      ...track,
      lessons: lessons
        .filter(l => l.track === track.id)
        .sort((a, b) => a.number - b.number),
    }))
    .filter(g => g.lessons.length > 0);
}

/**
 * The lesson to suggest next: the first, in number order, that is not yet
 * completed. Null when everything is done. There is deliberately no lock —
 * this is a suggestion the index highlights, never a gate.
 */
export function suggestNextLesson(
  lessons: readonly Lesson[], completedLessonIds: readonly string[],
): Lesson | null {
  const done = new Set(completedLessonIds);
  return [...lessons].sort((a, b) => a.number - b.number).find(l => !done.has(l.id)) ?? null;
}

/** «درس واحد» · «درسان» · «5 دروس» · «17 درساً» — Arabic counts agree with their noun. */
export function lessonCountLabel(n: number): string {
  if (n === 1) return 'درس واحد';
  if (n === 2) return 'درسان';
  if (n >= 3 && n <= 10) return `${n} دروس`;
  return `${n} درساً`;
}

/** Same rule for stages. */
export function stageCountLabel(n: number): string {
  if (n === 1) return 'مرحلة واحدة';
  if (n === 2) return 'مرحلتان';
  if (n >= 3 && n <= 10) return `${n} مراحل`;
  return `${n} مرحلة`;
}

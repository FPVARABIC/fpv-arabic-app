'use client';

import dynamic from 'next/dynamic';

/**
 * The client boundary the journey needs.
 *
 * The journey reads its saved state from localStorage in its very first
 * render, so it can open on the stage the learner left instead of flashing
 * stage one and jumping. That is only possible client-side, hence
 * `ssr: false` — the same trade `ProjectClient` makes for the same reason.
 * The page above stays a server component, so the lesson's title, objective,
 * summary and encyclopedia links are in the HTML for crawlers and for anyone
 * without JavaScript.
 */
const LessonJourney = dynamic(
  () => import('./LessonJourney').then(m => ({ default: m.LessonJourney })),
  {
    ssr: false,
    loading: () => (
      <p className="card-sm" data-testid="lesson-loading" style={{ padding: '18px 20px', color: 'var(--text-dim)' }}>
        جارٍ استرجاع تقدّمك في هذا الدرس…
      </p>
    ),
  },
);

export const LessonJourneyClient: React.FC<{ lessonId: string }> = ({ lessonId }) => (
  <LessonJourney lessonId={lessonId} />
);

'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { lessonsData } from '@core/data/lessonsData';
import { getLessonJourneyDefinition } from '@core/data/lessons/journeyRegistry';
import { enrichJourneyDefinition } from '@core/data/lessons/lessonJourneyEnrich';
import { suggestNextLesson, stageCountLabel } from '@core/data/lessons/lessonTracks';
import {
  summarizeJourneyProgress, restoreJourneyState, type PersistedJourneyMap,
} from '@core/data/lessons/lessonJourneyPersistence';
import { quizResult } from '@core/data/lessons/lessonJourneyEngine';
import { readCompletedLessons, readJourneyMap, readLastOpened } from '@/lib/lessonProgress';
import { href } from '@/lib/webRoutes';

/**
 * The client islands on the lessons index.
 *
 * WHY ISLANDS AND NOT A CLIENT PAGE
 * ---------------------------------
 * The list of seventeen lessons is content: it belongs in the HTML a crawler
 * and a no-JavaScript reader receive, so the page stays a server component.
 * What is personal — which lessons this reader finished, where they stopped,
 * what to suggest next — lives in the browser and is layered on after
 * hydration by the small components below. Each renders NOTHING until mounted,
 * so the server HTML and the first client paint agree and React never has to
 * reconcile a mismatch.
 */

interface Snapshot {
  completed: string[];
  journeys: PersistedJourneyMap;
  lastOpenedLessonId: string | undefined;
}

function useProgressSnapshot(): Snapshot | null {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  useEffect(() => {
    // Storage is read once, after mount — never during render, never on the server.
    const read = () => setSnap({
      completed: readCompletedLessons(),
      journeys: readJourneyMap(),
      lastOpenedLessonId: readLastOpened().lessonId,
    });
    read();
    window.addEventListener('storage', read);
    return () => window.removeEventListener('storage', read);
  }, []);
  return snap;
}

function enriched(lessonId: string) {
  const lesson = lessonsData.find(l => l.id === lessonId);
  const base = lesson ? getLessonJourneyDefinition(lesson.id) : undefined;
  return lesson && base ? enrichJourneyDefinition(base, lesson) : null;
}

/** «تابع من حيث توقّفت» — or, with nothing in progress, «ابدأ من هنا». */
export const ResumeCard: React.FC = () => {
  const snap = useProgressSnapshot();
  if (!snap) return null;

  const done = new Set(snap.completed);
  const inProgress = snap.lastOpenedLessonId && !done.has(snap.lastOpenedLessonId)
    ? lessonsData.find(l => l.id === snap.lastOpenedLessonId) ?? null
    : null;
  const def = inProgress ? enriched(inProgress.id) : null;
  const progress = inProgress && def ? summarizeJourneyProgress(def, snap.journeys[inProgress.id]) : null;

  if (inProgress && def && progress?.started) {
    const to = href({ kind: 'lesson', id: inProgress.id });
    if (!to) return null;
    return (
      <div className="card lj-resume" data-testid="lesson-resume-card">
        <div>
          <p style={{ margin: 0, fontSize: 12.5, fontWeight: 800, color: 'var(--accent-ink)' }}>تابع من حيث توقّفت</p>
          <h2 style={{ margin: '4px 0 0', fontSize: 17, fontWeight: 900 }}>{inProgress.title}</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-dim)' }}>
            المرحلة {progress.stageNumber} من {progress.stageCount}
          </p>
        </div>
        <Link href={to} className="btn-primary" data-testid="lesson-resume-link">افتح الدرس عند مرحلتك</Link>
      </div>
    );
  }

  const next = suggestNextLesson(lessonsData, snap.completed);
  if (!next) {
    return (
      <div className="card lj-resume" data-testid="lesson-all-done">
        <p style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>أكملتَ الدروس السبعة عشر. ما بعدها طيران.</p>
      </div>
    );
  }
  const to = href({ kind: 'lesson', id: next.id });
  if (!to) return null;
  return (
    <div className="card lj-resume" data-testid="lesson-suggest-card">
      <div>
        <p style={{ margin: 0, fontSize: 12.5, fontWeight: 800, color: 'var(--accent-ink)' }}>
          {snap.completed.length === 0 ? 'ابدأ من هنا' : 'الدرس المقترح التالي'}
        </p>
        <h2 style={{ margin: '4px 0 0', fontSize: 17, fontWeight: 900 }}>{next.title}</h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-dim)' }}>{next.description}</p>
      </div>
      <Link href={to} className="btn-primary" data-testid="lesson-suggest-link">ابدأ الدرس</Link>
    </div>
  );
};

/** «X من 17 درساً مكتملاً» with a real progressbar. */
export const LessonsProgressBar: React.FC<{ total: number }> = ({ total }) => {
  const snap = useProgressSnapshot();
  const done = snap?.completed.filter(id => lessonsData.some(l => l.id === id)).length ?? 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div style={{ marginTop: 18 }} data-testid="lessons-progress" data-done={done}>
      <div className="lj-stage-head">
        <span>{done} من {total} درساً مكتملاً</span>
        <div
          className="lj-progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={done}
          aria-label="تقدّمك في الدروس"
        >
          <span style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
};

/** The number badge on a card: the number, or a check once the lesson is done. */
export const LessonNumberBadge: React.FC<{ lessonId: string; number: number }> = ({ lessonId, number }) => {
  const snap = useProgressSnapshot();
  const done = !!snap?.completed.includes(lessonId);
  return (
    <span className="lj-num" data-done={done} aria-hidden>
      {done ? '✓' : number}
    </span>
  );
};

/** Status chips on a card: done with score · in progress at stage N · suggested next. */
export const LessonStatusChips: React.FC<{ lessonId: string }> = ({ lessonId }) => {
  const snap = useProgressSnapshot();
  const def = useMemo(() => enriched(lessonId), [lessonId]);
  if (!snap || !def) return null;

  const done = snap.completed.includes(lessonId);
  const record = snap.journeys[lessonId];
  const suggested = suggestNextLesson(lessonsData, snap.completed)?.id === lessonId;

  if (done) {
    const restored = record ? restoreJourneyState(def, record) : null;
    const quiz = restored ? quizResult(def, restored) : null;
    return (
      <span className="lj-chip" data-kind="done" data-testid={`lesson-status-${lessonId}`}>
        مكتمل{quiz && quiz.answered > 0 ? ` · الاختبار ${quiz.correctFirstTry}/${quiz.total}` : ''}
      </span>
    );
  }

  const progress = summarizeJourneyProgress(def, record);
  if (progress.started) {
    return (
      <span className="lj-chip" data-kind="progress" data-testid={`lesson-status-${lessonId}`}>
        قيد التقدّم · المرحلة {progress.stageNumber} من {progress.stageCount}
      </span>
    );
  }
  if (suggested) {
    return (
      <span className="lj-chip" data-kind="suggest" data-testid={`lesson-status-${lessonId}`}>المقترح التالي</span>
    );
  }
  return <span className="lj-chip" data-testid={`lesson-status-${lessonId}`}>{stageCountLabel(def.stages.length)}</span>;
};

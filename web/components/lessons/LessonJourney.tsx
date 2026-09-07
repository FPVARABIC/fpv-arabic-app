'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef } from 'react';
import { lessonsData } from '@core/data/lessonsData';
import { getLessonJourneyDefinition } from '@core/data/lessons/journeyRegistry';
import { enrichJourneyDefinition } from '@core/data/lessons/lessonJourneyEnrich';
import {
  currentStage, stageCount, isInteractionComplete, getReadinessRequirements, isReadyToComplete, quizResult,
} from '@core/data/lessons/lessonJourneyEngine';
import { interactiveDiagramAdapters } from '@core/components/lessons/interactiveDiagramAdapters';
import { href } from '@/lib/webRoutes';
import { useLessonJourney } from './useLessonJourney';
import {
  ReadableText, CalloutCard, KeyPointsCard, CheckpointCard, GlossaryRevealCard, QuizResultCard,
} from './journeyParts';

/**
 * The lesson journey, rendered for the web.
 *
 * Reads the same sixteen-plus-one definitions the phone app renders, through
 * the same pure engine, enriched with the same authored fields. What differs
 * is the chrome: the site's light tokens, a heading that takes focus on every
 * stage change so a screen reader hears where it is and the page never opens
 * mid-stage, a live region for the same reason, and a quiz result at the end.
 *
 * The interactive diagrams are the phone app's components, untouched, inside
 * the dark frame `lessons.css` paints for them.
 */
export const LessonJourney: React.FC<{ lessonId: string }> = ({ lessonId }) => {
  const lesson = lessonsData.find(l => l.id === lessonId)!;
  const definition = useMemo(() => enrichJourneyDefinition(getLessonJourneyDefinition(lesson.id)!, lesson), [lesson]);
  const index = lessonsData.findIndex(l => l.id === lesson.id);
  const nextLesson = index >= 0 && index < lessonsData.length - 1 ? lessonsData[index + 1] : null;

  const { state, isDone, next, prev, goto, answer, explore, reveal, retryQuiz, complete } =
    useLessonJourney(lesson, definition);

  const total = stageCount(definition);
  const stage = currentStage(definition, state);
  const stageNumber = state.currentStageIndex + 1;
  const hasNext = state.currentStageIndex < total - 1;
  const hasPrev = state.currentStageIndex > 0;
  const requirements = getReadinessRequirements(definition, state);
  const ready = isReadyToComplete(definition, state);
  const quiz = quizResult(definition, state);

  // Every stage change: show the new stage from its top and hand it focus.
  // Not on first render — the reader just arrived, wherever they are.
  const titleRef = useRef<HTMLHeadingElement>(null);
  const lastIndexRef = useRef(state.currentStageIndex);
  useEffect(() => {
    if (lastIndexRef.current === state.currentStageIndex) return;
    lastIndexRef.current = state.currentStageIndex;
    const el = titleRef.current;
    if (!el) return;
    el.scrollIntoView({ block: 'start', behavior: 'auto' });
    el.focus({ preventScroll: true });
  }, [state.currentStageIndex]);

  const nextHref = nextLesson ? href({ kind: 'lesson', id: nextLesson.id }) : null;
  const projectHref = lesson.track === 'assembly' ? href({ kind: 'project' }) : null;

  return (
    <div className="lj-col" data-testid="lesson-journey" data-stage={stageNumber} data-stage-id={stage.id}>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        المرحلة {stageNumber} من {total}: {stage.title}
      </p>

      <div className="lj-stage-head">
        <span data-testid="lesson-stage-label">المرحلة {stageNumber} من {total}</span>
        <div className="lj-progress" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={stageNumber} aria-label="تقدّمك في مراحل الدرس">
          <span style={{ width: `${(stageNumber / total) * 100}%` }} />
        </div>
      </div>

      <h2 ref={titleRef} tabIndex={-1} className="lj-title" data-testid="lesson-stage-title">{stage.title}</h2>

      <div className="lj-body">
        {stage.type === 'orientation' && (
          <div className="lj-card">
            <ReadableText text={stage.body} />
            {stage.objective && (
              <p className="lj-objective" data-testid="lesson-objective">الهدف من هذا الدرس: {stage.objective}</p>
            )}
          </div>
        )}

        {stage.type === 'explanation' && (
          <div className="lj-card">
            <ReadableText text={stage.body === 'lesson-explanation' ? lesson.explanation : stage.body} />
          </div>
        )}

        {stage.type === 'worked_example' && (
          <div className="lj-card lj-card-sunk">
            <p style={{ margin: '0 0 10px', fontSize: 12.5, fontWeight: 800, color: 'var(--accent-ink)' }}>مثال عملي</p>
            <ReadableText text={stage.body} />
          </div>
        )}

        {stage.type === 'comparison' && (
          <>
            <div className="lj-items">
              {stage.items.map(item => (
                <div key={item.label} className="lj-item">
                  <h3>{item.label}</h3>
                  <p>{item.body}</p>
                </div>
              ))}
            </div>
            {stage.footer && <p className="lj-prose" style={{ color: 'var(--text-dim)', fontSize: 14.5 }}>{stage.footer}</p>}
          </>
        )}

        {stage.type === 'callout' && <CalloutCard stage={stage} />}

        {stage.type === 'key_points' && <KeyPointsCard stage={stage} />}

        {stage.type === 'checkpoint' && (
          <CheckpointCard
            checkpoint={stage.checkpoint}
            answeredOptionId={state.checkpointAnswers[stage.checkpoint.id]}
            onAnswer={id => answer(stage.checkpoint.id, id)}
          />
        )}

        {stage.type === 'interactive_diagram' && (() => {
          const Diagram = interactiveDiagramAdapters[stage.diagramType];
          const recorded = state.interactionVariants[stage.id] || {};
          const doneCount = stage.requiredVariants.filter(v => recorded[v]).length;
          const complete = isInteractionComplete(stage, state);
          return (
            <>
              <p className="lj-prose" style={{ fontSize: 14.5, color: 'var(--text-dim)' }}>{stage.instructions}</p>
              <div className="lesson-diagram" data-testid="lesson-diagram">
                {Diagram
                  ? <Diagram onVariant={v => explore(stage.id, v)} />
                  : <p style={{ padding: 16 }}>هذا المخطّط غير متاح على الويب بعد.</p>}
              </div>
              <p style={{ margin: 0, fontSize: 13, color: complete ? 'var(--sev-ok)' : 'var(--text-dimmer)', fontWeight: 700 }} data-testid="lesson-diagram-progress">
                {complete
                  ? `استكشفتَ كل ما تحتاجه هنا (${doneCount} من ${stage.requiredVariants.length}).`
                  : `${doneCount} من ${stage.requiredVariants.length} · ${doneCount === 0 ? stage.hints.none : (stage.requiredVariants.filter(v => recorded[v]).map(v => stage.hints.partial[v]).filter(Boolean).at(-1) ?? 'تابع الاستكشاف.')}`}
              </p>
            </>
          );
        })()}

        {stage.type === 'glossary' && (
          <>
            <p className="lj-prose" style={{ fontSize: 14.5, color: 'var(--text-dim)' }}>{stage.intro}</p>
            <div className="lj-items">
              {stage.terms.map((t, i) => <GlossaryRevealCard key={t.term} index={i} term={t.term} definition={t.definition} />)}
            </div>
          </>
        )}

        {stage.type === 'recall' && (
          <>
            <p className="lj-prose" style={{ fontSize: 14.5, color: 'var(--text-dim)' }}>{stage.intro}</p>
            <div className="lj-items">
              {stage.prompts.map(p => {
                const shown = !!state.recallRevealed[stage.id]?.[p.id];
                return (
                  <div key={p.id} className="lj-reveal" data-testid={`recall-${p.id}`}>
                    <div className="lj-reveal-head">
                      <strong style={{ color: 'var(--text)' }}>{p.question}</strong>
                      {!shown && (
                        <button type="button" className="lj-link-btn" onClick={() => reveal(stage.id, p.id)} data-testid={`recall-${p.id}-reveal`}>
                          اعرض الإجابة
                        </button>
                      )}
                    </div>
                    {shown && <p className="lj-reveal-answer" data-testid={`recall-${p.id}-answer`}>{p.modelAnswer}</p>}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {stage.type === 'completion' && (
          <>
            <div className="lj-card"><ReadableText text={stage.summary} /></div>

            <QuizResultCard result={quiz} onRetry={retryQuiz} onJump={goto} />

            {!isDone && (
              <div className="lj-card" data-testid="lesson-readiness-checklist">
                <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 800, color: 'var(--accent-ink)' }}>قبل إكمال الدرس، تأكد من هذه النقاط:</p>
                <ul className="lj-req">
                  {requirements.map(r => (
                    <li key={r.id} data-met={r.met} data-testid={`requirement-${r.id}`}>
                      <span className="dot" aria-hidden />
                      <span style={{ flex: 1 }}>{r.label}</span>
                      {!r.met && (
                        <button type="button" className="lj-link-btn" onClick={() => goto(r.jumpStageId)} data-testid={`requirement-${r.id}-jump`}>
                          انتقل الآن
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!isDone ? (
              <button
                type="button"
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '14px 20px', fontSize: 15.5, opacity: ready ? 1 : 0.5, cursor: ready ? 'pointer' : 'not-allowed' }}
                disabled={!ready}
                aria-disabled={!ready}
                data-testid="lesson-complete-btn"
                onClick={complete}
              >
                فهمتُ وأكملتُ الدرس
              </button>
            ) : (
              <div className="lj-card" style={{ borderColor: 'var(--sev-ok)', background: 'var(--sev-ok-wash)', textAlign: 'center', fontWeight: 900, color: 'var(--sev-ok)' }} data-testid="lesson-completed-banner">
                ✓ تم إكمال هذا الدرس
              </div>
            )}

            {isDone && nextLesson && nextHref && (
              <div className="lj-card lj-card-sunk" data-testid="lesson-next-lesson-bridge">
                <p className="lj-prose" style={{ fontSize: 14.5, color: 'var(--text-dim)', marginBottom: 12 }}>{stage.nextLessonBridge(nextLesson)}</p>
                <Link href={nextHref} className="btn-primary" data-testid="lesson-open-next">افتح الدرس التالي: {nextLesson.title}</Link>
              </div>
            )}

            {projectHref && (
              <p style={{ margin: 0, fontSize: 14, color: 'var(--text-dim)' }}>
                هذا درس تركيب. مراحل البناء وقوائم الفحص المقابلة له في{' '}
                <Link href={projectHref} data-testid="lesson-project-link">مشروعي</Link>.
              </p>
            )}
          </>
        )}
      </div>

      <div className="lj-nav">
        {hasPrev
          ? <button type="button" className="btn-ghost" onClick={prev} data-testid="lesson-prev">السابق</button>
          : <span aria-hidden />}
        {hasNext
          ? <button type="button" className="btn-primary" onClick={next} data-testid="lesson-next">التالي</button>
          : <span aria-hidden />}
      </div>
    </div>
  );
};

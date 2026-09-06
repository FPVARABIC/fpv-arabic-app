'use client';

import { useState } from 'react';
import type { JourneyCheckpoint, CalloutStage, KeyPointsStage } from '@core/types/lessonJourney';
import type { QuizResult } from '@core/data/lessons/lessonJourneyEngine';
import { toReadableChunks } from '@core/data/lessons/readableText';
import { displayOptions } from '@core/data/lessons/checkpointOrder';

/**
 * The pieces a lesson stage is built from. No content lives here; every string
 * arrives as a prop from a journey definition.
 */

/** Prose, broken into short whole-sentence paragraphs (see readableText.ts). */
export const ReadableText: React.FC<{ text: string; testId?: string }> = ({ text, testId }) => (
  <div className="lj-prose" data-testid={testId}>
    {toReadableChunks(text).map((chunk, i) => <p key={i}>{chunk}</p>)}
  </div>
);

const TONE_LABEL: Record<CalloutStage['tone'], string> = {
  danger: 'خطر', warn: 'تنبيه', info: 'ملاحظة',
};

export const CalloutCard: React.FC<{ stage: CalloutStage }> = ({ stage }) => (
  <aside className="lj-callout" data-tone={stage.tone} role={stage.tone === 'danger' ? 'alert' : 'note'} data-testid={`callout-${stage.id}`}>
    <h3>{TONE_LABEL[stage.tone]} — {stage.title}</h3>
    <p>{stage.body}</p>
  </aside>
);

export const KeyPointsCard: React.FC<{ stage: KeyPointsStage }> = ({ stage }) => (
  <div className="lj-card" data-testid={`key-points-${stage.id}`}>
    {stage.intro && <p className="lj-prose" style={{ marginBottom: 14, color: 'var(--text-dim)', fontSize: 14 }}>{stage.intro}</p>}
    <ol className="lj-points">
      {stage.points.map((p, i) => (
        <li key={i}><span>{i + 1}</span><span>{p}</span></li>
      ))}
    </ol>
  </div>
);

export const CheckpointCard: React.FC<{
  checkpoint: JourneyCheckpoint;
  answeredOptionId: string | null;
  onAnswer: (optionId: string) => void;
}> = ({ checkpoint, answeredOptionId, onAnswer }) => {
  const chosen = answeredOptionId ? checkpoint.options.find(o => o.id === answeredOptionId) ?? null : null;
  return (
    <div className="lj-card" data-testid={`checkpoint-${checkpoint.id}`}>
      <p className="lj-question" id={`q-${checkpoint.id}`}>{checkpoint.question}</p>
      <div className="lj-options" role="group" aria-labelledby={`q-${checkpoint.id}`}>
        {/* Shown in a stable, seeded order — the answer used to sit at «b» in
            57 of the section's 68 questions. Ids are untouched, so a saved
            answer, its feedback and the browser test all still find it. */}
        {displayOptions(checkpoint).map(opt => {
          const selected = answeredOptionId === opt.id;
          const state = selected ? (opt.correct ? 'correct' : 'wrong') : 'idle';
          return (
            <button
              key={opt.id}
              type="button"
              className="lj-option"
              data-state={state}
              aria-pressed={selected}
              data-testid={`checkpoint-${checkpoint.id}-option-${opt.id}`}
              onClick={() => onAnswer(opt.id)}
            >
              {opt.text}
            </button>
          );
        })}
      </div>
      {chosen && (
        <div
          className="lj-feedback"
          data-tone={chosen.correct ? 'ok' : 'retry'}
          data-testid={`checkpoint-${checkpoint.id}-feedback`}
          role="status"
        >
          {chosen.feedback}
          {!chosen.correct && <small>لا بأس، جرّب اختياراً آخر — يمكنك تغيير إجابتك في أي وقت.</small>}
        </div>
      )}
    </div>
  );
};

/** A term with its definition hidden until asked for — retrieval, not reading. */
export const GlossaryRevealCard: React.FC<{ index: number; term: string; definition: string }> = ({ index, term, definition }) => {
  const [open, setOpen] = useState(false);
  const id = `glossary-def-${index}`;
  return (
    <div className="lj-reveal" data-testid={`glossary-item-${index}`}>
      <div className="lj-reveal-head">
        <strong>{term}</strong>
        <button
          type="button"
          className="lj-link-btn"
          aria-expanded={open}
          aria-controls={id}
          data-testid={`glossary-item-${index}-toggle`}
          onClick={() => setOpen(o => !o)}
        >
          {open ? 'إخفاء التعريف' : 'اعرض التعريف'}
        </button>
      </div>
      {open && <p id={id} data-testid={`glossary-item-${index}-definition`}>{definition}</p>}
    </div>
  );
};

export const QuizResultCard: React.FC<{
  result: QuizResult;
  onRetry: () => void;
  onJump: (stageId: string) => void;
}> = ({ result, onRetry, onJump }) => {
  if (result.answered === 0) return null;
  const allAnswered = result.answered === result.total;
  return (
    <div className="lj-card lj-card-sunk" data-testid="lesson-quiz-result" data-first-try={result.correctFirstTry}>
      <p style={{ margin: 0, fontSize: 12.5, fontWeight: 800, color: 'var(--text-dimmer)' }}>نتيجتك في أسئلة هذا الدرس</p>
      <div className="lj-quiz-score">
        <b>{result.correctFirstTry}<span style={{ fontSize: 18, color: 'var(--text-dimmer)' }}> / {result.total}</span></b>
        <span style={{ fontSize: 14, color: 'var(--text-dim)' }}>
          {allAnswered ? 'من أول محاولة' : `من أول محاولة · بقي ${result.total - result.answered} بلا إجابة`}
          {result.correctNow > result.correctFirstTry && ` — وصحّحتَ ${result.correctNow - result.correctFirstTry} بعدها`}
        </span>
      </div>
      {result.missedFirstTry.length > 0 && (
        <ul className="lj-quiz-missed" aria-label="الأسئلة التي أخطأتَ فيها أول مرة">
          {result.missedFirstTry.map(m => (
            <li key={m.checkpointId}>
              <span>{m.question}</span>
              <button type="button" className="lj-link-btn" onClick={() => onJump(m.stageId)} data-testid={`quiz-jump-${m.checkpointId}`}>
                ارجع إلى السؤال
              </button>
            </li>
          ))}
        </ul>
      )}
      <div style={{ marginTop: 14 }}>
        <button type="button" className="btn-ghost" onClick={onRetry} data-testid="lesson-quiz-retry">
          أعِد الاختبار
        </button>
        <span style={{ fontSize: 12.5, color: 'var(--text-dimmer)', marginInlineStart: 10 }}>
          يمسح الإجابات الأربع فقط ويعيدك إلى أول سؤال — بقية الدرس تبقى.
        </span>
      </div>
    </div>
  );
};

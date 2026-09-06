import React, { useState } from 'react';
import type { JourneyCheckpoint } from '../../types/lessonJourney';
import { displayOptions } from '../../data/lessons/checkpointOrder';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const ACCENT = '#5EEAD4';
export const CARD_BG = '#173F4D';

// ── Stage chrome shared by every non-completion stage ────────────────────────

export const StageShell: React.FC<{
  stage: number;
  stageCount: number;
  title: string;
  children: React.ReactNode;
  onPrev?: () => void;
  onNext?: () => void;
}> = ({ stage, stageCount, title, children, onPrev, onNext }) => (
  <div className="space-y-4" data-testid="lesson01-stage" data-stage={stage}>
    <div className="flex items-center justify-between">
      <p className="text-[11px] text-slate-500">المرحلة {stage} من {stageCount}</p>
      <div className="h-1 rounded-full flex-1 mx-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${(stage / stageCount) * 100}%`, background: `linear-gradient(to right, ${ACCENT}, #A7F3D0)` }} />
      </div>
    </div>
    <h2 className="text-base font-extrabold" style={{ color: '#F8FAFC' }}>{title}</h2>
    <div className="space-y-3">{children}</div>
    <div className="flex gap-2 pt-1">
      {onPrev ? (
        <button onClick={onPrev} data-testid="lesson01-prev" className="flex-1 flex items-center justify-center gap-1.5 rounded-xl px-3 py-3 bg-white/3 border border-white/8 hover:bg-white/6 transition-all press text-sm text-slate-300">
          <ChevronRight size={15}/> السابق
        </button>
      ) : <div className="flex-1"/>}
      {onNext && (
        <button
          onClick={onNext}
          data-testid="lesson01-next"
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl px-3 py-3 transition-all press"
          style={{ background: 'rgba(94,234,212,0.1)', border: `1px solid rgba(94,234,212,0.3)`, color: ACCENT }}
        >
          التالي <ChevronLeft size={15}/>
        </button>
      )}
    </div>
  </div>
);

// ── Checkpoint block (reused by every checkpoint stage) ──────────────────────

export const CheckpointCard: React.FC<{
  checkpoint: JourneyCheckpoint;
  answeredOptionId: string | null;
  onAnswer: (optionId: string) => void;
}> = ({ checkpoint, answeredOptionId, onAnswer }) => (
  <div className="card-subtle p-4 space-y-3" style={{ background: CARD_BG }} data-testid={`checkpoint-${checkpoint.id}`}>
    <p className="text-sm font-bold" style={{ color: '#F8FAFC' }}>{checkpoint.question}</p>
    <div className="space-y-2">
      {/* Shown in a stable, seeded order — the answer used to sit at «b» in
          57 of the section's 68 questions. Ids are untouched. */}
      {displayOptions(checkpoint).map(opt => {
        const isSelected = answeredOptionId === opt.id;
        return (
          <button
            key={opt.id}
            data-testid={`checkpoint-${checkpoint.id}-option-${opt.id}`}
            onClick={() => onAnswer(opt.id)}
            className="w-full text-right rounded-xl px-3 py-2.5 text-sm transition-all press"
            style={{
              background: isSelected ? (opt.correct ? 'rgba(74,222,128,0.14)' : 'rgba(248,113,113,0.12)') : 'rgba(255,255,255,0.04)',
              border: `1px solid ${isSelected ? (opt.correct ? 'rgba(74,222,128,0.4)' : 'rgba(248,113,113,0.35)') : 'rgba(255,255,255,0.08)'}`,
              color: '#E2E8F0',
            }}
          >
            {opt.text}
          </button>
        );
      })}
    </div>
    {answeredOptionId && (() => {
      const opt = checkpoint.options.find(o => o.id === answeredOptionId)!;
      return (
        <div
          data-testid={`checkpoint-${checkpoint.id}-feedback`}
          className="rounded-xl px-3 py-2.5 text-sm leading-relaxed"
          style={{
            background: opt.correct ? 'rgba(74,222,128,0.1)' : 'rgba(251,191,36,0.1)',
            border: `1px solid ${opt.correct ? 'rgba(74,222,128,0.3)' : 'rgba(251,191,36,0.3)'}`,
            color: opt.correct ? '#BBF7D0' : '#FDE68A',
          }}
        >
          {opt.feedback}
          {!opt.correct && (
            <p className="mt-1.5 text-xs" style={{ color: '#94a3b8' }}>لا بأس، جرّب اختيارًا آخر — يمكنك تغيير إجابتك في أي وقت.</p>
          )}
        </div>
      );
    })()}
  </div>
);

// ── Glossary retrieval card: term shown, definition hidden until requested ──

export const GlossaryRevealCard: React.FC<{ index: number; term: string; definition: string }> = ({ index, term, definition }) => {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="card-subtle p-3.5" style={{ background: CARD_BG }} data-testid={`glossary-item-${index}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold" style={{ color: ACCENT }}>{term}</p>
        <button
          onClick={() => setRevealed(r => !r)}
          data-testid={`glossary-item-${index}-toggle`}
          className="text-xs flex-shrink-0 underline press"
          style={{ color: ACCENT }}
        >
          {revealed ? 'إخفاء التعريف' : 'اعرض التعريف'}
        </button>
      </div>
      {revealed && (
        <p className="text-sm leading-relaxed mt-2" style={{ color: '#CBD5E1' }} data-testid={`glossary-item-${index}-definition`}>
          {definition}
        </p>
      )}
    </div>
  );
};

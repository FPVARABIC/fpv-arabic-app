'use client';

import React from 'react';

/**
 * ONE QUESTION, ONE SCREEN.
 *
 * V1's wizard put a step counter, a progress bar, a phase label, a part
 * picker, a reasons list and a sticky footer on the same 390px screen. The
 * measured result was a reader scrolling to find the actual question.
 *
 * So the shape here is fixed and small: a heading, one line of why, the
 * choices. Anything a component wants to add beyond that has to earn its place
 * against the only thing this screen is for.
 */
export const QuestionShell: React.FC<{
  /** The question itself. Rendered as the screen's one heading. */
  question: string;
  /** One line. Not a paragraph, and never a lecture. */
  help?: string;
  /** Optional deeper explanation, closed by default. */
  why?: { label: string; body: string };
  children: React.ReactNode;
}> = ({ question, help, why, children }) => (
  <section data-testid="v2-question" style={{ display: 'grid', gap: 14 }}>
    <header style={{ display: 'grid', gap: 6 }}>
      <h2 data-testid="v2-question-title"
        style={{ margin: 0, fontSize: 20, fontWeight: 900, lineHeight: 1.6 }}>
        {question}
      </h2>
      {help && (
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.9 }}>
          {help}
        </p>
      )}
    </header>

    {children}

    {why && (
      <details data-testid="v2-question-why">
        <summary style={{ fontSize: 12.5, color: 'var(--text-dimmer)', cursor: 'pointer' }}>
          {why.label}
        </summary>
        <p style={{ margin: '8px 0 0', fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.9 }}>
          {why.body}
        </p>
      </details>
    )}
  </section>
);

/**
 * A choice.
 *
 * `aria-pressed` carries the selected state, and the visual selection is a
 * BORDER plus a check glyph — never colour alone, which a reader with low
 * colour vision cannot see. The disabled state is a real `disabled` attribute
 * so the keyboard and the screen reader both learn about it, not an `onClick`
 * that quietly does nothing.
 */
export const ChoiceCard: React.FC<{
  testId: string;
  label: string;
  note?: string;
  /** Shown instead of a note when the choice cannot be taken. */
  disabledReason?: string;
  /** The word on the badge of an unavailable choice, e.g. «قريبًا». */
  disabledBadge?: string;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}> = ({ testId, label, note, disabledReason, disabledBadge, selected, disabled, onSelect }) => (
  <button
    type="button"
    data-testid={testId}
    data-selected={selected ? 'true' : 'false'}
    disabled={disabled}
    aria-pressed={disabled ? undefined : selected}
    onClick={onSelect}
    className="card-sm"
    style={{
      // A real touch target. 44px is the floor; the padding here clears it.
      padding: '15px 16px',
      textAlign: 'start',
      width: '100%',
      display: 'grid',
      gap: 5,
      cursor: disabled ? 'not-allowed' : 'pointer',
      border: selected ? '2px solid var(--accent-ink)' : '1px solid var(--line)',
      opacity: disabled ? 0.62 : 1,
      background: 'var(--surface)',
      font: 'inherit',
      color: 'inherit',
    }}
  >
    <span style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
      {/* The glyph, not the colour, is what says «chosen». */}
      <span aria-hidden style={{ fontWeight: 900, color: 'var(--accent-ink)' }}>
        {selected ? '✓' : ''}
      </span>
      <span style={{ fontSize: 15.5, fontWeight: 800 }}>{label}</span>
      {disabled && disabledBadge && (
        <span className="admin-badge" style={{ fontSize: 10.5, marginInlineStart: 'auto' }}>
          {disabledBadge}
        </span>
      )}
    </span>
    {(disabled ? disabledReason : note) && (
      <span style={{ fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.85 }}>
        {disabled ? disabledReason : note}
      </span>
    )}
  </button>
);

/** The choices, stacked. One column on a phone; never a grid that squeezes. */
export const ChoiceList: React.FC<{ children: React.ReactNode; label: string }> = ({
  children, label,
}) => (
  <div role="group" aria-label={label} style={{ display: 'grid', gap: 10 }}>
    {children}
  </div>
);

'use client';

import Link from 'next/link';
import type { SafetyGate } from '@/lib/build/gates';
import { gateTermNoteFor, PRE_BATTERY_SAFETY } from '@/lib/build/safetyNotes';

/**
 * A safety gate: the checklist that stands between two build phases.
 *
 * The wizard passes the confirmations in and receives every toggle — state
 * lives in the draft, so leaving and returning keeps what was confirmed.
 * «التالي» is disabled by the WIZARD until `isGateComplete` says so; this
 * component's job is to make each confirmation an explicit, individual act
 * rather than one «أوافق» button that confirms nine things nobody read.
 */
export const GateStep: React.FC<{
  gate: SafetyGate;
  confirmed: number[];
  onToggle: (itemIndex: number) => void;
}> = ({ gate, confirmed, onToggle }) => {
  const done = confirmed.length;
  return (
    <div data-testid={`gate-${gate.stepId}`}>
      <p role="note" className="card-sm" style={{
        padding: '13px 15px', margin: '0 0 14px', fontSize: 13,
        color: 'var(--sev-warning)', lineHeight: 1.95,
      }}>
        {gate.stakesAr}
      </p>

      {/* The last screen before any current flows repeats the one install
          mistake that is irreversible. The install step says it too; these can
          be days apart, and only one of them is the point of no return. */}
      {gate.stepId === 'prebattery' && (
        <div role="note" className="card-sm" data-testid="safety-note-prebattery" style={{
          padding: '12px 14px', margin: '0 0 14px', borderColor: 'var(--sev-warning)',
        }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 900, color: 'var(--sev-warning)', lineHeight: 1.8 }}>
            ⚠ {PRE_BATTERY_SAFETY.titleAr}
          </p>
          <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.95 }}>
            {PRE_BATTERY_SAFETY.bodyAr}
          </p>
          <Link href={`/lessons/${PRE_BATTERY_SAFETY.lessonId}`}
            data-testid="safety-lesson-prebattery"
            style={{ display: 'inline-block', marginTop: 8, fontSize: 12, color: 'var(--accent-ink)', fontWeight: 700 }}>
            الدرس الكامل: {PRE_BATTERY_SAFETY.lessonTitleAr} ←
          </Link>
        </div>
      )}

      <h3 style={{ fontSize: 14.5, fontWeight: 900, margin: '0 0 4px' }}>{gate.headlineAr}</h3>
      <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--text-dimmer)' }}>
        <span dir="ltr">{done}/{gate.items.length}</span> مؤكد — لا يفتح «التالي» قبل اكتمالها
      </p>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {gate.items.map((text, i) => {
          const isDone = confirmed.includes(i);
          /* The shared item text is not this component's to edit — the phone
           * renders the same list. What it CAN do is explain the untranslated
           * term standing between a beginner and an honest tick. Nothing here
           * offers a way to pass an item that was not actually done. */
          const term = gateTermNoteFor(text);
          return (
            <li key={i}>
              <label className="card-sm" style={{
                display: 'flex', gap: 10, alignItems: 'flex-start',
                padding: '12px 14px', cursor: 'pointer',
                border: isDone ? '1px solid var(--sev-ok)' : undefined,
              }}>
                <input
                  type="checkbox"
                  checked={isDone}
                  data-testid={`gate-item-${gate.stepId}-${i}`}
                  onChange={() => onToggle(i)}
                  style={{ marginTop: 4, width: 16, height: 16, accentColor: 'var(--accent-ink)' }}
                />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13.5, lineHeight: 1.9 }}>{text}</span>
                  {term && (
                    <span
                      data-testid={`gate-term-${gate.stepId}-${i}`}
                      style={{
                        display: 'block', marginTop: 4, fontSize: 12,
                        color: 'var(--text-dimmer)', lineHeight: 1.9,
                      }}
                    >
                      {term.explanationAr}
                    </span>
                  )}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export function isGateComplete(gate: SafetyGate, confirmed: number[] | undefined): boolean {
  return (confirmed?.length ?? 0) >= gate.items.length;
}

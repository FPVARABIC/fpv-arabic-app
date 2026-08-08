'use client';

import type { SafetyGate } from '@/lib/build/gates';

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

      <h3 style={{ fontSize: 14.5, fontWeight: 900, margin: '0 0 4px' }}>{gate.headlineAr}</h3>
      <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--text-dimmer)' }}>
        <span dir="ltr">{done}/{gate.items.length}</span> مؤكد — لا يفتح «التالي» قبل اكتمالها
      </p>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {gate.items.map((text, i) => {
          const isDone = confirmed.includes(i);
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
                <span style={{ fontSize: 13.5, lineHeight: 1.9 }}>{text}</span>
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

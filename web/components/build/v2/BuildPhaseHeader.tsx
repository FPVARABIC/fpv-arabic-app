'use client';

import React from 'react';
import { PHASES, PHASE_FUTURE_NOTE } from './copy';

/**
 * WHERE YOU ARE IN A JOURNEY A HUMAN CAN NAME.
 *
 * V1 answered «where am I?» with «الخطوة ٢ من ٢٠», which tells a beginner
 * nothing except how far they are from the end. This says the three things a
 * build actually consists of — choose the parts, assemble it, set it up and
 * fly — and marks which one they are in.
 *
 * IT IS NOT A PROGRESS BAR
 * ------------------------
 * The two later phases are deliberately not implemented, so they show as what
 * they are: named, visible, and not yet walkable. No percentage, no tick, no
 * second competing number anywhere on the screen. Claiming completion the
 * product cannot deliver is the failure this component exists to avoid.
 */
export const BuildPhaseHeader: React.FC<{ activeId: string }> = ({ activeId }) => (
  <nav aria-label="مراحل البناء" data-testid="v2-phases">
    <ol style={{
      display: 'flex', gap: 8, listStyle: 'none', margin: 0, padding: 0, flexWrap: 'wrap',
    }}>
      {PHASES.map((p, i) => {
        const active = p.id === activeId;
        return (
          <li key={p.id}
            data-testid={`v2-phase-${p.id}`}
            data-active={active ? 'true' : 'false'}
            aria-current={active ? 'step' : undefined}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '7px 11px',
              borderRadius: 999,
              border: active ? '1.5px solid var(--accent-ink)' : '1px solid var(--border-soft)',
              background: active ? 'var(--accent-wash, transparent)' : 'transparent',
              color: active ? 'var(--text)' : 'var(--text-dimmer)',
              fontSize: 12.5,
              fontWeight: active ? 900 : 600,
            }}
          >
            <span dir="ltr" aria-hidden style={{ opacity: 0.7 }}>{i + 1}</span>
            <span>{p.titleAr}</span>
            {/* Said once, on the phases that are not built — not implied by a
                greyed-out tick that could read as «done». */}
            {!active && <span className="sr-only">{PHASE_FUTURE_NOTE}</span>}
          </li>
        );
      })}
    </ol>
  </nav>
);

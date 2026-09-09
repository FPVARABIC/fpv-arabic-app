'use client';

import React from 'react';
import { droneTypes } from '@core/data/assembly/droneTypes';
import { batteryVoltageOptions } from '@core/data/assembly/batteryVoltageOptions';
import { SUMMARY } from './copy';

/** Who put this value here. The whole point of the screen. */
export type Provenance = 'chosen' | 'derived';

export interface SummaryRow {
  key: string;
  label: string;
  value: string;
  provenance: Provenance;
}

/**
 * «هذا ما فهمناه» — AND WHO DECIDED EACH LINE.
 *
 * This screen is the one Phase 2B most needs to test, because the whole
 * promise of V2 is «we handled what we could, and asked only what we needed».
 * A reader can only trust that if they can see WHICH lines they answered and
 * which the system worked out — otherwise «المقاس: 5 إنش» reads either as a
 * decision they forgot making or as a number that appeared from nowhere.
 *
 * So provenance is a visible badge on every row, not a footnote, and the
 * derived rows say where the value came from.
 */
export const BuildInputSummary: React.FC<{ rows: readonly SummaryRow[] }> = ({ rows }) => (
  <section data-testid="v2-summary" style={{ display: 'grid', gap: 16 }}>
    <header style={{ display: 'grid', gap: 6 }}>
      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, lineHeight: 1.6 }}>
        {SUMMARY.title}
      </h2>
      <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.9 }}>
        {SUMMARY.lead}
      </p>
    </header>

    <dl style={{ margin: 0, display: 'grid', gap: 10 }}>
      {rows.map(r => (
        <div
          key={r.key}
          className="card-sm"
          data-testid={`v2-summary-${r.key}`}
          data-provenance={r.provenance}
          style={{ padding: '13px 15px', display: 'grid', gap: 4 }}
        >
          <dt style={{ fontSize: 12, color: 'var(--text-dimmer)', fontWeight: 700 }}>
            {r.label}
          </dt>
          <dd style={{
            margin: 0, display: 'flex', gap: 9, alignItems: 'baseline', flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: 15.5, fontWeight: 800 }}>{r.value}</span>
            <span
              className="admin-badge"
              data-testid={`v2-summary-${r.key}-provenance`}
              style={{ fontSize: 10.5 }}
            >
              {r.provenance === 'chosen' ? SUMMARY.chosenBadge : SUMMARY.derivedBadge}
            </span>
          </dd>
          {r.provenance === 'derived' && (
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.85 }}>
              {SUMMARY.derivedNote}
            </p>
          )}
        </div>
      ))}
    </dl>

    {/*
      Phase 2B stops here ON PURPOSE. `proposeBuild()` can already return the
      decisions, and rendering them is Phase 2C — showing them now would blur
      the boundary this review is meant to test.
    */}
    <div className="card-sm" data-testid="v2-summary-next"
      style={{ padding: '14px 16px', display: 'grid', gap: 4 }}>
      <strong style={{ fontSize: 14.5 }}>{SUMMARY.nextTitle}</strong>
      <span style={{ fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.85 }}>
        {SUMMARY.nextBody}
      </span>
    </div>
  </section>
);

/** The display value for each field, so the shell stays about flow. */
export const summaryValue = {
  droneType: (id: string) => droneTypes.find(t => t.id === id)?.primaryName ?? id,
  sizeInch: (n: number) => `${n} إنش`,
  cellCount: (n: number) =>
    batteryVoltageOptions.find(o => o.sCount === n)?.labelAr ?? `${n}S`,
};

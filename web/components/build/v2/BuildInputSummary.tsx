'use client';

import React from 'react';
import { droneTypes } from '@core/data/assembly/droneTypes';
import { batteryVoltageOptions } from '@core/data/assembly/batteryVoltageOptions';
import { SUMMARY } from './copy';
import type { Readiness } from './readiness';

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
export const BuildInputSummary: React.FC<{
  rows: readonly SummaryRow[];
  readiness: Readiness;
}> = ({ rows, readiness }) => (
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
      HOW THIS SCREEN ENDS.

      Phase 2B still renders no parts — `proposeBuild()` can already return the
      decisions and showing them is 2C. But it must not claim a readiness it
      cannot back: the state comes from `readinessOf()`, and the reasons under
      a blocked build are the ENGINE's sentences, not this component's.

      `data-state` carries the state name for tests. The reader never sees it —
      they see Arabic.
    */}
    <div className="card-sm" data-testid="v2-summary-next" data-state={readiness.state}
      style={{ padding: '14px 16px', display: 'grid', gap: 6 }}>
      {readiness.state === 'ready' && (
        <>
          <strong style={{ fontSize: 14.5 }}>{SUMMARY.status.ready.title}</strong>
          <span style={{ fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.85 }}>
            {SUMMARY.status.ready.body}
          </span>
        </>
      )}

      {readiness.state === 'needs-equipment-identification' && (
        <>
          <strong style={{ fontSize: 14.5 }}>{SUMMARY.status.needsEquipment.title}</strong>
          <ul style={{ margin: 0, paddingInlineStart: 18, display: 'grid', gap: 4 }}>
            {readiness.unresolved.map(u => (
              <li key={u} data-testid={`v2-summary-unresolved-${u}`}
                style={{ fontSize: 12.5, lineHeight: 1.85 }}>
                {u === 'rc' ? SUMMARY.status.needsEquipment.rc
                  : SUMMARY.status.needsEquipment.video}
              </li>
            ))}
          </ul>
          <span style={{ fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.85 }}>
            {SUMMARY.status.needsEquipment.body}
          </span>
        </>
      )}

      {readiness.state === 'no-viable-build' && (
        <>
          <strong style={{ fontSize: 14.5, color: 'var(--sev-warning)' }}>
            {SUMMARY.status.blocked.title}
          </strong>
          {readiness.reasonsAr.length > 0 && (
            <>
              <span style={{ fontSize: 12, color: 'var(--text-dimmer)', fontWeight: 700 }}>
                {SUMMARY.status.blocked.reasonsLabel}
              </span>
              <ul data-testid="v2-summary-blocked-reasons"
                style={{ margin: 0, paddingInlineStart: 18, display: 'grid', gap: 4 }}>
                {readiness.reasonsAr.map(r => (
                  <li key={r} style={{ fontSize: 12.5, lineHeight: 1.85 }}>{r}</li>
                ))}
              </ul>
            </>
          )}
          <span style={{ fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.85 }}>
            {SUMMARY.status.blocked.body}
          </span>
        </>
      )}
    </div>
  </section>
);

/**
 * The display value for each field, so the shell stays about flow.
 *
 * `droneType` returns UNDEFINED for an id it cannot resolve rather than
 * falling back to the id itself. It used to read `?? id`, which would have put
 * `long-range` — a database key — in the summary as the name of the build the
 * reader had just chosen. The goal screen offers nothing but real
 * `droneTypes`, so this cannot happen; the point is that if it ever did, the
 * row is absent instead of wrong, and the caller decides.
 *
 * The same fallback shape was live in three places in the proposal and is
 * gone from all of them. A key is never a name.
 */
export const summaryValue = {
  droneType: (id: string): string | undefined =>
    droneTypes.find(t => t.id === id)?.primaryName,
  sizeInch: (n: number) => `${n} إنش`,
  cellCount: (n: number) =>
    batteryVoltageOptions.find(o => o.sCount === n)?.labelAr ?? `${n}S`,
};

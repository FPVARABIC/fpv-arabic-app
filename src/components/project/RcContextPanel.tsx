import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, ChevronLeft, CircleAlert, TriangleAlert, CircleHelp, CircleCheck } from 'lucide-react';
import { SEVERITY_LABEL_AR, type Finding, type FindingSeverity } from '../../data/project/types';

/**
 * «في مشروعك» — one panel, several screens.
 *
 * WHY IT TAKES FACTS AND FINDINGS RATHER THAN AN ID
 * -------------------------------------------------
 * Each surface knows its own mapping: an EdgeTX topic asks
 * `rcFactsForEdgeTxPage`, an ExpressLRS step asks `rcFactsForElrsEntry`. What
 * they share is the RENDERING, not the selection — so the selection stays in
 * the data layer where it can be tested without a browser, and only the paint
 * lives here.
 *
 * WHY THE FACT TYPE IS STRUCTURAL
 * -------------------------------
 * It takes `{ field, labelAr, valueAr }` rather than `RcFactRef` specifically,
 * because the video record produces the identical shape from a different key
 * space. Widening the prop was the whole cost of reusing this panel across both
 * records; the alternative — a second panel that renders the same three columns
 * in the same colours — is the duplication that makes one of the two quietly
 * diverge six months later.
 *
 * THE RULE IT ENFORCES
 * --------------------
 * It renders nothing when there is nothing true to say. That is not a nicety:
 * the requirement was explicitly «لا تعرض لوحة عامة متكررة في كل صفحة», and a
 * panel that appears everywhere saying "no data recorded" is exactly the
 * repeated general panel that requirement forbids.
 */

const SEV: Record<FindingSeverity, { bg: string; fg: string; border: string; Icon: typeof CircleAlert }> = {
  blocker: { bg: 'rgba(239,68,68,0.10)', fg: '#b91c1c', border: 'rgba(239,68,68,0.30)', Icon: CircleAlert },
  warning: { bg: 'rgba(245,158,11,0.12)', fg: '#b45309', border: 'rgba(245,158,11,0.32)', Icon: TriangleAlert },
  unknown: { bg: 'rgba(100,116,139,0.12)', fg: '#475569', border: 'rgba(100,116,139,0.28)', Icon: CircleHelp },
  ok: { bg: 'rgba(16,185,129,0.10)', fg: '#047857', border: 'rgba(16,185,129,0.28)', Icon: CircleCheck },
};

/** What either setup record renders down to. Structural on purpose. */
export interface ContextFact {
  field: string;
  labelAr: string;
  valueAr: string;
}

export const RcContextPanel: React.FC<{
  /** Prefix for the test ids, so each surface stays independently assertable. */
  testIdPrefix: string;
  /** Which entry this panel is for — rendered as a data attribute for tests. */
  entryId: string;
  facts: ContextFact[];
  /**
   * Which record these facts came from. Only affects the test id, so a screen
   * showing both can be asserted per-record rather than as one undifferentiated
   * list.
   */
  factKind?: 'rc' | 'video';
  findings: Finding[];
}> = ({ testIdPrefix, entryId, facts, factKind = 'rc', findings }) => {
  const navigate = useNavigate();

  if (facts.length === 0 && findings.length === 0) return null;

  return (
    <div
      data-testid={`${testIdPrefix}-project-context`}
      data-entry={entryId}
      style={{
        background: '#ffffff', border: '1px solid rgba(14,165,233,0.28)',
        borderRadius: 14, padding: '12px 13px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
        <Wrench size={15} style={{ color: '#0369a1' }} aria-hidden />
        <span style={{ flex: 1, fontSize: 12, fontWeight: 900, color: '#0369a1' }}>في مشروعك</span>
        <button
          type="button"
          data-testid={`${testIdPrefix}-project-context-open`}
          onClick={() => navigate('/project')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none',
            border: 'none', cursor: 'pointer', color: '#0891b2', fontSize: 11, fontWeight: 700,
          }}
        >
          مشروعي
          <ChevronLeft size={13} aria-hidden />
        </button>
      </div>

      {facts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: findings.length ? 10 : 0 }}>
          {facts.map(f => (
            <div
              key={f.field}
              data-testid={`${testIdPrefix}-${factKind}-fact-${f.field}`}
              style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}
            >
              <span style={{ fontSize: 11, color: '#64748b', minWidth: 112 }}>{f.labelAr}</span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a', flex: 1 }}>{f.valueAr}</span>
            </div>
          ))}
        </div>
      )}

      {findings.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {findings.map(f => {
            const s = SEV[f.severity];
            return (
              <button
                key={f.id}
                type="button"
                data-testid={`${testIdPrefix}-finding-${f.id}`}
                onClick={() => navigate('/project?view=findings')}
                style={{
                  display: 'flex', gap: 8, alignItems: 'flex-start', width: '100%',
                  background: s.bg, border: `1px solid ${s.border}`, borderRadius: 11,
                  padding: '8px 10px', cursor: 'pointer', textAlign: 'right',
                }}
              >
                <s.Icon size={14} style={{ color: s.fg, flexShrink: 0, marginTop: 2 }} aria-hidden />
                <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: '#0f172a', lineHeight: 1.65 }}>
                  {f.claimAr}
                </span>
                <span style={{ fontSize: 9.5, fontWeight: 800, color: s.fg, flexShrink: 0, marginTop: 2 }}>
                  {SEVERITY_LABEL_AR[f.severity]}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, ChevronLeft, CircleAlert, TriangleAlert, CircleHelp, CircleCheck } from 'lucide-react';
import { readProjectSnapshot } from '../../data/project/snapshot';
import { computeFindings } from '../../data/project/verdicts';
import { findingsForBetaflightPage, factsForBetaflightPage } from '../../data/project/context';
import { SEVERITY_LABEL_AR, type FindingSeverity } from '../../data/project/types';

/**
 * «في مشروعك» on a Betaflight settings page.
 *
 * The reason this exists: someone opens the Ports page because they are about
 * to change a port. What they need at that moment is not a general description
 * of what ports are — it is which UART THEY recorded for the receiver, which
 * one the GPS is on, and whether the two collide. The configurator itself
 * cannot tell them that, because it does not know what they wrote down.
 *
 * Renders nothing when there is nothing true to say: no project, a page with no
 * declared control-link fields, or a build where none of those fields were
 * filled. A panel that appears on every page and says nothing on most of them
 * stops being read on the pages where it matters.
 *
 * Styled for the dark Betaflight surface rather than reusing ProjectContextCard,
 * whose colours are hard-coded for the light knowledge-base pages. The data and
 * the judgement come from the same functions in both places; only the paint
 * differs — which is exactly the split the multi-platform architecture asks for.
 */

const SEV: Record<FindingSeverity, { bg: string; fg: string; border: string; Icon: typeof CircleAlert }> = {
  blocker: { bg: 'rgba(239,68,68,0.14)', fg: '#fca5a5', border: 'rgba(239,68,68,0.38)', Icon: CircleAlert },
  warning: { bg: 'rgba(245,158,11,0.14)', fg: '#fcd34d', border: 'rgba(245,158,11,0.38)', Icon: TriangleAlert },
  unknown: { bg: 'rgba(148,163,184,0.14)', fg: '#cbd5e1', border: 'rgba(148,163,184,0.32)', Icon: CircleHelp },
  ok: { bg: 'rgba(16,185,129,0.12)', fg: '#6ee7b7', border: 'rgba(16,185,129,0.32)', Icon: CircleCheck },
};

export const BetaflightProjectContext: React.FC<{ pageId: string }> = ({ pageId }) => {
  const navigate = useNavigate();

  const project = useMemo(() => readProjectSnapshot(), []);
  // Both records, merged. The ports page is the reason: a reader looking at it
  // needs the receiver's UART and the video control's UART in the same list, or
  // the clash between them is invisible at exactly the moment they are about to
  // create it.
  const facts = useMemo(() => factsForBetaflightPage(project, pageId), [project, pageId]);
  const findings = useMemo(
    () => findingsForBetaflightPage(computeFindings(project), pageId),
    [project, pageId],
  );

  if (facts.length === 0 && findings.length === 0) return null;

  return (
    <div
      data-testid="bf-project-context"
      data-page={pageId}
      className="bf-panel"
      style={{ padding: '13px 14px', marginTop: 4 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
        <Wrench size={15} style={{ color: '#38e0e0' }} aria-hidden />
        <span style={{ flex: 1, fontSize: 12.5, fontWeight: 900, color: '#e2f6f6' }}>في مشروعك</span>
        <button
          type="button"
          data-testid="bf-project-context-open"
          onClick={() => navigate('/project')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none',
            border: 'none', cursor: 'pointer', color: '#7dd3fc', fontSize: 11, fontWeight: 700,
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
              key={`${f.record}-${f.field}`}
              data-testid={`bf-${f.record}-fact-${f.field}`}
              style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}
            >
              <span style={{ fontSize: 11, color: '#94b8b8', minWidth: 108 }}>{f.labelAr}</span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: '#e2f6f6', flex: 1 }}>{f.valueAr}</span>
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
                data-testid={`bf-finding-${f.id}`}
                onClick={() => navigate('/project')}
                style={{
                  display: 'flex', gap: 8, alignItems: 'flex-start', width: '100%',
                  background: s.bg, border: `1px solid ${s.border}`, borderRadius: 10,
                  padding: '8px 10px', cursor: 'pointer', textAlign: 'right',
                }}
              >
                <s.Icon size={14} style={{ color: s.fg, flexShrink: 0, marginTop: 2 }} aria-hidden />
                <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: '#e2f6f6', lineHeight: 1.65 }}>
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

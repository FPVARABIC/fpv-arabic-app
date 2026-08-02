import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, ChevronLeft } from 'lucide-react';
import { readProjectSnapshot } from '../../data/project/snapshot';
import { computeFindings } from '../../data/project/verdicts';
import {
  projectPartsForModule, findingsForArticle, hasProjectContext, rcFactsForModule,
} from '../../data/project/context';
import { SEVERITY_LABEL_AR, type FindingSeverity } from '../../data/project/types';
import { RichText } from './Term';

const SEV_STYLE: Record<FindingSeverity, { bg: string; fg: string; border: string }> = {
  blocker: { bg: 'rgba(239,68,68,0.10)', fg: '#b91c1c', border: 'rgba(239,68,68,0.30)' },
  warning: { bg: 'rgba(245,158,11,0.12)', fg: '#b45309', border: 'rgba(245,158,11,0.32)' },
  unknown: { bg: 'rgba(100,116,139,0.12)', fg: '#475569', border: 'rgba(100,116,139,0.28)' },
  ok: { bg: 'rgba(16,185,129,0.10)', fg: '#047857', border: 'rgba(16,185,129,0.28)' },
};

/**
 * «في مشروعك» — the article, applied to the reader's own build.
 *
 * Renders nothing at all when there is nothing true to say: no saved project,
 * a module this page's subject does not map to, or a build with none of the
 * relevant parts chosen yet. An empty panel that promises personalisation and
 * delivers a heading would be worse than no panel.
 */
export const ProjectContextCard: React.FC<{ moduleId: string; articleId: string }> = ({
  moduleId, articleId,
}) => {
  const navigate = useNavigate();

  const project = useMemo(() => readProjectSnapshot(), []);
  const parts = useMemo(() => projectPartsForModule(project, moduleId), [project, moduleId]);
  const findings = useMemo(
    () => findingsForArticle(computeFindings(project), articleId),
    [project, articleId],
  );
  // Facts the reader recorded about this system that no catalogue holds — the
  // band they actually run, the firmware they actually flashed. Shown here so
  // an article about ExpressLRS settings is read against the reader's own
  // settings rather than against an imagined default.
  const facts = useMemo(() => rcFactsForModule(project, moduleId), [project, moduleId]);

  if (!hasProjectContext(parts, findings) && facts.length === 0) return null;

  return (
    <div
      data-testid="kb-project-context"
      style={{
        marginTop: 12, background: '#fff', border: '1px solid rgba(14,165,233,0.28)',
        borderRadius: 14, padding: '12px 13px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9 }}>
        <Wrench size={15} style={{ color: '#0369a1' }} aria-hidden />
        <span style={{ fontSize: 12, fontWeight: 900, color: '#0369a1' }}>في مشروعك</span>
      </div>

      {parts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: (findings.length || facts.length) ? 10 : 0 }}>
          {parts.map(r => (
            <div
              key={r.part.id}
              data-testid={`kb-context-part-${r.part.id}`}
              style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}
            >
              <span style={{ fontSize: 11, color: '#64748b', minWidth: 84 }}>{r.labelAr}</span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a', flex: 1 }}>
                {r.part.nameAr}
              </span>
            </div>
          ))}
        </div>
      )}

      {facts.length > 0 && (
        <div
          data-testid="kb-context-rc-facts"
          style={{
            display: 'flex', flexDirection: 'column', gap: 5,
            marginBottom: findings.length ? 10 : 0,
            paddingTop: parts.length ? 8 : 0,
            borderTop: parts.length ? '1px solid rgba(15,23,42,0.06)' : undefined,
          }}
        >
          {facts.map(f => (
            <div
              key={f.field}
              data-testid={`kb-context-rc-${f.field}`}
              style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}
            >
              <span style={{ fontSize: 11, color: '#64748b', minWidth: 108 }}>{f.labelAr}</span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a', flex: 1 }}>{f.valueAr}</span>
            </div>
          ))}
        </div>
      )}

      {findings.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {findings.map(f => {
            const s = SEV_STYLE[f.severity];
            return (
              <button
                key={f.id}
                type="button"
                data-testid={`kb-context-finding-${f.id}`}
                onClick={() => navigate('/project')}
                style={{
                  display: 'flex', gap: 8, alignItems: 'flex-start', width: '100%',
                  background: s.bg, border: `1px solid ${s.border}`, borderRadius: 11,
                  padding: '8px 10px', cursor: 'pointer', textAlign: 'right',
                }}
              >
                <span
                  style={{
                    fontSize: 9.5, fontWeight: 800, color: s.fg, background: '#fff',
                    borderRadius: 999, padding: '2px 6px', flexShrink: 0, marginTop: 1,
                  }}
                >
                  {SEVERITY_LABEL_AR[f.severity]}
                </span>
                <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: '#0f172a', lineHeight: 1.65 }}>
                  <RichText text={f.claimAr} idKey={`ctx-${f.id}`} />
                </span>
                <ChevronLeft size={14} style={{ color: '#94a3b8', flexShrink: 0, marginTop: 2 }} aria-hidden />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

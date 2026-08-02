import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Library, Stethoscope, ChevronLeft } from 'lucide-react';
import { getBacklinks } from '../../data/kb/backlinks';
import type { KbLinkKind } from '../../data/kb/types';

/**
 * "In the encyclopedia" strip, rendered inside EXISTING sections (a lesson, a
 * Betaflight page) to close the loop the audit flagged: the app's subsystems
 * had no way to reach each other. Renders nothing at all when there is no
 * related content, so a section never shows an empty promise.
 */
export const KbBacklinks: React.FC<{ kind: KbLinkKind; targetId: string; tone?: 'light' | 'dark' }> = ({
  kind, targetId, tone = 'light',
}) => {
  const navigate = useNavigate();
  const { articles, trees } = getBacklinks(kind, targetId);

  if (articles.length === 0 && trees.length === 0) return null;

  const dark = tone === 'dark';
  const cardBg = dark ? 'rgba(255,255,255,0.05)' : '#ffffff';
  const cardBorder = dark ? 'rgba(148,163,184,0.22)' : 'rgba(15,23,42,0.09)';
  const titleColor = dark ? '#e2e8f0' : '#0f172a';
  const subColor = dark ? '#94a3b8' : '#64748b';

  return (
    <section
      data-testid={`kb-backlinks-${kind}-${targetId}`}
      style={{
        border: `1px solid ${dark ? 'rgba(56,189,248,0.28)' : 'rgba(14,165,233,0.28)'}`,
        background: dark ? 'rgba(14,165,233,0.07)' : 'rgba(14,165,233,0.05)',
        borderRadius: 16, padding: 13, marginTop: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9 }}>
        <Library size={16} style={{ color: dark ? '#38bdf8' : '#0369a1' }} aria-hidden />
        <strong style={{ fontSize: 13, color: titleColor }}>في الموسوعة — شرح أعمق</strong>
      </div>

      {articles.map(a => (
        <button
          key={a.id}
          type="button"
          data-testid={`kb-backlink-article-${a.id}`}
          onClick={() => navigate(`/kb/${a.moduleId}/${a.id}`)}
          style={{
            width: '100%', textAlign: 'right', display: 'flex', alignItems: 'flex-start', gap: 9,
            background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 11,
            padding: '10px 11px', marginBottom: 7, cursor: 'pointer',
          }}
        >
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 12.5, fontWeight: 800, color: titleColor, lineHeight: 1.6 }}>
              {a.titleAr}
            </span>
            <span style={{ display: 'block', fontSize: 11, lineHeight: 1.65, color: subColor, marginTop: 3 }}>
              {a.summaryAr}
            </span>
          </span>
          <ChevronLeft size={14} style={{ color: subColor, flexShrink: 0, marginTop: 3 }} aria-hidden />
        </button>
      ))}

      {trees.map(t => (
        <button
          key={t.id}
          type="button"
          data-testid={`kb-backlink-dx-${t.id}`}
          onClick={() => navigate(`/diagnose/${t.id}`)}
          style={{
            width: '100%', textAlign: 'right', display: 'flex', alignItems: 'center', gap: 9,
            background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 11,
            padding: '10px 11px', marginBottom: 7, cursor: 'pointer',
          }}
        >
          <Stethoscope size={14} style={{ color: '#a21caf', flexShrink: 0 }} aria-hidden />
          <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: titleColor }}>{t.titleAr}</span>
          <ChevronLeft size={14} style={{ color: subColor, flexShrink: 0 }} aria-hidden />
        </button>
      ))}
    </section>
  );
};

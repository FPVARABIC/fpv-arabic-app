import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { Header } from '../components/Header';
import { ArrowRight, ChevronLeft, CircleCheck, Route as RouteIcon, ListTree, Grid3x3, Stethoscope } from 'lucide-react';
import { getModule, moduleArticles } from '../data/kb/registry';
import { computeModuleCoverage } from '../data/kb/coverage';
import { dxTreesForModule } from '../data/kb/diagnostics/trees';
import { useKbProgress } from '../hooks/useKbProgress';
import {
  KB_COVERAGE_LABEL_AR, KB_KIND_LABEL_AR, KB_LEVEL_LABEL_AR,
} from '../data/kb/types';

type Tab = 'paths' | 'articles' | 'coverage';

/**
 * Module page — the place where "وضع التعلّم" and "الوضع المرجعي" physically
 * split. Paths tab is the ordered learning journey; Articles tab is the flat
 * reference index a professional can jump straight into; Coverage tab is the
 * honesty surface that names any missing axis instead of hiding it.
 */
export const KbModuleView: React.FC = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const progress = useKbProgress();
  const [tab, setTab] = useState<Tab>('paths');

  const mod = moduleId ? getModule(moduleId) : undefined;

  if (!mod) {
    return (
      <AppShell tint="blue">
        <Header title="الموسوعة" />
        <div style={{ padding: 20 }}>
          <p style={{ fontSize: 14, color: '#334155' }}>هذه الوحدة غير موجودة.</p>
          <button className="btn-secondary" onClick={() => navigate('/kb')}>العودة إلى الموسوعة</button>
        </div>
      </AppShell>
    );
  }

  const cov = computeModuleCoverage(mod);
  const articles = moduleArticles(mod.id);
  const trees = dxTreesForModule(mod.id);
  const readCount = progress.readCountIn(articles.map(a => a.id));

  const tabs: { id: Tab; label: string; Icon: typeof RouteIcon }[] = [
    { id: 'paths', label: 'مسارات', Icon: RouteIcon },
    { id: 'articles', label: 'كل المقالات', Icon: ListTree },
    { id: 'coverage', label: 'التغطية', Icon: Grid3x3 },
  ];

  return (
    <AppShell tint="blue">
      <Header
        title={mod.titleAr}
        rightAction={
          <button
            onClick={() => navigate('/kb')}
            aria-label="رجوع"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0f172a', display: 'flex' }}
          >
            <ArrowRight size={20} />
          </button>
        }
      />

      <div className="fade-in" style={{ background: '#f8fafc', minHeight: '100%', paddingBottom: 24 }}>
        <div style={{ padding: '14px 16px 0' }}>
          <p style={{ fontSize: 13, lineHeight: 1.85, color: '#334155', margin: '0 0 10px' }}>{mod.summaryAr}</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            <span style={CHIP}>{articles.length} مقالاً</span>
            <span style={CHIP}>{readCount} مقروء</span>
            <span style={CHIP}>{trees.length} شجرة تشخيص</span>
            <span style={{ ...CHIP, background: cov.complete ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.14)', color: cov.complete ? '#047857' : '#b45309' }}>
              تغطية {cov.coveredCount}/{cov.requiredCount}
            </span>
            <span style={CHIP}>آخر مراجعة {mod.lastReviewed}</span>
          </div>
        </div>

        <div
          role="tablist"
          style={{ display: 'flex', gap: 6, padding: '0 16px 12px', borderBottom: '1px solid rgba(15,23,42,0.07)' }}
        >
          {tabs.map(t => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              data-testid={`kb-module-tab-${t.id}`}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                padding: '8px 6px', borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 800,
                border: '1px solid ' + (tab === t.id ? 'rgba(14,165,233,0.45)' : 'rgba(15,23,42,0.09)'),
                background: tab === t.id ? 'rgba(14,165,233,0.12)' : '#ffffff',
                color: tab === t.id ? '#0369a1' : '#475569',
              }}
            >
              <t.Icon size={14} aria-hidden />
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ padding: '14px 16px 0' }}>
          {tab === 'paths' && (
            <>
              {mod.paths.map(p => {
                const done = progress.readCountIn(p.articleIds);
                return (
                  <div
                    key={p.id}
                    data-testid={`kb-path-${p.id}`}
                    style={{
                      background: '#ffffff', border: '1px solid rgba(15,23,42,0.10)',
                      borderRadius: 16, padding: 14, marginBottom: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: 14.5, fontWeight: 900, color: '#0f172a', margin: 0 }}>{p.titleAr}</h3>
                      <span style={{ ...CHIP, background: 'rgba(14,165,233,0.12)', color: '#0369a1' }}>
                        {KB_LEVEL_LABEL_AR[p.level]}
                      </span>
                    </div>
                    <p style={{ fontSize: 12.5, lineHeight: 1.8, color: '#475569', margin: '6px 0 0' }}>{p.audienceAr}</p>
                    <p style={{ fontSize: 12.5, lineHeight: 1.8, color: '#047857', margin: '6px 0 10px' }}>
                      <strong>بعد هذا المسار: </strong>{p.outcomeAr}
                    </p>

                    <div style={{ height: 5, borderRadius: 999, background: 'rgba(148,163,184,0.22)', marginBottom: 10 }}>
                      <div
                        style={{
                          height: '100%', borderRadius: 999,
                          width: `${(done / p.articleIds.length) * 100}%`,
                          background: 'linear-gradient(90deg,#0ea5e9,#38bdf8)',
                        }}
                      />
                    </div>

                    <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {p.articleIds.map((aid, i) => {
                        const a = articles.find(x => x.id === aid);
                        if (!a) return null;
                        const isDone = progress.isRead(aid);
                        return (
                          <li key={aid} style={{ marginBottom: 6 }}>
                            <button
                              type="button"
                              data-testid={`kb-path-step-${aid}`}
                              onClick={() => navigate(`/kb/${mod.id}/${a.id}`)}
                              style={{
                                width: '100%', textAlign: 'right', display: 'flex', alignItems: 'center', gap: 9,
                                background: 'rgba(148,163,184,0.07)', border: 'none', borderRadius: 10,
                                padding: '9px 10px', cursor: 'pointer',
                              }}
                            >
                              <span
                                style={{
                                  width: 20, height: 20, borderRadius: 999, flexShrink: 0, fontSize: 10.5, fontWeight: 800,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  background: isDone ? 'rgba(16,185,129,0.16)' : 'rgba(14,165,233,0.12)',
                                  color: isDone ? '#047857' : '#0369a1',
                                }}
                              >
                                {isDone ? <CircleCheck size={13} aria-hidden /> : i + 1}
                              </span>
                              <span style={{ flex: 1, fontSize: 13, color: '#1e293b', fontWeight: 600 }}>{a.titleAr}</span>
                              <ChevronLeft size={15} style={{ color: '#94a3b8', flexShrink: 0 }} aria-hidden />
                            </button>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                );
              })}

              {trees.length > 0 && (
                <div
                  style={{
                    background: 'rgba(217,70,239,0.05)', border: '1px solid rgba(217,70,239,0.28)',
                    borderRadius: 16, padding: 14, marginBottom: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Stethoscope size={17} style={{ color: '#a21caf' }} aria-hidden />
                    <h3 style={{ fontSize: 14, fontWeight: 900, color: '#0f172a', margin: 0 }}>أشجار التشخيص</h3>
                  </div>
                  {trees.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      data-testid={`kb-module-dx-${t.id}`}
                      onClick={() => navigate(`/diagnose/${t.id}`)}
                      style={{
                        width: '100%', textAlign: 'right', display: 'flex', alignItems: 'center', gap: 8,
                        background: '#ffffff', border: '1px solid rgba(15,23,42,0.08)', borderRadius: 10,
                        padding: '9px 10px', marginBottom: 6, cursor: 'pointer',
                      }}
                    >
                      <span style={{ flex: 1, fontSize: 12.5, color: '#1e293b', fontWeight: 600 }}>{t.titleAr}</span>
                      <ChevronLeft size={15} style={{ color: '#94a3b8', flexShrink: 0 }} aria-hidden />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'articles' && (
            <>
              <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 10px', lineHeight: 1.7 }}>
                الوضع المرجعي: ادخل مباشرةً على ما تحتاجه دون المرور بأي مسار.
              </p>
              {articles.map(a => (
                <button
                  key={a.id}
                  type="button"
                  data-testid={`kb-article-link-${a.id}`}
                  onClick={() => navigate(`/kb/${mod.id}/${a.id}`)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'right', background: '#ffffff',
                    border: '1px solid rgba(15,23,42,0.09)', borderRadius: 14, padding: 12,
                    marginBottom: 8, cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                    <span
                      style={{
                        width: 22, height: 22, borderRadius: 7, flexShrink: 0, fontSize: 11, fontWeight: 800,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1,
                        background: progress.isRead(a.id) ? 'rgba(16,185,129,0.16)' : 'rgba(148,163,184,0.16)',
                        color: progress.isRead(a.id) ? '#047857' : '#475569',
                      }}
                    >
                      {progress.isRead(a.id) ? <CircleCheck size={13} aria-hidden /> : a.order}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a', lineHeight: 1.6 }}>{a.titleAr}</div>
                      <div style={{ fontSize: 12, lineHeight: 1.7, color: '#64748b', marginTop: 3 }}>{a.summaryAr}</div>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 7 }}>
                        <span style={CHIP}>{KB_KIND_LABEL_AR[a.kind]}</span>
                        {a.levels.slice(0, 2).map(l => (
                          <span key={l} style={CHIP}>{KB_LEVEL_LABEL_AR[l]}</span>
                        ))}
                        {a.safetyLevel === 'critical' && (
                          <span style={{ ...CHIP, background: 'rgba(239,68,68,0.12)', color: '#b91c1c' }}>سلامة حرجة</span>
                        )}
                      </div>
                    </div>
                    <ChevronLeft size={16} style={{ color: '#94a3b8', flexShrink: 0, marginTop: 4 }} aria-hidden />
                  </div>
                </button>
              ))}
            </>
          )}

          {tab === 'coverage' && (
            <div data-testid="kb-coverage-matrix">
              <p style={{ fontSize: 12.5, lineHeight: 1.8, color: '#475569', margin: '0 0 12px' }}>
                هذه مصفوفة التغطية الحقيقية للوحدة. المحور غير المغطى يظهر هنا باسمه — لا يُخفى خلف نسبة.
              </p>
              <div
                style={{
                  background: '#ffffff', border: '1px solid rgba(15,23,42,0.10)',
                  borderRadius: 14, padding: 12, marginBottom: 14,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                  <strong style={{ fontSize: 13, color: '#0f172a' }}>
                    {cov.coveredCount} من {cov.requiredCount} محوراً
                  </strong>
                  <span style={{ fontSize: 12, fontWeight: 800, color: cov.complete ? '#047857' : '#b45309' }}>
                    {cov.percent}%
                  </span>
                </div>
                <div style={{ height: 6, borderRadius: 999, background: 'rgba(148,163,184,0.22)' }}>
                  <div
                    style={{
                      height: '100%', borderRadius: 999, width: `${cov.percent}%`,
                      background: cov.complete ? 'linear-gradient(90deg,#10b981,#34d399)' : 'linear-gradient(90deg,#f59e0b,#fbbf24)',
                    }}
                  />
                </div>
                {cov.missing.length > 0 && (
                  <div style={{ marginTop: 10, fontSize: 12, color: '#b45309', lineHeight: 1.8 }}>
                    <strong>محاور ناقصة: </strong>
                    {cov.missing.map(m => KB_COVERAGE_LABEL_AR[m]).join('، ')}
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
                {cov.axes.map(ax => (
                  <div
                    key={ax.axis}
                    data-testid={`kb-axis-${ax.axis}`}
                    data-covered={ax.covered ? 'true' : 'false'}
                    style={{
                      border: `1px solid ${ax.covered ? 'rgba(16,185,129,0.30)' : 'rgba(245,158,11,0.45)'}`,
                      background: ax.covered ? 'rgba(16,185,129,0.05)' : 'rgba(245,158,11,0.07)',
                      borderRadius: 11, padding: '8px 10px',
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 800, color: ax.covered ? '#047857' : '#b45309' }}>
                      {ax.covered ? '✓ ' : '✕ '}{KB_COVERAGE_LABEL_AR[ax.axis]}
                    </div>
                    <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 2 }}>
                      {ax.covered ? `${ax.articleIds.length} مقال` : 'غير مغطّى'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
};

const CHIP: React.CSSProperties = {
  fontSize: 10.5, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
  background: 'rgba(148,163,184,0.16)', color: '#475569',
};

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { Header } from '../components/Header';
import { ArrowRight, ChevronLeft, Grid3x3, Info } from 'lucide-react';
import {
  domainMatrixStatus, summarizeDomainMatrix, DOMAIN_AREA_LABEL_AR,
  MATRIX_DIMENSIONS, MATRIX_DIMENSION_LABEL_AR, MATRIX_DIMENSION_SHORT_AR,
  MIN_DX_TREES_FOR_COMPLETE, MIN_TERMS_FOR_COMPLETE, MIN_PARTS_FOR_COMPLETE,
  type DomainArea, type DimensionState,
} from '../data/kb/domainMatrix';
import { getSearchIndex } from '../data/kb/search/buildIndex';
import { RichText } from '../components/kb/Term';

const STATE_STYLE: Record<DimensionState, { bg: string; fg: string; border: string; mark: string }> = {
  complete: { bg: 'rgba(16,185,129,0.12)', fg: '#047857', border: 'rgba(16,185,129,0.30)', mark: '✓' },
  partial: { bg: 'rgba(245,158,11,0.14)', fg: '#b45309', border: 'rgba(245,158,11,0.32)', mark: '◐' },
  none: { bg: 'rgba(148,163,184,0.14)', fg: '#94a3b8', border: 'rgba(148,163,184,0.25)', mark: '✕' },
};

const STATE_LABEL_AR: Record<DimensionState, string> = {
  complete: 'مكتمل',
  partial: 'جزئي',
  none: 'لم يبدأ',
};

const KIND_LABEL_AR: Record<string, string> = {
  system: 'نظام',
  component: 'مكوّن',
  protocol: 'بروتوكول',
  software: 'برنامج',
  discipline: 'مجال',
};

/**
 * The domain coverage matrix, rendered from DERIVED status.
 *
 * Every tick on this page is computed by inspecting the real data at render
 * time. Nothing here can be hand-marked as done, which is the entire point: the
 * spec demands that a gap show up as a gap rather than hide behind a design.
 */
export const KbMatrixView: React.FC = () => {
  const navigate = useNavigate();
  const [openArea, setOpenArea] = useState<DomainArea | null>(null);

  const rows = useMemo(() => {
    const systems = new Set(
      getSearchIndex().map(d => d.system).filter((s): s is string => !!s),
    );
    // Software rows are indexed under `software`, not `system`.
    for (const d of getSearchIndex()) if (d.software) systems.add(d.software);
    return domainMatrixStatus(systems);
  }, []);

  const summary = useMemo(() => summarizeDomainMatrix(rows), [rows]);

  const areas = summary.byArea;

  return (
    <AppShell tint="blue">
      <Header
        title="مصفوفة التغطية"
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

      <div className="fade-in" style={{ background: '#f8fafc', minHeight: '100%', padding: '14px 16px 28px' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(14,165,233,0.12), rgba(56,189,248,0.05))',
            border: '1px solid rgba(14,165,233,0.25)', borderRadius: 16, padding: 14, marginBottom: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
            <Grid3x3 size={18} style={{ color: '#0369a1' }} aria-hidden />
            <h2 style={{ fontSize: 15, fontWeight: 900, color: '#0f172a', margin: 0 }}>جرد المجال الكامل</h2>
          </div>
          <p style={{ fontSize: 12.5, lineHeight: 1.85, color: '#334155', margin: 0 }}>
            كل نظام ومكوّن وبرنامج تنوي المنصة تغطيته — بما فيه ما لم يُكتب بعد. كل علامة في هذه
            الصفحة محسوبة من البيانات الحقيقية لحظة العرض، لا مكتوبة يدوياً، فلا يمكن ادّعاء تغطية
            غير موجودة.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
          <StatTile label="عنصراً" value={summary.totalElements} tone="neutral" testid="matrix-total" />
          <StatTile label="مكتمل" value={summary.complete} tone="good" testid="matrix-complete" />
          <StatTile label="جزئي" value={summary.partial} tone="warn" testid="matrix-partial" />
        </div>

        <div
          style={{
            display: 'flex', gap: 7, alignItems: 'flex-start', background: '#ffffff',
            border: '1px solid rgba(15,23,42,0.09)', borderRadius: 13, padding: '11px 12px', marginBottom: 16,
          }}
        >
          <Info size={14} style={{ color: '#0369a1', flexShrink: 0, marginTop: 2 }} aria-hidden />
          <div style={{ fontSize: 11.5, lineHeight: 1.8, color: '#475569' }}>
            ستة أبعاد لكل عنصر: {MATRIX_DIMENSIONS.map(d => MATRIX_DIMENSION_SHORT_AR[d]).join(' · ')}،
            ولكل بُعد ثلاث حالات: مكتمل ◐ جزئي ✕ لم يبدأ.
            <br />
            <strong>حالة العنصر الكلية هي أضعف أبعاده لا متوسطها.</strong> نظام مشروح في الدروس
            بتغطية كاملة لكن قسم البناء فيه جزئي يبقى «جزئياً» — لأن المستخدم الذي يبني لن يجد
            ما يحتاجه.
            <br />
            حدود الاكتمال المعلنة: {MIN_DX_TREES_FOR_COMPLETE} أشجار تشخيص · {MIN_TERMS_FOR_COMPLETE} مصطلحات ·
            {' '}{MIN_PARTS_FOR_COMPLETE} قطع في البناء · وكل محاور التغطية المطلوبة مغطّاة.
          </div>
        </div>

        {areas.map(a => {
          const inArea = rows.filter(r => r.element.area === a.area);
          const open = openArea === a.area;
          return (
            <div key={a.area} style={{ marginBottom: 10 }}>
              <button
                type="button"
                data-testid={`matrix-area-${a.area}`}
                onClick={() => setOpenArea(open ? null : a.area)}
                style={{
                  width: '100%', textAlign: 'right', background: '#ffffff',
                  border: '1px solid rgba(15,23,42,0.10)', borderRadius: 14,
                  padding: '12px 13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 900, color: '#0f172a' }}>
                    {DOMAIN_AREA_LABEL_AR[a.area]}
                  </div>
                  <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 3 }}>
                    {a.total} عناصر · {a.complete} مكتمل · {a.partial} جزئي
                  </div>
                </div>
                <ChevronLeft
                  size={16}
                  style={{ color: '#94a3b8', flexShrink: 0, transform: open ? 'rotate(-90deg)' : 'none', transition: 'transform .15s' }}
                  aria-hidden
                />
              </button>

              {open && (
                <div style={{ marginTop: 7 }}>
                  {inArea.map(r => (
                    <div
                      key={r.element.id}
                      data-testid={`matrix-row-${r.element.id}`}
                      data-corners={r.coveredCorners}
                      data-overall={r.overall}
                      style={{
                        background: '#ffffff', border: '1px solid rgba(15,23,42,0.09)',
                        borderRadius: 12, padding: '11px 12px', marginBottom: 7,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: 13, color: '#0f172a' }}>{r.element.titleAr}</strong>
                        <span dir="ltr" style={{ fontSize: 11, color: '#64748b', unicodeBidi: 'isolate' }}>
                          {r.element.titleEn}
                        </span>
                        <span style={CHIP}>{KIND_LABEL_AR[r.element.kind]}</span>
                      </div>

                      <p style={{ fontSize: 11.5, lineHeight: 1.75, color: '#64748b', margin: '5px 0 8px' }}>
                        <RichText text={r.element.whyAr} idKey={`why-${r.element.id}`} />
                      </p>

                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        {MATRIX_DIMENSIONS.map(d => {
                          const state = r.dimensions[d];
                          const s = STATE_STYLE[state];
                          return (
                            <span
                              key={d}
                              title={`${MATRIX_DIMENSION_LABEL_AR[d]}: ${STATE_LABEL_AR[state]}`}
                              data-testid={`matrix-${r.element.id}-${d}`}
                              data-state={state}
                              data-on={state !== 'none' ? 'true' : 'false'}
                              style={{
                                fontSize: 10.5, fontWeight: 800, padding: '3px 8px', borderRadius: 999,
                                background: s.bg, color: s.fg, border: `1px solid ${s.border}`,
                              }}
                            >
                              {s.mark} {MATRIX_DIMENSION_SHORT_AR[d]}
                            </span>
                          );
                        })}
                      </div>

                      <div style={{ display: 'flex', gap: 10, marginTop: 8, fontSize: 10.5, color: '#94a3b8', flexWrap: 'wrap' }}>
                        <span>{r.articleCount} مقالاً</span>
                        {r.coverageRequired > 0 && (
                          <span>تغطية {r.coverageCovered}/{r.coverageRequired}</span>
                        )}
                        <span>{r.dxCount} شجرة تشخيص</span>
                        <span>{r.termCount} مصطلحاً</span>
                        <span>{r.partCount} قطعة في البناء</span>
                        {r.bfDeclared > 0 && <span>{r.bfReviewed}/{r.bfDeclared} صفحة برنامج</span>}
                        <span data-testid={`matrix-overall-${r.element.id}`}>
                          الحالة: {STATE_LABEL_AR[r.overall]}
                        </span>
                        <span>أولوية {r.element.priority}</span>
                      </div>

                      {r.articleCount > 0 && r.element.moduleId && (
                        <button
                          type="button"
                          data-testid={`matrix-open-${r.element.id}`}
                          onClick={() => navigate(`/kb/${r.element.moduleId}`)}
                          style={{
                            marginTop: 8, background: 'none', border: 'none', padding: 0,
                            color: '#0369a1', fontSize: 11.5, fontWeight: 800, cursor: 'pointer',
                          }}
                        >
                          افتح الوحدة ←
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AppShell>
  );
};

const CHIP: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
  background: 'rgba(148,163,184,0.16)', color: '#475569',
};

const StatTile: React.FC<{ label: string; value: number; tone: 'neutral' | 'good' | 'warn'; testid: string }> = ({
  label, value, tone, testid,
}) => {
  const color = tone === 'good' ? '#047857' : tone === 'warn' ? '#b45309' : '#0369a1';
  const bg = tone === 'good' ? 'rgba(16,185,129,0.08)' : tone === 'warn' ? 'rgba(245,158,11,0.09)' : 'rgba(14,165,233,0.08)';
  return (
    <div
      data-testid={testid}
      style={{ background: bg, border: `1px solid ${color}33`, borderRadius: 13, padding: '11px 8px', textAlign: 'center' }}
    >
      <div style={{ fontSize: 20, fontWeight: 900, color }}>{value}</div>
      <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{label}</div>
    </div>
  );
};

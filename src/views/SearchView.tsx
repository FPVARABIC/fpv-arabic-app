import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { Header } from '../components/Header';
import { ArrowRight, Search as SearchIcon, X, ChevronLeft, SlidersHorizontal } from 'lucide-react';
import { search, type SearchFilters } from '../data/kb/search/query';
import { SEARCH_TYPE_LABEL_AR, type SearchDocType, type SearchContentClass } from '../data/kb/search/buildIndex';
import { RichText } from '../components/kb/Term';

const SUGGESTIONS = ['فلايت كنترولر', 'UART', 'فيل سيف', 'ESC', 'اهتزاز', 'بلاك بوكس', 'DShot', 'بطارية'];

const CLASS_LABEL: Record<SearchContentClass, string> = {
  learning: 'تعليمي',
  reference: 'مرجعي',
  diagnostic: 'تشخيصي',
};

const TYPE_COLOR: Partial<Record<SearchDocType, string>> = {
  article: '#0369a1',
  dx: '#a21caf',
  term: '#047857',
  lesson: '#b45309',
  'bf-page': '#4338ca',
  'bf-field': '#4338ca',
  'edgetx-topic': '#0e7490',
  'edgetx-setting': '#0e7490',
  'video-tool': '#7c3aed',
};

/**
 * Global search across every content source in the app.
 *
 * The audit found the app had no app-wide search at all — the only search box
 * queried Firestore for community posts. This view searches KB articles,
 * glossary terms, diagnostic trees, lessons, Betaflight pages AND individual
 * Betaflight settings by their real English label, assembly parts and stages,
 * roadmap stages, checklists, and the ExpressLRS content.
 */
export const SearchView: React.FC = () => {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [contentClass, setContentClass] = useState<SearchContentClass | null>(null);
  const [typeFilter, setTypeFilter] = useState<SearchDocType | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filters: SearchFilters = useMemo(() => ({
    contentClass: contentClass ?? undefined,
    types: typeFilter ? [typeFilter] : undefined,
  }), [contentClass, typeFilter]);

  // Unfiltered hits drive the type chips, so a chip never shows a count of 0 for
  // a type that only disappeared because of the currently-active filter.
  const allHits = useMemo(() => search(input, { limit: 400 }), [input]);
  const hits = useMemo(() => search(input, { filters, limit: 120 }), [input, filters]);

  const typeCounts = useMemo(() => {
    const m = new Map<SearchDocType, number>();
    for (const h of allHits) m.set(h.doc.type, (m.get(h.doc.type) ?? 0) + 1);
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [allHits]);

  return (
    <AppShell tint="blue">
      <Header
        title="بحث"
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
        <div style={{ padding: '12px 16px 0' }}>
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 8, background: '#ffffff',
              border: '1px solid rgba(15,23,42,0.12)', borderRadius: 12, padding: '9px 12px',
            }}
          >
            <SearchIcon size={16} style={{ color: '#94a3b8', flexShrink: 0 }} aria-hidden />
            <input
              data-testid="search-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="ابحث بالعربية أو الإنجليزية: فلايت كنترولر، UART، اهتزاز..."
              aria-label="حقل البحث"
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13.5, fontFamily: 'inherit', background: 'transparent', minWidth: 0 }}
            />
            {input && (
              <button
                onClick={() => setInput('')}
                aria-label="مسح"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}
              >
                <X size={15} />
              </button>
            )}
            <button
              onClick={() => setFiltersOpen(o => !o)}
              aria-label="فلاتر"
              data-testid="search-filters-toggle"
              style={{
                background: filtersOpen ? 'rgba(14,165,233,0.12)' : 'none', border: 'none', cursor: 'pointer',
                color: filtersOpen ? '#0369a1' : '#94a3b8', display: 'flex', borderRadius: 8, padding: 3,
              }}
            >
              <SlidersHorizontal size={15} />
            </button>
          </div>

          {filtersOpen && (
            <div style={{ marginTop: 10 }} data-testid="search-filters">
              <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', marginBottom: 5 }}>نوع المحتوى</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                {(['learning', 'reference', 'diagnostic'] as SearchContentClass[]).map(c => (
                  <button
                    key={c}
                    data-testid={`search-class-${c}`}
                    onClick={() => setContentClass(prev => (prev === c ? null : c))}
                    style={chipStyle(contentClass === c)}
                  >
                    {CLASS_LABEL[c]}
                  </button>
                ))}
              </div>
              {typeCounts.length > 0 && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', marginBottom: 5 }}>المصدر</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {typeCounts.map(([t, n]) => (
                      <button
                        key={t}
                        data-testid={`search-type-${t}`}
                        onClick={() => setTypeFilter(prev => (prev === t ? null : t))}
                        style={chipStyle(typeFilter === t)}
                      >
                        {SEARCH_TYPE_LABEL_AR[t]} ({n})
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {!input && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: '#64748b', marginBottom: 7 }}>جرّب</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {SUGGESTIONS.map(s => (
                  <button key={s} data-testid={`search-suggestion-${s}`} onClick={() => setInput(s)} style={chipStyle(false)}>
                    {s}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: 12, lineHeight: 1.85, color: '#64748b', marginTop: 16 }}>
                البحث يفهم العربية والإنجليزية والاختصارات والنقحرة الشائعة، ويتحمّل الأخطاء الإملائية البسيطة.
                «فلايت كنترولر» و«Flight Controller» و«FC» و«متحكم الطيران» كلها تصل إلى المحتوى نفسه.
              </p>
            </div>
          )}
        </div>

        {input && (
          <div style={{ padding: '14px 16px 0' }}>
            <div data-testid="search-count" style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>
              {hits.length === 0 ? 'لا توجد نتائج' : `${hits.length} نتيجة`}
              {(contentClass || typeFilter) && ` (من ${allHits.length} قبل الفلترة)`}
            </div>

            {hits.length === 0 && (
              <div
                style={{
                  background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.35)',
                  borderRadius: 14, padding: '12px 14px', fontSize: 12.5, lineHeight: 1.85, color: '#78350f',
                }}
              >
                لم يُعثر على شيء. جرّب كلمة أقصر، أو المصطلح الإنجليزي، أو الاختصار.
                إن كان الموضوع خارج ما كُتب حتى الآن فستجد نطاق الموسوعة الحالي معلناً في صفحتها الرئيسية.
              </div>
            )}

            {hits.map(h => (
              <button
                key={h.doc.key}
                type="button"
                data-testid={`search-result-${h.doc.key}`}
                onClick={() => navigate(h.doc.route)}
                style={{
                  display: 'block', width: '100%', textAlign: 'right', background: '#ffffff',
                  border: '1px solid rgba(15,23,42,0.09)', borderRadius: 13, padding: '11px 13px',
                  marginBottom: 8, cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 999,
                          background: `${TYPE_COLOR[h.doc.type] ?? '#64748b'}1a`,
                          color: TYPE_COLOR[h.doc.type] ?? '#475569',
                        }}
                      >
                        {SEARCH_TYPE_LABEL_AR[h.doc.type]}
                      </span>
                      {h.doc.version && (
                        <span dir="ltr" style={{ fontSize: 10, color: '#94a3b8', unicodeBidi: 'isolate' }}>{h.doc.version}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a', lineHeight: 1.6 }}>
                      <RichText text={h.doc.titleAr} idKey={`t-${h.doc.key}`} />
                    </div>
                    {h.doc.titleEn && h.doc.titleEn !== h.doc.titleAr && (
                      <div dir="ltr" style={{ fontSize: 11.5, color: '#0369a1', marginTop: 1, unicodeBidi: 'isolate' }}>
                        {h.doc.titleEn}
                      </div>
                    )}
                    {h.doc.subtitle && (
                      <div style={{ fontSize: 11.5, lineHeight: 1.7, color: '#64748b', marginTop: 3 }}>
                        <RichText text={h.doc.subtitle} idKey={`s-${h.doc.key}`} />
                      </div>
                    )}
                  </div>
                  <ChevronLeft size={15} style={{ color: '#94a3b8', flexShrink: 0, marginTop: 6 }} aria-hidden />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
};

function chipStyle(active: boolean): React.CSSProperties {
  return {
    fontSize: 11.5, fontWeight: 700, padding: '5px 11px', borderRadius: 999, cursor: 'pointer',
    border: '1px solid ' + (active ? 'rgba(14,165,233,0.5)' : 'rgba(15,23,42,0.10)'),
    background: active ? 'rgba(14,165,233,0.14)' : '#ffffff',
    color: active ? '#0369a1' : '#475569',
  };
}

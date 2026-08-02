import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { Header } from '../components/Header';
import { ArrowRight, Search as SearchIcon, X, ChevronLeft, AlertCircle } from 'lucide-react';
import { kbTerms, getTerm, glossaryDomains } from '../data/kb/glossary/terms';
import { getArticle } from '../data/kb/registry';
import { normalizeText } from '../data/kb/search/normalize';
import { search } from '../data/kb/search/query';
import { RichText } from '../components/kb/Term';

/**
 * Arabic technical dictionary.
 *
 * `?term=<id>` opens a specific entry — that is the deep-link every article's
 * glossary chip and every search hit points at, so a term always has one stable
 * address rather than being buried in a scroll list.
 */
export const GlossaryView: React.FC = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');

  const selectedId = params.get('term');
  const selected = selectedId ? getTerm(selectedId) : undefined;

  useEffect(() => { window.scrollTo(0, 0); }, [selectedId]);

  // Reuses the global search engine rather than a second, weaker substring
  // filter. That is what makes «يوارت» find UART here exactly as it does in
  // global search — a private implementation would have to re-learn every
  // transliteration and typo rule, and would drift out of sync the moment one
  // of them changed.
  const filtered = useMemo(() => {
    if (!normalizeText(query)) return kbTerms;
    const ids = search(query, { filters: { types: ['term'] }, limit: 200 }).map(h => h.doc.sourceId);
    const order = new Map(ids.map((id, i) => [id, i]));
    return kbTerms
      .filter(t => order.has(t.id))
      .sort((a, b) => (order.get(a.id)! - order.get(b.id)!));
  }, [query]);

  // Domains are ordered by the canonical domain list, not by how many terms
  // each happens to contain: a size-based order would visibly reshuffle the
  // whole page as the user types, which reads as instability rather than as a
  // narrowing result set.
  const grouped = useMemo(() => {
    const present = new Set(filtered.map(t => t.domain));
    return glossaryDomains()
      .filter(d => present.has(d))
      .map(d => [d, filtered.filter(t => t.domain === d)] as const);
  }, [filtered]);

  if (selected) {
    return (
      <AppShell tint="green">
        <Header
          title="القاموس"
          rightAction={
            <button
              onClick={() => setParams({})}
              aria-label="رجوع"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0f172a', display: 'flex' }}
            >
              <ArrowRight size={20} />
            </button>
          }
        />
        <div className="fade-in" style={{ background: '#f8fafc', minHeight: '100%', padding: '14px 16px 28px' }}>
          <div
            data-testid="glossary-detail"
            style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.10)', borderRadius: 16, padding: 15 }}
          >
            <h1 style={{ fontSize: 19, fontWeight: 900, color: '#0f172a', margin: 0 }}>{selected.ar}</h1>
            <div dir="ltr" style={{ fontSize: 13, color: '#0369a1', marginTop: 3, unicodeBidi: 'isolate' }}>
              {selected.en}{selected.abbr ? ` (${selected.abbr})` : ''}
            </div>
            {selected.pronunciationAr && (
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>يُنطق: {selected.pronunciationAr}</div>
            )}

            <div style={{ marginTop: 13 }}>
              <div style={LABEL}>تعريف مبسّط</div>
              <p style={BODY}><RichText text={selected.short} idKey="short" /></p>
            </div>

            {selected.technical && (
              <div style={{ marginTop: 12 }}>
                <div style={LABEL}>تعريف تقني</div>
                <p style={BODY}><RichText text={selected.technical} idKey="tech" /></p>
              </div>
            )}

            {selected.appearsIn.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={LABEL}>أين تراه</div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {selected.appearsIn.map((a, i) => (
                    <span key={i} style={CHIP}><RichText text={a} idKey={`ai${i}`} /></span>
                  ))}
                </div>
              </div>
            )}

            {selected.examples && selected.examples.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={LABEL}>أمثلة</div>
                <ul style={{ margin: 0, paddingInlineStart: 18 }}>
                  {selected.examples.map((e, i) => (
                    <li key={i} style={{ ...BODY, marginBottom: 3 }}><RichText text={e} idKey={`ex${i}`} /></li>
                  ))}
                </ul>
              </div>
            )}

            {selected.confusedWith.length > 0 && (
              <div
                data-testid="glossary-confused"
                style={{
                  marginTop: 14, background: 'rgba(245,158,11,0.07)',
                  border: '1px solid rgba(245,158,11,0.35)', borderRadius: 13, padding: '11px 13px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
                  <AlertCircle size={14} style={{ color: '#b45309' }} aria-hidden />
                  <strong style={{ fontSize: 12.5, color: '#b45309' }}>يختلط كثيراً بـ</strong>
                </div>
                {selected.confusedWith.map((c, i) => {
                  const other = getTerm(c.termId);
                  return (
                    <div key={i} style={{ marginBottom: 8 }}>
                      {other && (
                        <button type="button" onClick={() => setParams({ term: other.id })} style={LINK_CHIP}>
                          {other.ar} <span dir="ltr" style={{ opacity: 0.7, unicodeBidi: 'isolate' }}>({other.abbr ?? other.en})</span>
                        </button>
                      )}
                      <p style={{ ...BODY, marginTop: 5, color: '#78350f' }}>
                        <RichText text={c.note} idKey={`cw${i}`} />
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {selected.relatedTermIds.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={LABEL}>مصطلحات مرتبطة</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {selected.relatedTermIds.map(rid => {
                    const r = getTerm(rid);
                    if (!r) return null;
                    return (
                      <button key={rid} type="button" data-testid={`glossary-related-${rid}`} onClick={() => setParams({ term: rid })} style={LINK_CHIP}>
                        {r.ar}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {selected.articleIds.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={LABEL}>اقرأ أكثر</div>
                {selected.articleIds.map(aid => {
                  const a = getArticle(aid);
                  if (!a) return null;
                  return (
                    <button
                      key={aid}
                      type="button"
                      data-testid={`glossary-article-${aid}`}
                      onClick={() => navigate(`/kb/${a.moduleId}/${a.id}`)}
                      style={{
                        width: '100%', textAlign: 'right', display: 'flex', alignItems: 'center', gap: 8,
                        background: 'rgba(148,163,184,0.08)', border: 'none', borderRadius: 10,
                        padding: '9px 11px', marginBottom: 6, cursor: 'pointer',
                      }}
                    >
                      <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>{a.titleAr}</span>
                      <ChevronLeft size={14} style={{ color: '#94a3b8', flexShrink: 0 }} aria-hidden />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell tint="green">
      <Header
        title="القاموس"
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
      <div className="fade-in" style={{ background: '#f8fafc', minHeight: '100%', padding: '12px 16px 28px' }}>
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 8, background: '#ffffff',
            border: '1px solid rgba(15,23,42,0.12)', borderRadius: 12, padding: '9px 12px', marginBottom: 14,
          }}
        >
          <SearchIcon size={16} style={{ color: '#94a3b8', flexShrink: 0 }} aria-hidden />
          <input
            data-testid="glossary-search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="ابحث عن مصطلح بالعربية أو الإنجليزية"
            aria-label="بحث في القاموس"
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13.5, fontFamily: 'inherit', background: 'transparent', minWidth: 0 }}
          />
          {query && (
            <button onClick={() => setQuery('')} aria-label="مسح" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
              <X size={15} />
            </button>
          )}
        </div>

        <div data-testid="glossary-count" style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
          {filtered.length} من {kbTerms.length} مصطلحاً
        </div>

        {grouped.map(([domain, terms]) => (
          <div key={domain} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11.5, fontWeight: 900, color: '#047857', marginBottom: 7 }}>{DOMAIN_LABEL[domain] ?? domain}</div>
            {terms.map(t => (
              <button
                key={t.id}
                type="button"
                data-testid={`glossary-item-${t.id}`}
                onClick={() => setParams({ term: t.id })}
                style={{
                  display: 'block', width: '100%', textAlign: 'right', background: '#ffffff',
                  border: '1px solid rgba(15,23,42,0.09)', borderRadius: 12,
                  padding: '10px 12px', marginBottom: 7, cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: 13.5, color: '#0f172a' }}>{t.ar}</strong>
                  <span dir="ltr" style={{ fontSize: 11.5, color: '#0369a1', unicodeBidi: 'isolate' }}>
                    {t.en}{t.abbr ? ` · ${t.abbr}` : ''}
                  </span>
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.7, color: '#64748b', marginTop: 3 }}>
                  <RichText text={t.short} idKey={`sh-${t.id}`} />
                </div>
              </button>
            ))}
          </div>
        ))}
      </div>
    </AppShell>
  );
};

const DOMAIN_LABEL: Record<string, string> = {
  'flight-controller': 'متحكم الطيران',
  electrical: 'الكهرباء والطاقة',
  esc: 'منظّم السرعة والمحركات',
  'radio-control': 'أنظمة التحكم',
  'navigation-sensors': 'الملاحة والحساسات',
  tuning: 'الضبط والأداء',
  'power-battery': 'البطاريات',
  safety: 'السلامة',
};

const LABEL: React.CSSProperties = { fontSize: 11, fontWeight: 800, color: '#64748b', marginBottom: 5 };
const BODY: React.CSSProperties = { fontSize: 13, lineHeight: 1.9, color: '#1e293b', margin: 0 };
const CHIP: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, padding: '4px 9px', borderRadius: 999,
  background: 'rgba(148,163,184,0.16)', color: '#475569',
};
const LINK_CHIP: React.CSSProperties = {
  fontSize: 11.5, fontWeight: 700, padding: '5px 10px', borderRadius: 999,
  background: 'rgba(16,185,129,0.10)', color: '#047857',
  border: '1px solid rgba(16,185,129,0.30)', cursor: 'pointer',
};

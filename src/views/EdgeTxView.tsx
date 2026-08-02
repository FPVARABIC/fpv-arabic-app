import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Search, ChevronLeft, Radio, Sliders, Activity, Wrench, TriangleAlert,
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { Header } from '../components/Header';
import {
  edgeTxSections, edgeTxPage, edgeTxTopicIndex, TOTAL_EDGETX_PAGES,
} from '../data/edgetx/registry';
import { EDGETX_KIND_LABEL_AR, EDGETX_LEVEL_LABEL_AR, type EdgeTxPageKind } from '../data/edgetx/types';
import { normalizeText } from '../data/kb/search/normalize';
import { readProjectSnapshot } from '../data/project/snapshot';
import { computeFindings } from '../data/project/verdicts';
import { rcFactsForEdgeTxHub } from '../data/project/context';
import { RcContextPanel } from '../components/project/RcContextPanel';
import { resolveDestination } from '../platform/destinations';

/**
 * مركز EdgeTX — the radio's own firmware, as a place rather than a list.
 *
 * WHY THIS IS NOT A LIST OF ARTICLES
 * ----------------------------------
 * The requirement was explicit: «لا تجعل الواجهة مجرد قائمة مقالات». A list of
 * thirty titles is a list of thirty titles no matter how well written each one
 * is. What makes this a centre is that it does four things a list cannot:
 *
 *   it searches DOWN TO THE SETTING — «Subtrim» finds the row, not the screen
 *   it reads the reader's own radio — module, system, band, Model Match
 *   it hands off to the other centres — ExpressLRS, Betaflight, diagnostics
 *   it returns to the project, which is where the work actually is
 *
 * The section grouping exists for the same reason: thirty flat entries force a
 * reader to already know the vocabulary, and the people who need this screen
 * most are exactly the ones who do not.
 */

const SECTION_ICON: Record<string, typeof Radio> = {
  model: Radio,
  control: Sliders,
  link: Activity,
  maintenance: Wrench,
  problems: TriangleAlert,
};

const KIND_STYLE: Record<EdgeTxPageKind, { bg: string; fg: string }> = {
  reference: { bg: '#eef2ff', fg: '#4338ca' },
  task: { bg: '#ecfdf5', fg: '#047857' },
  problem: { bg: '#fef2f2', fg: '#b91c1c' },
};

export const EdgeTxView: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const project = useMemo(() => readProjectSnapshot(), []);
  const hubFacts = useMemo(() => rcFactsForEdgeTxHub(project), [project]);
  // The hub shows no findings: a verdict belongs on the topic that can act on
  // it, not on a table of contents.
  const findings = useMemo(() => computeFindings(project), [project]);
  const hubFindings = useMemo(
    () => findings.filter(f => f.severity === 'blocker' && f.links.some(l => l.kind === 'edgetx')),
    [findings],
  );

  const topics = useMemo(() => edgeTxTopicIndex(), []);
  const results = useMemo(() => {
    const q = normalizeText(query).trim();
    if (q.length < 2) return null;
    const terms = q.split(/\s+/).filter(Boolean);
    return topics
      .map(t => {
        const hay = normalizeText(`${t.titleAr} ${t.titleEn} ${t.subtitleAr} ${t.searchText}`);
        const title = normalizeText(`${t.titleAr} ${t.titleEn}`);
        if (!terms.every(term => hay.includes(term))) return null;
        // Title hits rank above body hits, and a setting outranks its own page
        // when the query names the setting — that is the whole reason the index
        // is flattened to settings at all.
        const score = terms.reduce((n, term) => n + (title.includes(term) ? 2 : 0), 0);
        return { t, score };
      })
      .filter((x): x is { t: (typeof topics)[number]; score: number } => x !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 24);
  }, [query, topics]);

  const openTopic = (pageId: string, settingId?: string) => {
    const base = resolveDestination({ kind: 'edgetx', id: pageId }) ?? '/programming/edgetx';
    navigate(settingId ? `${base}?topic=${encodeURIComponent(settingId)}` : base);
  };

  return (
    <AppShell tint="purple">
      <Header title="EdgeTX" />
      <div
        data-edgetx-frame="true"
        className="relative flex flex-col"
        style={{ minHeight: 'calc(100% + 6rem)', background: '#f8fafc', marginBottom: '-6rem' }}
      >
        <div className="px-4 py-4 space-y-4 fade-in">
          <button
            type="button"
            data-testid="edgetx-exit"
            onClick={() => navigate('/programming')}
            className="flex items-center gap-1.5 text-xs font-semibold"
            style={{ color: '#64748b' }}
          >
            <ArrowRight size={14} aria-hidden /> العودة إلى البرمجة
          </button>

          <div className="space-y-1.5">
            <p className="text-sm font-semibold" style={{ color: '#334155' }}>
              نظام تشغيل جهاز الإرسال، مشروحاً بما يفعله في الطائرة
            </p>
            <p className="text-sm leading-relaxed" style={{ color: '#64748b' }}>
              {TOTAL_EDGETX_PAGES} موضوعاً، كل واحد يقول ما الغرض منه ومتى تحتاجه وكيف تتحقق وكيف تتراجع.
              أسماء القوائم تتغير بين الإصدارات، فالمبدأ هو المكتوب هنا لا موضع الزر.
            </p>
          </div>

          <div
            data-testid="edgetx-search-wrap"
            style={{
              display: 'flex', alignItems: 'center', gap: 8, background: '#ffffff',
              border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 12px',
            }}
          >
            <Search size={16} style={{ color: '#94a3b8', flexShrink: 0 }} aria-hidden />
            <input
              data-testid="edgetx-search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="ابحث في المواضيع والإعدادات…"
              aria-label="ابحث في مواضيع EdgeTX وإعداداتها"
              style={{
                flex: 1, border: 'none', outline: 'none', fontSize: 13,
                background: 'transparent', color: '#0f172a',
              }}
            />
          </div>

          <RcContextPanel
            testIdPrefix="edgetx-hub"
            entryId="hub"
            facts={hubFacts}
            findings={hubFindings}
          />

          {results !== null ? (
            <div data-testid="edgetx-search-results" className="space-y-1.5">
              <p className="text-xs font-semibold" style={{ color: '#64748b' }}>
                {results.length === 0 ? 'لا نتائج — جرّب الاسم الإنجليزي للإعداد' : `${results.length} نتيجة`}
              </p>
              {results.map(({ t }) => (
                <button
                  key={`${t.kind}:${t.pageId}:${t.settingId ?? ''}`}
                  type="button"
                  data-testid={`edgetx-result-${t.pageId}${t.settingId ? `-${t.settingId}` : ''}`}
                  onClick={() => openTopic(t.pageId, t.settingId)}
                  className="w-full text-right p-3 rounded-xl flex items-center gap-2.5 press"
                  style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}
                >
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                    style={t.kind === 'setting'
                      ? { background: '#f0f9ff', color: '#0369a1' }
                      : { background: '#f1f5f9', color: '#475569' }}
                  >
                    {t.kind === 'setting' ? 'إعداد' : 'موضوع'}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-bold" style={{ color: '#0f172a' }}>{t.titleAr}</span>
                    <span className="block text-[11px] mt-0.5" style={{ color: '#64748b' }} dir="ltr">{t.titleEn}</span>
                  </span>
                  <ChevronLeft size={16} style={{ color: '#94a3b8', flexShrink: 0 }} aria-hidden />
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-5" data-testid="edgetx-sections">
              {edgeTxSections.map(section => {
                const Icon = SECTION_ICON[section.id] ?? Radio;
                return (
                  <div key={section.id} className="space-y-2" data-testid={`edgetx-section-${section.id}`}>
                    <div className="flex items-center gap-2">
                      <Icon size={15} style={{ color: '#0891b2' }} aria-hidden />
                      <h2 className="text-sm font-bold" style={{ color: '#0f172a' }}>{section.titleAr}</h2>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: '#64748b' }}>{section.descriptionAr}</p>
                    <div className="space-y-1.5">
                      {section.pageIds.map(pid => {
                        const p = edgeTxPage(pid);
                        if (!p) return null;
                        const k = KIND_STYLE[p.kind];
                        return (
                          <button
                            key={p.id}
                            type="button"
                            data-testid={`edgetx-page-${p.id}`}
                            onClick={() => openTopic(p.id)}
                            className="w-full text-right p-3 rounded-xl flex items-start gap-2.5 press"
                            style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}
                          >
                            <span
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                              style={{ background: k.bg, color: k.fg, marginTop: 2 }}
                            >
                              {EDGETX_KIND_LABEL_AR[p.kind]}
                            </span>
                            <span className="flex-1 min-w-0">
                              <span className="block text-sm font-bold" style={{ color: '#0f172a' }}>{p.titleAr}</span>
                              <span className="block text-[11.5px] mt-1 leading-relaxed" style={{ color: '#64748b' }}>
                                {p.summaryAr}
                              </span>
                              <span className="block text-[10.5px] mt-1" style={{ color: '#94a3b8' }}>
                                {EDGETX_LEVEL_LABEL_AR[p.level]}
                              </span>
                            </span>
                            <ChevronLeft size={16} style={{ color: '#94a3b8', flexShrink: 0, marginTop: 3 }} aria-hidden />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-3 border-t space-y-1.5" style={{ borderColor: '#e2e8f0' }}>
            <p className="text-xs font-semibold" style={{ color: '#64748b' }}>من هنا إلى بقية النظام</p>
            {([
              { id: 'elrs', label: 'ExpressLRS — الإعداد والتحديث', to: resolveDestination({ kind: 'elrs-setup' }) },
              { id: 'elrs-issues', label: 'ExpressLRS — حل المشاكل', to: resolveDestination({ kind: 'elrs-issue' }) },
              { id: 'bf-receiver', label: 'Betaflight — صفحة المستقبل', to: resolveDestination({ kind: 'betaflight', id: 'receiver' }) },
              { id: 'diagnose', label: 'التشخيص — ابدأ من العرَض', to: resolveDestination({ kind: 'diagnose' }) },
              { id: 'project', label: 'مشروعي', to: resolveDestination({ kind: 'project' }) },
            ] as const).map(l => l.to && (
              <button
                key={l.id}
                type="button"
                data-testid={`edgetx-jump-${l.id}`}
                onClick={() => navigate(l.to!)}
                className="w-full text-right px-3 py-2.5 rounded-xl flex items-center gap-2 press"
                style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}
              >
                <span className="flex-1 text-[12.5px] font-semibold" style={{ color: '#334155' }}>{l.label}</span>
                <ChevronLeft size={15} style={{ color: '#94a3b8' }} aria-hidden />
              </button>
            ))}
          </div>
        </div>
        <div style={{ height: 112 }} aria-hidden />
      </div>
    </AppShell>
  );
};

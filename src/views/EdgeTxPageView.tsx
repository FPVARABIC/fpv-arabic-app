import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowRight, ChevronLeft, ChevronDown, MapPin, CircleAlert, TriangleAlert,
  CircleHelp, Info, BookOpen, Undo2, CircleCheck, ExternalLink,
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { Header } from '../components/Header';
import { edgeTxPage, edgeTxSectionOfPage, edgeTxSections } from '../data/edgetx/registry';
import {
  EDGETX_KIND_LABEL_AR, EDGETX_LEVEL_LABEL_AR, EDGETX_RISK_LABEL_AR,
  type EdgeTxRisk,
} from '../data/edgetx/types';
import { readProjectSnapshot } from '../data/project/snapshot';
import { computeFindings } from '../data/project/verdicts';
import { findingsForEdgeTxPage, rcFactsForEdgeTxPage } from '../data/project/context';
import { RcContextPanel } from '../components/project/RcContextPanel';
import { resolveLinkRoute } from '../data/kb/registry';
import { resolveDestination } from '../platform/destinations';

/**
 * One EdgeTX topic.
 *
 * WHAT THE LAYOUT IS ARGUING
 * --------------------------
 * The order of the blocks is the order a person actually needs them: what is
 * this for, when would I need it, where is it (with the version caveat right
 * there), what does MY radio look like, then the procedure, then the settings,
 * then how to check I did it right and how to undo it if I did not.
 *
 * «الأخطاء الشائعة» sits before «التحقق» on purpose. Reading the mistakes first
 * is what stops someone making one; reading them after the fact is a post-mortem.
 *
 * DEEP LINKS
 * ----------
 * `?topic=<settingId>` opens and highlights one setting. That is what makes a
 * search result for a field name land on the field. An unknown id is ignored —
 * the page still opens, because a stale shared link should degrade to the topic
 * rather than to an error.
 */

const RISK_STYLE: Record<EdgeTxRisk, { bg: string; fg: string; border: string; Icon: typeof Info }> = {
  info: { bg: 'rgba(14,165,233,0.08)', fg: '#0369a1', border: 'rgba(14,165,233,0.28)', Icon: Info },
  caution: { bg: 'rgba(100,116,139,0.10)', fg: '#475569', border: 'rgba(100,116,139,0.26)', Icon: CircleHelp },
  warning: { bg: 'rgba(245,158,11,0.12)', fg: '#b45309', border: 'rgba(245,158,11,0.32)', Icon: TriangleAlert },
  critical: { bg: 'rgba(239,68,68,0.10)', fg: '#b91c1c', border: 'rgba(239,68,68,0.30)', Icon: CircleAlert },
};

const Block: React.FC<{
  titleAr: string;
  testId: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}> = ({ titleAr, testId, icon, children }) => (
  <section
    data-testid={testId}
    style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '13px 14px' }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9 }}>
      {icon}
      <h2 style={{ fontSize: 12.5, fontWeight: 900, color: '#0f172a' }}>{titleAr}</h2>
    </div>
    {children}
  </section>
);

const Bullets: React.FC<{ items: string[]; testId: string }> = ({ items, testId }) => (
  <ul data-testid={testId} style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: 0, padding: 0, listStyle: 'none' }}>
    {items.map((t, i) => (
      <li key={i} style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
        <span style={{ width: 5, height: 5, borderRadius: 999, background: '#94a3b8', marginTop: 7, flexShrink: 0 }} aria-hidden />
        <span style={{ fontSize: 12.5, lineHeight: 1.8, color: '#334155' }}>{t}</span>
      </li>
    ))}
  </ul>
);

export const EdgeTxPageView: React.FC = () => {
  const navigate = useNavigate();
  const { pageId } = useParams<{ pageId: string }>();
  const [searchParams] = useSearchParams();
  const page = pageId ? edgeTxPage(pageId) : undefined;

  const topRef = useRef<HTMLDivElement>(null);

  /**
   * Which setting is expanded.
   *
   * `?topic=<settingId>` is the deep link — it is READ, never copied into
   * state, so there is no effect and no cascading render. A user toggle takes
   * precedence over the parameter, and the toggle records which page it was
   * made on so that navigating to the next topic does not carry a stale open
   * row with it. An unknown id simply opens nothing: a stale shared link
   * degrades to the topic rather than to an error.
   */
  const [toggled, setToggled] = useState<{ pageId: string; id: string | null } | null>(null);
  const requestedTopic = searchParams.get('topic');
  const paramTopic = requestedTopic
    && page?.groups.some(g => g.settings.some(s => s.id === requestedTopic))
    ? requestedTopic
    : null;
  const openSetting = toggled && toggled.pageId === pageId ? toggled.id : paramTopic;
  const setOpenSetting = (id: string | null) => setToggled({ pageId: pageId ?? '', id });

  useEffect(() => {
    topRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' });
  }, [pageId]);

  const project = useMemo(() => readProjectSnapshot(), []);
  const facts = useMemo(() => (page ? rcFactsForEdgeTxPage(project, page.id) : []), [project, page]);
  const findings = useMemo(
    () => (page ? findingsForEdgeTxPage(computeFindings(project), page.id) : []),
    [project, page],
  );

  const section = page ? edgeTxSectionOfPage(page.id) : undefined;
  const neighbours = useMemo(() => {
    if (!page || !section) return { prev: undefined, next: undefined };
    const i = section.pageIds.indexOf(page.id);
    return {
      prev: i > 0 ? edgeTxPage(section.pageIds[i - 1]) : undefined,
      next: i < section.pageIds.length - 1 ? edgeTxPage(section.pageIds[i + 1]) : undefined,
    };
  }, [page, section]);

  if (!page) {
    // An unknown id must not break the screen. It lands on an honest statement
    // plus a way forward — the same rule the ExpressLRS deep links follow.
    return (
      <AppShell tint="purple">
        <Header title="EdgeTX" />
        <div className="px-4 py-4 space-y-4 fade-in" style={{ background: '#f8fafc', minHeight: '60vh' }}>
          <div
            data-testid="edgetx-unknown-page"
            style={{
              background: '#ffffff', border: '1px solid rgba(245,158,11,0.32)',
              borderRadius: 14, padding: '13px 14px',
            }}
          >
            <p style={{ fontSize: 13, fontWeight: 800, color: '#b45309', marginBottom: 6 }}>
              لا يوجد موضوع بهذا المعرّف
            </p>
            <p style={{ fontSize: 12.5, lineHeight: 1.8, color: '#334155' }}>
              الرابط الذي فتحته يشير إلى موضوع غير موجود — قد يكون قديماً أو مكتوباً بخطأ.
              كل مواضيع EdgeTX متاحة من الصفحة الرئيسية للمركز.
            </p>
          </div>
          <button
            type="button"
            data-testid="edgetx-unknown-back"
            onClick={() => navigate('/programming/edgetx')}
            className="w-full py-3 rounded-xl font-bold text-sm press"
            style={{ background: '#0891b2', color: '#ffffff' }}
          >
            افتح مركز EdgeTX
          </button>
          <div className="space-y-1.5">
            {edgeTxSections.map(s => (
              <div key={s.id} className="text-xs" style={{ color: '#64748b' }}>{s.titleAr}</div>
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  const risk = RISK_STYLE[page.risk];

  return (
    <AppShell tint="purple">
      <Header title="EdgeTX" />
      <div
        data-edgetx-page-frame="true"
        className="relative flex flex-col"
        style={{ minHeight: 'calc(100% + 6rem)', background: '#f8fafc', marginBottom: '-6rem' }}
      >
        <div ref={topRef} className="px-4 py-4 space-y-3 fade-in">
          <button
            type="button"
            data-testid="edgetx-page-exit"
            onClick={() => navigate('/programming/edgetx')}
            className="flex items-center gap-1.5 text-xs font-semibold"
            style={{ color: '#64748b' }}
          >
            <ArrowRight size={14} aria-hidden /> كل مواضيع EdgeTX
          </button>

          <header data-testid="edgetx-page-header" className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#f1f5f9', color: '#475569' }}>
                {EDGETX_KIND_LABEL_AR[page.kind]}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#f1f5f9', color: '#475569' }}>
                {EDGETX_LEVEL_LABEL_AR[page.level]}
              </span>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: risk.bg, color: risk.fg, border: `1px solid ${risk.border}` }}
              >
                {EDGETX_RISK_LABEL_AR[page.risk]}
              </span>
              {section && (
                <span className="text-[10px] font-semibold" style={{ color: '#94a3b8' }}>{section.titleAr}</span>
              )}
            </div>
            <h1 className="text-lg font-extrabold" style={{ color: '#0f172a' }}>{page.titleAr}</h1>
            <p className="text-xs" style={{ color: '#64748b' }} dir="ltr">{page.titleEn}</p>
            <p className="text-[13px] leading-relaxed" style={{ color: '#334155' }}>{page.summaryAr}</p>
          </header>

          <Block titleAr="متى تحتاجه" testId="edgetx-when" icon={<BookOpen size={14} style={{ color: '#0891b2' }} aria-hidden />}>
            <p style={{ fontSize: 12.5, lineHeight: 1.8, color: '#334155' }}>{page.whenNeededAr}</p>
          </Block>

          <Block titleAr="أين تجده" testId="edgetx-where" icon={<MapPin size={14} style={{ color: '#0891b2' }} aria-hidden />}>
            <p style={{ fontSize: 12.5, lineHeight: 1.8, color: '#334155' }}>{page.whereAr}</p>
          </Block>

          <RcContextPanel
            testIdPrefix="edgetx"
            entryId={page.id}
            facts={facts}
            findings={findings}
          />

          {page.prerequisitesAr.length > 0 && (
            <Block titleAr="قبل أن تبدأ" testId="edgetx-prereq">
              <Bullets items={page.prerequisitesAr} testId="edgetx-prereq-list" />
            </Block>
          )}

          {page.stepsAr.length > 0 && (
            <Block titleAr="الخطوات" testId="edgetx-steps">
              <ol style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: 0, padding: 0, listStyle: 'none' }}>
                {page.stepsAr.map((s, i) => {
                  const r = s.risk ? RISK_STYLE[s.risk] : null;
                  return (
                    <li key={i} data-testid={`edgetx-step-${i}`} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span
                        style={{
                          width: 20, height: 20, borderRadius: 999, background: '#f1f5f9', color: '#475569',
                          fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center',
                          justifyContent: 'center', flexShrink: 0, marginTop: 1,
                        }}
                        aria-hidden
                      >
                        {i + 1}
                      </span>
                      <span style={{ flex: 1 }}>
                        <span style={{ display: 'block', fontSize: 12.5, lineHeight: 1.8, color: '#0f172a', fontWeight: r ? 700 : 500 }}>
                          {s.textAr}
                        </span>
                        {s.noteAr && (
                          <span style={{ display: 'block', fontSize: 11.5, lineHeight: 1.7, color: '#64748b', marginTop: 3 }}>
                            {s.noteAr}
                          </span>
                        )}
                        {r && (
                          <span
                            style={{
                              display: 'inline-block', marginTop: 4, fontSize: 10, fontWeight: 800,
                              padding: '2px 7px', borderRadius: 999,
                              background: r.bg, color: r.fg, border: `1px solid ${r.border}`,
                            }}
                          >
                            {EDGETX_RISK_LABEL_AR[s.risk!]}
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </Block>
          )}

          {page.groups.map(g => (
            <Block key={g.id} titleAr={g.titleAr} testId={`edgetx-group-${g.id}`}>
              {g.introAr && (
                <p style={{ fontSize: 12, lineHeight: 1.8, color: '#64748b', marginBottom: 9 }}>{g.introAr}</p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {g.settings.map(s => {
                  const open = openSetting === s.id;
                  const r = RISK_STYLE[s.risk];
                  return (
                    <div
                      key={s.id}
                      data-testid={`edgetx-setting-${s.id}`}
                      data-open={open ? 'true' : 'false'}
                      style={{
                        border: open ? `1px solid ${r.border}` : '1px solid #e2e8f0',
                        borderRadius: 12, overflow: 'hidden',
                        background: open ? r.bg : '#ffffff',
                      }}
                    >
                      <button
                        type="button"
                        data-testid={`edgetx-setting-toggle-${s.id}`}
                        onClick={() => setOpenSetting(open ? null : s.id)}
                        aria-expanded={open}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'flex-start', gap: 8,
                          padding: '10px 11px', background: 'none', border: 'none',
                          cursor: 'pointer', textAlign: 'right',
                        }}
                      >
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'block', fontSize: 12.5, fontWeight: 800, color: '#0f172a' }}>{s.labelAr}</span>
                          <span style={{ display: 'block', fontSize: 11, color: '#64748b', marginTop: 2 }} dir="ltr">{s.labelEn}</span>
                        </span>
                        <span
                          style={{
                            fontSize: 9.5, fontWeight: 800, color: r.fg, flexShrink: 0,
                            padding: '2px 6px', borderRadius: 999, background: '#ffffff',
                            border: `1px solid ${r.border}`, marginTop: 2,
                          }}
                        >
                          {EDGETX_RISK_LABEL_AR[s.risk]}
                        </span>
                        <ChevronDown
                          size={15}
                          style={{ color: '#94a3b8', flexShrink: 0, marginTop: 3, transform: open ? 'rotate(180deg)' : undefined }}
                          aria-hidden
                        />
                      </button>

                      {open && (
                        <div
                          data-testid={`edgetx-setting-body-${s.id}`}
                          style={{ padding: '0 11px 11px', display: 'flex', flexDirection: 'column', gap: 7 }}
                        >
                          {([
                            ['ما هو', s.whatAr],
                            ['ماذا يغيّر فعلاً', s.effectAr],
                            ['متى تحتاجه', s.whenAr],
                            ['ما الذي يسوء', s.riskAr],
                            ['كيف تتحقق', s.verifyAr],
                            ['كيف تتراجع', s.revertAr],
                            ['تحذير إصدار', s.versionNoteAr],
                            ['ما لا نستطيع تأكيده', s.manualCheckAr],
                          ] as const).map(([label, value]) => value && (
                            <div key={label}>
                              <span style={{ display: 'block', fontSize: 10.5, fontWeight: 800, color: '#64748b', marginBottom: 2 }}>
                                {label}
                              </span>
                              <span style={{ display: 'block', fontSize: 12.5, lineHeight: 1.8, color: '#0f172a' }}>
                                {value}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Block>
          ))}

          <Block titleAr="علاقته بالمستقبل وExpressLRS وBetaflight" testId="edgetx-relation">
            <Bullets items={page.relationAr} testId="edgetx-relation-list" />
          </Block>

          <Block titleAr="الأخطاء الشائعة" testId="edgetx-mistakes" icon={<TriangleAlert size={14} style={{ color: '#b45309' }} aria-hidden />}>
            <Bullets items={page.commonMistakesAr} testId="edgetx-mistakes-list" />
          </Block>

          <Block titleAr="كيف تتحقق" testId="edgetx-verify" icon={<CircleCheck size={14} style={{ color: '#047857' }} aria-hidden />}>
            <Bullets items={page.verifyAr} testId="edgetx-verify-list" />
          </Block>

          <Block titleAr="كيف تتراجع" testId="edgetx-revert" icon={<Undo2 size={14} style={{ color: '#0891b2' }} aria-hidden />}>
            <p style={{ fontSize: 12.5, lineHeight: 1.8, color: '#334155' }}>{page.revertAr}</p>
          </Block>

          <Block titleAr="تحذيرات الإصدار" testId="edgetx-version-notes">
            <Bullets items={page.versionNotesAr} testId="edgetx-version-notes-list" />
          </Block>

          {page.troubleshootingAr && page.troubleshootingAr.length > 0 && (
            <Block titleAr="إن حدث هذا" testId="edgetx-troubleshooting">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {page.troubleshootingAr.map((t, i) => (
                  <div key={i}>
                    <span style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#b45309', marginBottom: 3 }}>
                      {t.symptomAr}
                    </span>
                    <span style={{ display: 'block', fontSize: 12.5, lineHeight: 1.8, color: '#334155' }}>{t.checkAr}</span>
                  </div>
                ))}
              </div>
            </Block>
          )}

          <Block titleAr="ما لا نقوله لك — اقرأه من دليل جهازك" testId="edgetx-manual-required" icon={<CircleHelp size={14} style={{ color: '#475569' }} aria-hidden />}>
            <Bullets items={page.manualRequiredAr} testId="edgetx-manual-required-list" />
          </Block>

          {page.canonicalDiagnosis && (
            <div
              data-testid="edgetx-canonical-diagnosis"
              style={{
                background: '#ffffff', border: '1px solid rgba(8,145,178,0.32)',
                borderRadius: 14, padding: '12px 13px',
              }}
            >
              <p style={{ fontSize: 12, fontWeight: 800, color: '#0e7490', marginBottom: 6 }}>
                الإجراء الكامل موثّق في مكان واحد
              </p>
              {page.canonicalDiagnosis.reason && (
                <p style={{ fontSize: 12, lineHeight: 1.8, color: '#475569', marginBottom: 8 }}>
                  {page.canonicalDiagnosis.reason}
                </p>
              )}
              <button
                type="button"
                data-testid="edgetx-canonical-diagnosis-open"
                onClick={() => {
                  const route = resolveLinkRoute(page.canonicalDiagnosis!);
                  if (route) navigate(route);
                }}
                className="w-full py-2.5 rounded-xl font-bold text-[12.5px] press"
                style={{ background: '#0891b2', color: '#ffffff' }}
              >
                {page.canonicalDiagnosis.label}
              </button>
            </div>
          )}

          {page.ownsDiagnosis && (
            <div
              data-testid="edgetx-owns-diagnosis"
              style={{
                background: 'rgba(100,116,139,0.06)', border: '1px solid #e2e8f0',
                borderRadius: 14, padding: '12px 13px',
              }}
            >
              <p style={{ fontSize: 12, fontWeight: 800, color: '#475569', marginBottom: 5 }}>
                هذا العرَض موثّق هنا ولا يتكرر في مكان آخر
              </p>
              <p style={{ fontSize: 12, lineHeight: 1.8, color: '#64748b' }}>{page.ownsDiagnosis.reasonAr}</p>
            </div>
          )}

          {page.links.length > 0 && (
            <Block titleAr="من هنا إلى" testId="edgetx-links">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {page.links.map((l, i) => {
                  const route = resolveLinkRoute(l);
                  if (!route) return null;
                  return (
                    <button
                      key={`${l.kind}-${l.targetId}-${i}`}
                      type="button"
                      data-testid={`edgetx-link-${l.kind}-${l.targetId || 'root'}`}
                      onClick={() => {
                        if (l.kind === 'external') window.open(route, '_blank', 'noopener,noreferrer');
                        else navigate(route);
                      }}
                      className="w-full text-right px-3 py-2.5 rounded-xl flex items-center gap-2 press"
                      style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
                    >
                      <span className="flex-1 text-[12.5px] font-semibold" style={{ color: '#334155' }}>{l.label}</span>
                      {l.kind === 'external'
                        ? <ExternalLink size={14} style={{ color: '#94a3b8' }} aria-hidden />
                        : <ChevronLeft size={15} style={{ color: '#94a3b8' }} aria-hidden />}
                    </button>
                  );
                })}
              </div>
            </Block>
          )}

          <Block titleAr="المصادر" testId="edgetx-sources">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {page.sources.map((s, i) => (
                <div key={i} data-testid={`edgetx-source-${i}`}>
                  <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{s.title}</span>
                  <span style={{ display: 'block', fontSize: 11, color: '#64748b', marginTop: 2 }}>
                    {s.version} · روجِع {s.reviewedAt}
                  </span>
                  {s.url && (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 11, color: '#0891b2', wordBreak: 'break-all' }}
                      dir="ltr"
                    >
                      {s.url}
                    </a>
                  )}
                </div>
              ))}
              <span style={{ fontSize: 11, color: '#94a3b8' }}>آخر مراجعة لهذا الموضوع: {page.lastReviewed}</span>
            </div>
          </Block>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              data-testid="edgetx-prev"
              disabled={!neighbours.prev}
              onClick={() => neighbours.prev && navigate(`/programming/edgetx/${neighbours.prev.id}`)}
              className="flex-1 py-3 rounded-xl font-bold text-sm"
              style={neighbours.prev
                ? { background: '#f1f5f9', color: '#334155' }
                : { background: '#f1f5f9', color: '#cbd5e1', cursor: 'not-allowed' }}
            >
              السابق
            </button>
            <button
              type="button"
              data-testid="edgetx-next"
              disabled={!neighbours.next}
              onClick={() => neighbours.next && navigate(`/programming/edgetx/${neighbours.next.id}`)}
              className="flex-1 py-3 rounded-xl font-bold text-sm"
              style={neighbours.next
                ? { background: '#0891b2', color: '#ffffff' }
                : { background: '#f1f5f9', color: '#cbd5e1', cursor: 'not-allowed' }}
            >
              التالي
            </button>
          </div>

          <button
            type="button"
            data-testid="edgetx-back-to-project"
            onClick={() => navigate(resolveDestination({ kind: 'project' }) ?? '/project')}
            className="w-full py-3 rounded-xl font-bold text-sm press"
            style={{ background: '#ffffff', color: '#0e7490', border: '1px solid rgba(8,145,178,0.32)' }}
          >
            العودة إلى مشروعي
          </button>
        </div>
        <div style={{ height: 112 }} aria-hidden />
      </div>
    </AppShell>
  );
};

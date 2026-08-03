import React, { useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight, ChevronLeft, Wrench, CircleAlert, TriangleAlert,
  CircleHelp, Info, BookOpen, Undo2, CircleCheck, ExternalLink, ListChecks,
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { Header } from '../components/Header';
import { getVideoToolPage, videoToolSections } from '../data/video/software/registry';
import {
  VIDEO_TOOL_KIND_LABEL_AR, VIDEO_TOOL_LEVEL_LABEL_AR, VIDEO_TOOL_RISK_LABEL_AR,
  VIDEO_TOOL_SCOPE_LABEL_AR, type VideoToolRisk,
} from '../data/video/software/types';
import { readProjectSnapshot } from '../data/project/snapshot';
import { computeFindings } from '../data/project/verdicts';
import { videoFactsFor } from '../data/project/context';
import { RcContextPanel } from '../components/project/RcContextPanel';
import { resolveLinkRoute } from '../data/kb/registry';
import { resolveDestination } from '../platform/destinations';

/**
 * One page of the video software centre.
 *
 * WHAT THE BLOCK ORDER IS ARGUING
 * -------------------------------
 * Same argument the EdgeTX topic page makes, adapted to a subject where the
 * cost of acting too early is higher: what is this for, when do I need it,
 * which tool, what must be true BEFORE I start, what does my own build look
 * like, then the procedure, then the mistakes, then how to check and how to
 * undo.
 *
 * «ما يجب أن يكون جاهزاً» comes before the steps rather than being folded into
 * step one, because on this subject the prerequisites are the safety margin: a
 * backup that was not taken, a battery that was not charged, props that were
 * not removed. A reader who skims straight to the numbered list should still
 * have passed the block that says «خذ نسخة أولاً».
 *
 * «الأخطاء الشائعة» sits before «التحقق» for the reason it always does:
 * reading the mistakes first prevents one, reading them after is a post-mortem.
 *
 * «البيانات الناقصة» is a first-class block, not a footnote. On this subject
 * more than any other, the honest answer to most specific questions is "your
 * manufacturer's support page for your exact model" — and presenting that as a
 * visible, named part of the page is the difference between a limit that is
 * declared and a limit that looks like an omission.
 */

const RISK_STYLE: Record<VideoToolRisk, { bg: string; fg: string; border: string; Icon: typeof Info }> = {
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

export const VideoSoftwarePageView: React.FC = () => {
  const navigate = useNavigate();
  const { pageId } = useParams<{ pageId: string }>();
  const page = pageId ? getVideoToolPage(pageId) : undefined;
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    topRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' });
  }, [pageId]);

  const project = useMemo(() => readProjectSnapshot(), []);
  const facts = useMemo(
    () => (page ? videoFactsFor(project, page.projectFields) : []),
    [project, page],
  );
  // A page claims a finding only when the verdict engine's own links point at
  // it — the same rule every other surface follows, so a page can never annex a
  // verdict that did not name it.
  const findings = useMemo(() => {
    if (!page) return [];
    return computeFindings(project).filter(f =>
      f.links.some(l => l.kind === 'video' && l.targetId === page.id));
  }, [project, page]);

  const section = useMemo(
    () => videoToolSections.find(s => page && s.pageIds.includes(page.id)),
    [page],
  );
  const neighbours = useMemo(() => {
    if (!page || !section) return { prev: undefined, next: undefined };
    const i = section.pageIds.indexOf(page.id);
    return {
      prev: i > 0 ? getVideoToolPage(section.pageIds[i - 1]) : undefined,
      next: i < section.pageIds.length - 1 ? getVideoToolPage(section.pageIds[i + 1]) : undefined,
    };
  }, [page, section]);

  if (!page) {
    return (
      <AppShell tint="purple">
        <Header title="برامج الفيديو" />
        <div className="px-4 py-6 space-y-3" data-testid="video-software-page-missing">
          <p className="text-sm" style={{ color: '#334155' }}>هذه الصفحة غير موجودة.</p>
          <button
            type="button"
            onClick={() => navigate('/programming/video')}
            className="text-xs font-semibold"
            style={{ color: '#0369a1' }}
          >
            العودة إلى مركز برامج الفيديو
          </button>
        </div>
      </AppShell>
    );
  }

  const risk = RISK_STYLE[page.risk];

  return (
    <AppShell tint="purple">
      <Header title="برامج الفيديو" />
      <div
        ref={topRef}
        data-video-software-page={page.id}
        className="relative flex flex-col"
        style={{ minHeight: 'calc(100% + 6rem)', background: '#f8fafc', marginBottom: '-6rem' }}
      >
        <div className="px-4 py-4 space-y-3 fade-in">
          <button
            type="button"
            data-testid="video-software-page-back"
            onClick={() => navigate('/programming/video')}
            className="flex items-center gap-1.5 text-xs font-semibold"
            style={{ color: '#64748b' }}
          >
            <ArrowRight size={14} aria-hidden /> مركز برامج الفيديو
          </button>

          {/* ── Identity ────────────────────────────────────────────────── */}
          <div className="space-y-2">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span
                data-testid="video-software-page-kind"
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: '#f1f5f9', color: '#475569' }}
              >
                {VIDEO_TOOL_KIND_LABEL_AR[page.kind]}
              </span>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: '#f5f3ff', color: '#6d28d9' }}
              >
                {VIDEO_TOOL_SCOPE_LABEL_AR[page.scope]}
              </span>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: '#f1f5f9', color: '#475569' }}
              >
                {VIDEO_TOOL_LEVEL_LABEL_AR[page.level]}
              </span>
            </div>
            <h1 className="text-base font-black" style={{ color: '#0f172a' }}>{page.titleAr}</h1>
            <p className="text-[11.5px]" style={{ color: '#94a3b8' }} dir="ltr">{page.titleEn}</p>
            <p className="text-[12.5px] leading-relaxed" style={{ color: '#475569' }}>{page.summaryAr}</p>
          </div>

          {/* ── The risk banner, before anything actionable ─────────────── */}
          <div
            data-testid="video-software-page-risk"
            style={{
              display: 'flex', gap: 8, alignItems: 'flex-start',
              background: risk.bg, border: `1px solid ${risk.border}`,
              borderRadius: 12, padding: '10px 12px',
            }}
          >
            <risk.Icon size={15} style={{ color: risk.fg, flexShrink: 0, marginTop: 2 }} aria-hidden />
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: risk.fg, display: 'block', marginBottom: 3 }}>
                {VIDEO_TOOL_RISK_LABEL_AR[page.risk]}
              </span>
              <span style={{ fontSize: 12, lineHeight: 1.75, color: '#334155' }}>{page.whenNeededAr}</span>
            </div>
          </div>

          <Block titleAr="بأي أداة" testId="video-software-page-tool" icon={<Wrench size={14} style={{ color: '#7c3aed' }} aria-hidden />}>
            <p style={{ fontSize: 12.5, lineHeight: 1.85, color: '#334155', margin: 0 }}>{page.toolAr}</p>
          </Block>

          <Block titleAr="ما يجب أن يكون جاهزاً قبل أن تبدأ" testId="video-software-page-prereq" icon={<ListChecks size={14} style={{ color: '#b45309' }} aria-hidden />}>
            <Bullets items={page.prerequisitesAr} testId="video-software-page-prereq-list" />
          </Block>

          <RcContextPanel
            testIdPrefix="video-software-page"
            entryId={page.id}
            facts={facts}
            factKind="video"
            findings={findings}
          />

          {/* ── The procedure ───────────────────────────────────────────── */}
          <Block titleAr="الخطوات" testId="video-software-page-steps" icon={<BookOpen size={14} style={{ color: '#0369a1' }} aria-hidden />}>
            <ol style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: 0, padding: 0, listStyle: 'none' }}>
              {page.stepsAr.map((s, i) => {
                const sr = s.risk ? RISK_STYLE[s.risk] : null;
                return (
                  <li key={i} data-testid={`video-software-step-${i}`} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                    <span
                      style={{
                        width: 20, height: 20, borderRadius: 999, background: '#eef2ff', color: '#4338ca',
                        fontSize: 11, fontWeight: 900, display: 'inline-flex', alignItems: 'center',
                        justifyContent: 'center', flexShrink: 0, marginTop: 1,
                      }}
                      dir="ltr"
                    >
                      {i + 1}
                    </span>
                    <span style={{ flex: 1 }}>
                      <span style={{ display: 'block', fontSize: 12.5, lineHeight: 1.85, color: '#334155' }}>
                        {s.textAr}
                      </span>
                      {s.noteAr && (
                        <span style={{ display: 'block', fontSize: 11.5, lineHeight: 1.8, color: '#64748b', marginTop: 4 }}>
                          {s.noteAr}
                        </span>
                      )}
                      {sr && (
                        <span
                          style={{
                            display: 'inline-block', fontSize: 10, fontWeight: 800, marginTop: 5,
                            padding: '2px 7px', borderRadius: 999, background: sr.bg, color: sr.fg,
                          }}
                        >
                          {VIDEO_TOOL_RISK_LABEL_AR[s.risk!]}
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ol>
          </Block>

          <Block titleAr="علاقته ببقية النظام" testId="video-software-page-relation">
            <Bullets items={page.relationAr} testId="video-software-page-relation-list" />
          </Block>

          <Block titleAr="الأخطاء الشائعة" testId="video-software-page-mistakes" icon={<TriangleAlert size={14} style={{ color: '#b45309' }} aria-hidden />}>
            <Bullets items={page.commonMistakesAr} testId="video-software-page-mistakes-list" />
          </Block>

          <Block titleAr="كيف تتحقق أنه نجح" testId="video-software-page-verify" icon={<CircleCheck size={14} style={{ color: '#047857' }} aria-hidden />}>
            <Bullets items={page.verifyAr} testId="video-software-page-verify-list" />
          </Block>

          <Block titleAr="كيف تتراجع" testId="video-software-page-revert" icon={<Undo2 size={14} style={{ color: '#475569' }} aria-hidden />}>
            <p style={{ fontSize: 12.5, lineHeight: 1.85, color: '#334155', margin: 0 }}>{page.revertAr}</p>
          </Block>

          <Block titleAr="تحذيرات الإصدار" testId="video-software-page-versions" icon={<Info size={14} style={{ color: '#0369a1' }} aria-hidden />}>
            <Bullets items={page.versionNotesAr} testId="video-software-page-versions-list" />
          </Block>

          {/* ── Declared missing data, as a visible block ────────────────── */}
          <section
            data-testid="video-software-page-manual"
            style={{
              background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: 14, padding: '13px 14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9 }}>
              <CircleHelp size={14} style={{ color: '#b45309' }} aria-hidden />
              <h2 style={{ fontSize: 12.5, fontWeight: 900, color: '#92400e' }}>
                ما لا نجيب عنه — ويجب أن تأخذه من شركتك
              </h2>
            </div>
            <Bullets items={page.manualRequiredAr} testId="video-software-page-manual-list" />
          </section>

          {/* ── The one owner of the symptom, when this is a problem page ── */}
          {page.canonicalDiagnosis && (
            <button
              type="button"
              data-testid="video-software-page-canonical"
              onClick={() => {
                const to = resolveLinkRoute(page.canonicalDiagnosis!);
                if (to) navigate(to);
              }}
              className="w-full text-right px-3 py-3 rounded-xl flex items-center gap-2 press"
              style={{ background: '#ffffff', border: '1px solid rgba(239,68,68,0.28)' }}
            >
              <CircleAlert size={15} style={{ color: '#b91c1c', flexShrink: 0 }} aria-hidden />
              <span className="flex-1 text-[12.5px] font-semibold" style={{ color: '#334155' }}>
                {page.canonicalDiagnosis.label}
              </span>
              <ChevronLeft size={15} style={{ color: '#94a3b8' }} aria-hidden />
            </button>
          )}

          {/* ── Outbound links ──────────────────────────────────────────── */}
          <Block titleAr="اذهب من هنا" testId="video-software-page-links">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {page.links.map((l, i) => {
                const to = resolveLinkRoute(l);
                return (
                  <button
                    key={`${l.kind}:${l.targetId ?? i}`}
                    type="button"
                    disabled={!to}
                    data-testid={`video-software-page-link-${l.kind}-${l.targetId ?? i}`}
                    onClick={() => to && navigate(to)}
                    className="w-full text-right px-3 py-2.5 rounded-xl flex items-center gap-2 press"
                    style={{
                      background: '#ffffff', border: '1px solid #e2e8f0',
                      opacity: to ? 1 : 0.45, cursor: to ? 'pointer' : 'default',
                    }}
                  >
                    <span className="flex-1 text-[12.5px] font-semibold" style={{ color: '#334155' }}>{l.label}</span>
                    <ChevronLeft size={15} style={{ color: '#94a3b8' }} aria-hidden />
                  </button>
                );
              })}
            </div>
          </Block>

          {/* ── Sources, with their versions and review dates ───────────── */}
          <Block titleAr="المصادر" testId="video-software-page-sources" icon={<ExternalLink size={14} style={{ color: '#64748b' }} aria-hidden />}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {page.sources.map((s, i) => (
                <div key={i} data-testid={`video-software-page-source-${i}`}>
                  <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155' }}>{s.title}</span>
                  <span style={{ display: 'block', fontSize: 10.5, color: '#94a3b8', marginTop: 2 }}>
                    {s.version} · روجِع {s.reviewedAt}
                  </span>
                  {s.url && (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      style={{ display: 'inline-block', fontSize: 10.5, color: '#0369a1', marginTop: 2 }}
                      dir="ltr"
                    >
                      {s.url}
                    </a>
                  )}
                </div>
              ))}
            </div>
            <p style={{ fontSize: 10.5, color: '#94a3b8', margin: '9px 0 0' }}>
              روجعت هذه الصفحة في {page.lastReviewed}.
            </p>
          </Block>

          {/* ── Continue within the section ─────────────────────────────── */}
          <div style={{ display: 'flex', gap: 8 }}>
            {neighbours.prev && (
              <button
                type="button"
                data-testid="video-software-page-prev"
                onClick={() => navigate(resolveDestination({ kind: 'video', id: neighbours.prev!.id }) ?? '/programming/video')}
                className="flex-1 text-right px-3 py-2.5 rounded-xl press"
                style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}
              >
                <span className="block text-[10px]" style={{ color: '#94a3b8' }}>السابق</span>
                <span className="block text-[12px] font-bold" style={{ color: '#334155' }}>{neighbours.prev.titleAr}</span>
              </button>
            )}
            {neighbours.next && (
              <button
                type="button"
                data-testid="video-software-page-next"
                onClick={() => navigate(resolveDestination({ kind: 'video', id: neighbours.next!.id }) ?? '/programming/video')}
                className="flex-1 text-right px-3 py-2.5 rounded-xl press"
                style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}
              >
                <span className="block text-[10px]" style={{ color: '#94a3b8' }}>التالي</span>
                <span className="block text-[12px] font-bold" style={{ color: '#334155' }}>{neighbours.next.titleAr}</span>
              </button>
            )}
          </div>
        </div>
        <div style={{ height: 112 }} aria-hidden />
      </div>
    </AppShell>
  );
};

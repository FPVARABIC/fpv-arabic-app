import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Search, ChevronLeft, Sliders, Boxes, Download, LifeBuoy,
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { Header } from '../components/Header';
import {
  videoToolSections, getVideoToolPage, videoToolIndex, allVideoToolPages,
} from '../data/video/software/registry';
import {
  VIDEO_TOOL_KIND_LABEL_AR, VIDEO_TOOL_LEVEL_LABEL_AR, VIDEO_TOOL_SCOPE_LABEL_AR,
  type VideoToolKind,
} from '../data/video/software/types';
import { normalizeText } from '../data/kb/search/normalize';
import { readProjectSnapshot } from '../data/project/snapshot';
import { computeFindings } from '../data/project/verdicts';
import { videoFactsFor } from '../data/project/context';
import { RcContextPanel } from '../components/project/RcContextPanel';
import { resolveDestination } from '../platform/destinations';

/**
 * مركز برامج الفيديو — the tools, as a place.
 *
 * WHY A SEPARATE CENTRE RATHER THAN MORE BETAFLIGHT PAGES
 * ------------------------------------------------------
 * Because half of what a video system needs is not in Betaflight at all. The
 * air unit's firmware, the goggles' firmware, the pairing step, the SD card,
 * the recovery route — none of those has a configurator tab, and a reader
 * looking for them in the Betaflight reference will not find them because they
 * are not there. Putting them in one place, ordered by when they are needed
 * rather than by which company made them, is what makes this navigable.
 *
 * The four sections are the four moments a reader arrives: configuring the
 * flight controller, understanding their own ecosystem, updating, and recovering
 * from something that went wrong. Grouping by vendor instead would have
 * scattered each of those journeys across three boxes.
 *
 * The hub shows the reader's recorded system and any blocking video verdict,
 * for the same reason the EdgeTX hub does: which pages matter depends on which
 * system they actually own, and a centre that cannot tell them apart is a list.
 */

const SECTION_ICON: Record<string, typeof Sliders> = {
  betaflight: Sliders,
  ecosystems: Boxes,
  update: Download,
  recovery: LifeBuoy,
};

const KIND_STYLE: Record<VideoToolKind, { bg: string; fg: string }> = {
  reference: { bg: '#eef2ff', fg: '#4338ca' },
  task: { bg: '#ecfdf5', fg: '#047857' },
  problem: { bg: '#fef2f2', fg: '#b91c1c' },
};

/**
 * What the hub shows about the reader's own system.
 *
 * Deliberately the five facts that decide which pages are relevant at all — the
 * system, the two devices and their versions — not the whole record. A hub is a
 * place to choose from, not a place to read from.
 */
const HUB_FIELDS = ['ecosystem', 'gogglesEcosystem', 'airUnitModel', 'gogglesModel', 'airUnitFirmware'] as const;

export const VideoSoftwareView: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const project = useMemo(() => readProjectSnapshot(), []);
  const hubFacts = useMemo(() => videoFactsFor(project, [...HUB_FIELDS]), [project]);
  const findings = useMemo(() => computeFindings(project), [project]);
  // Blockers only on the hub: a warning belongs on the page that can act on it,
  // not on a table of contents. A blocker is different — it is a reason not to
  // start at all, and the reader should see it before they pick anything.
  const hubFindings = useMemo(
    () => findings.filter(f => f.severity === 'blocker' && f.id.startsWith('video-')),
    [findings],
  );

  const index = useMemo(() => videoToolIndex(), []);
  const results = useMemo(() => {
    const q = normalizeText(query).trim();
    if (q.length < 2) return null;
    const terms = q.split(/\s+/).filter(Boolean);
    const seen = new Set<string>();
    return index
      .map(e => {
        const hay = normalizeText(e.termAr);
        if (!terms.every(t => hay.includes(t))) return null;
        return e;
      })
      .filter((e): e is (typeof index)[number] => e !== null)
      .filter(e => {
        if (seen.has(e.pageId)) return false;
        seen.add(e.pageId);
        return true;
      })
      .slice(0, 20);
  }, [query, index]);

  const openPage = (pageId: string) => {
    navigate(resolveDestination({ kind: 'video', id: pageId }) ?? '/programming/video');
  };

  return (
    <AppShell tint="purple">
      <Header title="برامج الفيديو" />
      <div
        data-video-software-frame="true"
        className="relative flex flex-col"
        style={{ minHeight: 'calc(100% + 6rem)', background: '#f8fafc', marginBottom: '-6rem' }}
      >
        <div className="px-4 py-4 space-y-4 fade-in">
          <button
            type="button"
            data-testid="video-software-exit"
            onClick={() => navigate('/programming')}
            className="flex items-center gap-1.5 text-xs font-semibold"
            style={{ color: '#64748b' }}
          >
            <ArrowRight size={14} aria-hidden /> العودة إلى البرمجة
          </button>

          <div className="space-y-1.5">
            <p className="text-sm font-semibold" style={{ color: '#334155' }}>
              أدوات نظام الفيديو، مرتّبة بحسب متى تحتاجها
            </p>
            <p className="text-sm leading-relaxed" style={{ color: '#64748b' }}>
              {allVideoToolPages.length} صفحة تغطي إعداد الفيديو في متحكم الطيران، وأدوات الشركات،
              والتحديث والاقتران، والاسترجاع حين يسوء شيء. أسماء البرامج وأزرارها تتغير بين الأجيال،
              فالمكتوب هنا هو الإجراء ومنطقه — والاسم الدقيق في صفحة الدعم لطرازك أنت.
            </p>
          </div>

          <div
            data-testid="video-software-search-wrap"
            style={{
              display: 'flex', alignItems: 'center', gap: 8, background: '#ffffff',
              border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 12px',
            }}
          >
            <Search size={16} style={{ color: '#94a3b8', flexShrink: 0 }} aria-hidden />
            <input
              data-testid="video-software-search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="ابحث: تحديث، اقتران، بطاقة، استرجاع…"
              aria-label="ابحث في صفحات برامج الفيديو"
              style={{
                flex: 1, border: 'none', outline: 'none', fontSize: 13,
                background: 'transparent', color: '#0f172a',
              }}
            />
          </div>

          <RcContextPanel
            testIdPrefix="video-software-hub"
            entryId="hub"
            facts={hubFacts}
            factKind="video"
            findings={hubFindings}
          />

          {results !== null ? (
            <div data-testid="video-software-search-results" className="space-y-1.5">
              <p className="text-xs font-semibold" style={{ color: '#64748b' }}>
                {results.length === 0 ? 'لا نتائج — جرّب كلمة من وصف المشكلة' : `${results.length} نتيجة`}
              </p>
              {results.map(r => {
                const p = getVideoToolPage(r.pageId);
                if (!p) return null;
                return (
                  <button
                    key={r.pageId}
                    type="button"
                    data-testid={`video-software-result-${r.pageId}`}
                    onClick={() => openPage(r.pageId)}
                    className="w-full text-right p-3 rounded-xl flex items-center gap-2.5 press"
                    style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}
                  >
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: KIND_STYLE[p.kind].bg, color: KIND_STYLE[p.kind].fg }}
                    >
                      {VIDEO_TOOL_KIND_LABEL_AR[p.kind]}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-bold" style={{ color: '#0f172a' }}>{p.titleAr}</span>
                      <span className="block text-[11px] mt-0.5" style={{ color: '#64748b' }} dir="ltr">{p.titleEn}</span>
                    </span>
                    <ChevronLeft size={16} style={{ color: '#94a3b8', flexShrink: 0 }} aria-hidden />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-5" data-testid="video-software-sections">
              {videoToolSections.map(section => {
                const Icon = SECTION_ICON[section.id] ?? Sliders;
                return (
                  <div key={section.id} className="space-y-2" data-testid={`video-software-section-${section.id}`}>
                    <div className="flex items-center gap-2">
                      <Icon size={15} style={{ color: '#7c3aed' }} aria-hidden />
                      <h2 className="text-sm font-bold" style={{ color: '#0f172a' }}>{section.titleAr}</h2>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: '#64748b' }}>{section.descriptionAr}</p>
                    <div className="space-y-1.5">
                      {section.pageIds.map(pid => {
                        const p = getVideoToolPage(pid);
                        if (!p) return null;
                        const k = KIND_STYLE[p.kind];
                        return (
                          <button
                            key={p.id}
                            type="button"
                            data-testid={`video-software-page-${p.id}`}
                            onClick={() => openPage(p.id)}
                            className="w-full text-right p-3 rounded-xl flex items-start gap-2.5 press"
                            style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}
                          >
                            <span
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                              style={{ background: k.bg, color: k.fg, marginTop: 2 }}
                            >
                              {VIDEO_TOOL_KIND_LABEL_AR[p.kind]}
                            </span>
                            <span className="flex-1 min-w-0">
                              <span className="block text-sm font-bold" style={{ color: '#0f172a' }}>{p.titleAr}</span>
                              <span className="block text-[11.5px] mt-1 leading-relaxed" style={{ color: '#64748b' }}>
                                {p.summaryAr}
                              </span>
                              <span className="block text-[10.5px] mt-1" style={{ color: '#94a3b8' }}>
                                {VIDEO_TOOL_LEVEL_LABEL_AR[p.level]} · {VIDEO_TOOL_SCOPE_LABEL_AR[p.scope]}
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
              { id: 'kb', label: 'موسوعة نظام الفيديو', to: resolveDestination({ kind: 'module', id: 'video' }) },
              { id: 'bf-osd', label: 'Betaflight — عرض المعلومات', to: resolveDestination({ kind: 'betaflight', id: 'osd' }) },
              { id: 'bf-vtx', label: 'Betaflight — جهاز الفيديو', to: resolveDestination({ kind: 'betaflight', id: 'vtx' }) },
              { id: 'diagnose', label: 'التشخيص — ابدأ من العرَض', to: resolveDestination({ kind: 'diagnose' }) },
              { id: 'project', label: 'مشروعي', to: resolveDestination({ kind: 'project', view: 'video' }) },
            ] as const).map(l => l.to && (
              <button
                key={l.id}
                type="button"
                data-testid={`video-software-jump-${l.id}`}
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

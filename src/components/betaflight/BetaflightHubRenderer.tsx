import React, { useMemo, useState } from 'react';
import {
  Search, X, AlertCircle,
  Rocket, DownloadCloud, FileText, Settings, HelpCircle, Compass, Plug,
  SlidersHorizontal, Radio, BatteryCharging, Gauge, ToggleRight, Sliders, Sparkles,
  ShieldAlert, Fan, Terminal, FileDown, Database, Cog, Radar, Activity, MapPin,
  Lightbulb, MonitorPlay, Tv, LayoutGrid,
  WifiOff, Wrench, Crosshair, Eye, Boxes,
} from 'lucide-react';
import type { BfRegistryEntry, BfVersionContext } from '../../data/betaflight/types';
import { SafetyBadge, ConditionBadge, ContentStatusBadge } from './BfBadges';

/**
 * Live Betaflight hub renderer, driven entirely by `bfPageRegistry` — the
 * real 26-page official inventory, not the legacy 10-article list. Wired
 * into the live `/betaflight` route via `BetaflightView.tsx` (a thin
 * wrapper around this component).
 *
 * Per-page and per-group icons below are presentation-only lookups keyed
 * on registry `id` — they do not add, remove, or alter any registry/page
 * data field.
 */

type IconCmp = React.FC<{ size?: number; className?: string }>;

const PAGE_ICON: Record<string, IconCmp> = {
  landing: Rocket,
  'firmware-flasher': DownloadCloud,
  'privacy-policy': FileText,
  options: Settings,
  help: HelpCircle,
  setup: Compass,
  ports: Plug,
  configuration: SlidersHorizontal,
  receiver: Radio,
  power: BatteryCharging,
  'pid-tuning': Gauge,
  modes: ToggleRight,
  adjustments: Sliders,
  presets: Sparkles,
  failsafe: ShieldAlert,
  motors: Fan,
  cli: Terminal,
  'tethered-logging': FileDown,
  blackbox: Database,
  servos: Cog,
  transponder: Radar,
  sensors: Activity,
  gps: MapPin,
  'led-strip': Lightbulb,
  osd: MonitorPlay,
  vtx: Tv,
};

/**
 * Hub-only grouping, matching the real Configurator's disconnected /
 * connected / feature-gated structure (see pageRegistry.ts's own section
 * comments) subdivided further for scannability. Every one of the 26
 * registry IDs appears in exactly one group below — verified by the
 * structural test.
 */
const HUB_GROUPS: { id: string; titleAr: string; icon: IconCmp; pageIds: string[] }[] = [
  { id: 'disconnected', titleAr: 'قبل الاتصال', icon: WifiOff, pageIds: ['landing', 'firmware-flasher', 'privacy-policy', 'options', 'help'] },
  { id: 'basic-setup', titleAr: 'الإعدادات الأساسية', icon: Wrench, pageIds: ['setup', 'ports', 'configuration', 'receiver', 'power'] },
  { id: 'tuning-control', titleAr: 'الضبط والتحكم', icon: Crosshair, pageIds: ['pid-tuning', 'modes', 'adjustments', 'presets', 'failsafe', 'motors'] },
  { id: 'video-sensors', titleAr: 'الفيديو والحساسات', icon: Eye, pageIds: ['osd', 'vtx', 'sensors', 'gps', 'led-strip'] },
  { id: 'advanced-tools', titleAr: 'الأدوات المتقدمة', icon: Boxes, pageIds: ['cli', 'tethered-logging', 'blackbox', 'servos', 'transponder'] },
];

type StatusFilter = 'all' | 'reviewed' | 'not-started';

function matchesQuery(entry: BfRegistryEntry, rawQuery: string): boolean {
  const q = rawQuery.trim();
  if (!q) return true;
  const qLower = q.toLowerCase();
  return (
    entry.officialTitle.toLowerCase().includes(qLower) ||
    entry.titleAr.includes(q) ||
    entry.id.toLowerCase().includes(qLower) ||
    (entry.page?.summaryAr ?? '').includes(q)
  );
}

const HubCard: React.FC<{ entry: BfRegistryEntry; onOpenPage: (id: string) => void }> = ({ entry, onOpenPage }) => {
  const Icon = PAGE_ICON[entry.id] ?? LayoutGrid;
  return (
    <button
      type="button"
      onClick={() => onOpenPage(entry.id)}
      data-testid={`betaflight-hub-card-${entry.id}`}
      className="bf-panel p-4 w-full text-right press"
    >
      <div className="flex items-center gap-3">
        <span className="bf-accent-chip" aria-hidden>
          <Icon size={14} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white" dir="ltr">
            {entry.officialTitle}
          </p>
          <p className="text-xs text-cyan-300 mt-0.5">{entry.titleAr}</p>
        </div>
        <SafetyBadge level={entry.safetyLevel} />
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2.5">
        <ContentStatusBadge status={entry.contentStatus} />
        {entry.conditionNote && <ConditionBadge note={entry.conditionNote} />}
        {entry.connectionState === 'disconnected' && (
          <span className="text-[11px] text-slate-300 px-2.5 py-1 rounded-full border border-white/12 bg-white/[0.03]">قبل الاتصال بالـ FC</span>
        )}
      </div>
    </button>
  );
};

export const BetaflightHubRenderer: React.FC<{
  entries: BfRegistryEntry[];
  versionContext: BfVersionContext;
  onOpenPage: (id: string) => void;
}> = ({ entries, versionContext, onOpenPage }) => {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const reviewedCount = entries.filter(e => e.contentStatus === 'reviewed').length;
  const notStartedCount = entries.filter(e => e.contentStatus === 'not-started').length;
  const byId = useMemo(() => new Map(entries.map(e => [e.id, e])), [entries]);

  const filtered = useMemo(
    () =>
      entries.filter(e => {
        if (statusFilter === 'reviewed' && e.contentStatus !== 'reviewed') return false;
        if (statusFilter === 'not-started' && e.contentStatus !== 'not-started') return false;
        return matchesQuery(e, query);
      }),
    [entries, query, statusFilter],
  );

  const isFiltering = query.trim().length > 0 || statusFilter !== 'all';

  return (
    <div className="px-4 py-4 space-y-4 fade-in bf-shell" data-testid="betaflight-hub-renderer">
      <div className="bf-panel-quiet p-3 flex items-start gap-2">
        <AlertCircle size={14} className="text-cyan-300 flex-shrink-0 mt-0.5" aria-hidden />
        <p className="text-xs text-cyan-100">دليل تعليمي غير رسمي للمبتدئين. التطبيق غير تابع لـ Betaflight ولا يستخدم شعاره الرسمي.</p>
      </div>

      <div className="bf-panel-quiet p-3.5 space-y-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-slate-300">
          <span>الإصدار الموثّق: Betaflight {versionContext.releaseLine}</span>
          <span>الفيرموير: {versionContext.firmwareVersion}</span>
          <span>التطبيق: {versionContext.appVersion}</span>
          <span>تمت المراجعة: {versionContext.reviewedAt}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2" data-testid="betaflight-hub-summary">
          <span className="text-[13px] font-bold text-emerald-200">{reviewedCount} صفحة مراجعة</span>
          <span className="text-slate-400" aria-hidden>•</span>
          <span className="text-[13px] font-bold text-slate-300">{notStartedCount} صفحات قيد الإعداد</span>
        </div>
      </div>

      <div className="relative">
        <Search size={16} className="absolute top-1/2 -translate-y-1/2 right-3.5 text-slate-400 pointer-events-none" aria-hidden />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="ابحث بالاسم العربي أو الإنجليزي..."
          aria-label="بحث في صفحات Betaflight"
          data-testid="betaflight-hub-search-input"
          className="bf-panel w-full pr-10 pl-9 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-cyan-400/50"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="مسح البحث"
            data-testid="betaflight-hub-search-clear"
            className="absolute top-1/2 -translate-y-1/2 left-3 text-slate-400 hover:text-white"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="تصفية حسب الحالة">
        {(
          [
            ['all', 'الكل'],
            ['reviewed', 'مراجَع'],
            ['not-started', 'لم يُبدأ بعد'],
          ] as [StatusFilter, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setStatusFilter(value)}
            data-testid={`betaflight-hub-filter-${value}`}
            aria-pressed={statusFilter === value}
            className={`px-3.5 py-1.5 rounded-full text-[12px] font-bold border press transition-colors ${
              statusFilter === value
                ? 'bg-cyan-500/20 text-cyan-100 border-cyan-400/50'
                : 'bg-white/[0.03] text-slate-300 border-white/12'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isFiltering ? (
        filtered.length > 0 ? (
          <div className="space-y-2.5" data-testid="betaflight-hub-search-results">
            {filtered
              .slice()
              .sort((a, b) => a.officialOrder - b.officialOrder)
              .map(entry => (
                <HubCard key={entry.id} entry={entry} onOpenPage={onOpenPage} />
              ))}
          </div>
        ) : (
          <div className="bf-panel-quiet p-6 text-center" data-testid="betaflight-hub-empty-state">
            <p className="text-sm text-slate-300">لا توجد صفحات مطابقة لبحثك.</p>
          </div>
        )
      ) : (
        <div className="space-y-5">
          {HUB_GROUPS.map(group => {
            const groupEntries = group.pageIds
              .map(id => byId.get(id))
              .filter((e): e is BfRegistryEntry => Boolean(e))
              .sort((a, b) => a.officialOrder - b.officialOrder);
            if (groupEntries.length === 0) return null;
            const GroupIcon = group.icon;
            return (
              <div key={group.id} className="space-y-2.5" data-testid={`betaflight-hub-group-${group.id}`}>
                <div className="flex items-center gap-2.5">
                  <span className="bf-accent-chip" aria-hidden>
                    <GroupIcon size={14} />
                  </span>
                  <h2 className="text-[15px] font-bold text-white flex-1">{group.titleAr}</h2>
                </div>
                <div className="space-y-2.5">
                  {groupEntries.map(entry => (
                    <HubCard key={entry.id} entry={entry} onOpenPage={onOpenPage} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

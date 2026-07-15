import React from 'react';
import { ShieldAlert, AlertTriangle, Info, ShieldCheck } from 'lucide-react';
import type { BfSafetyLevel, BfContentLevel, BfContentStatus } from '../../data/betaflight/types';

/**
 * Badge tokens designed for the opaque dark `.bf-shell`/`.bf-panel`
 * surfaces (see index.css) that every Betaflight page/hub/not-started
 * component now wraps its content in — not for the app's light frame.
 * Fill opacity + text lightness verified >= 9:1 contrast against the
 * bf-panel background.
 */

const SAFETY_META: Record<BfSafetyLevel, { labelAr: string; icon: React.FC<{ size?: number; className?: string }>; className: string }> = {
  informational: { labelAr: 'معلومة', icon: Info, className: 'bg-slate-500/15 text-slate-200 border-slate-400/35' },
  caution: { labelAr: 'انتبه', icon: ShieldCheck, className: 'bg-amber-500/15 text-amber-200 border-amber-400/40' },
  warning: { labelAr: 'تحذير', icon: AlertTriangle, className: 'bg-amber-500/22 text-amber-100 border-amber-400/55' },
  critical: { labelAr: 'حرِج', icon: ShieldAlert, className: 'bg-red-500/22 text-red-100 border-red-400/55' },
};

export const SafetyBadge: React.FC<{ level: BfSafetyLevel }> = ({ level }) => {
  const meta = SAFETY_META[level];
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${meta.className}`}>
      <Icon size={12} />
      {meta.labelAr}
    </span>
  );
};

const LEVEL_LABEL_AR: Record<BfContentLevel, string> = { basic: 'أساسي', advanced: 'متقدم', expert: 'خبير' };

export const LevelBadge: React.FC<{ level: BfContentLevel }> = ({ level }) => (
  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border bg-cyan-500/12 text-cyan-200 border-cyan-400/35">
    {LEVEL_LABEL_AR[level]}
  </span>
);

export const ConditionBadge: React.FC<{ note: string }> = ({ note }) => (
  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border bg-purple-500/12 text-purple-200 border-purple-400/35">
    {note}
  </span>
);

const STATUS_LABEL_AR: Record<BfContentStatus, string> = {
  'not-started': 'لم يُبدأ بعد',
  'architecture-preview': 'معاينة معمارية — غير مكتمل',
  reviewed: 'مراجَع',
};

export const ContentStatusBadge: React.FC<{ status: BfContentStatus }> = ({ status }) => (
  <span
    className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${
      status === 'reviewed'
        ? 'bg-emerald-500/18 text-emerald-200 border-emerald-400/40'
        : status === 'architecture-preview'
          ? 'bg-amber-500/18 text-amber-200 border-amber-400/40'
          : 'bg-slate-500/12 text-slate-300 border-slate-400/30'
    }`}
  >
    {STATUS_LABEL_AR[status]}
  </span>
);

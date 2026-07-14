import React from 'react';
import { ShieldAlert, AlertTriangle, Info, ShieldCheck } from 'lucide-react';
import type { BfSafetyLevel, BfContentLevel, BfContentStatus } from '../../data/betaflight/types';

const SAFETY_META: Record<BfSafetyLevel, { labelAr: string; icon: React.FC<{ size?: number; className?: string }>; className: string }> = {
  informational: { labelAr: 'معلومة', icon: Info, className: 'bg-slate-500/15 text-slate-300 border-slate-500/30' },
  caution: { labelAr: 'انتبه', icon: ShieldCheck, className: 'bg-amber-500/12 text-amber-300 border-amber-500/30' },
  warning: { labelAr: 'تحذير', icon: AlertTriangle, className: 'bg-amber-500/20 text-amber-200 border-amber-400/40' },
  critical: { labelAr: 'حرِج', icon: ShieldAlert, className: 'bg-red-500/20 text-red-200 border-red-400/40' },
};

export const SafetyBadge: React.FC<{ level: BfSafetyLevel }> = ({ level }) => {
  const meta = SAFETY_META[level];
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${meta.className}`}>
      <Icon size={11} />
      {meta.labelAr}
    </span>
  );
};

const LEVEL_LABEL_AR: Record<BfContentLevel, string> = { basic: 'أساسي', advanced: 'متقدم', expert: 'خبير' };

export const LevelBadge: React.FC<{ level: BfContentLevel }> = ({ level }) => (
  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-cyan-500/10 text-cyan-300 border-cyan-400/30">
    {LEVEL_LABEL_AR[level]}
  </span>
);

export const ConditionBadge: React.FC<{ note: string }> = ({ note }) => (
  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-purple-500/10 text-purple-300 border-purple-400/30">
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
    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
      status === 'reviewed'
        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30'
        : status === 'architecture-preview'
          ? 'bg-amber-500/15 text-amber-300 border-amber-400/30'
          : 'bg-slate-500/10 text-slate-400 border-slate-500/25'
    }`}
  >
    {STATUS_LABEL_AR[status]}
  </span>
);

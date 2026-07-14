import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { BfRegistryEntry, BfVersionContext } from '../../data/betaflight/types';
import { SafetyBadge, ConditionBadge, ContentStatusBadge } from './BfBadges';

/**
 * Honest state for a real, verified official page that has no authored
 * Arabic content yet (`contentStatus: 'not-started'`). Distinct from the
 * "invalid route" state: this page genuinely exists in Betaflight and in
 * our registry — it is not a 404, and must never look like one.
 */
export const BetaflightNotStartedPage: React.FC<{
  entry: BfRegistryEntry;
  versionContext: BfVersionContext;
  backTo?: string;
}> = ({ entry, versionContext, backTo = '/betaflight' }) => {
  const navigate = useNavigate();

  return (
    <div className="fade-in">
      <div className="px-4 pt-4 pb-3 flex items-center gap-3 border-b border-cyan-400/10">
        <button onClick={() => navigate(backTo)} className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center press" aria-label="العودة">
          <ArrowRight size={18} className="text-slate-400" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-extrabold text-white" dir="ltr">
            {entry.officialTitle}
          </h1>
          <p className="text-xs text-cyan-300">{entry.titleAr}</p>
        </div>
        <SafetyBadge level={entry.safetyLevel} />
      </div>

      <div className="px-4 py-4 space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <ContentStatusBadge status={entry.contentStatus} />
          {entry.conditionNote && <ConditionBadge note={entry.conditionNote} />}
        </div>

        <div className="card-subtle p-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
          <span>الإصدار الموثّق: Betaflight {versionContext.releaseLine}</span>
          <span>تمت المراجعة: {versionContext.reviewedAt}</span>
        </div>

        <div className="pull-quote">
          <p className="text-[15px] text-slate-100 leading-loose">
            صفحة <span dir="ltr">{entry.officialTitle}</span> ({entry.titleAr}) موجودة فعليًا في تطبيق Betaflight الرسمي،
            لكن لم يتم بعد بناء المحتوى العربي التفصيلي لها في هذا التطبيق. هذه ليست صفحة غير موجودة —
            المحتوى قيد الإعداد وسيُضاف في مرحلة قادمة.
          </p>
        </div>

        <button onClick={() => navigate(backTo)} className="btn-primary w-full mt-2">
          <ArrowRight size={18} /> العودة إلى Betaflight
        </button>
      </div>
    </div>
  );
};

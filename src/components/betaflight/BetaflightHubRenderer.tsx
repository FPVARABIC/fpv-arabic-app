import React from 'react';
import type { BfRegistryEntry } from '../../data/betaflight/types';
import type { BfVersionContext } from '../../data/betaflight/types';
import { SafetyBadge, ConditionBadge, ContentStatusBadge } from './BfBadges';

/**
 * Reusable hub renderer — architecture deliverable for Phase 1.
 *
 * NOT wired into the live `/betaflight` route yet: the production hub
 * (BetaflightView.tsx) still renders the original ten articles unchanged,
 * per "do not replace all ten current articles in this phase." This
 * component is proven via its own dedicated test (testBetaflightArchitecture*)
 * so the reusable-hub-renderer requirement is satisfied without touching
 * the live hub experience.
 */
export const BetaflightHubRenderer: React.FC<{
  entries: BfRegistryEntry[];
  versionContext: BfVersionContext;
  onOpenPage: (id: string) => void;
}> = ({ entries, versionContext, onOpenPage }) => {
  const ordered = [...entries].sort((a, b) => a.officialOrder - b.officialOrder);

  return (
    <div className="px-4 py-4 space-y-3.5 fade-in" data-testid="betaflight-hub-renderer">
      <div className="card-subtle p-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
        <span>الإصدار الموثّق: Betaflight {versionContext.releaseLine}</span>
        <span>الفيرموير: {versionContext.firmwareVersion}</span>
        <span>التطبيق: {versionContext.appVersion}</span>
        <span>تمت المراجعة: {versionContext.reviewedAt}</span>
      </div>

      {ordered.map(entry => (
        <button
          key={entry.id}
          type="button"
          onClick={() => onOpenPage(entry.id)}
          data-testid={`betaflight-hub-card-${entry.id}`}
          className="card-feature p-4 w-full text-right press"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
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
              <span className="text-[10px] text-slate-400 px-2 py-0.5 rounded-full border border-white/8">قبل الاتصال بالـ FC</span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
};

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, RotateCcw, ChevronLeft } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { Header } from '../components/Header';
import { ExpressLrsTroubleshootingIssueCard } from '../components/expresslrs/ExpressLrsTroubleshootingIssueCard';
import { useExpressLrsTroubleshootingProgress } from '../hooks/useExpressLrsTroubleshootingProgress';
import { troubleshootingIssues, TROUBLESHOOTING_CATEGORIES } from '../data/expresslrs/troubleshootingIssues';
import { readProjectSnapshot } from '../data/project/snapshot';
import { computeFindings } from '../data/project/verdicts';
import { findingsForElrsEntry, rcFactsForElrsEntry } from '../data/project/context';
import { RcContextPanel } from '../components/project/RcContextPanel';
import { resolveLinkRoute } from '../data/kb/registry';

const APPLICABILITY_LABEL: Record<string, string> = { uart: 'UART', spi: 'SPI' };

export const ExpressLrsTroubleshootingView: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const progress = useExpressLrsTroubleshootingProgress();
  const [confirmingReset, setConfirmingReset] = useState(false);
  const issueTopRef = useRef<HTMLDivElement>(null);

  const currentIssue = progress.currentIssueId
    ? troubleshootingIssues.find(i => i.id === progress.currentIssueId) ?? null
    : null;

  // Deep link: `?issue=<id>` opens that exact issue.
  //
  // Without this, every link into this screen — from search, from a diagnostic
  // tree, from an article, and later from the bot — could only say "open the
  // troubleshooting page", leaving the user to find their own symptom among 33.
  // An unknown id is ignored rather than erroring: a stale shared link should
  // land on the list, not on a broken screen. The parameter is consumed once so
  // that navigating away from the issue afterwards is not undone by a reload.
  const requestedIssue = searchParams.get('issue');
  useEffect(() => {
    if (!requestedIssue) return;
    if (troubleshootingIssues.some(i => i.id === requestedIssue)) {
      if (progress.currentIssueId !== requestedIssue) progress.goToIssue(requestedIssue);
    }
    const next = new URLSearchParams(searchParams);
    next.delete('issue');
    setSearchParams(next, { replace: true });
    // `progress` is recreated each render by its hook; depending on it here
    // would re-run this effect forever. The requested id is the only real input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedIssue]);

  // Keyed only to the active issue's identity — switching issues always
  // opens the new one at its own top. Changing a check's outcome inside the
  // same issue, or the reset-all confirmation state, never touch
  // currentIssueId, so neither re-triggers this.
  useLayoutEffect(() => {
    issueTopRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' });
  }, [currentIssue?.id]);

  // The reader's own recorded setup, narrowed to what THIS issue is about.
  // Nothing renders when the issue has no declared fields or the project has no
  // values for them — see RcContextPanel for why that matters.
  const project = useMemo(() => readProjectSnapshot(), []);
  const facts = useMemo(
    () => (currentIssue ? rcFactsForElrsEntry(project, currentIssue.id) : []),
    [project, currentIssue],
  );
  const projectFindings = useMemo(
    () => (currentIssue ? findingsForElrsEntry(computeFindings(project), currentIssue.id) : []),
    [project, currentIssue],
  );

  const exit = () => navigate('/programming/expresslrs');

  return (
    <AppShell tint="purple">
      <Header title="حل مشاكل ExpressLRS"/>
      <div
        data-expresslrs-troubleshooting-frame="true"
        className="relative flex flex-col"
        style={{ minHeight: 'calc(100% + 6rem)', background: '#f8fafc', marginBottom: '-6rem' }}
      >
        <div className="px-4 py-4 space-y-5 fade-in">
          <button
            type="button"
            data-testid="expresslrs-troubleshooting-exit"
            onClick={exit}
            className="flex items-center gap-1.5 text-xs font-semibold"
            style={{ color: '#64748b' }}
          >
            <ArrowRight size={14} aria-hidden/> العودة إلى ExpressLRS
          </button>

          <div className="space-y-1.5">
            <p className="text-sm font-semibold" style={{ color: '#334155' }}>اختر المشكلة التي تواجهها</p>
            <p className="text-sm leading-relaxed" style={{ color: '#64748b' }}>كل مشكلة لها فحوصات مرتبة تساعدك على عزل السبب خطوة بخطوة، بدل نصائح عشوائية.</p>
          </div>

          <nav className="space-y-4" data-testid="expresslrs-troubleshooting-nav" aria-label="قائمة مشاكل ExpressLRS حسب الفئة">
            {TROUBLESHOOTING_CATEGORIES.map(category => (
              <div key={category} className="space-y-2">
                <h2 className="text-xs font-bold uppercase tracking-wide" style={{ color: '#64748b' }}>{category}</h2>
                <div className="space-y-1.5">
                  {troubleshootingIssues.filter(i => i.category === category).map(issue => {
                    const active = issue.id === currentIssue?.id;
                    return (
                      <button
                        key={issue.id}
                        type="button"
                        aria-current={active ? 'true' : undefined}
                        data-testid={`expresslrs-troubleshooting-nav-${issue.id}`}
                        onClick={() => progress.goToIssue(issue.id)}
                        className="w-full text-right p-3 rounded-xl flex items-center gap-2.5 press"
                        style={active
                          ? { background: '#ecfeff', border: '1.5px solid #06b6d4' }
                          : { background: '#ffffff', border: '1px solid #e2e8f0' }}
                      >
                        <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold" style={{ background: '#f1f5f9', color: '#475569' }} aria-hidden>{issue.order}</span>
                        <span className="text-sm flex-1" style={{ color: active ? '#0e7490' : '#334155', fontWeight: active ? 700 : 500 }}>{issue.title}</span>
                        {issue.applicability !== 'both' && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: '#f1f5f9', color: '#64748b' }}>
                            {APPLICABILITY_LABEL[issue.applicability]}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {currentIssue && (
            <div ref={issueTopRef} className="space-y-3">
              <RcContextPanel
                testIdPrefix="elrs"
                entryId={currentIssue.id}
                facts={facts}
                findings={projectFindings}
              />

              <div className="p-4 rounded-2xl shadow-sm" style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}>
                <ExpressLrsTroubleshootingIssueCard
                  issue={currentIssue}
                  getCheckOutcome={progress.getCheckOutcome}
                  onSetCheckOutcome={progress.setCheckOutcome}
                  onResetIssue={() => progress.resetIssue(currentIssue.checks.map(c => c.id))}
                />
              </div>

              {currentIssue.links && currentIssue.links.length > 0 && (
                <div
                  data-testid="elrs-issue-links"
                  className="p-3 rounded-2xl space-y-1.5"
                  style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}
                >
                  <p className="text-xs font-bold" style={{ color: '#0f172a' }}>من هنا إلى</p>
                  {currentIssue.links.map((l, i) => {
                    const route = resolveLinkRoute(l);
                    if (!route) return null;
                    return (
                      <button
                        key={`${l.kind}-${l.targetId}-${i}`}
                        type="button"
                        data-testid={`elrs-issue-link-${l.kind}-${l.targetId || 'root'}`}
                        onClick={() => navigate(route)}
                        className="w-full text-right px-3 py-2.5 rounded-xl flex items-center gap-2 press"
                        style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
                      >
                        <span className="flex-1 text-[12.5px] font-semibold" style={{ color: '#334155' }}>{l.label}</span>
                        <ChevronLeft size={15} style={{ color: '#94a3b8' }} aria-hidden/>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="pt-2 border-t" style={{ borderColor: '#e2e8f0' }}>
            {!confirmingReset ? (
              <button
                type="button"
                data-testid="expresslrs-troubleshooting-reset-all"
                onClick={() => setConfirmingReset(true)}
                className="flex items-center gap-1.5 text-xs font-semibold"
                style={{ color: '#94a3b8' }}
              >
                <RotateCcw size={13} aria-hidden/> إعادة تعيين كل التشخيصات
              </button>
            ) : (
              <div className="flex items-center gap-2" data-testid="expresslrs-troubleshooting-reset-all-confirm">
                <span className="text-xs font-semibold" style={{ color: '#92400e' }}>تأكيد إعادة التعيين؟ سيُحذف كل تقدم التشخيص المحفوظ (لا يؤثر على دليل الإعداد).</span>
                <button
                  type="button"
                  data-testid="expresslrs-troubleshooting-reset-all-confirm-yes"
                  onClick={() => { progress.resetAll(); setConfirmingReset(false); }}
                  className="text-xs font-bold px-2.5 py-1 rounded-lg"
                  style={{ background: '#fee2e2', color: '#991b1b' }}
                >
                  نعم، إعادة التعيين
                </button>
                <button
                  type="button"
                  data-testid="expresslrs-troubleshooting-reset-all-confirm-cancel"
                  onClick={() => setConfirmingReset(false)}
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                  style={{ background: '#f1f5f9', color: '#475569' }}
                >
                  إلغاء
                </button>
              </div>
            )}
          </div>
        </div>
        <div style={{ height: 112 }} aria-hidden />
      </div>
    </AppShell>
  );
};

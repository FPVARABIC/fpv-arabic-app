import React, { useLayoutEffect, useMemo, useRef, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, RotateCcw, Settings2, ChevronLeft } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { Header } from '../components/Header';
import { ExpressLrsOnboarding } from '../components/expresslrs/ExpressLrsOnboarding';
import { ExpressLrsStepCard } from '../components/expresslrs/ExpressLrsStepCard';
import { useExpressLrsSetupProgress } from '../hooks/useExpressLrsSetupProgress';
import { setupSteps, TOTAL_SETUP_STEPS } from '../data/expresslrs/setupSteps';
import { troubleshootingIssues } from '../data/expresslrs/troubleshootingIssues';
import { readProjectSnapshot } from '../data/project/snapshot';
import { computeFindings } from '../data/project/verdicts';
import { findingsForElrsEntry, rcFactsForElrsEntry } from '../data/project/context';
import { RcContextPanel } from '../components/project/RcContextPanel';
import { resolveLinkRoute } from '../data/kb/registry';

export const ExpressLrsSetupView: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const progress = useExpressLrsSetupProgress();
  const [confirmingReset, setConfirmingReset] = useState(false);
  const stepTopRef = useRef<HTMLDivElement>(null);

  const currentIndex = Math.max(0, setupSteps.findIndex(s => s.id === progress.currentStepId));

  // Deep link: `?step=<id>` opens that exact step — the same reason the
  // troubleshooting screen accepts `?issue=`. A destination that can only say
  // "open the setup guide" is not an answer when the user asked how to flash a
  // receiver. An unknown id is ignored so a stale shared link still lands
  // somewhere usable.
  //
  // The parameter is NOT consumed. It used to be deleted after being applied,
  // which was fine until the onboarding gate below started reading it: a
  // deep-linked reader who had never answered the onboarding questions would
  // see the questionnaire, answer nothing, and never reach the step they were
  // sent to. Keeping the parameter makes a reload land in the same place too,
  // and re-applying it is a no-op because the guard below compares first.
  const requestedStep = searchParams.get('step');
  const deepLinkedStep = requestedStep && setupSteps.some(s => s.id === requestedStep) ? requestedStep : null;
  useEffect(() => {
    if (!deepLinkedStep) return;
    if (progress.currentStepId !== deepLinkedStep) progress.goToStep(deepLinkedStep);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLinkedStep]);

  // The onboarding questions tailor the guide's branches, and they are worth
  // asking — but they must not stand between a precise link and its target.
  // Arriving with a valid step id shows the guide immediately; the questions
  // stay one tap away through the existing edit control.
  const [forceOnboarding, setForceOnboarding] = useState(false);
  const showOnboarding = forceOnboarding || (!progress.onboardingCompleted && !deepLinkedStep);
  const currentStep = setupSteps[currentIndex] ?? setupSteps[0];
  const prevStep = currentIndex > 0 ? setupSteps[currentIndex - 1] : null;
  const nextStep = currentIndex < setupSteps.length - 1 ? setupSteps[currentIndex + 1] : null;
  const prerequisiteReminderTitle = prevStep && !progress.isStepDone(prevStep.id) ? prevStep.title : undefined;

  // Keyed only to the active step's identity — Next/Previous/direct-jump all
  // change currentStep.id, so replacement content always opens at its own
  // top. Checklist toggles, step-complete, onboarding edits, and reset-armed
  // state never touch currentStep.id, so they never re-trigger this.
  useLayoutEffect(() => {
    stepTopRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' });
  }, [currentStep.id]);

  const project = useMemo(() => readProjectSnapshot(), []);
  const facts = useMemo(() => rcFactsForElrsEntry(project, currentStep.id), [project, currentStep.id]);
  const stepFindings = useMemo(
    () => findingsForElrsEntry(computeFindings(project), currentStep.id),
    [project, currentStep.id],
  );

  // `troubleshootingLinks` was already authored on every step as a list of issue
  // ids, but nothing rendered it — so a step that named the issue you were about
  // to hit still left you to find it yourself. Resolving them through the one
  // destination resolver turns each into a real jump, and an id that stops
  // existing renders as nothing rather than as a dead button.
  const stepIssueLinks = useMemo(
    () => currentStep.troubleshootingLinks
      .map(id => troubleshootingIssues.find(i => i.id === id))
      .filter((i): i is NonNullable<typeof i> => !!i),
    [currentStep.troubleshootingLinks],
  );

  const exit = () => navigate('/programming/expresslrs');

  return (
    <AppShell tint="purple">
      <Header title="إعداد ExpressLRS"/>
      <div
        data-expresslrs-setup-frame="true"
        className="relative flex flex-col"
        style={{ minHeight: 'calc(100% + 6rem)', background: '#f8fafc', marginBottom: '-6rem' }}
      >
        <div className="px-4 py-4 space-y-4 fade-in">
          <button
            type="button"
            data-testid="expresslrs-setup-exit"
            onClick={exit}
            className="flex items-center gap-1.5 text-xs font-semibold"
            style={{ color: '#64748b' }}
          >
            <ArrowRight size={14} aria-hidden/> العودة إلى ExpressLRS
          </button>

          {showOnboarding ? (
            <ExpressLrsOnboarding
              answers={progress.onboarding}
              onAnswer={progress.setOnboardingAnswer}
              onDone={() => { progress.completeOnboarding(); setForceOnboarding(false); }}
            />
          ) : (
            <div className="space-y-5">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span data-testid="expresslrs-setup-progress-label" className="text-sm font-bold" style={{ color: '#0f172a' }}>
                    {progress.completedStepIds.length} من {TOTAL_SETUP_STEPS} خطوات مكتملة
                  </span>
                  <button
                    type="button"
                    data-testid="expresslrs-setup-edit-onboarding"
                    onClick={() => { progress.editOnboarding(); setForceOnboarding(true); }}
                    className="flex items-center gap-1 text-xs font-semibold"
                    style={{ color: '#0891b2' }}
                  >
                    <Settings2 size={13} aria-hidden/> تعديل إجابات الإعداد
                  </button>
                </div>

                <nav className="flex flex-wrap gap-1.5" data-testid="expresslrs-setup-step-nav" aria-label="الانتقال المباشر إلى أي خطوة من خطوات إعداد ExpressLRS">
                  {setupSteps.map(s => {
                    const done = progress.isStepDone(s.id);
                    const active = s.id === currentStep.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        aria-current={active ? 'step' : undefined}
                        aria-label={`الخطوة ${s.order}: ${s.title}${done ? ' (مكتملة)' : ''}`}
                        data-testid={`expresslrs-setup-step-nav-${s.id}`}
                        onClick={() => progress.goToStep(s.id)}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={active
                          ? { background: '#0891b2', color: '#ffffff' }
                          : done
                            ? { background: '#dcfce7', color: '#166534', border: '1px solid #86efac' }
                            : { background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}
                      >
                        {done && !active ? <Check size={14} aria-hidden/> : s.order}
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div ref={stepTopRef}>
                <RcContextPanel
                  testIdPrefix="elrs"
                  entryId={currentStep.id}
                  facts={facts}
                  findings={stepFindings}
                />
              </div>

              <div className="p-4 rounded-2xl shadow-sm" style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}>
                <ExpressLrsStepCard
                  step={currentStep}
                  receiverArchitecture={progress.onboarding.receiverArchitecture}
                  isChecklistItemDone={progress.isChecklistItemDone}
                  onToggleChecklistItem={progress.toggleChecklistItem}
                  isStepDone={progress.isStepDone(currentStep.id)}
                  onToggleStepComplete={() => progress.toggleStepComplete(currentStep.id)}
                  prerequisiteReminderTitle={prerequisiteReminderTitle}
                />
              </div>

              {stepIssueLinks.length > 0 && (
                <div
                  data-testid="elrs-step-links"
                  className="p-3 rounded-2xl space-y-1.5"
                  style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}
                >
                  <p className="text-xs font-bold" style={{ color: '#0f172a' }}>إن تعثّرت في هذه الخطوة</p>
                  {stepIssueLinks.map(issue => {
                    const route = resolveLinkRoute({ kind: 'elrs-issue', targetId: issue.id, label: issue.title });
                    if (!route) return null;
                    return (
                      <button
                        key={issue.id}
                        type="button"
                        data-testid={`elrs-step-link-${issue.id}`}
                        onClick={() => navigate(route)}
                        className="w-full text-right px-3 py-2.5 rounded-xl flex items-center gap-2 press"
                        style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
                      >
                        <span className="flex-1 text-[12.5px] font-semibold" style={{ color: '#334155' }}>{issue.title}</span>
                        <ChevronLeft size={15} style={{ color: '#94a3b8' }} aria-hidden/>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  data-testid="expresslrs-setup-prev"
                  disabled={!prevStep}
                  aria-label={prevStep ? `الخطوة السابقة: ${prevStep.title}` : 'لا توجد خطوة سابقة'}
                  onClick={() => prevStep && progress.goToStep(prevStep.id)}
                  className="flex-1 py-3 rounded-xl font-bold text-sm"
                  style={prevStep ? { background: '#f1f5f9', color: '#334155' } : { background: '#f1f5f9', color: '#cbd5e1', cursor: 'not-allowed' }}
                >
                  السابق
                </button>
                <button
                  type="button"
                  data-testid="expresslrs-setup-next"
                  disabled={!nextStep}
                  aria-label={nextStep ? `الخطوة التالية: ${nextStep.title}` : 'لا توجد خطوة تالية'}
                  onClick={() => nextStep && progress.goToStep(nextStep.id)}
                  className="flex-1 py-3 rounded-xl font-bold text-sm"
                  style={nextStep ? { background: '#0891b2', color: '#ffffff' } : { background: '#f1f5f9', color: '#cbd5e1', cursor: 'not-allowed' }}
                >
                  التالي
                </button>
              </div>

              <div className="pt-2 border-t" style={{ borderColor: '#e2e8f0' }}>
                {!confirmingReset ? (
                  <button
                    type="button"
                    data-testid="expresslrs-setup-reset"
                    onClick={() => setConfirmingReset(true)}
                    className="flex items-center gap-1.5 text-xs font-semibold"
                    style={{ color: '#94a3b8' }}
                  >
                    <RotateCcw size={13} aria-hidden/> إعادة تعيين التقدم
                  </button>
                ) : (
                  <div className="flex items-center gap-2" data-testid="expresslrs-setup-reset-confirm">
                    <span className="text-xs font-semibold" style={{ color: '#92400e' }}>تأكيد إعادة التعيين؟ سيُحذف كل التقدم المحفوظ.</span>
                    <button
                      type="button"
                      data-testid="expresslrs-setup-reset-confirm-yes"
                      onClick={() => { progress.resetProgress(); setConfirmingReset(false); }}
                      className="text-xs font-bold px-2.5 py-1 rounded-lg"
                      style={{ background: '#fee2e2', color: '#991b1b' }}
                    >
                      نعم، إعادة التعيين
                    </button>
                    <button
                      type="button"
                      data-testid="expresslrs-setup-reset-confirm-cancel"
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
          )}
        </div>
        <div style={{ height: 112 }} aria-hidden />
      </div>
    </AppShell>
  );
};

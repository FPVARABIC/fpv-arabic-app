import React, { useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, RotateCcw, Settings2 } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { Header } from '../components/Header';
import { ExpressLrsOnboarding } from '../components/expresslrs/ExpressLrsOnboarding';
import { ExpressLrsStepCard } from '../components/expresslrs/ExpressLrsStepCard';
import { useExpressLrsSetupProgress } from '../hooks/useExpressLrsSetupProgress';
import { setupSteps, TOTAL_SETUP_STEPS } from '../data/expresslrs/setupSteps';

export const ExpressLrsSetupView: React.FC = () => {
  const navigate = useNavigate();
  const progress = useExpressLrsSetupProgress();
  const [confirmingReset, setConfirmingReset] = useState(false);
  const stepTopRef = useRef<HTMLDivElement>(null);

  const currentIndex = Math.max(0, setupSteps.findIndex(s => s.id === progress.currentStepId));
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

          {!progress.onboardingCompleted ? (
            <ExpressLrsOnboarding
              answers={progress.onboarding}
              onAnswer={progress.setOnboardingAnswer}
              onDone={progress.completeOnboarding}
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
                    onClick={progress.editOnboarding}
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

              <div ref={stepTopRef} className="p-4 rounded-2xl shadow-sm" style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}>
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

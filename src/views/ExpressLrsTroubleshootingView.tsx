import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { Header } from '../components/Header';
import { ExpressLrsTroubleshootingIssueCard } from '../components/expresslrs/ExpressLrsTroubleshootingIssueCard';
import { useExpressLrsTroubleshootingProgress } from '../hooks/useExpressLrsTroubleshootingProgress';
import { troubleshootingIssues, TROUBLESHOOTING_CATEGORIES } from '../data/expresslrs/troubleshootingIssues';

const APPLICABILITY_LABEL: Record<string, string> = { uart: 'UART', spi: 'SPI' };

export const ExpressLrsTroubleshootingView: React.FC = () => {
  const navigate = useNavigate();
  const progress = useExpressLrsTroubleshootingProgress();
  const [confirmingReset, setConfirmingReset] = useState(false);

  const currentIssue = progress.currentIssueId
    ? troubleshootingIssues.find(i => i.id === progress.currentIssueId) ?? null
    : null;

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
            <div className="p-4 rounded-2xl shadow-sm" style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}>
              <ExpressLrsTroubleshootingIssueCard
                issue={currentIssue}
                getCheckOutcome={progress.getCheckOutcome}
                onSetCheckOutcome={progress.setCheckOutcome}
                onResetIssue={() => progress.resetIssue(currentIssue.checks.map(c => c.id))}
              />
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

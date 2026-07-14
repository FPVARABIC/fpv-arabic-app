import React from 'react';
import { Check, ExternalLink, X, RotateCcw, CircleDashed } from 'lucide-react';
import type { CheckOutcome, TroubleshootingIssue } from '../../data/expresslrs/types';
import { ExpressLrsCallout } from './ExpressLrsCallout';

interface ExpressLrsTroubleshootingIssueCardProps {
  issue: TroubleshootingIssue;
  getCheckOutcome: (checkId: string) => CheckOutcome;
  onSetCheckOutcome: (checkId: string, outcome: CheckOutcome) => void;
  onResetIssue: () => void;
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="space-y-2">
    <h3 className="text-sm font-bold" style={{ color: '#0f172a' }}>{title}</h3>
    {children}
  </div>
);

const OUTCOME_OPTIONS: { value: CheckOutcome; label: string; Icon: React.FC<{ size?: number }> }[] = [
  { value: 'not-checked', label: 'لم يُفحص بعد', Icon: CircleDashed },
  { value: 'passed', label: 'نجح', Icon: Check },
  { value: 'failed', label: 'فشل', Icon: X },
];

const APPLICABILITY_LABEL: Record<string, string> = { uart: 'UART فقط', spi: 'SPI فقط' };

export const ExpressLrsTroubleshootingIssueCard: React.FC<ExpressLrsTroubleshootingIssueCardProps> = ({
  issue, getCheckOutcome, onSetCheckOutcome, onResetIssue,
}) => {
  const hasChecks = issue.checks.length > 0;
  const allPassed = hasChecks && issue.checks.every(c => getCheckOutcome(c.id) === 'passed');

  return (
    <div className="space-y-5 fade-in" data-testid={`expresslrs-issue-card-${issue.id}`}>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-lg font-extrabold" style={{ color: '#0f172a' }}>{issue.title}</h2>
          {issue.applicability !== 'both' && (
            <span
              data-testid={`expresslrs-issue-applicability-${issue.id}`}
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}
            >
              {APPLICABILITY_LABEL[issue.applicability]}
            </span>
          )}
        </div>
        <p className="text-sm leading-relaxed" style={{ color: '#64748b' }}>{issue.symptom}</p>
      </div>

      {issue.safetyWarning && (
        <div data-testid={`expresslrs-issue-safety-warning-${issue.id}`}>
          <ExpressLrsCallout level={issue.safetyWarning.level} message={issue.safetyWarning.message}/>
        </div>
      )}

      <Section title="الأسباب المحتملة">
        <ul className="space-y-1.5">
          {issue.likelyCauses.map((c, i) => (
            <li key={i} className="text-sm leading-relaxed flex items-start gap-2" style={{ color: '#334155' }}>
              <span aria-hidden style={{ color: '#94a3b8' }}>—</span>{c}
            </li>
          ))}
        </ul>
      </Section>

      {hasChecks && (
        <Section title="الفحوصات (بالترتيب)">
          <div className="space-y-3">
            {issue.checks.map((check, i) => {
              const outcome = getCheckOutcome(check.id);
              return (
                <fieldset
                  key={check.id}
                  data-testid={`expresslrs-check-${check.id}`}
                  className="p-3 rounded-xl"
                  style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
                >
                  <legend className="text-sm font-semibold px-1" style={{ color: '#0f172a' }}>
                    {i + 1}. {check.instruction}
                  </legend>
                  <p className="text-xs leading-relaxed mt-1 mb-2" style={{ color: '#64748b' }}>
                    <span className="font-semibold">النتيجة المتوقعة:</span> {check.expectedResult}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {OUTCOME_OPTIONS.map(opt => {
                      const isSelected = outcome === opt.value;
                      const inputId = `expresslrs-check-${check.id}-${opt.value}`;
                      return (
                        <label
                          key={opt.value}
                          htmlFor={inputId}
                          data-testid={`expresslrs-check-option-${check.id}-${opt.value}`}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg cursor-pointer text-xs font-semibold"
                          style={{
                            background: isSelected ? (opt.value === 'failed' ? '#fef2f2' : opt.value === 'passed' ? '#f0fdf4' : '#e0f2fe') : '#ffffff',
                            border: isSelected ? `1.5px solid ${opt.value === 'failed' ? '#fca5a5' : opt.value === 'passed' ? '#86efac' : '#7dd3fc'}` : '1px solid #e2e8f0',
                            color: isSelected ? (opt.value === 'failed' ? '#991b1b' : opt.value === 'passed' ? '#166534' : '#0369a1') : '#475569',
                          }}
                        >
                          <input
                            id={inputId}
                            type="radio"
                            name={`expresslrs-check-${check.id}`}
                            value={opt.value}
                            checked={isSelected}
                            onChange={() => onSetCheckOutcome(check.id, opt.value)}
                            className="w-3.5 h-3.5"
                          />
                          <opt.Icon size={13}/>
                          {opt.label}
                        </label>
                      );
                    })}
                  </div>
                  {outcome === 'failed' && (
                    <p data-testid={`expresslrs-check-if-failed-${check.id}`} className="text-xs leading-relaxed mt-2 p-2 rounded-lg" style={{ background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' }}>
                      <span className="font-semibold">الخطوة التالية:</span> {check.ifFailed}
                    </p>
                  )}
                </fieldset>
              );
            })}
          </div>
        </Section>
      )}

      {hasChecks && allPassed && (
        <div data-testid={`expresslrs-issue-resolved-${issue.id}`} className="p-3 rounded-xl flex items-start gap-2" style={{ background: '#f0fdf4', border: '1px solid #86efac' }}>
          <Check size={16} style={{ color: '#166534', flexShrink: 0, marginTop: 2 }} aria-hidden/>
          <p className="text-sm leading-relaxed" style={{ color: '#166534' }}>{issue.resolvedWhen}</p>
        </div>
      )}

      {!hasChecks && (
        <Section title="متى يُعتبر هذا الأمر منتهيًا؟">
          <p className="text-sm leading-relaxed" style={{ color: '#334155' }}>{issue.resolvedWhen}</p>
        </Section>
      )}

      <Section title="إذا لم تُحل المشكلة">
        <p className="text-sm leading-relaxed" style={{ color: '#334155' }}>{issue.nextIfUnresolved}</p>
      </Section>

      <Section title="المصادر الرسمية">
        <ul className="space-y-1.5">
          {issue.sources.map((s, i) => (
            <li key={i}>
              <a href={s.url} target="_blank" rel="noreferrer" className="text-sm inline-flex items-center gap-1.5 underline" style={{ color: '#0891b2' }}>
                {s.label} <ExternalLink size={12} aria-hidden/>
              </a>
            </li>
          ))}
        </ul>
      </Section>

      {hasChecks && (
        <button
          type="button"
          data-testid={`expresslrs-issue-restart-${issue.id}`}
          onClick={onResetIssue}
          className="flex items-center gap-1.5 text-xs font-semibold"
          style={{ color: '#94a3b8' }}
        >
          <RotateCcw size={13} aria-hidden/> إعادة تعيين هذا التشخيص
        </button>
      )}
    </div>
  );
};

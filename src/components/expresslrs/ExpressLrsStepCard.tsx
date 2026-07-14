import React, { useState } from 'react';
import { Check, ChevronDown, ChevronUp, ExternalLink, Clock } from 'lucide-react';
import type { ReceiverArchitecture, SetupStepContent } from '../../data/expresslrs/types';
import { ExpressLrsCallout } from './ExpressLrsCallout';

interface ExpressLrsStepCardProps {
  step: SetupStepContent;
  receiverArchitecture: ReceiverArchitecture | null;
  isChecklistItemDone: (itemId: string) => boolean;
  onToggleChecklistItem: (itemId: string) => void;
  isStepDone: boolean;
  onToggleStepComplete: () => void;
  prerequisiteReminderTitle?: string;
}

function splitBranches(lines: string[]) {
  const uart: string[] = [];
  const spi: string[] = [];
  const general: string[] = [];
  for (const line of lines) {
    if (line.startsWith('[UART] ')) uart.push(line.slice('[UART] '.length));
    else if (line.startsWith('[SPI] ')) spi.push(line.slice('[SPI] '.length));
    else general.push(line);
  }
  return { uart, spi, general };
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="space-y-2">
    <h3 className="text-sm font-bold" style={{ color: '#0f172a' }}>{title}</h3>
    {children}
  </div>
);

export const ExpressLrsStepCard: React.FC<ExpressLrsStepCardProps> = ({
  step, receiverArchitecture, isChecklistItemDone, onToggleChecklistItem, isStepDone, onToggleStepComplete, prerequisiteReminderTitle,
}) => {
  const [advancedOpen, setAdvancedOpen] = useState<Record<number, boolean>>({});
  const { uart, spi, general } = splitBranches(step.actions);
  const hasBranches = uart.length > 0 || spi.length > 0;

  const branchBadge = (branch: 'uart' | 'spi') => {
    if (!receiverArchitecture || receiverArchitecture === 'unknown') return null;
    if (receiverArchitecture !== branch) {
      return (
        <span
          data-testid={`expresslrs-step-branch-badge-${branch}`}
          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0' }}
        >
          لا ينطبق على إعدادك
        </span>
      );
    }
    return null;
  };

  return (
    <div className="space-y-5 fade-in" data-testid={`expresslrs-step-card-${step.id}`}>
      {prerequisiteReminderTitle && (
        <div data-testid="expresslrs-prerequisite-reminder" className="p-3 rounded-xl text-xs font-semibold" style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' }}>
          تذكير: لم تُكمّل خطوة «{prerequisiteReminderTitle}» بعد. يمكنك المتابعة، لكن يُنصح بإكمالها أولًا.
        </div>
      )}

      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: '#64748b' }}>
          <span data-testid="expresslrs-step-order">الخطوة {step.order} من 10</span>
          <span aria-hidden>•</span>
          <span className="flex items-center gap-1"><Clock size={12}/>{step.estimatedMinutes} دقائق تقريبًا</span>
        </div>
        <h2 className="text-lg font-extrabold" style={{ color: '#0f172a' }}>{step.title}</h2>
        <p className="text-sm leading-relaxed" style={{ color: '#64748b' }}>{step.summary}</p>
      </div>

      <Section title="الهدف">
        <p className="text-sm leading-relaxed" style={{ color: '#334155' }}>{step.goal}</p>
      </Section>

      <Section title="قبل أن تبدأ">
        <ul className="space-y-1.5">
          {step.prerequisites.map((p, i) => (
            <li key={i} className="text-sm leading-relaxed flex items-start gap-2" style={{ color: '#334155' }}>
              <span aria-hidden style={{ color: '#94a3b8' }}>—</span>{p}
            </li>
          ))}
        </ul>
      </Section>

      {step.terminology.length > 0 && (
        <Section title="المصطلحات">
          <dl className="space-y-2">
            {step.terminology.map((t, i) => (
              <div key={i} className="p-2.5 rounded-lg" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <dt className="text-sm font-bold" style={{ color: '#0f172a' }}>{t.term}</dt>
                <dd className="text-xs leading-relaxed mt-0.5" style={{ color: '#64748b' }}>{t.definition}</dd>
              </div>
            ))}
          </dl>
        </Section>
      )}

      <Section title="الخطوات">
        <div className="space-y-3">
          {general.length > 0 && (
            <ol className="space-y-2 list-none">
              {general.map((a, i) => (
                <li key={i} className="text-sm leading-relaxed flex items-start gap-2" style={{ color: '#334155' }}>
                  <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold" style={{ background: '#e0f2fe', color: '#0369a1' }} aria-hidden>{i + 1}</span>
                  {a}
                </li>
              ))}
            </ol>
          )}
          {hasBranches && uart.length > 0 && (
            <div className="p-2.5 rounded-xl" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }} data-testid="expresslrs-step-branch-uart">
              <div className="flex items-center gap-2 mb-1.5">
                <h4 className="text-xs font-bold" style={{ color: '#0f172a' }}>لمستقبلات UART</h4>
                {branchBadge('uart')}
              </div>
              <ul className="space-y-1.5">
                {uart.map((a, i) => <li key={i} className="text-sm leading-relaxed" style={{ color: '#334155' }}>{a}</li>)}
              </ul>
            </div>
          )}
          {hasBranches && spi.length > 0 && (
            <div className="p-2.5 rounded-xl" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }} data-testid="expresslrs-step-branch-spi">
              <div className="flex items-center gap-2 mb-1.5">
                <h4 className="text-xs font-bold" style={{ color: '#0f172a' }}>لمستقبلات SPI</h4>
                {branchBadge('spi')}
              </div>
              <ul className="space-y-1.5">
                {spi.map((a, i) => <li key={i} className="text-sm leading-relaxed" style={{ color: '#334155' }}>{a}</li>)}
              </ul>
            </div>
          )}
        </div>
      </Section>

      <Section title="ماذا يجب أن ترى؟">
        <ul className="space-y-1.5">
          {step.expectedResult.map((r, i) => (
            <li key={i} className="text-sm leading-relaxed flex items-start gap-2" style={{ color: '#166534' }}>
              <Check size={16} className="flex-shrink-0 mt-0.5" aria-hidden/>{r}
            </li>
          ))}
        </ul>
      </Section>

      {step.ifNotSeen.length > 0 && (
        <Section title="إذا لم تظهر النتيجة">
          <ul className="space-y-1.5">
            {step.ifNotSeen.map((r, i) => <li key={i} className="text-sm leading-relaxed" style={{ color: '#334155' }}>{r}</li>)}
          </ul>
        </Section>
      )}

      {step.commonMistakes.length > 0 && (
        <Section title="أخطاء شائعة">
          <ul className="space-y-1.5">
            {step.commonMistakes.map((m, i) => (
              <li key={i} className="text-sm leading-relaxed flex items-start gap-2" style={{ color: '#334155' }}>
                <span aria-hidden style={{ color: '#f59e0b' }}>•</span>{m}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {step.warnings.length > 0 && (
        <div className="space-y-2">
          {step.warnings.map((w, i) => <ExpressLrsCallout key={i} level={w.level} message={w.message}/>)}
        </div>
      )}

      {step.advancedDisclosures.length > 0 && step.advancedDisclosures.map((d, i) => {
        const open = !!advancedOpen[i];
        return (
          <div key={i} className="rounded-xl overflow-hidden" style={{ border: '1px solid #e2e8f0' }}>
            <button
              type="button"
              data-testid={`expresslrs-step-advanced-toggle-${step.id}-${i}`}
              onClick={() => setAdvancedOpen(prev => ({ ...prev, [i]: !prev[i] }))}
              aria-expanded={open}
              className="w-full flex items-center justify-between p-3 text-right"
              style={{ background: '#f8fafc' }}
            >
              <span className="text-sm font-bold" style={{ color: '#0f172a' }}>{d.title}</span>
              {open ? <ChevronUp size={16} style={{ color: '#64748b' }}/> : <ChevronDown size={16} style={{ color: '#64748b' }}/>}
            </button>
            {open && (
              <ul className="p-3 space-y-1.5" style={{ background: '#ffffff' }}>
                {d.body.map((b, j) => <li key={j} className="text-sm leading-relaxed" style={{ color: '#334155' }}>{b}</li>)}
              </ul>
            )}
          </div>
        );
      })}

      <Section title="تحقق قبل المتابعة">
        <div className="space-y-2">
          {step.checklist.map(item => {
            const done = isChecklistItemDone(item.id);
            const inputId = `expresslrs-checklist-${item.id}`;
            return (
              <label
                key={item.id}
                htmlFor={inputId}
                data-testid={`expresslrs-checklist-item-${item.id}`}
                className="flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer"
                style={{ background: done ? '#f0fdf4' : '#f8fafc', border: done ? '1px solid #86efac' : '1px solid #e2e8f0' }}
              >
                <input id={inputId} type="checkbox" checked={done} onChange={() => onToggleChecklistItem(item.id)} className="w-4 h-4"/>
                <span className="text-sm flex-1" style={{ color: done ? '#166534' : '#334155', textDecoration: done ? 'line-through' : 'none' }}>{item.label}</span>
              </label>
            );
          })}
        </div>
      </Section>

      <Section title="المصادر الرسمية">
        <ul className="space-y-1.5">
          {step.sources.map((s, i) => (
            <li key={i}>
              <a href={s.url} target="_blank" rel="noreferrer" className="text-sm inline-flex items-center gap-1.5 underline" style={{ color: '#0891b2' }}>
                {s.label} <ExternalLink size={12} aria-hidden/>
              </a>
            </li>
          ))}
        </ul>
      </Section>

      <button
        type="button"
        data-testid="expresslrs-step-mark-complete"
        onClick={onToggleStepComplete}
        className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
        style={isStepDone
          ? { background: '#dcfce7', color: '#166534', border: '1px solid #86efac' }
          : { background: '#0891b2', color: '#ffffff' }}
      >
        <Check size={16} aria-hidden/>
        {isStepDone ? 'تم إنهاء هذه الخطوة' : 'أنهيت هذه الخطوة'}
      </button>
    </div>
  );
};

import React, { useState } from 'react';
import { Check, HelpCircle } from 'lucide-react';
import {
  RECEIVER_ARCHITECTURE_LABELS, TX_MODULE_LOCATION_LABELS, FREQUENCY_BAND_LABELS,
  SETUP_INTENT_LABELS, FC_SOFTWARE_LABELS,
} from '../../data/expresslrs/types';
import type { OnboardingAnswers } from '../../data/expresslrs/types';

interface ExpressLrsOnboardingProps {
  answers: OnboardingAnswers;
  onAnswer: <K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) => void;
  onDone: () => void;
}

interface Question<K extends keyof OnboardingAnswers> {
  key: K;
  legend: string;
  options: { value: NonNullable<OnboardingAnswers[K]>; label: string }[];
  helpForUnknown?: string;
}

const questions: Question<keyof OnboardingAnswers>[] = [
  {
    key: 'receiverArchitecture',
    legend: 'نوع المستقبل',
    options: [
      { value: 'uart', label: RECEIVER_ARCHITECTURE_LABELS.uart },
      { value: 'spi', label: RECEIVER_ARCHITECTURE_LABELS.spi },
      { value: 'unknown', label: RECEIVER_ARCHITECTURE_LABELS.unknown },
    ],
    helpForUnknown: 'إذا كان المستقبل قطعة منفصلة موصولة بأسلاك بمتحكم الطيران فهو غالبًا UART. إذا كان لوحة صغيرة مثبتة مباشرة فوق متحكم الطيران بلا أسلاك بيانات ظاهرة فهو غالبًا SPI. راجع خطوة "تحديد نوع النظام والأجهزة" للمزيد من التفاصيل.',
  },
  {
    key: 'txModuleLocation',
    legend: 'وحدة الإرسال',
    options: [
      { value: 'internal', label: TX_MODULE_LOCATION_LABELS.internal },
      { value: 'external', label: TX_MODULE_LOCATION_LABELS.external },
      { value: 'unknown', label: TX_MODULE_LOCATION_LABELS.unknown },
    ],
    helpForUnknown: 'افحص جسم جهاز التحكم: إذا لم تجد وحدة بارزة في حاوية خلفية فوحدة الإرسال على الأرجح داخلية. إذا وجدت وحدة منفصلة مثبتة خلف الجهاز فهي خارجية.',
  },
  {
    key: 'frequencyBand',
    legend: 'نطاق التردد',
    options: [
      { value: '2.4', label: FREQUENCY_BAND_LABELS['2.4'] },
      { value: '900', label: FREQUENCY_BAND_LABELS['900'] },
      { value: 'unknown', label: FREQUENCY_BAND_LABELS.unknown },
    ],
    helpForUnknown: 'راجع الملصق المطبوع على المستقبل ووحدة الإرسال، أو صفحة المنتج الرسمية — النطاق الترددي مذكور دائمًا صراحة ولا يجب تخمينه.',
  },
  {
    key: 'setupIntent',
    legend: 'الحالة الحالية',
    options: [
      { value: 'new', label: SETUP_INTENT_LABELS.new },
      { value: 'bound-not-moving', label: SETUP_INTENT_LABELS['bound-not-moving'] },
      { value: 'update-existing', label: SETUP_INTENT_LABELS['update-existing'] },
      { value: 'replace-receiver', label: SETUP_INTENT_LABELS['replace-receiver'] },
    ],
  },
  {
    key: 'fcSoftware',
    legend: 'برنامج متحكم الطيران',
    options: [
      { value: 'betaflight', label: FC_SOFTWARE_LABELS.betaflight },
      { value: 'other', label: FC_SOFTWARE_LABELS.other },
      { value: 'unknown', label: FC_SOFTWARE_LABELS.unknown },
    ],
    helpForUnknown: 'إذا كنت تستخدم Betaflight Configurator لإدارة طائرتك فاختر Betaflight. إذا كنت تستخدم برنامجًا آخر فاختر "نظام آخر" — ستبقى خطوات الربط والتوصيل العامة صالحة لك، لكن لن يُفترض أن إعدادات Betaflight التفصيلية تنطبق عليك.',
  },
];

export const ExpressLrsOnboarding: React.FC<ExpressLrsOnboardingProps> = ({ answers, onAnswer, onDone }) => {
  const [showUnknownHelp, setShowUnknownHelp] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-5 fade-in" data-testid="expresslrs-onboarding">
      <div className="space-y-1.5">
        <h2 className="font-bold" style={{ color: '#0f172a' }}>أسئلة سريعة قبل البدء</h2>
        <p className="text-sm leading-relaxed" style={{ color: '#64748b' }}>
          تساعد هذه الإجابات على تخصيص الشرح المناسب لأجهزتك. لا تُحدَّد إجاباتك تلقائيًا — اخترها بنفسك، ويمكنك تعديلها لاحقًا في أي وقت.
        </p>
      </div>

      {questions.map(q => {
        const selected = answers[q.key];
        return (
          <fieldset key={q.key} className="p-3.5 rounded-2xl" style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}>
            <legend className="text-sm font-bold px-1" style={{ color: '#0f172a' }}>{q.legend}</legend>
            <div className="space-y-2 mt-2">
              {q.options.map(opt => {
                const isSelected = selected === opt.value;
                const inputId = `expresslrs-onboarding-${q.key}-${opt.value}`;
                return (
                  <label
                    key={opt.value}
                    htmlFor={inputId}
                    data-testid={`expresslrs-onboarding-option-${q.key}-${opt.value}`}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer transition-colors"
                    style={{
                      background: isSelected ? '#ecfeff' : '#f8fafc',
                      border: isSelected ? '1.5px solid #06b6d4' : '1px solid #e2e8f0',
                    }}
                  >
                    <input
                      id={inputId}
                      type="radio"
                      name={`expresslrs-onboarding-${q.key}`}
                      value={opt.value}
                      checked={isSelected}
                      onChange={() => {
                        onAnswer(q.key, opt.value);
                        if (opt.value !== 'unknown') setShowUnknownHelp(prev => ({ ...prev, [q.key]: false }));
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-sm flex-1" style={{ color: isSelected ? '#0e7490' : '#334155', fontWeight: isSelected ? 700 : 500 }}>
                      {opt.label}
                    </span>
                    {isSelected && <Check size={16} style={{ color: '#06b6d4' }} aria-hidden/>}
                  </label>
                );
              })}
            </div>
            {selected === 'unknown' && q.helpForUnknown && (
              <div className="mt-2.5">
                <button
                  type="button"
                  data-testid={`expresslrs-onboarding-help-toggle-${q.key}`}
                  onClick={() => setShowUnknownHelp(prev => ({ ...prev, [q.key]: !prev[q.key] }))}
                  aria-expanded={!!showUnknownHelp[q.key]}
                  className="flex items-center gap-1.5 text-xs font-semibold"
                  style={{ color: '#0e7490' }}
                >
                  <HelpCircle size={14}/> كيف أعرف؟
                </button>
                {showUnknownHelp[q.key] && (
                  <p data-testid={`expresslrs-onboarding-help-text-${q.key}`} className="text-xs leading-relaxed mt-1.5 p-2.5 rounded-lg" style={{ color: '#475569', background: '#f1f5f9' }}>
                    {q.helpForUnknown}
                  </p>
                )}
              </div>
            )}
          </fieldset>
        );
      })}

      <div className="flex flex-col gap-2 pt-1">
        <button
          type="button"
          data-testid="expresslrs-onboarding-continue"
          onClick={onDone}
          className="w-full py-3 rounded-xl font-bold text-sm text-white"
          style={{ background: '#0891b2' }}
        >
          متابعة إلى الخطوات
        </button>
        <button
          type="button"
          data-testid="expresslrs-onboarding-skip"
          onClick={onDone}
          className="w-full py-2 text-xs font-semibold"
          style={{ color: '#64748b' }}
        >
          تخطي الآن، أعرف ما أحتاجه
        </button>
      </div>
    </div>
  );
};

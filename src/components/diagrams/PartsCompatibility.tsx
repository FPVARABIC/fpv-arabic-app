import React from 'react';
import { DiagramFrame, DiagramInfo, DiagramWarn, useReveal } from './_shared';
import { ArrowLeft } from 'lucide-react';

/**
 * The order in which compatible parts are chosen, one decision feeding the
 * next. Each step is tappable: it reveals WHY that step comes where it does,
 * and reports the step id to a consuming lesson through `onStepExplore` so a
 * journey can require the whole chain be walked.
 */
const chain = [
  {
    id: 'frame', step: '1', label: 'Frame', note: 'ابدأ بحجم الفريم', val: '5 بوصة',
    detail: 'حجم الفريم يُقاس بأكبر مروحة يحملها. هو القرار الأول لأن كل شيء بعده — حجم المحرك، جهد البطارية، حتى الكاميرا — يُشتقّ منه. اختر الحجم من هدفك (الدرس الرابع) لا من الشكل.',
  },
  {
    id: 'motors', step: '2', label: 'Motors', note: 'تناسب حجم الفريم', val: '2306',
    detail: 'رقم المحرك مثل 2306 هو قطر الستاتور (23 مم) وارتفاعه (6 مم). لكل حجم فريم نطاق محركات معتاد؛ محرك أكبر من الفريم يُهدر طاقة ويُسخّن، وأصغر يعجز عن الرفع.',
  },
  {
    id: 'esc', step: '3', label: 'ESC', note: 'تيار > تيار الموتور +20%', val: '45A',
    detail: 'الـESC يجب أن يتحمّل أقصى تيار يسحبه المحرك مع هامش نحو 20٪. تيار المحرك معلن في ورقته مع المروحة والجهد المستعملين — فلا تقرأه إلا بعد اختيار المحرك.',
  },
  {
    id: 'fc', step: '4', label: 'FC', note: 'منافذ UART كافية', val: '4×UART',
    detail: 'المتحكم يحتاج منفذاً تسلسلياً (UART) لكل جهاز يتحدث معه: المستقبل، الـVTX، الـGPS. عُدّ أجهزتك قبل أن تشتري اللوحة — منفذ ناقص لا يُعوَّض بالبرمجة.',
  },
  {
    id: 'lipo', step: '5', label: 'LiPo', note: 'توافق جهد ESC', val: '6S',
    detail: 'عدد خلايا البطارية (4S أو 6S) يجب أن يقع داخل نطاق الجهد الذي يقبله الـESC والمحرك معاً. بطارية 6S على ESC مصنّف حتى 4S تحرقه في أول توصيل.',
  },
];

export interface PartsCompatibilityProps {
  /** Fired each time a learner opens a step — lets a lesson require all five. */
  onStepExplore?: (stepId: string) => void;
}

export const PartsCompatibility: React.FC<PartsCompatibilityProps> = ({ onStepExplore }) => {
  const { sel, toggle } = useReveal<string>();
  const handle = (id: string) => {
    toggle(id);
    onStepExplore?.(id);
  };
  const selected = chain.find(c => c.id === sel) ?? null;
  return (
    <DiagramFrame title="ترتيب اختيار القطع المتوافقة" hint="اضغط كل خطوة لتعرف لماذا تأتي في موضعها">
      <div className="space-y-2">
        {chain.map((c, i) => {
          const active = sel === c.id;
          return (
            <React.Fragment key={c.step}>
              <button
                type="button"
                onClick={() => handle(c.id)}
                aria-pressed={active}
                data-testid={`parts-compat-step-${c.id}`}
                className={`w-full flex items-center gap-3 rounded-xl px-3 py-2 border transition-all press ${active ? 'bg-cyan-400/10 border-cyan-400/50' : 'bg-white/4 border-cyan-400/15'}`}
              >
                <span className="w-6 h-6 rounded-full bg-cyan-400/15 text-cyan-400 text-xs font-bold flex items-center justify-center flex-shrink-0">{c.step}</span>
                <div className="flex-1 text-right">
                  <p className="text-sm font-bold text-white leading-tight">{c.label}</p>
                  <p className="text-[11px] text-slate-400">{c.note}</p>
                </div>
                <span className="badge-cyan font-mono">{c.val}</span>
              </button>
              {i < chain.length - 1 && <ArrowLeft size={14} className="text-cyan-400/60 mx-auto rotate-90" />}
            </React.Fragment>
          );
        })}
      </div>
      <DiagramInfo text={selected ? `${selected.label}: ${selected.detail}` : null} placeholder="اضغط أي خطوة من الخمس لتعرف سبب ترتيبها" />
      <DiagramWarn tone="danger">⚠ قطع غير متوافقة قد تحترق فور التشغيل</DiagramWarn>
    </DiagramFrame>
  );
};

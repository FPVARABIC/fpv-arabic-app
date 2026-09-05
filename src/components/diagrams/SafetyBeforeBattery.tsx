import React from 'react';
import { DiagramFrame, DiagramInfo, DiagramWarn, useReveal } from './_shared';
import { Ban, Gauge, ShieldCheck, CheckCircle2 } from 'lucide-react';

/**
 * The pre-battery safety protocol, in the only order that is safe. Each step
 * is tappable: it reveals what that step catches that the others cannot, and
 * reports the step id through `onStepExplore` so Lesson 10 can require all
 * four be read before the lesson is completed.
 */
const steps = [
  {
    id: 'no-props', Icon: Ban, t: 'لا مراوح مركبة', d: 'تأكد تمامًا من غياب المراوح',
    detail: 'يكتشف: لا شيء — يمنع الضرر. أي خطأ في الخطوات التالية قد يُدير محركاً فجأة؛ بلا مراوح يكون ذلك صوتاً مزعجاً، ومعها يكون جرحاً. تُنزع قبل أول توصيل على الطاولة، لا قبل أول طيران فقط.',
  },
  {
    id: 'smoke-stopper', Icon: ShieldCheck, t: 'Smoke Stopper', d: 'وصّله أولًا — يحمي من القصر',
    detail: 'يكتشف: القصر الكهربائي لحظة التوصيل الفعلي. مقاومته تحدّ من التيار فلا يحترق شيء فوراً، ولمبته تضيء بشدة لتقول لك «افصل الآن». لا يفصل بنفسه — أنت من يفصل.',
  },
  {
    id: 'multimeter', Icon: Gauge, t: 'Multimeter', d: 'افحص القطبية و continuity',
    detail: 'يكتشف: القصر قبل أن يوجد تيار أصلاً. مقاومة قريبة من الصفر بين VBAT وGND تعني اتصالاً لا يجب أن يكون. وهذا الفحص هو الوحيد الذي يلتقط قطبية معكوسة قبل أن تصل الكهرباء إلى الـESC.',
  },
  {
    id: 'battery', Icon: CheckCircle2, t: 'ثم البطارية', d: 'وصّل البطارية فقط بعد النجاح',
    detail: 'الخطوة الأخيرة لا الأولى. تُوصَل مباشرةً فقط بعد أن يمرّ Smoke Stopper بلمبة خافتة والمقياس بقراءة عالية — والمراوح ما زالت منزوعة حتى تنتهي كل اختبارات الطاولة.',
  },
];

export interface SafetyBeforeBatteryProps {
  /** Fired each time a learner opens a step — lets a lesson require all four. */
  onStepExplore?: (stepId: string) => void;
}

export const SafetyBeforeBattery: React.FC<SafetyBeforeBatteryProps> = ({ onStepExplore }) => {
  const { sel, toggle } = useReveal<string>();
  const handle = (id: string) => {
    toggle(id);
    onStepExplore?.(id);
  };
  const selected = steps.find(s => s.id === sel) ?? null;
  return (
    <DiagramFrame title="بروتوكول السلامة قبل البطارية" hint="اضغط كل خطوة لتعرف ما تكتشفه هي وحدها">
      <div className="space-y-2">
        {steps.map((s, i) => {
          const active = sel === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => handle(s.id)}
              aria-pressed={active}
              data-testid={`safety-step-${s.id}`}
              className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-all press ${active ? 'bg-cyan-400/10 border-cyan-400/50' : 'bg-white/4 border-cyan-400/15'}`}
            >
              <span className="w-6 h-6 rounded-full bg-cyan-400/15 text-cyan-400 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
              <s.Icon size={18} className="text-cyan-400 flex-shrink-0" />
              <div className="text-right flex-1">
                <p className="text-sm font-bold text-white leading-tight">{s.t}</p>
                <p className="text-[11px] text-slate-400">{s.d}</p>
              </div>
            </button>
          );
        })}
      </div>
      <DiagramInfo text={selected ? `${selected.t} — ${selected.detail}` : null} placeholder="اضغط أي خطوة من الأربع" />
      <DiagramWarn>✗ لا توصل البطارية قبل فحص Multimeter — حتى لو كنت متأكدًا</DiagramWarn>
    </DiagramFrame>
  );
};

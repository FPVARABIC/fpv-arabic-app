import React from 'react';
import { DiagramFrame, DiagramInfo, DiagramWarn, useReveal } from './_shared';
import { Eye, Plug, Ban, ShieldCheck, Gauge } from 'lucide-react';

/**
 * The five things that are checked BEFORE a battery is ever connected to a
 * finished build, in the order they are done. Each one is tappable and says
 * what it — and only it — catches, so Lesson 17 can require all five be read.
 *
 * Steps 3, 4 and 5 are deliberately the same three the learner already met in
 * Lesson 10; this diagram is where that protocol finally gets executed rather
 * than described, so it repeats them by design rather than by accident.
 */
const checks = [
  {
    id: 'visual', Icon: Eye, t: 'فحص بصري نهائي', d: 'قبل أن تلمس البطارية',
    detail: 'يكتشف: ما تراه العين وحدها. سلك مكشوف قرب سطح كربوني، بُرادة معدنية أو قصاصة سلك سقطت أثناء التركيب، نقطة لحام باردة أو بارزة، برغي لم يُشدّ. هذه كلها لا تظهر في أي فحص كهربائي لاحق لأنها لم تصبح عطلاً بعد — تصبح عطلاً في اللحظة التي يمرّ فيها التيار.',
  },
  {
    id: 'polarity', Icon: Plug, t: 'القطبية', d: 'الموجب في الموجب، السالب في السالب',
    detail: 'يكتشف: أخطر خطأ في هذه القائمة. عكس القطبية لا يعني «لن تعمل»، بل يعني غالباً تلفاً فورياً في القطع، وقد رأيتَ هذا في الدرس السادس. تحقّق من الطرفين معاً — عند البطارية وعند لوحة التوزيع — لا من طرف واحد.',
  },
  {
    id: 'no-props', Icon: Ban, t: 'بلا مراوح', d: 'منزوعة تمامًا، لا مرخيّة',
    detail: 'يكتشف: لا شيء — يمنع الأذى. أي خطأ فيما يأتي بعده قد يُدير محركاً فجأة؛ بلا مراوح يكون ذلك صوتاً، ومعها يكون جرحاً. والمراوح تبقى منزوعة حتى تنتهي كل اختبارات الطاولة، لا حتى نهاية هذا الدرس فقط.',
  },
  {
    id: 'smoke-stopper', Icon: ShieldCheck, t: 'Smoke Stopper', d: 'بين البطارية والدائرة',
    detail: 'يكتشف: القصر في لحظة التوصيل الفعلي. مقاومته تحدّ من التيار فلا يحترق شيء في الثانية الأولى، ولمبته تضيء بشدة لتقول «افصل». وهو لا يفصل بنفسه — أنت من يفصل، وهذا ما يجعل مراقبتك للّمبة جزءاً من الفحص لا تفصيلاً.',
  },
  {
    id: 'resistance', Icon: Gauge, t: 'قياس المقاومة', d: 'بين VBAT وGND',
    detail: 'يكتشف: القصر قبل أن يوجد تيار أصلاً. قراءة قريبة من الصفر تعني اتصالاً لا يجب أن يكون بين المسارين. هذا هو الفحص الوحيد في القائمة الذي يعمل والطائرة ميّتة تماماً — ولهذا يسبق التوصيل ولا يليه.',
  },
];

export interface PrePowerCheckProps {
  /** Fired each time a learner opens a check — lets Lesson 17 require all five. */
  onCheckExplore?: (checkId: string) => void;
}

export const PrePowerCheck: React.FC<PrePowerCheckProps> = ({ onCheckExplore }) => {
  const { sel, toggle } = useReveal<string>();
  const handle = (id: string) => {
    toggle(id);
    onCheckExplore?.(id);
  };
  const selected = checks.find(c => c.id === sel) ?? null;
  return (
    <DiagramFrame title="قبل أن تصل الكهرباء: خمسة فحوص بالترتيب" hint="اضغط كل فحص لتعرف ما يكتشفه هو وحده">
      <div className="space-y-2">
        {checks.map((c, i) => {
          const active = sel === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => handle(c.id)}
              aria-pressed={active}
              data-testid={`pre-power-check-${c.id}`}
              className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-all press ${active ? 'bg-cyan-400/10 border-cyan-400/50' : 'bg-white/4 border-cyan-400/15'}`}
            >
              <span className="w-6 h-6 rounded-full bg-cyan-400/15 text-cyan-400 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
              <c.Icon size={18} className="text-cyan-400 flex-shrink-0" />
              <div className="text-right flex-1">
                <p className="text-sm font-bold text-white leading-tight">{c.t}</p>
                <p className="text-[11px] text-slate-400">{c.d}</p>
              </div>
            </button>
          );
        })}
      </div>
      <DiagramInfo text={selected ? `${selected.t} — ${selected.detail}` : null} placeholder="اضغط أي فحص من الخمسة" />
      <DiagramWarn>✗ لا توصل البطارية قبل أن تمرّ الخمسة كلها — الترتيب هو الحماية</DiagramWarn>
    </DiagramFrame>
  );
};

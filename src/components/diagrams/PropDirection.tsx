import React from 'react';
import { DiagramFrame, DiagramInfo, DiagramWarn, useReveal } from './_shared';
import { QUAD_X_MOTORS, SPIN_BADGE, SPIN_LABEL_AR } from '../../data/lessons/motorLayout';

/**
 * Which propeller goes on which arm, read from `motorLayout.ts`.
 *
 * A propeller has to match the direction its motor actually turns, and that
 * direction was established — and proved, props off — in Lesson 18. So this
 * diagram deliberately renders the SAME shared table rather than restating it:
 * if the default rotation ever changes, the motor lesson and the propeller
 * lesson change together or not at all.
 */
/**
 * Front row first, right side first — so the 2×2 grid reads as the quad seen
 * from above in an RTL page, where a grid fills right to left. Ordering the
 * cards in the table's own M1…M4 sequence would put the REAR-right motor at
 * the top right, which reads as a map and contradicts one.
 */
const SPATIAL = [...QUAD_X_MOTORS].sort(
  (a, b) => Number(b.front) - Number(a.front) || Number(b.right) - Number(a.right),
);

export interface PropDirectionProps {
  /** Fired each time a learner opens an arm — lets Lesson 19 require all four. */
  onArmExplore?: (motorId: string) => void;
}

export const PropDirection: React.FC<PropDirectionProps> = ({ onArmExplore }) => {
  const { sel, toggle } = useReveal<string>();
  const handle = (id: string) => {
    toggle(id);
    onArmExplore?.(id);
  };
  const selected = QUAD_X_MOTORS.find(m => m.id === sel) ?? null;
  return (
    <DiagramFrame
      title="أي مروحة على أي ذراع"
      hint="اضغط كل ذراع لتعرف أي مروحة تناسبه ولماذا"
    >
      <div className="grid grid-cols-2 gap-2">
        {SPATIAL.map(motor => {
          const active = sel === motor.id;
          return (
            <button
              key={motor.id}
              type="button"
              onClick={() => handle(motor.id)}
              aria-pressed={active}
              aria-label={`ذراع المحرك M${motor.number} — ${motor.positionAr}`}
              data-testid={`prop-direction-${motor.id}`}
              className={`flex flex-col items-center gap-1 rounded-xl px-3 py-3 border transition-all press ${active ? 'bg-cyan-400/10 border-cyan-400/50' : 'bg-white/4 border-cyan-400/15'}`}
            >
              <span className="text-base font-black text-cyan-400">M{motor.number}</span>
              <span className="text-[11px] text-slate-300">{motor.positionAr}</span>
              <span className="text-[11px] font-bold text-slate-400">مروحة {SPIN_BADGE[motor.spin]}</span>
            </button>
          );
        })}
      </div>
      <DiagramInfo
        text={selected
          ? `الذراع ${selected.positionAr} (M${selected.number}) يحمل مروحة ${SPIN_LABEL_AR[selected.spin]} `
            + 'في الإعداد الافتراضي — أي مروحة تدفع الهواء لأسفل وهي تدور في هذا الاتجاه تحديداً. '
            + 'والمرجع ليس هذا المخطط بل الاتجاه الذي رأيتَه بعينك على طائرتك في الدرس الثامن عشر: '
            + 'إن كنتَ قد عكستَ الأربعة معاً، فاعكس المراوح الأربع معها.'
          : null}
        placeholder="اضغط أي ذراع من الأربعة"
      />
      <DiagramWarn>✗ مروحة على الذراع الخطأ تدفع الهواء لأعلى — الطائرة تنقلب لحظة رفع الخانق</DiagramWarn>
    </DiagramFrame>
  );
};

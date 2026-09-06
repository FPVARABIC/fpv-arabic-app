import React from 'react';
import { DiagramFrame, DiagramInfo, DiagramWarn, useReveal } from './_shared';
import { QUAD_X_MOTORS, SPIN_BADGE, SPIN_LABEL_AR } from '../../data/lessons/motorLayout';

/**
 * The props-off motor check, one motor at a time.
 *
 * NUMBERING AND ROTATION COME FROM `motorLayout.ts` AND NOWHERE ELSE.
 * That file exists because two places used to state this independently and
 * disagreed (see its header). Lesson 18 is the lesson where a learner first
 * spins a real motor, so it is the last place that should carry a second copy
 * of the table — this component renders the shared one.
 *
 * Each motor is tappable and reports its id through `onMotorCheck`, so the
 * lesson can require that all four were walked before it can be completed.
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

export interface MotorTestCheckProps {
  /** Fired each time a learner opens a motor — lets Lesson 18 require all four. */
  onMotorCheck?: (motorId: string) => void;
}

export const MotorTestCheck: React.FC<MotorTestCheckProps> = ({ onMotorCheck }) => {
  const { sel, toggle } = useReveal<string>();
  const handle = (id: string) => {
    toggle(id);
    onMotorCheck?.(id);
  };
  const selected = QUAD_X_MOTORS.find(m => m.id === sel) ?? null;
  return (
    <DiagramFrame
      title="اختبار المحركات والمراوح منزوعة: محرك واحد في كل مرة"
      hint="اضغط كل محرك لتعرف أين يجب أن يدور وبأي اتجاه"
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
              aria-label={`المحرك M${motor.number} — ${motor.positionAr}`}
              data-testid={`motor-test-${motor.id}`}
              className={`flex flex-col items-center gap-1 rounded-xl px-3 py-3 border transition-all press ${active ? 'bg-cyan-400/10 border-cyan-400/50' : 'bg-white/4 border-cyan-400/15'}`}
            >
              <span className="text-base font-black text-cyan-400">M{motor.number}</span>
              <span className="text-[11px] text-slate-300">{motor.positionAr}</span>
              <span className="text-[11px] font-bold text-slate-400">{SPIN_BADGE[motor.spin]}</span>
            </button>
          );
        })}
      </div>
      <DiagramInfo
        text={selected
          ? `M${selected.number} هو المحرك ${selected.positionAr}. حرّك شريط M${selected.number} وحده: `
            + `يجب أن يدور هذا المحرك بالذات — فإن دار غيره فالترتيب هو المشكلة لا الاتجاه. `
            + `واتجاهه الافتراضي ${SPIN_LABEL_AR[selected.spin]} منظوراً إليه من أعلى.`
          : null}
        placeholder="اضغط أي محرك من الأربعة"
      />
      <DiagramWarn>✗ لا تفتح هذا التبويب ومروحة واحدة مركّبة — ولو للحظة</DiagramWarn>
    </DiagramFrame>
  );
};

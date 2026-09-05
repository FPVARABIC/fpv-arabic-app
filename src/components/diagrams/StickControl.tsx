import React from 'react';
import { DiagramFrame, DiagramInfo, DiagramWarn, C, useReveal } from './_shared';

/**
 * The transmitter's two sticks, Mode 2, and what each direction does to the
 * quad — the diagram Lesson 17 is built around.
 *
 * Mode 2 is the near-universal FPV default: left stick = throttle (up/down)
 * and yaw (left/right); right stick = pitch (up/down) and roll (left/right).
 * The pad row is forced LTR because a stick is a physical position, not a
 * reading direction — the left stick must stay on the left in an RTL page.
 *
 * Tapping a direction reveals the motor-level cause and the visible effect,
 * and animates a small top-down quad accordingly. `onAxisExplore` fires with
 * the axis every tap, so a consuming lesson can require all four be explored
 * without duplicating this diagram's own selection state.
 */

export type StickAxis = 'throttle' | 'yaw' | 'pitch' | 'roll';
type Dir = 'up' | 'down' | 'left' | 'right';

interface Move {
  axis: StickAxis;
  dir: Dir;
  label: string;
  effect: string;
  cause: string;
}

const LEFT_STICK: Move[] = [
  { axis: 'throttle', dir: 'up', label: 'الخانق ↑', effect: 'الطائرة ترتفع عمودياً.', cause: 'المحركات الأربعة تزيد سرعتها معاً بالمقدار نفسه، فيزيد الدفع الكلي على الوزن.' },
  { axis: 'throttle', dir: 'down', label: 'الخانق ↓', effect: 'الطائرة تنخفض.', cause: 'المحركات الأربعة تُبطئ معاً. في أغلب أجهزة FPV عصا الخانق لا تعود إلى المنتصف بنفسها — أنت من يحدّد موضعها.' },
  { axis: 'yaw', dir: 'left', label: 'الانحراف ◀', effect: 'تدور حول محورها وتوجّه أنفها يساراً، دون أن تتحرّك من مكانها.', cause: 'محرّكا قطر واحد يزيدان ومحرّكا القطر الآخر ينقصان؛ عزم الدوران غير المتوازن يلفّ الهيكل.' },
  { axis: 'yaw', dir: 'right', label: 'الانحراف ▶', effect: 'تدور وتوجّه أنفها يميناً.', cause: 'العكس: القطر الآخر يزيد. اتجاه دوران كل محرك (CW/CCW من الدرس الأول) هو ما يجعل هذا ممكناً.' },
];

const RIGHT_STICK: Move[] = [
  { axis: 'pitch', dir: 'up', label: 'الميل الطولي ▲', effect: 'ينخفض الأنف وتتقدّم الطائرة إلى الأمام.', cause: 'المحرّكان الخلفيان يزيدان عن الأماميين، فيرتفع الخلف نسبياً وتنحني الطائرة للأمام.' },
  { axis: 'pitch', dir: 'down', label: 'الميل الطولي ▼', effect: 'يرتفع الأنف وتتراجع الطائرة إلى الخلف.', cause: 'الأماميان يزيدان عن الخلفيين.' },
  { axis: 'roll', dir: 'left', label: 'الميل الجانبي ◀', effect: 'تميل وتنزلق إلى اليسار.', cause: 'محرّكا الجانب الأيمن يزيدان عن الأيسر، فترتفع الجهة اليمنى.' },
  { axis: 'roll', dir: 'right', label: 'الميل الجانبي ▶', effect: 'تميل وتنزلق إلى اليمين.', cause: 'محرّكا الجانب الأيسر يزيدان عن الأيمن.' },
];

const AXIS_NAME_EN: Record<StickAxis, string> = {
  throttle: 'Throttle', yaw: 'Yaw', pitch: 'Pitch', roll: 'Roll',
};

export interface StickControlProps {
  onAxisExplore?: (axis: StickAxis) => void;
}

const ARROW: Record<Dir, string> = { up: '▲', down: '▼', left: '◀', right: '▶' };

/** One direction button. Module-level, so React keeps it mounted across renders. */
const DirButton: React.FC<{
  move: Move;
  active: boolean;
  onPick: (m: Move) => void;
  testId: string;
  className?: string;
}> = ({ move, active, onPick, testId, className = '' }) => (
  <button
    type="button"
    onClick={() => onPick(move)}
    aria-label={move.label}
    aria-pressed={active}
    data-testid={`${testId}-${move.axis}-${move.dir}`}
    className={`w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center press transition-all border ${className} ${active ? 'bg-cyan-400/15 border-cyan-400/50 text-cyan-300' : 'bg-white/4 border-white/8 text-slate-300'}`}
  >
    {ARROW[move.dir]}
  </button>
);

const StickPad: React.FC<{
  title: string;
  moves: Move[];
  selected: Move | null;
  onPick: (m: Move) => void;
  testId: string;
}> = ({ title, moves, selected, onPick, testId }) => {
  const at = (dir: Dir) => moves.find(m => m.dir === dir)!;
  const isActive = (m: Move) => selected?.axis === m.axis && selected?.dir === m.dir;
  const btn = (dir: Dir, className = '') => {
    const m = at(dir);
    return <DirButton move={m} active={isActive(m)} onPick={onPick} testId={testId} className={className} />;
  };
  return (
    <div className="flex-1 flex flex-col items-center gap-1.5">
      <p className="text-[11px] font-bold text-cyan-300">{title}</p>
      <div className="relative w-28 h-28 rounded-2xl border border-cyan-400/15 bg-white/3 flex items-center justify-center">
        <div className="absolute top-1.5">{btn('up')}</div>
        <div className="absolute inset-0 flex items-center justify-between px-1.5 pointer-events-none">
          <span className="pointer-events-auto">{btn('left')}</span>
          <span className="pointer-events-auto">{btn('right')}</span>
        </div>
        <span className="w-7 h-7 rounded-full" style={{ background: 'radial-gradient(circle at 35% 35%, #7fe9e9, #0e7c86)', boxShadow: '0 2px 8px rgba(0,0,0,0.5)' }} aria-hidden />
        <div className="absolute bottom-1.5">{btn('down')}</div>
      </div>
    </div>
  );
};

/** A tiny top-down quad that leans, lifts or turns to match the selected move. */
const QuadResponse: React.FC<{ move: Move | null }> = ({ move }) => {
  let transform = 'none';
  if (move) {
    if (move.axis === 'throttle') transform = move.dir === 'up' ? 'scale(1.12)' : 'scale(0.9)';
    if (move.axis === 'yaw') transform = `rotate(${move.dir === 'left' ? -25 : 25}deg)`;
    if (move.axis === 'pitch') transform = `perspective(180px) rotateX(${move.dir === 'up' ? 28 : -28}deg)`;
    if (move.axis === 'roll') transform = `perspective(180px) rotateY(${move.dir === 'left' ? -28 : 28}deg)`;
  }
  return (
    <svg viewBox="0 0 120 120" className="w-20 h-20 mx-auto" style={{ transform, transition: 'transform 0.25s ease' }} aria-hidden>
      <line x1="25" y1="25" x2="95" y2="95" stroke={C.stroke} strokeWidth="6" strokeLinecap="round" />
      <line x1="95" y1="25" x2="25" y2="95" stroke={C.stroke} strokeWidth="6" strokeLinecap="round" />
      {[[25, 25], [95, 25], [25, 95], [95, 95]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="11" fill="rgba(24,230,230,0.12)" stroke={C.cyan} strokeWidth="1.5" />
      ))}
      <rect x="46" y="46" width="28" height="28" rx="6" fill={C.frame} stroke={C.cyan} strokeWidth="1.5" />
      <polygon points="60,32 54,44 66,44" fill={C.green} />
    </svg>
  );
};

export const StickControl: React.FC<StickControlProps> = ({ onAxisExplore }) => {
  const { sel, toggle } = useReveal<string>();
  const all = [...LEFT_STICK, ...RIGHT_STICK];
  const selected = sel ? all.find(m => `${m.axis}-${m.dir}` === sel) ?? null : null;
  const pick = (m: Move) => {
    toggle(`${m.axis}-${m.dir}`);
    onAxisExplore?.(m.axis);
  };

  return (
    <DiagramFrame title="عصا التحكم — الوضع 2 (Mode 2)" hint="اضغط اتجاهاً على أي عصا لترى ما تفعله الطائرة ولماذا">
      <div className="flex items-start gap-3" dir="ltr">
        <StickPad title="اليسرى: خانق + انحراف" moves={LEFT_STICK} selected={selected} onPick={pick} testId="stick-left" />
        <div className="flex-shrink-0 flex flex-col items-center justify-center pt-4">
          <QuadResponse move={selected} />
          <span className="text-[9px] text-slate-500">الأنف ▲</span>
        </div>
        <StickPad title="اليمنى: ميل طولي + جانبي" moves={RIGHT_STICK} selected={selected} onPick={pick} testId="stick-right" />
      </div>
      <DiagramInfo
        text={selected ? `${selected.label} (${AXIS_NAME_EN[selected.axis]}): ${selected.effect} ${selected.cause}` : null}
        placeholder="اضغط أحد الأسهم الثمانية — كل محور من الأربعة له سببه في المحركات."
      />
      <DiagramWarn tone="warning">التسليح لا يكون بالعصا وحدها في Betaflight — بمفتاح مخصّص على الجهاز. تفصيله في المرحلة التالية.</DiagramWarn>
    </DiagramFrame>
  );
};

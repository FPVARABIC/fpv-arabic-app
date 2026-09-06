import React from 'react';
import { DiagramFrame, DiagramInfo, HotSpot, useReveal, C } from './_shared';
import {
  QUAD_X_MOTORS, SPIN_BADGE, SPIN_LABEL_AR, motorById,
  type MotorPosition, type QuadMotor,
} from '../../data/lessons/motorLayout';

/**
 * The X layout: which motor is which number, and which way each one turns.
 *
 * Numbers and directions are NOT written here — they come from
 * `src/data/lessons/motorLayout.ts`, the one table Lesson 12's text also
 * reads. This diagram used to number the front-right motor M1; Betaflight
 * numbers the rear-right one M1, and the learner meets Betaflight's numbers
 * the first time they open the Motors tab.
 */

/** Where each corner sits in the 280×220 viewBox. */
const XY: Record<MotorPosition, readonly [number, number]> = {
  'front-left': [60, 50],
  'front-right': [220, 50],
  'rear-left': [60, 170],
  'rear-right': [220, 170],
};

const BODY_INFO = 'جسم الفريم — يحمل FC و ESC والبطارية في المنتصف.';

function motorInfo(motor: QuadMotor): string {
  return `المحرك ${motor.positionAr} — رقمه M${motor.number} في الترقيم القياسي، ويدور ${SPIN_LABEL_AR[motor.spin]}.`;
}

const Motor: React.FC<{ motor: QuadMotor; sel: string | null; on: (v: string) => void }> = ({ motor, sel, on }) => {
  const [x, y] = XY[motor.position];
  const cw = motor.spin === 'cw';
  const active = sel === motor.id;
  return (
    <HotSpot
      onActivate={() => on(motor.id)}
      active={active}
      testId={`quad-x-motor-${motor.id}`}
      label={`المحرك ${motor.positionAr} — M${motor.number}، ${SPIN_LABEL_AR[motor.spin]}`}
    >
      <circle cx={x} cy={y} r="26" fill="none" stroke={active ? C.cyan : 'rgba(34,211,238,0.35)'} strokeWidth={active ? 3 : 1.6} strokeDasharray="4 2" className={`quad-x-ring ${cw ? 'spin-slow' : 'spin-rev'}`} />
      <circle cx={x} cy={y} r="9" fill={active ? C.cyan : 'rgba(24,230,230,0.5)'} />
      <path d={`M ${x} ${y} m -4 -1 a 4 4 0 0 ${cw ? 1 : 0} 8 0`} fill="none" stroke="#04101c" strokeWidth="1.5" />
      <text x={x} y={y - 36} textAnchor="middle" fill={active ? C.cyan : '#94a3b8'} fontSize="11" fontWeight="bold">{`M${motor.number}`}</text>
      <text x={x} y={y + 44} textAnchor="middle" fill="#64748b" fontSize="9">{SPIN_BADGE[motor.spin]}</text>
    </HotSpot>
  );
};

export interface QuadXLayoutProps {
  /** Fired the first time a learner opens a motor of a given rotation
   *  direction — lets a consuming lesson track "explored CW and CCW"
   *  without duplicating this diagram's own selection state. */
  onMotorExplore?: (motorId: string, cw: boolean) => void;
}

export const QuadXLayout: React.FC<QuadXLayoutProps> = ({ onMotorExplore }) => {
  const { sel, toggle } = useReveal<string>();
  const handleToggle = (id: string) => {
    toggle(id);
    if (id !== 'body') onMotorExplore?.(id, motorById(id as QuadMotor['id']).spin === 'cw');
  };
  const selectedMotor = sel && sel !== 'body' ? motorById(sel as QuadMotor['id']) : null;
  return (
    <>
      {/* Component-scoped only (does not touch index.css's global .spin-slow/
          .spin-rev, which BottomNavigation.tsx also relies on) — stops the
          continuous ring-spin animation for users who requested reduced
          motion, while every static cue (CW/CCW text, direction arc, click
          handling) is untouched and still fully available. */}
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .quad-x-ring { animation: none !important; }
        }
      `}</style>
      <DiagramFrame title="تخطيط الكوادكابتر X" hint="الترقيم واتجاه الدوران الافتراضيان — كل محرك يدور عكس جاره">
        <svg viewBox="0 0 280 220" className="w-full">
          <line x1="140" y1="110" x2="60" y2="50" stroke={C.cyan} strokeWidth="6" strokeLinecap="round" opacity="0.5" />
          <line x1="140" y1="110" x2="220" y2="50" stroke={C.cyan} strokeWidth="6" strokeLinecap="round" opacity="0.5" />
          <line x1="140" y1="110" x2="60" y2="170" stroke={C.cyan} strokeWidth="6" strokeLinecap="round" opacity="0.5" />
          <line x1="140" y1="110" x2="220" y2="170" stroke={C.cyan} strokeWidth="6" strokeLinecap="round" opacity="0.5" />
          <HotSpot onActivate={() => handleToggle('body')} active={sel === 'body'} label="جسم الفريم — وعلامة الأمام">
            <rect x="118" y="88" width="44" height="44" rx="8" fill={C.frame} stroke={sel === 'body' ? C.cyan : 'rgba(34,211,238,0.5)'} strokeWidth={sel === 'body' ? 3 : 1.8} />
            <path d="M140 92 l6 8 h-12 z" fill={C.cyan} />
            <text x="140" y="118" textAnchor="middle" fill="#7fe9e9" fontSize="9">أمام</text>
          </HotSpot>
          {QUAD_X_MOTORS.map(motor => (
            <Motor key={motor.id} motor={motor} sel={sel} on={handleToggle} />
          ))}
        </svg>
        <DiagramInfo text={selectedMotor ? motorInfo(selectedMotor) : (sel === 'body' ? BODY_INFO : null)} />
      </DiagramFrame>
    </>
  );
};

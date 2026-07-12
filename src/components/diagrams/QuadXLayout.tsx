import React from 'react';
import { DiagramFrame, DiagramInfo, useReveal, C } from './_shared';

const info: Record<string, string> = {
  m1: 'المحرك الأمامي الأيمن — يدور عكس عقارب الساعة (CCW).',
  m2: 'المحرك الخلفي الأيسر — يدور عكس عقارب الساعة (CCW).',
  m3: 'المحرك الأمامي الأيسر — يدور مع عقارب الساعة (CW).',
  m4: 'المحرك الخلفي الأيمن — يدور مع عقارب الساعة (CW).',
  body: 'جسم الفريم — يحمل FC و ESC والبطارية في المنتصف.',
};

const Motor: React.FC<{ x: number; y: number; cw?: boolean; id: string; sel: string | null; on: (v: string) => void; label: string }> =
({ x, y, cw, id, sel, on, label }) => {
  const active = sel === id;
  return (
    <g onClick={() => on(id)} style={{ cursor: 'pointer' }} data-testid={`quad-x-motor-${id}`}>
      <circle cx={x} cy={y} r="26" fill="none" stroke={active ? C.cyan : 'rgba(34,211,238,0.35)'} strokeWidth={active ? 3 : 1.6} strokeDasharray="4 2" className={`quad-x-ring ${cw ? 'spin-slow' : 'spin-rev'}`} />
      <circle cx={x} cy={y} r="9" fill={active ? C.cyan : 'rgba(24,230,230,0.5)'} />
      <path d={`M ${x} ${y} m -4 -1 a 4 4 0 0 ${cw ? 1 : 0} 8 0`} fill="none" stroke="#04101c" strokeWidth="1.5" />
      <text x={x} y={y - 36} textAnchor="middle" fill={active ? C.cyan : '#94a3b8'} fontSize="11" fontWeight="bold">{label}</text>
      <text x={x} y={y + 44} textAnchor="middle" fill="#64748b" fontSize="9">{cw ? 'CW ↻' : 'CCW ↺'}</text>
    </g>
  );
};

const MOTOR_CW: Record<string, boolean> = { m1: false, m2: false, m3: true, m4: true };

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
    if (id in MOTOR_CW) onMotorExplore?.(id, MOTOR_CW[id]);
  };
  return (
    <>
      {/* Component-scoped only (does not touch index.css's global .spin-slow/
          .spin-rev, which MotorTest.tsx also relies on) — stops the
          continuous ring-spin animation for users who requested reduced
          motion, while every static cue (CW/CCW text, direction arc, click
          handling) is untouched and still fully available. */}
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .quad-x-ring { animation: none !important; }
        }
      `}</style>
      <DiagramFrame title="تخطيط الكوادكابتر X" hint="أربعة محركات في شكل X — كل محرك يدور عكس جاره">
        <svg viewBox="0 0 280 220" className="w-full">
          <line x1="140" y1="110" x2="60" y2="50" stroke={C.cyan} strokeWidth="6" strokeLinecap="round" opacity="0.5" />
          <line x1="140" y1="110" x2="220" y2="50" stroke={C.cyan} strokeWidth="6" strokeLinecap="round" opacity="0.5" />
          <line x1="140" y1="110" x2="60" y2="170" stroke={C.cyan} strokeWidth="6" strokeLinecap="round" opacity="0.5" />
          <line x1="140" y1="110" x2="220" y2="170" stroke={C.cyan} strokeWidth="6" strokeLinecap="round" opacity="0.5" />
          <g onClick={() => handleToggle('body')} style={{ cursor: 'pointer' }}>
            <rect x="118" y="88" width="44" height="44" rx="8" fill={C.frame} stroke={sel === 'body' ? C.cyan : 'rgba(34,211,238,0.5)'} strokeWidth={sel === 'body' ? 3 : 1.8} />
            <path d="M140 92 l6 8 h-12 z" fill={C.cyan} />
            <text x="140" y="118" textAnchor="middle" fill="#7fe9e9" fontSize="9">أمام</text>
          </g>
          <Motor x={220} y={50} cw={false} id="m1" label="M1" sel={sel} on={handleToggle} />
          <Motor x={60} y={170} cw={false} id="m2" label="M2" sel={sel} on={handleToggle} />
          <Motor x={60} y={50} cw id="m3" label="M3" sel={sel} on={handleToggle} />
          <Motor x={220} y={170} cw id="m4" label="M4" sel={sel} on={handleToggle} />
        </svg>
        <DiagramInfo text={sel ? info[sel] : null} />
      </DiagramFrame>
    </>
  );
};

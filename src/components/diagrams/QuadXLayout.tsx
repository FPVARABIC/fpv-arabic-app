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
    <g onClick={() => on(id)} style={{ cursor: 'pointer' }}>
      <circle cx={x} cy={y} r="26" fill="none" stroke={active ? C.cyan : 'rgba(34,211,238,0.35)'} strokeWidth={active ? 3 : 1.6} strokeDasharray="4 2" className={cw ? 'spin-slow' : 'spin-rev'} />
      <circle cx={x} cy={y} r="9" fill={active ? C.cyan : 'rgba(24,230,230,0.5)'} />
      <path d={`M ${x} ${y} m -4 -1 a 4 4 0 0 ${cw ? 1 : 0} 8 0`} fill="none" stroke="#04101c" strokeWidth="1.5" />
      <text x={x} y={y - 36} textAnchor="middle" fill={active ? C.cyan : '#94a3b8'} fontSize="11" fontWeight="bold">{label}</text>
      <text x={x} y={y + 44} textAnchor="middle" fill="#64748b" fontSize="9">{cw ? 'CW ↻' : 'CCW ↺'}</text>
    </g>
  );
};

export const QuadXLayout: React.FC = () => {
  const { sel, toggle } = useReveal<string>();
  return (
    <DiagramFrame title="تخطيط الكوادكابتر X" hint="أربعة محركات في شكل X — كل محرك يدور عكس جاره">
      <svg viewBox="0 0 280 220" className="w-full">
        <line x1="140" y1="110" x2="60" y2="50" stroke={C.cyan} strokeWidth="6" strokeLinecap="round" opacity="0.5" />
        <line x1="140" y1="110" x2="220" y2="50" stroke={C.cyan} strokeWidth="6" strokeLinecap="round" opacity="0.5" />
        <line x1="140" y1="110" x2="60" y2="170" stroke={C.cyan} strokeWidth="6" strokeLinecap="round" opacity="0.5" />
        <line x1="140" y1="110" x2="220" y2="170" stroke={C.cyan} strokeWidth="6" strokeLinecap="round" opacity="0.5" />
        <g onClick={() => toggle('body')} style={{ cursor: 'pointer' }}>
          <rect x="118" y="88" width="44" height="44" rx="8" fill={C.frame} stroke={sel === 'body' ? C.cyan : 'rgba(34,211,238,0.5)'} strokeWidth={sel === 'body' ? 3 : 1.8} />
          <path d="M140 92 l6 8 h-12 z" fill={C.cyan} />
          <text x="140" y="118" textAnchor="middle" fill="#7fe9e9" fontSize="9">أمام</text>
        </g>
        <Motor x={220} y={50} cw={false} id="m1" label="M1" sel={sel} on={toggle} />
        <Motor x={60} y={170} cw={false} id="m2" label="M2" sel={sel} on={toggle} />
        <Motor x={60} y={50} cw id="m3" label="M3" sel={sel} on={toggle} />
        <Motor x={220} y={170} cw id="m4" label="M4" sel={sel} on={toggle} />
      </svg>
      <DiagramInfo text={sel ? info[sel] : null} />
    </DiagramFrame>
  );
};

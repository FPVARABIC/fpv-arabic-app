import React from 'react';
import { DiagramFrame, DiagramWarn, C } from './_shared';
import { Ban } from 'lucide-react';

const motors = [
  { x: 210, y: 55, n: 'Motor 1', d: 'أمام يمين', cw: false },
  { x: 70, y: 145, n: 'Motor 2', d: 'خلف يسار', cw: false },
  { x: 70, y: 55, n: 'Motor 3', d: 'أمام يسار', cw: true },
  { x: 210, y: 145, n: 'Motor 4', d: 'خلف يمين', cw: true },
];

export const MotorTest: React.FC = () => (
  <DiagramFrame title="اختبار المحركات" hint="ترتيب المحركات 1–4 واتجاه دوران كل محرك">
    <svg viewBox="0 0 280 200" className="w-full">
      <line x1="140" y1="100" x2="70" y2="55" stroke={C.cyan} strokeWidth="5" opacity="0.4" strokeLinecap="round" />
      <line x1="140" y1="100" x2="210" y2="55" stroke={C.cyan} strokeWidth="5" opacity="0.4" strokeLinecap="round" />
      <line x1="140" y1="100" x2="70" y2="145" stroke={C.cyan} strokeWidth="5" opacity="0.4" strokeLinecap="round" />
      <line x1="140" y1="100" x2="210" y2="145" stroke={C.cyan} strokeWidth="5" opacity="0.4" strokeLinecap="round" />
      <rect x="120" y="80" width="40" height="40" rx="7" fill={C.frame} stroke={C.stroke} strokeWidth="1.6" />
      <path d="M140 84 l5 7 h-10 z" fill={C.cyan} />
      {motors.map(m => (
        <g key={m.n}>
          <circle cx={m.x} cy={m.y} r="22" fill="none" stroke="rgba(34,211,238,0.4)" strokeWidth="1.6" strokeDasharray="4 2" className={m.cw ? 'spin-slow' : 'spin-rev'} />
          <circle cx={m.x} cy={m.y} r="14" fill="rgba(24,230,230,0.12)" stroke={C.cyan} strokeWidth="1.2" />
          <text x={m.x} y={m.y + 4} textAnchor="middle" fill={C.cyan} fontSize="13" fontWeight="bold">{m.n.split(' ')[1]}</text>
          <text x={m.x} y={m.y - 28} textAnchor="middle" fill="#94a3b8" fontSize="9">{m.n}</text>
          <text x={m.x} y={m.y + 36} textAnchor="middle" fill="#64748b" fontSize="8">{m.d} • {m.cw ? 'CW' : 'CCW'}</text>
        </g>
      ))}
    </svg>
    <DiagramWarn><Ban size={14} /> لا مراوح أثناء الاختبار — خطر جسدي حقيقي</DiagramWarn>
  </DiagramFrame>
);

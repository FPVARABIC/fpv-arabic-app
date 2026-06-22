import React from 'react';
import { DiagramFrame, DiagramWarn, useReveal, C } from './_shared';

const motors = [
  { id: 'M1', cx: 70, cy: 70, dir: 'CW', color: '#f97316' },
  { id: 'M2', cx: 230, cy: 70, dir: 'CCW', color: '#a78bfa' },
  { id: 'M3', cx: 230, cy: 180, dir: 'CW', color: '#f97316' },
  { id: 'M4', cx: 70, cy: 180, dir: 'CCW', color: '#a78bfa' },
];

const info: Record<string, string> = {
  M1: 'M1 — أمام اليسار. يدور CW (عقارب الساعة). تحقق الدوران في Betaflight Motors.',
  M2: 'M2 — أمام اليمين. يدور CCW (عكس عقارب الساعة).',
  M3: 'M3 — خلف اليمين. يدور CW (عقارب الساعة).',
  M4: 'M4 — خلف اليسار. يدور CCW (عكس عقارب الساعة).',
};

export const MotorTest: React.FC = () => {
  const { sel, toggle } = useReveal<string>();
  return (
    <DiagramFrame title="اختبار المحركات — Motor Test" hint="اضغط على أي محرك لمعرفة تفاصيله">
      <div className="mb-3 rounded-2xl p-3 flex items-center gap-3" style={{background:'rgba(248,113,113,0.12)', border:'2px solid rgba(248,113,113,0.5)'}}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:'rgba(248,113,113,0.2)'}}>
          <span className="text-2xl">🛑</span>
        </div>
        <div>
          <p className="text-sm font-bold text-red-400">أزل جميع المراوح أولًا</p>
          <p className="text-xs text-red-300">قبل أي اختبار للمحركات — خطر إصابة خطير</p>
        </div>
      </div>

      <svg viewBox="0 0 300 250" className="w-full">
        <line x1="150" y1="125" x2="70" y2="70" stroke={`${C.stroke}`} strokeWidth="6" strokeLinecap="round"/>
        <line x1="150" y1="125" x2="230" y2="70" stroke={`${C.stroke}`} strokeWidth="6" strokeLinecap="round"/>
        <line x1="150" y1="125" x2="230" y2="180" stroke={`${C.stroke}`} strokeWidth="6" strokeLinecap="round"/>
        <line x1="150" y1="125" x2="70" y2="180" stroke={`${C.stroke}`} strokeWidth="6" strokeLinecap="round"/>

        <rect x="125" y="100" width="50" height="50" rx="8" fill={C.frame} stroke={C.cyan} strokeWidth="2"/>
        <text x="150" y="122" textAnchor="middle" fill="#7fe9e9" fontSize="10" fontWeight="bold">FC</text>
        <text x="150" y="138" textAnchor="middle" fill="#475569" fontSize="8">↑ Front</text>

        <polygon points="150,88 144,100 156,100" fill={C.cyan} opacity="0.8"/>

        {motors.map(m => {
          const active = sel === m.id;
          return (
            <g key={m.id} onClick={() => toggle(m.id)} style={{cursor:'pointer'}}>
              {active && <circle cx={m.cx} cy={m.cy} r="34" fill={`${m.color}10`} stroke={`${m.color}60`} strokeWidth="1"/>}
              <ellipse cx={m.cx} cy={m.cy} rx="26" ry="7" fill="none" stroke={`${m.color}50`} strokeWidth="2"
                transform={`rotate(45,${m.cx},${m.cy})`} className={active ? 'spin-slow' : ''}/>
              <ellipse cx={m.cx} cy={m.cy} rx="26" ry="7" fill="none" stroke={`${m.color}50`} strokeWidth="2"
                transform={`rotate(-45,${m.cx},${m.cy})`} className={active ? (m.dir==='CW' ? 'spin-slow' : 'spin-rev') : ''}/>
              <circle cx={m.cx} cy={m.cy} r="20" fill={C.frame} stroke={active ? m.color : `${m.color}60`} strokeWidth={active ? 2.5 : 1.5}/>
              <text x={m.cx} y={m.cy - 4} textAnchor="middle" fill={active ? '#fff' : '#e2e8f0'} fontSize="11" fontWeight="bold">{m.id}</text>
              <text x={m.cx} y={m.cy + 8} textAnchor="middle" fill={m.color} fontSize="8">{m.dir}</text>
            </g>
          );
        })}
        <text x="10" y="240" fill="#f97316" fontSize="8">■ CW (عقارب)</text>
        <text x="120" y="240" fill="#a78bfa" fontSize="8">■ CCW (عكس عقارب)</text>
      </svg>

      {sel && (
        <div className="mt-2 p-3 rounded-xl text-xs" style={{background:'rgba(34,211,238,0.08)', border:'1px solid rgba(34,211,238,0.2)', color:'#7fe9e9'}}>
          {info[sel]}
        </div>
      )}

      <DiagramWarn>في Betaflight: Motors → افق على التحذير → اسحب الـ Slider ببطء</DiagramWarn>
    </DiagramFrame>
  );
};

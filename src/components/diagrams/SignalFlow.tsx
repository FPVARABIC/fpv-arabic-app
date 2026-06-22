import React from 'react';
import { DiagramFrame, DiagramInfo, useReveal, C } from './_shared';

const nodes = [
  {
    id: 'radio', label: 'Radio / TX', sub: 'جهاز التحكم', color: C.purple,
    signal: 'RF 2.4GHz',
    info: 'جهاز التحكم: تحرّك العصا فيُرسل إشارة لاسلكية (RF) إلى الطائرة بتردد 2.4 GHz أو 900 MHz.',
  },
  {
    id: 'rx', label: 'Receiver', sub: 'المستقبل', color: C.cyan,
    signal: 'CRSF/SBUS',
    info: 'Receiver: يستقبل الإشارة اللاسلكية ويحوّلها لبيانات رقمية (CRSF أو SBUS) يُرسلها للـ FC عبر UART.',
  },
  {
    id: 'fc', label: 'FC', sub: 'Flight Controller', color: C.blue,
    signal: 'DSHOT',
    info: 'Flight Controller: الدماغ — يحلّل بيانات الجيروسكوب والتحكم ويحسب سرعة كل محرك ويُرسلها لـ ESC.',
  },
  {
    id: 'esc', label: 'ESC', sub: 'المنظّم', color: C.amber,
    signal: '3-phase PWM',
    info: 'ESC (Electronic Speed Controller): ينفّذ أوامر FC ويتحكم في سرعة كل محرك بدقة عالية.',
  },
  {
    id: 'motors', label: 'Motors', sub: 'المحركات', color: C.green,
    signal: '→ رفع',
    info: 'Motors: تدير المراوح Propellers وتولّد قوة الرفع Thrust والحركة في الاتجاهات المطلوبة.',
  },
];

export const SignalFlow: React.FC = () => {
  const { sel, toggle } = useReveal<string>();
  return (
    <DiagramFrame title="مسار الإشارة" hint="اضغط أي مرحلة لمعرفة دورها">
      {/* SVG flow diagram */}
      <svg viewBox="0 0 300 340" className="w-full">
        {nodes.map((n, i) => {
          const y = 20 + i * 64;
          const active = sel === n.id;
          const nextN = nodes[i + 1];
          return (
            <g key={n.id}>
              {/* Node box */}
              <g onClick={() => toggle(n.id)} style={{ cursor: 'pointer' }}>
                <rect
                  x="40" y={y} width="220" height="46" rx="10"
                  fill={active ? `${n.color}18` : 'rgba(15,23,42,0.7)'}
                  stroke={active ? n.color : `${n.color}50`}
                  strokeWidth={active ? 2 : 1.5}
                />
                {/* Icon circle */}
                <circle cx="65" cy={y + 23} r="15" fill={`${n.color}20`} stroke={`${n.color}50`} strokeWidth="1"/>
                <text x="65" y={y + 27} textAnchor="middle" fill={n.color} fontSize="10" fontWeight="bold">{i + 1}</text>
                {/* Labels */}
                <text x="88" y={y + 18} fill={active ? '#fff' : '#e2e8f0'} fontSize="12" fontWeight="bold">{n.label}</text>
                <text x="88" y={y + 32} fill="#64748b" fontSize="9">{n.sub}</text>
                {/* Active glow dot */}
                {active && <circle cx="248" cy={y + 23} r="4" fill={n.color} className="glow-node"/>}
              </g>

              {/* Arrow to next node */}
              {nextN && (
                <g>
                  {/* Arrow line */}
                  <line
                    x1="150" y1={y + 46} x2="150" y2={y + 58}
                    stroke={n.color} strokeWidth="2" className="flow-dash"
                  />
                  {/* Signal label badge */}
                  <rect x="112" y={y + 47} width="76" height="14" rx="7"
                    fill={`${n.color}15`} stroke={`${n.color}40`} strokeWidth="1"/>
                  <text x="150" y={y + 57} textAnchor="middle" fill={n.color} fontSize="8" fontWeight="bold">
                    {n.signal}
                  </text>
                  {/* Arrow head */}
                  <polygon points={`150,${y + 62} 145,${y + 55} 155,${y + 55}`} fill={nextN.color} opacity="0.8"/>
                </g>
              )}
            </g>
          );
        })}

        {/* Final arrow to lift */}
        <g>
          <line x1="150" y1="300" x2="150" y2="320" stroke={C.green} strokeWidth="2" className="flow-dash"/>
          <polygon points="150,326 145,318 155,318" fill={C.green} opacity="0.8"/>
          <text x="150" y="338" textAnchor="middle" fill={C.green} fontSize="9">🚁 رفع وحركة</text>
        </g>
      </svg>

      <DiagramInfo text={sel ? nodes.find(n => n.id === sel)!.info : null} />
    </DiagramFrame>
  );
};

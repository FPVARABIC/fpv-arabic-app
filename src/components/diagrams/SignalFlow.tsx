import React from 'react';
import { DiagramFrame, DiagramInfo, HotSpot, useReveal, C } from './_shared';

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
    signal: 'دفع ورفع',
    info: 'Motors: تدير المراوح Propellers وتولّد قوة الرفع Thrust والحركة في الاتجاهات المطلوبة.',
  },
];

const NODE_H = 50;
const STEP = 72;

export interface SignalFlowProps {
  /** Fired the first time a learner opens a given node — lets a consuming
   *  lesson track "explored every stage of the chain" without duplicating
   *  this diagram's own selection state. */
  onNodeExplore?: (nodeId: string) => void;
}

export const SignalFlow: React.FC<SignalFlowProps> = ({ onNodeExplore }) => {
  const { sel, toggle } = useReveal<string>();
  const handleToggle = (id: string) => {
    toggle(id);
    onNodeExplore?.(id);
  };
  const lastY = 20 + 4 * STEP;
  return (
    <>
      {/* Component-scoped only (does not touch index.css's global .flow-dash/
          .glow-node, which several other diagrams also rely on) — stops the
          continuous flow/glow animations for users who requested reduced
          motion, while every static cue (labels, numbering, click handling)
          is untouched and still fully available. */}
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .signal-flow-anim { animation: none !important; }
        }
      `}</style>
      <DiagramFrame title="مسار الإشارة" hint="اضغط أي مرحلة لمعرفة دورها">
      <svg viewBox="0 0 300 400" className="w-full">
        {nodes.map((n, i) => {
          const y = 20 + i * STEP;
          const active = sel === n.id;
          const nextN = nodes[i + 1];
          return (
            <g key={n.id}>
              {/* Node box */}
              <HotSpot onActivate={() => handleToggle(n.id)} active={active} testId={`signal-flow-node-${n.id}`} label={`${n.label} — ${n.sub}`}>
                <rect
                  x="40" y={y} width="220" height={NODE_H} rx="10"
                  fill={active ? `${n.color}18` : 'rgba(15,23,42,0.7)'}
                  stroke={active ? n.color : `${n.color}50`}
                  strokeWidth={active ? 2 : 1.5}
                />
                {/* Icon circle — vertically centered in box */}
                <circle cx="65" cy={y + 25} r="15" fill={`${n.color}20`} stroke={`${n.color}50`} strokeWidth="1"/>
                <text x="65" y={y + 29} textAnchor="middle" fill={n.color} fontSize="10" fontWeight="bold">{i + 1}</text>
                {/* Labels — English upper, Arabic lower with clear gap */}
                <text x="88" y={y + 16} fill={active ? '#fff' : '#e2e8f0'} fontSize="12" fontWeight="bold">{n.label}</text>
                <text x="88" y={y + 37} fill="#64748b" fontSize="9">{n.sub}</text>
                {/* Active glow dot */}
                {active && <circle cx="248" cy={y + 25} r="4" fill={n.color} className="glow-node signal-flow-anim"/>}
              </HotSpot>

              {/* Arrow to next node */}
              {nextN && (
                <g>
                  {/* Arrow line */}
                  <line
                    x1="150" y1={y + NODE_H} x2="150" y2={y + NODE_H + 14}
                    stroke={n.color} strokeWidth="2" className="flow-dash signal-flow-anim"
                  />
                  {/* Signal label badge */}
                  <rect x="112" y={y + NODE_H + 1} width="76" height="14" rx="7"
                    fill={`${n.color}15`} stroke={`${n.color}40`} strokeWidth="1"/>
                  <text x="150" y={y + NODE_H + 11} textAnchor="middle" fill={n.color} fontSize="8" fontWeight="bold">
                    {n.signal}
                  </text>
                  {/* Arrow head — 4px gap before next box */}
                  <polygon points={`150,${y + STEP - 4} 145,${y + STEP - 11} 155,${y + STEP - 11}`} fill={nextN.color} opacity="0.8"/>
                </g>
              )}
            </g>
          );
        })}

        {/* Final arrow to lift */}
        <g>
          <line x1="150" y1={lastY + NODE_H} x2="150" y2={lastY + NODE_H + 18} stroke={C.green} strokeWidth="2" className="flow-dash signal-flow-anim"/>
          <polygon points={`150,${lastY + NODE_H + 24} 145,${lastY + NODE_H + 17} 155,${lastY + NODE_H + 17}`} fill={C.green} opacity="0.8"/>
          <text x="150" y={lastY + NODE_H + 36} textAnchor="middle" fill={C.green} fontSize="9">🚁 رفع وحركة</text>
        </g>
      </svg>

      <DiagramInfo text={sel ? nodes.find(n => n.id === sel)!.info : null} />
      </DiagramFrame>
    </>
  );
};

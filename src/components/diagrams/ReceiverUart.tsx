import React from 'react';
import { DiagramFrame, DiagramInfo, Legend, useReveal, C } from './_shared';

const info: Record<string, string> = {
  v5: '5V: تغذية المستقبل من منفذ 5V في FC.',
  gnd: 'GND: الأرضي المشترك — إلزامي.',
  tx: 'TX من Receiver → RX في FC (نقل البيانات).',
  rx: 'RX من Receiver → TX في FC.',
};

const Pin: React.FC<{ y: number; color: string; id: string; label: string; sel: string | null; on: (v: string) => void; cross?: boolean }> =
({ y, color, id, label, sel, on, cross }) => {
  const active = sel === id;
  return (
    <g onClick={() => on(id)} style={{ cursor: 'pointer' }} data-testid={`receiver-uart-part-${id}`}>
      <line x1="95" y1={y} x2="185" y2={cross ? (y === 80 ? 105 : 80) : y} stroke={color} strokeWidth={active ? 4 : 2.4} className="flow-dash receiver-uart-anim" />
      <circle cx="95" cy={y} r="5" fill={color} />
      <text x="85" y={y + 4} textAnchor="end" fill="#cbd5e1" fontSize="10">{label}</text>
    </g>
  );
};

export interface ReceiverUartProps {
  /** Fired the first time a learner opens a given part — lets a consuming
   *  lesson track "explored every part" without duplicating this diagram's
   *  own selection state. */
  onPartExplore?: (partId: string) => void;
}

export const ReceiverUart: React.FC<ReceiverUartProps> = ({ onPartExplore }) => {
  const { sel, toggle } = useReveal<string>();
  const handleToggle = (id: string) => {
    toggle(id);
    onPartExplore?.(id);
  };
  return (
    <>
      {/* Component-scoped only (does not touch index.css's global .flow-dash,
          which several other diagrams also rely on) — stops the continuous
          signal-flow animation on all four pins for users who requested
          reduced motion, while every static cue (labels, click handling) is
          untouched and still fully available. */}
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .receiver-uart-anim { animation: none !important; }
        }
      `}</style>
      <DiagramFrame title="توصيل Receiver بالـ FC" hint="ثلاث توصيلات + بيانات متقاطعة — اضغط أي سلك">
        <svg viewBox="0 0 280 150" className="w-full">
          <rect x="20" y="30" width="75" height="95" rx="9" fill={C.frame} stroke={C.stroke} strokeWidth="1.4" />
          <text x="57" y="24" textAnchor="middle" fill="#7fe9e9" fontSize="10" fontWeight="bold">Receiver</text>
          <rect x="185" y="30" width="75" height="95" rx="9" fill={C.frame} stroke={C.stroke} strokeWidth="1.4" />
          <text x="222" y="24" textAnchor="middle" fill="#7fe9e9" fontSize="10" fontWeight="bold">FC (UART)</text>
          <Pin y={50} color={C.amber} id="v5" label="5V" sel={sel} on={handleToggle} />
          <Pin y={65} color={C.ground} id="gnd" label="GND" sel={sel} on={handleToggle} />
          <Pin y={80} color={C.green} id="tx" label="TX" sel={sel} on={handleToggle} cross />
          <Pin y={105} color={C.blue} id="rx" label="RX" sel={sel} on={handleToggle} cross />
        </svg>
        <Legend items={[{ color: C.green, label: 'TX→RX' }, { color: C.blue, label: 'RX→TX' }, { color: C.amber, label: '5V' }, { color: C.ground, label: 'GND' }]} />
        <DiagramInfo text={sel ? info[sel] : null} placeholder="اضغط على كل نقطة لفهم توصيلات المستقبل الأساسية." />
      </DiagramFrame>
    </>
  );
};

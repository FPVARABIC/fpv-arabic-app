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
    <g onClick={() => on(id)} style={{ cursor: 'pointer' }}>
      <line x1="95" y1={y} x2="185" y2={cross ? (y === 80 ? 105 : 80) : y} stroke={color} strokeWidth={active ? 4 : 2.4} className="flow-dash" />
      <circle cx="95" cy={y} r="5" fill={color} />
      <text x="85" y={y + 4} textAnchor="end" fill="#cbd5e1" fontSize="10">{label}</text>
    </g>
  );
};

export const ReceiverUart: React.FC = () => {
  const { sel, toggle } = useReveal<string>();
  return (
    <DiagramFrame title="توصيل Receiver بالـ FC" hint="ثلاث توصيلات + بيانات متقاطعة — اضغط أي سلك">
      <svg viewBox="0 0 280 150" className="w-full">
        <rect x="20" y="30" width="75" height="95" rx="9" fill={C.frame} stroke={C.stroke} strokeWidth="1.4" />
        <text x="57" y="24" textAnchor="middle" fill="#7fe9e9" fontSize="10" fontWeight="bold">Receiver</text>
        <rect x="185" y="30" width="75" height="95" rx="9" fill={C.frame} stroke={C.stroke} strokeWidth="1.4" />
        <text x="222" y="24" textAnchor="middle" fill="#7fe9e9" fontSize="10" fontWeight="bold">FC (UART)</text>
        <Pin y={50} color={C.amber} id="v5" label="5V" sel={sel} on={toggle} />
        <Pin y={65} color={C.ground} id="gnd" label="GND" sel={sel} on={toggle} />
        <Pin y={80} color={C.green} id="tx" label="TX" sel={sel} on={toggle} cross />
        <Pin y={105} color={C.blue} id="rx" label="RX" sel={sel} on={toggle} cross />
      </svg>
      <Legend items={[{ color: C.green, label: 'TX→RX' }, { color: C.blue, label: 'RX→TX' }, { color: C.amber, label: '5V' }, { color: C.ground, label: 'GND' }]} />
      <DiagramInfo text={sel ? info[sel] : null} placeholder="فعّل Serial RX على UART الصحيح في Betaflight" />
    </DiagramFrame>
  );
};

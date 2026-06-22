import React from 'react';
import { DiagramFrame, DiagramInfo, DiagramWarn, Legend, useReveal, C } from './_shared';

const info: Record<string, string> = {
  vbat: 'VBAT: جهد البطارية الكامل (14–25V) — للأجهزة القوية مثل VTX.',
  v5: '5V: جهد منخفض منظَّم — للأجهزة الحساسة مثل Receiver.',
  gnd: 'GND: الأرضي المشترك — ضروري لكل الأجهزة ولأي اتصال إشارة.',
};

const Rail: React.FC<{ y: number; color: string; id: string; label: string; sel: string | null; on: (v: string) => void }> =
({ y, color, id, label, sel, on }) => {
  const active = sel === id;
  return (
    <g onClick={() => on(id)} style={{ cursor: 'pointer' }}>
      <line x1="40" y1={y} x2="260" y2={y} stroke={color} strokeWidth={active ? 5 : 3} className="flow-dash" />
      <circle cx="40" cy={y} r="6" fill={color} />
      <circle cx="260" cy={y} r="6" fill={color} />
      <text x="20" y={y + 4} textAnchor="end" fill={active ? '#fff' : '#cbd5e1'} fontSize="12" fontWeight="bold">{label}</text>
    </g>
  );
};

export const GndFiveVbat: React.FC = () => {
  const { sel, toggle } = useReveal<string>();
  return (
    <DiagramFrame title="مصادر الطاقة: GND / 5V / VBAT" hint="اضغط أي مسار لمعرفة استخدامه">
      <svg viewBox="0 0 280 140" className="w-full">
        <rect x="100" y="10" width="80" height="120" rx="8" fill={C.frame} stroke={C.stroke} strokeWidth="1.4" />
        <text x="140" y="76" textAnchor="middle" fill="#7fe9e9" fontSize="10">الدائرة</text>
        <Rail y={35} color={C.red} id="vbat" label="VBAT" sel={sel} on={toggle} />
        <Rail y={70} color={C.amber} id="v5" label="5V" sel={sel} on={toggle} />
        <Rail y={105} color={C.ground} id="gnd" label="GND" sel={sel} on={toggle} />
      </svg>
      <Legend items={[{ color: C.red, label: 'VBAT — جهد البطارية' }, { color: C.amber, label: '5V — تغذية منخفضة' }, { color: C.ground, label: 'GND — أرضي مشترك' }]} />
      <DiagramInfo text={sel ? info[sel] : null} />
      <DiagramWarn>✗ لا توصل VBAT إلى دخل 5V — ستحرق الجهاز</DiagramWarn>
    </DiagramFrame>
  );
};

import React from 'react';
import { DiagramFrame, DiagramWarn, C } from './_shared';

export const MotorMount: React.FC = () => (
  <DiagramFrame title="تركيب المحرك على الذراع" hint="طول المسمار حاسم — لا يلمس ملفات الموتور">
    <svg viewBox="0 0 280 160" className="w-full">
      {/* arm */}
      <rect x="20" y="95" width="160" height="22" rx="6" fill={C.frame} stroke={C.stroke} strokeWidth="1.4" />
      <text x="60" y="135" fill="#64748b" fontSize="10">ذراع الفريم (كربون)</text>
      {/* motor */}
      <ellipse cx="180" cy="70" rx="34" ry="14" fill="rgba(24,230,230,0.08)" stroke={C.cyan} strokeWidth="1.4" />
      <rect x="150" y="55" width="60" height="30" rx="6" fill="rgba(24,230,230,0.06)" stroke={C.cyan} strokeWidth="1.2" />
      <text x="180" y="44" textAnchor="middle" fill="#7fe9e9" fontSize="10">Motor</text>
      {/* coils hint */}
      <text x="180" y="74" textAnchor="middle" fill="#64748b" fontSize="8">ملفات داخلية</text>
      {/* correct screw */}
      <g>
        <line x1="165" y1="117" x2="165" y2="92" stroke={C.green} strokeWidth="3" />
        <circle cx="165" cy="120" r="3.5" fill={C.green} />
        <text x="120" y="150" fill={C.green} fontSize="9">✓ مسمار بطول مناسب (6–8mm)</text>
      </g>
    </svg>
    <DiagramWarn>✗ مسمار طويل يلمس الملفات = احتراق الموتور عند الدوران</DiagramWarn>
  </DiagramFrame>
);

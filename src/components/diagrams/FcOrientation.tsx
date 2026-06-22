import React from 'react';
import { DiagramFrame, DiagramInfo, DiagramWarn, useReveal, C } from './_shared';

const info: Record<string, string> = {
  arrow: 'سهم الاتجاه: يجب أن يشير للأمام في اتجاه الطيران.',
  grommet: 'Grommets المطاطية: تمتص الاهتزاز وتحمي الجيروسكوب الحساس.',
  usb: 'منفذ USB: اتركه متاحًا دائمًا للوصول والإعداد.',
};

export const FcOrientation: React.FC = () => {
  const { sel, toggle } = useReveal<string>();
  return (
    <DiagramFrame title="تركيب Flight Controller" hint="اضغط أي جزء لمعرفة دوره">
      <svg viewBox="0 0 220 180" className="w-full">
        {/* grommets */}
        {[[55, 55], [165, 55], [55, 125], [165, 125]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="10" fill="none" stroke={sel === 'grommet' ? C.cyan : 'rgba(148,163,184,0.6)'} strokeWidth={sel === 'grommet' ? 3 : 2} onClick={() => toggle('grommet')} style={{ cursor: 'pointer' }} />
        ))}
        {/* board */}
        <rect x="50" y="50" width="120" height="80" rx="8" fill={C.frame} stroke={C.stroke} strokeWidth="1.6" />
        <circle cx="110" cy="90" r="14" fill="rgba(24,230,230,0.1)" stroke={C.cyan} strokeWidth="1" />
        <text x="110" y="94" textAnchor="middle" fill="#7fe9e9" fontSize="9">FC</text>
        {/* forward arrow */}
        <g onClick={() => toggle('arrow')} style={{ cursor: 'pointer' }}>
          <path d="M110 50 L110 18" stroke={sel === 'arrow' ? C.cyan : C.green} strokeWidth="2.5" />
          <path d="M110 12 l-6 9 h12 z" fill={sel === 'arrow' ? C.cyan : C.green} />
          <text x="120" y="28" fill={C.green} fontSize="10">أمام</text>
        </g>
        {/* usb */}
        <rect x="60" y="130" width="22" height="10" rx="2" fill={sel === 'usb' ? C.cyan : 'rgba(148,163,184,0.5)'} onClick={() => toggle('usb')} style={{ cursor: 'pointer' }} />
        <text x="71" y="158" textAnchor="middle" fill="#64748b" fontSize="8">USB</text>
      </svg>
      <DiagramInfo text={sel ? info[sel] : null} />
      <DiagramWarn tone="warning">⚠ لا تثبّت FC مباشرة على الفريم بدون grommets</DiagramWarn>
    </DiagramFrame>
  );
};

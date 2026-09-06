import React from 'react';
import { DiagramFrame, DiagramInfo, DiagramWarn, HotSpot, useReveal, C } from './_shared';

const info: Record<string, string> = {
  arrow: 'سهم الاتجاه: يجب أن يشير للأمام في اتجاه الطيران.',
  grommet: 'Grommets المطاطية: تمتص الاهتزاز وتحمي الجيروسكوب الحساس.',
  usb: 'منفذ USB: اتركه متاحًا دائمًا للوصول والإعداد.',
};

export interface FcOrientationProps {
  /** Fired the first time a learner opens a given part — lets a consuming
   *  lesson track "explored every part" without duplicating this diagram's
   *  own selection state. */
  onPartExplore?: (partId: string) => void;
}

export const FcOrientation: React.FC<FcOrientationProps> = ({ onPartExplore }) => {
  const { sel, toggle } = useReveal<string>();
  const handleToggle = (id: string) => {
    toggle(id);
    onPartExplore?.(id);
  };
  return (
    <DiagramFrame title="تركيب Flight Controller" hint="اضغط أي جزء لمعرفة دوره">
      <svg viewBox="0 0 220 180" className="w-full">
        {/* grommets */}
        {/* The four grommets are one control, not four: they teach one idea,
            and four identical tab stops would be four ways to say it. */}
        <HotSpot onActivate={() => handleToggle('grommet')} active={sel === 'grommet'} testId="fc-orientation-part-grommet" label="الحلقات المطاطية Grommets الأربع">
          {[[55, 55], [165, 55], [55, 125], [165, 125]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="10" fill="none" stroke={sel === 'grommet' ? C.cyan : 'rgba(148,163,184,0.6)'} strokeWidth={sel === 'grommet' ? 3 : 2} />
          ))}
        </HotSpot>
        {/* board */}
        <rect x="50" y="50" width="120" height="80" rx="8" fill={C.frame} stroke={C.stroke} strokeWidth="1.6" />
        <circle cx="110" cy="90" r="14" fill="rgba(24,230,230,0.1)" stroke={C.cyan} strokeWidth="1" />
        <text x="110" y="94" textAnchor="middle" fill="#7fe9e9" fontSize="9">FC</text>
        {/* forward arrow */}
        <HotSpot onActivate={() => handleToggle('arrow')} active={sel === 'arrow'} testId="fc-orientation-part-arrow" label="سهم الاتجاه الأمامي">
          <path d="M110 50 L110 18" stroke={sel === 'arrow' ? C.cyan : C.green} strokeWidth="2.5" />
          <path d="M110 12 l-6 9 h12 z" fill={sel === 'arrow' ? C.cyan : C.green} />
          <text x="120" y="28" fill={C.green} fontSize="10">أمام</text>
        </HotSpot>
        {/* usb */}
        <HotSpot onActivate={() => handleToggle('usb')} active={sel === 'usb'} testId="fc-orientation-part-usb" label="منفذ USB">
          <rect x="60" y="130" width="22" height="10" rx="2" fill={sel === 'usb' ? C.cyan : 'rgba(148,163,184,0.5)'} />
        </HotSpot>
        <text x="71" y="158" textAnchor="middle" fill="#64748b" fontSize="8">USB</text>
      </svg>
      <DiagramInfo text={sel ? info[sel] : null} />
      <DiagramWarn tone="warning">⚠ لا تثبّت FC مباشرة على الفريم بدون grommets</DiagramWarn>
    </DiagramFrame>
  );
};

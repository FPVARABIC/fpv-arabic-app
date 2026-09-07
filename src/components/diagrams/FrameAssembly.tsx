import React from 'react';
import { DiagramFrame, DiagramInfo, HotSpot, useReveal, C } from './_shared';

const info: Record<string, string> = {
  base: 'Base Plate: القاعدة السفلية — ثبّت كل المسامير بإحكام معتدل.',
  arms: 'الأذرع: لا تشد المسامير بقوة زائدة فقد يتشقق الكربون.',
  front: 'علامة الأمام: حدّد اتجاه الفريم قبل تثبيت أي شيء.',
};

export interface FrameAssemblyProps {
  /** Fired the first time a learner opens a given part — lets a consuming
   *  lesson track "explored every part" without duplicating this diagram's
   *  own selection state. */
  onPartExplore?: (partId: string) => void;
}

export const FrameAssembly: React.FC<FrameAssemblyProps> = ({ onPartExplore }) => {
  const { sel, toggle } = useReveal<string>();
  const handleToggle = (id: string) => {
    toggle(id);
    onPartExplore?.(id);
  };
  return (
    <DiagramFrame title="تركيب الهيكل Frame" hint="اضغط أي جزء لمعرفة نصيحة التركيب">
      <svg viewBox="0 0 240 200" className="w-full">
        {/* arms — clickable */}
        <HotSpot onActivate={() => handleToggle('arms')} active={sel === 'arms'} testId="frame-assembly-part-arms" label="أذرع الهيكل">
          <g stroke={sel === 'arms' ? C.cyan : 'rgba(34,211,238,0.45)'} strokeWidth={sel === 'arms' ? 8 : 6} strokeLinecap="round">
            <line x1="120" y1="100" x2="50" y2="45" />
            <line x1="120" y1="100" x2="190" y2="45" />
            <line x1="120" y1="100" x2="50" y2="155" />
            <line x1="120" y1="100" x2="190" y2="155" />
          </g>
        </HotSpot>
        {/* motor mounting areas */}
        {[[50, 45], [190, 45], [50, 155], [190, 155]].map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="13" fill="rgba(148,163,184,0.05)" stroke="rgba(148,163,184,0.3)" strokeWidth="1.5"/>
            <circle cx={x} cy={y} r="5" fill="rgba(148,163,184,0.12)" stroke="rgba(148,163,184,0.45)" strokeWidth="1"/>
            <text x={x} y={y < 100 ? y - 18 : y + 20} textAnchor="middle" fill="#64748b" fontSize="8">موتور</text>
          </g>
        ))}
        {/* battery strap zone — rear center between arms */}
        <rect x="99" y="128" width="42" height="21" rx="4"
          fill="rgba(251,191,36,0.07)" stroke="rgba(251,191,36,0.35)" strokeWidth="1" strokeDasharray="3 2"/>
        <text x="120" y="142" textAnchor="middle" fill={C.amber} fontSize="8">بطارية</text>
        {/* center stack FC/ESC — clickable */}
        <HotSpot onActivate={() => handleToggle('base')} active={sel === 'base'} testId="frame-assembly-part-base" label="القاعدة السفلية Base Plate">
          <rect x="95" y="75" width="50" height="50" rx="8" fill={C.frame} stroke={sel === 'base' ? C.cyan : C.stroke} strokeWidth={sel === 'base' ? 3 : 1.6} />
          {[[103, 83], [137, 83], [103, 117], [137, 117]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.5" fill="#64748b" />)}
          <text x="120" y="103" textAnchor="middle" fill={C.cyan} fontSize="8" fontWeight="bold" opacity="0.8">FC/ESC</text>
        </HotSpot>
        {/* front direction mark — clickable */}
        <HotSpot onActivate={() => handleToggle('front')} active={sel === 'front'} testId="frame-assembly-part-front" label="علامة الأمام">
          <path d="M120 75 l6 9 h-12 z" fill={sel === 'front' ? C.cyan : C.green} />
          <text x="120" y="68" textAnchor="middle" fill={C.green} fontSize="9">أمام</text>
        </HotSpot>
      </svg>
      <DiagramInfo text={sel ? info[sel] : null} />
    </DiagramFrame>
  );
};

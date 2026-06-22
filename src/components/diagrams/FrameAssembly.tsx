import React from 'react';
import { DiagramFrame, DiagramInfo, useReveal, C } from './_shared';

const info: Record<string, string> = {
  base: 'Base Plate: القاعدة السفلية — ثبّت كل المسامير بإحكام معتدل.',
  arms: 'الأذرع: لا تشد المسامير بقوة زائدة فقد يتشقق الكربون.',
  front: 'علامة الأمام: حدّد اتجاه الفريم قبل تثبيت أي شيء.',
};

export const FrameAssembly: React.FC = () => {
  const { sel, toggle } = useReveal<string>();
  return (
    <DiagramFrame title="تركيب الهيكل Frame" hint="اضغط أي جزء لمعرفة نصيحة التركيب">
      <svg viewBox="0 0 240 200" className="w-full">
        {/* arms */}
        <g onClick={() => toggle('arms')} style={{ cursor: 'pointer' }} stroke={sel === 'arms' ? C.cyan : 'rgba(34,211,238,0.45)'} strokeWidth={sel === 'arms' ? 8 : 6} strokeLinecap="round">
          <line x1="120" y1="100" x2="50" y2="45" />
          <line x1="120" y1="100" x2="190" y2="45" />
          <line x1="120" y1="100" x2="50" y2="155" />
          <line x1="120" y1="100" x2="190" y2="155" />
        </g>
        {/* motor pads */}
        {[[50, 45], [190, 45], [50, 155], [190, 155]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="10" fill="none" stroke="rgba(148,163,184,0.5)" strokeWidth="2" />
        ))}
        {/* base plate */}
        <g onClick={() => toggle('base')} style={{ cursor: 'pointer' }}>
          <rect x="95" y="75" width="50" height="50" rx="8" fill={C.frame} stroke={sel === 'base' ? C.cyan : C.stroke} strokeWidth={sel === 'base' ? 3 : 1.6} />
          {[[103, 83], [137, 83], [103, 117], [137, 117]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.5" fill="#64748b" />)}
        </g>
        {/* front mark */}
        <g onClick={() => toggle('front')} style={{ cursor: 'pointer' }}>
          <path d="M120 75 l6 9 h-12 z" fill={sel === 'front' ? C.cyan : C.green} />
          <text x="120" y="68" textAnchor="middle" fill={C.green} fontSize="9">أمام</text>
        </g>
      </svg>
      <DiagramInfo text={sel ? info[sel] : null} />
    </DiagramFrame>
  );
};

import React from 'react';
import { DiagramFrame, DiagramInfo, HotSpot, useReveal, C } from './_shared';
import { Wind } from 'lucide-react';

const info: Record<string, string> = {
  esc: 'ESC: يولّد حرارة — ضعه حيث يمر الهواء للتبريد.',
  power: 'أسلاك الطاقة: VBAT و GND قصيرة قدر الإمكان لتقليل التداخل.',
  signal: 'أسلاك الإشارة: من ESC إلى FC — رتّبها بعيدًا عن أسلاك الطاقة.',
};

export interface EscPlacementProps {
  /** Fired the first time a learner opens a given part — lets a consuming
   *  lesson track "explored every part" without duplicating this diagram's
   *  own selection state. */
  onPartExplore?: (partId: string) => void;
}

export const EscPlacement: React.FC<EscPlacementProps> = ({ onPartExplore }) => {
  const { sel, toggle } = useReveal<string>();
  const handleToggle = (id: string) => {
    toggle(id);
    onPartExplore?.(id);
  };
  return (
    <>
      {/* Component-scoped only (does not touch index.css's global .flow-dash/
          .float-soft, which several other diagrams also rely on) — stops the
          continuous signal-flow and airflow animations for users who
          requested reduced motion, while every static cue (labels, click
          handling) is untouched and still fully available. */}
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .esc-placement-anim { animation: none !important; }
        }
      `}</style>
      <DiagramFrame title="تركيب ESC" hint="اضغط أي جزء — التبريد وقِصَر الأسلاك مهمّان">
        <svg viewBox="0 0 260 160" className="w-full">
          {/* stack */}
          <rect x="90" y="30" width="80" height="22" rx="5" fill={C.frame} stroke={C.stroke} strokeWidth="1.4" />
          <text x="130" y="45" textAnchor="middle" fill="#7fe9e9" fontSize="9">FC</text>
          <HotSpot onActivate={() => handleToggle('esc')} active={sel === 'esc'} testId="esc-placement-part-esc" label="لوحة ESC وموضعها">
            <rect x="90" y="95" width="80" height="26" rx="5" fill="rgba(24,230,230,0.08)" stroke={sel === 'esc' ? C.cyan : C.stroke} strokeWidth={sel === 'esc' ? 3 : 1.4} />
            <text x="130" y="112" textAnchor="middle" fill="#7fe9e9" fontSize="9">ESC</text>
          </HotSpot>
          {/* signal */}
          <HotSpot onActivate={() => handleToggle('signal')} active={sel === 'signal'} testId="esc-placement-part-signal" label="أسلاك الإشارة بين ESC وFC">
            <line x1="130" y1="52" x2="130" y2="95" stroke={sel === 'signal' ? C.cyan : C.green} strokeWidth="2" className="flow-dash esc-placement-anim" />
            <rect x="122" y="52" width="16" height="43" fill="transparent" />
          </HotSpot>
          {/* power wires */}
          <HotSpot onActivate={() => handleToggle('power')} active={sel === 'power'} testId="esc-placement-part-power" label="أسلاك الطاقة VBAT وGND">
            <line x1="90" y1="108" x2="40" y2="108" stroke={C.red} strokeWidth="2.5" />
            <line x1="90" y1="115" x2="40" y2="115" stroke={C.ground} strokeWidth="2.5" />
            <text x="38" y="105" textAnchor="end" fill="#64748b" fontSize="8">VBAT</text>
          </HotSpot>
          {/* airflow */}
          <g className="float-soft esc-placement-anim">
            <path d="M180 108 q 20 -8 40 0" fill="none" stroke="rgba(148,163,184,0.5)" strokeWidth="1.5" />
            <path d="M180 118 q 20 -8 40 0" fill="none" stroke="rgba(148,163,184,0.4)" strokeWidth="1.5" />
          </g>
        </svg>
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400"><Wind size={13} className="text-cyan-400" /> ESC يحتاج تدفق هواء للتبريد</div>
        <DiagramInfo text={sel ? info[sel] : null} />
      </DiagramFrame>
    </>
  );
};

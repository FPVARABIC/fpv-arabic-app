import React from 'react';
import { DiagramFrame, DiagramInfo, DiagramWarn, useReveal, C } from './_shared';

const items: Record<string, { t: string }> = {
  voltage: { t: 'الجهد (Voltage): "قوة" الكهرباء بالفولت. 4S=14.8V و 6S=22.2V.' },
  current: { t: 'التيار (Current): "كمية" الكهرباء المتدفقة بالأمبير.' },
  polarity: { t: 'القطبية: (+) موجب و (−) سالب. عكسها قد يحرق القطع فورًا.' },
  short: { t: 'القصر: تلامس (+) مع (−) مباشرة — خطير جدًا مع LiPo.' },
};

export interface ElectricityBasicsProps {
  /** Fired the first time a learner opens a given concept — lets a consuming
   *  lesson track "explored every concept" without duplicating this diagram's
   *  own selection state. */
  onConceptExplore?: (conceptId: string) => void;
}

export const ElectricityBasics: React.FC<ElectricityBasicsProps> = ({ onConceptExplore }) => {
  const { sel, toggle } = useReveal<string>();
  const handleToggle = (id: string) => {
    toggle(id);
    onConceptExplore?.(id);
  };
  return (
    <>
      {/* Component-scoped only (does not touch index.css's global .flow-dash,
          which several other diagrams also rely on) — stops the continuous
          wire-flow animation for users who requested reduced motion, while
          every static cue (labels, click handling) is untouched. */}
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .electricity-basics-anim { animation: none !important; }
        }
      `}</style>
      <DiagramFrame title="أساسيات الكهرباء" hint="اضغط أي مفهوم لشرحه">
      <svg viewBox="0 0 280 130" className="w-full">
        {/* battery */}
        <g onClick={() => handleToggle('polarity')} style={{ cursor: 'pointer' }}>
          <rect x="20" y="45" width="50" height="40" rx="6" fill={C.frame} stroke={sel === 'polarity' ? C.cyan : C.stroke} strokeWidth="1.6" />
          <text x="30" y="40" fill={C.red} fontSize="14" fontWeight="bold">+</text>
          <text x="56" y="40" fill={C.ground} fontSize="14" fontWeight="bold">−</text>
          <text x="45" y="70" textAnchor="middle" fill="#94a3b8" fontSize="9">LiPo</text>
        </g>
        {/* wire + */}
        <line x1="70" y1="55" x2="210" y2="55" stroke={C.red} strokeWidth="2.4" className="flow-dash electricity-basics-anim" onClick={() => handleToggle('current')} style={{ cursor: 'pointer' }} />
        <line x1="70" y1="78" x2="210" y2="78" stroke={C.ground} strokeWidth="2.4" className="flow-dash electricity-basics-anim" />
        {/* load */}
        <rect x="210" y="45" width="50" height="40" rx="6" fill={C.frame} stroke={C.stroke} strokeWidth="1.4" onClick={() => handleToggle('voltage')} style={{ cursor: 'pointer' }} />
        <text x="235" y="70" textAnchor="middle" fill="#7fe9e9" fontSize="9">حمل</text>
        <text x="140" y="105" textAnchor="middle" fill="#64748b" fontSize="10" onClick={() => handleToggle('voltage')} style={{ cursor: 'pointer' }}>دائرة كاملة</text>
      </svg>
      <div className="grid grid-cols-4 gap-1.5 mt-1">
        {Object.keys(items).map(k => (
          <button key={k} onClick={() => handleToggle(k)} data-testid={`electricity-basics-item-${k}`} className={`text-[10px] rounded-lg py-1.5 border transition-all ${sel === k ? 'bg-cyan-400/15 border-cyan-400/50 text-cyan-300' : 'bg-white/4 border-white/8 text-slate-400'}`}>
            {k === 'voltage' ? 'الجهد' : k === 'current' ? 'التيار' : k === 'polarity' ? 'القطبية' : 'القصر'}
          </button>
        ))}
      </div>
      <DiagramInfo text={sel ? items[sel].t : null} />
      <DiagramWarn>⚠ الدائرة القصيرة مع LiPo قد تسبب حريقًا</DiagramWarn>
      </DiagramFrame>
    </>
  );
};

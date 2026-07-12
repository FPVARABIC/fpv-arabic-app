import React from 'react';
import { DiagramFrame, DiagramInfo, useReveal, C } from './_shared';

const sizes = [
  { id: '3', r: 26, label: '3"', name: '3 بوصة', info: '3 بوصة: صغير وخفيف — مناسب للأماكن الضيقة والداخلية، لكن التحكم أصعب قليلًا.' },
  { id: '5', r: 40, label: '5"', name: '5 بوصة', info: '5 بوصة: النقطة الذهبية والأكثر شيوعًا — أكبر مجتمع ودروس وقطع. موصى به للمبتدئ.', best: true },
  { id: '7', r: 54, label: '7"', name: '7 بوصة', info: '7 بوصة: أكبر وأثقل — لحمل كاميرات احترافية أو الطيران لمسافات طويلة.' },
];

export interface SizeComparisonProps {
  /** Fired the first time a learner opens a given size — lets a consuming
   *  lesson track "explored every size" without duplicating this diagram's
   *  own selection state. */
  onSizeExplore?: (sizeId: string) => void;
}

export const SizeComparison: React.FC<SizeComparisonProps> = ({ onSizeExplore }) => {
  const { sel, toggle } = useReveal<string>();
  const handleToggle = (id: string) => {
    toggle(id);
    onSizeExplore?.(id);
  };
  return (
    <DiagramFrame title="مقارنة الأحجام" hint="حجم نسبي حقيقي — اضغط أي حجم لمعرفة استخدامه">
      <div className="flex items-end justify-around gap-2 px-2 pt-4 pb-2">
        {sizes.map(s => {
          const active = sel === s.id;
          return (
            <button key={s.id} onClick={() => handleToggle(s.id)} data-testid={`size-comparison-item-${s.id}`} className="flex flex-col items-center gap-2 press">
              <svg width={s.r * 2 + 8} height={s.r * 2 + 8} viewBox={`0 0 ${s.r * 2 + 8} ${s.r * 2 + 8}`}>
                <circle cx={s.r + 4} cy={s.r + 4} r={s.r} fill={active ? 'rgba(24,230,230,0.18)' : 'rgba(24,230,230,0.06)'}
                  stroke={active || s.best ? C.cyan : 'rgba(34,211,238,0.4)'} strokeWidth={active ? 3 : 1.6} strokeDasharray={s.best ? '0' : '5 3'} />
                <text x={s.r + 4} y={s.r + 9} textAnchor="middle" fill={active || s.best ? C.cyan : '#94a3b8'} fontSize="16" fontWeight="bold">{s.label}</text>
              </svg>
              <span className={`text-[11px] ${s.best ? 'badge-cyan' : 'text-slate-400'}`}>{s.best ? 'موصى به' : s.name}</span>
            </button>
          );
        })}
      </div>
      <DiagramInfo text={sel ? sizes.find(s => s.id === sel)!.info : null} />
    </DiagramFrame>
  );
};

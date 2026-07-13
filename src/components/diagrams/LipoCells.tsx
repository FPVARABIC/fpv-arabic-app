import React from 'react';
import { DiagramFrame, DiagramInfo, DiagramWarn, useReveal, C } from './_shared';

const packs = [
  { id: '4s', cells: 4, v: '14.8V', name: '4S', info: '4S = 4 خلايا × 3.7V = 14.8V (حتى 16.8V مشحونة بالكامل).' },
  { id: '6s', cells: 6, v: '22.2V', name: '6S', info: '6S = 6 خلايا × 3.7V = 22.2V (حتى 25.2V مشحونة بالكامل). أعلى كفاءة.' },
];

export interface LipoCellsProps {
  /** Fired the first time a learner opens a given pack — lets a consuming
   *  lesson track "explored every pack" without duplicating this diagram's
   *  own selection state. */
  onPackExplore?: (packId: string) => void;
}

export const LipoCells: React.FC<LipoCellsProps> = ({ onPackExplore }) => {
  const { sel, toggle } = useReveal<string>();
  const handleToggle = (id: string) => {
    toggle(id);
    onPackExplore?.(id);
  };
  return (
    <DiagramFrame title="بطارية LiPo" hint="كل خلية 3.7V — اضغط أي بطارية لتفاصيلها">
      <div className="space-y-3">
        {packs.map(p => {
          const active = sel === p.id;
          return (
            <button key={p.id} onClick={() => handleToggle(p.id)} data-testid={`lipo-cells-item-${p.id}`}
              className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-all press ${active ? 'bg-cyan-400/10 border-cyan-400/50' : 'bg-white/4 border-white/8'}`}>
              <span className="text-sm font-bold text-cyan-400 w-8">{p.name}</span>
              <div className="flex gap-1 flex-1">
                {Array.from({ length: p.cells }).map((_, i) => (
                  <div key={i} className="flex-1 h-7 rounded-sm flex items-center justify-center"
                    style={{ background: 'linear-gradient(180deg, rgba(24,230,230,0.25), rgba(24,230,230,0.08))', border: `1px solid ${C.stroke}` }}>
                    <span className="text-[8px] text-cyan-200">3.7V</span>
                  </div>
                ))}
              </div>
              <span className="text-xs text-slate-300 font-mono w-14 text-left">{p.v}</span>
            </button>
          );
        })}
      </div>
      <DiagramInfo text={sel ? packs.find(p => p.id === sel)!.info : null} placeholder="جهد التخزين الآمن = 3.8V لكل خلية" />
      <div className="rounded-xl p-3 mt-1" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-[10px] text-slate-500 text-center mb-2">اعرف الفرق — قبل أن تشحن</p>
        <div className="flex items-center justify-around gap-2">
          <div className="flex flex-col items-center gap-1">
            <svg viewBox="0 0 80 36" className="w-20">
              <rect x="4" y="8" width="72" height="20" rx="3"
                fill="rgba(74,222,128,0.12)" stroke={C.green} strokeWidth="1.5" />
              <text x="40" y="21" textAnchor="middle" fill={C.green} fontSize="7" fontWeight="bold">سليمة</text>
            </svg>
            <span className="text-[9px] font-semibold" style={{ color: C.green }}>✓ آمنة</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <svg viewBox="0 0 80 44" className="w-20">
              <path d="M4,12 C4,2 76,2 76,12 L76,30 C76,40 4,40 4,30 Z"
                fill="rgba(248,113,113,0.18)" stroke={C.red} strokeWidth="1.5" />
              <text x="40" y="24" textAnchor="middle" fill={C.red} fontSize="7" fontWeight="bold">منتفخة</text>
              <text x="40" y="33" textAnchor="middle" fill={C.red} fontSize="9">⚠</text>
            </svg>
            <span className="text-[9px] font-semibold" style={{ color: C.red }}>✗ خطر</span>
          </div>
        </div>
      </div>
      <DiagramWarn>⚠ لا تشحن بطارية منتفخة أبدًا — تخلّص منها بأمان</DiagramWarn>
    </DiagramFrame>
  );
};

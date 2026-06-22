import React from 'react';
import { DiagramFrame, DiagramInfo, DiagramWarn, useReveal, C } from './_shared';

const packs = [
  { id: '4s', cells: 4, v: '14.8V', name: '4S', info: '4S = 4 خلايا × 3.7V = 14.8V (حتى 16.8V مشحونة بالكامل).' },
  { id: '6s', cells: 6, v: '22.2V', name: '6S', info: '6S = 6 خلايا × 3.7V = 22.2V (حتى 25.2V مشحونة بالكامل). أعلى كفاءة.' },
];

export const LipoCells: React.FC = () => {
  const { sel, toggle } = useReveal<string>();
  return (
    <DiagramFrame title="بطارية LiPo" hint="كل خلية 3.7V — اضغط أي بطارية لتفاصيلها">
      <div className="space-y-3">
        {packs.map(p => {
          const active = sel === p.id;
          return (
            <button key={p.id} onClick={() => toggle(p.id)}
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
      <DiagramWarn>⚠ لا تشحن بطارية منتفخة أبدًا — تخلّص منها بأمان</DiagramWarn>
    </DiagramFrame>
  );
};

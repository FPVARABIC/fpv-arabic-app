import React from 'react';
import { Camera, RadioTower, Glasses } from 'lucide-react';
import { DiagramFrame, DiagramInfo, useReveal } from './_shared';

const nodes = [
  { id: 'cam', label: 'الكاميرا', Icon: Camera, info: 'الكاميرا: تلتقط الصورة وترسلها لإشارة الفيديو.' },
  { id: 'vtx', label: 'VTX', Icon: RadioTower, info: 'VTX: يبثّ الصورة لاسلكيًا — يحتاج VBAT و GND وإشارة الكاميرا.' },
  { id: 'goggles', label: 'النظارات', Icon: Glasses, info: 'النظارات/الشاشة: تستقبل البث وتعرضه للطيار (مع OSD).' },
];

export const CameraVtx: React.FC = () => {
  const { sel, toggle } = useReveal<string>();
  return (
    <DiagramFrame title="نظام الفيديو" hint="كاميرا ← VTX ← نظارات — اضغط أي جزء">
      <div className="flex items-center justify-between gap-1">
        {nodes.map((n, i) => (
          <React.Fragment key={n.id}>
            <button onClick={() => toggle(n.id)}
              className={`flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 flex-1 border transition-all press ${sel === n.id ? 'bg-cyan-400/14 border-cyan-400/50' : 'bg-white/4 border-white/8'}`}>
              <n.Icon size={22} className="text-cyan-400" />
              <span className="text-[11px] text-slate-300">{n.label}</span>
            </button>
            {i < nodes.length - 1 && (
              <svg viewBox="0 0 18 10" className="w-5 h-3 flex-shrink-0">
                <line x1="18" y1="5" x2="6" y2="5" stroke="#18E6E6" strokeWidth="2" className="flow-dash" />
                <path d="M1 5 l5 -4 v8 z" fill="#18E6E6" />
              </svg>
            )}
          </React.Fragment>
        ))}
      </div>
      <DiagramInfo text={sel ? nodes.find(n => n.id === sel)!.info : null} placeholder="يمكن تعلّم FPV بالـ Simulator قبل شراء النظام" />
    </DiagramFrame>
  );
};

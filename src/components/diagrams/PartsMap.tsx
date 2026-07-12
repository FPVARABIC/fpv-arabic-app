import React from 'react';
import { Box, Fan, Cpu, Zap, Antenna, Camera, BatteryFull, CircleDot } from 'lucide-react';
import { DiagramFrame, DiagramInfo, useReveal } from './_shared';

const parts = [
  { id: 'frame', label: 'Frame', name: 'الهيكل', Icon: Box, info: 'Frame: الهيكل الذي يحمل كل القطع ويحدد حجم الدرون.' },
  { id: 'motors', label: 'Motors', name: 'المحركات', Icon: Fan, info: 'Motors: تدير المراوح وتولّد القوة الرافعة.' },
  { id: 'fc', label: 'FC', name: 'المتحكم', Icon: Cpu, info: 'Flight Controller: الدماغ الذي يدير الطيران.' },
  { id: 'esc', label: 'ESC', name: 'المنظّم', Icon: Zap, info: 'ESC: يتحكم في سرعة كل محرك ويوفر له طاقة نظيفة.' },
  { id: 'rx', label: 'Receiver', name: 'المستقبل', Icon: Antenna, info: 'Receiver: يستقبل أوامر جهاز التحكم.' },
  { id: 'vtx', label: 'Camera/VTX', name: 'الفيديو', Icon: Camera, info: 'الكاميرا و VTX: يلتقطان ويبثّان الصورة لاسلكيًا.' },
  { id: 'lipo', label: 'LiPo', name: 'البطارية', Icon: BatteryFull, info: 'LiPo: بطارية الطيران عالية الطاقة.' },
  { id: 'props', label: 'Props', name: 'المراوح', Icon: CircleDot, info: 'Props: المراوح التي تحوّل دوران المحرك إلى دفع.' },
];

export interface PartsMapProps {
  /** Fired the first time a learner opens a given part — lets a consuming
   *  lesson track "explored every part" without duplicating this diagram's
   *  own selection state. */
  onPartExplore?: (partId: string) => void;
}

export const PartsMap: React.FC<PartsMapProps> = ({ onPartExplore }) => {
  const { sel, toggle } = useReveal<string>();
  const handleToggle = (id: string) => {
    toggle(id);
    onPartExplore?.(id);
  };
  return (
    <DiagramFrame title="خريطة القطع الأساسية" hint="اضغط أي قطعة لمعرفة وظيفتها">
      <div className="grid grid-cols-4 gap-2">
        {parts.map(p => {
          const active = sel === p.id;
          return (
            <button key={p.id} onClick={() => handleToggle(p.id)} data-testid={`parts-map-item-${p.id}`}
              className={`flex flex-col items-center gap-1 rounded-xl py-2.5 border transition-all press ${active ? 'bg-cyan-400/14 border-cyan-400/50' : 'bg-white/4 border-white/8 hover:border-cyan-400/30'}`}>
              <p.Icon size={20} className="text-cyan-400" />
              <span className="text-[10px] text-slate-300 leading-tight text-center">{p.name}</span>
            </button>
          );
        })}
      </div>
      <DiagramInfo text={sel ? parts.find(p => p.id === sel)!.info : null} />
    </DiagramFrame>
  );
};

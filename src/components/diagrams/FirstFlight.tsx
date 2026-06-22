import React from 'react';
import { DiagramFrame, DiagramWarn } from './_shared';
import { MapPin, Battery, ShieldCheck, Plane } from 'lucide-react';

const checks = [
  { Icon: MapPin, t: 'مكان مفتوح', d: 'بعيد عن الناس والأشجار والكابلات' },
  { Icon: Battery, t: 'بطارية مثبتة', d: 'مشحونة ومربوطة جيدًا' },
  { Icon: ShieldCheck, t: 'Failsafe + Angle', d: 'مختبر ووضع Angle مفعّل' },
  { Icon: Plane, t: 'ارتفاع منخفض', d: 'ابدأ بنصف متر وتعوّد على الاستجابة' },
];

export const FirstFlight: React.FC = () => (
  <DiagramFrame title="أول طيران آمن" hint="جهّز هذه النقاط قبل الإقلاع">
    <div className="grid grid-cols-2 gap-2">
      {checks.map((c, i) => (
        <div key={i} className="rounded-xl px-3 py-3 bg-white/4 border border-cyan-400/15 flex flex-col items-center text-center gap-1.5">
          <c.Icon size={20} className="text-cyan-400" />
          <p className="text-xs font-bold text-white leading-tight">{c.t}</p>
          <p className="text-[10px] text-slate-400 leading-tight">{c.d}</p>
        </div>
      ))}
    </div>
    <DiagramWarn>✗ لا تطر فوق الناس أو بالقرب منهم</DiagramWarn>
  </DiagramFrame>
);

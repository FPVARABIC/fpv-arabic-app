import React from 'react';
import { DiagramFrame, DiagramWarn } from './_shared';
import { MapPin, Battery, ShieldCheck, Plane } from 'lucide-react';

const checks = [
  { Icon: MapPin,      t: 'مكان مفتوح وآمن',       d: 'بعيد عن الناس والأشجار والكابلات الكهربائية' },
  { Icon: Battery,     t: 'بطارية مشحونة ومثبتة',  d: 'تحقق من الشحن الكامل والتثبيت الجيد' },
  { Icon: ShieldCheck, t: 'Failsafe + Angle Mode', d: 'مختبران — Angle Mode للاستقرار والتحكم' },
  { Icon: Plane,       t: 'ابدأ منخفضًا جداً',     d: 'نصف متر أولاً — تعوّد على ردة فعل الدرون' },
];

export const FirstFlight: React.FC = () => (
  <DiagramFrame title="أول طيران آمن" hint="نفّذ بالترتيب — كل خطوة بوابة للتالية">
    <div className="space-y-2">
      {checks.map((c, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-3 bg-white/4 border border-cyan-400/15">
          <div
            className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-extrabold"
            style={{ background: 'linear-gradient(135deg, rgba(74,222,128,0.22), rgba(24,230,230,0.12))', border: '1.5px solid rgba(74,222,128,0.4)', color: '#4ade80' }}
          >
            {i + 1}
          </div>
          <c.Icon size={18} className="text-cyan-400 flex-shrink-0" />
          <div className="flex-1 min-w-0 text-right">
            <p className="text-sm font-bold text-white leading-tight">{c.t}</p>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{c.d}</p>
          </div>
        </div>
      ))}
    </div>
    <DiagramWarn>✗ لا تطر فوق الناس أو بالقرب منهم</DiagramWarn>
  </DiagramFrame>
);

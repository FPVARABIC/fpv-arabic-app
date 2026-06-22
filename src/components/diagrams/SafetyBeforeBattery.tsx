import React from 'react';
import { DiagramFrame, DiagramWarn } from './_shared';
import { Ban, Gauge, ShieldCheck, CheckCircle2 } from 'lucide-react';

const steps = [
  { Icon: Ban, t: 'لا مراوح مركبة', d: 'تأكد تمامًا من غياب المراوح' },
  { Icon: ShieldCheck, t: 'Smoke Stopper', d: 'وصّله أولًا — يحمي من القصر' },
  { Icon: Gauge, t: 'Multimeter', d: 'افحص القطبية و continuity' },
  { Icon: CheckCircle2, t: 'ثم البطارية', d: 'وصّل البطارية فقط بعد النجاح' },
];

export const SafetyBeforeBattery: React.FC = () => (
  <DiagramFrame title="بروتوكول السلامة قبل البطارية" hint="نفّذ الخطوات بالترتيب قبل أول تشغيل">
    <div className="space-y-2">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2.5 bg-white/4 border border-cyan-400/15">
          <span className="w-6 h-6 rounded-full bg-cyan-400/15 text-cyan-400 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
          <s.Icon size={18} className="text-cyan-400 flex-shrink-0" />
          <div className="text-right flex-1">
            <p className="text-sm font-bold text-white leading-tight">{s.t}</p>
            <p className="text-[11px] text-slate-400">{s.d}</p>
          </div>
        </div>
      ))}
    </div>
    <DiagramWarn>✗ لا توصل البطارية قبل فحص Multimeter — حتى لو كنت متأكدًا</DiagramWarn>
  </DiagramFrame>
);

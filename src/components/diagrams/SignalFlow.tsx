import React from 'react';
import { Radio, Antenna, Cpu, Zap, Fan } from 'lucide-react';
import { DiagramFrame, DiagramInfo, useReveal } from './_shared';

const nodes = [
  { id: 'radio', label: 'Radio', sub: 'جهاز التحكم', Icon: Radio, info: 'جهاز التحكم: تحرّك العصا فيُرسل إشارة لاسلكية إلى الطائرة.' },
  { id: 'rx', label: 'Receiver', sub: 'المستقبل', Icon: Antenna, info: 'Receiver: يستقبل الإشارة اللاسلكية ويحوّلها لبيانات رقمية (SBUS/CRSF) للـ FC.' },
  { id: 'fc', label: 'FC', sub: 'المتحكم', Icon: Cpu, info: 'Flight Controller: الدماغ — يحلّل بيانات الجيروسكوب والتحكم ويحسب سرعة كل محرك.' },
  { id: 'esc', label: 'ESC', sub: 'المنظّم', Icon: Zap, info: 'ESC: ينفّذ أوامر FC ويتحكم في سرعة كل محرك بدقة.' },
  { id: 'motors', label: 'Motors', sub: 'المحركات', Icon: Fan, info: 'Motors: تدير المراوح وتولّد قوة الرفع والحركة.' },
];

export const SignalFlow: React.FC = () => {
  const { sel, toggle } = useReveal<string>();
  return (
    <DiagramFrame title="مسار الإشارة" hint="اضغط أي مرحلة لمعرفة دورها — الأسهم تتحرك باتجاه التدفق">
      <div className="flex flex-col gap-2">
        {nodes.map((n, i) => {
          const active = sel === n.id;
          return (
            <React.Fragment key={n.id}>
              <button onClick={() => toggle(n.id)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-all press ${active ? 'bg-cyan-400/12 border-cyan-400/50' : 'bg-white/4 border-white/8 hover:border-cyan-400/30'}`}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${active ? 'bg-cyan-400/25' : 'bg-cyan-400/10'}`}>
                  <n.Icon size={18} className="text-cyan-400" />
                </div>
                <div className="text-right flex-1">
                  <p className="text-sm font-bold text-white leading-tight">{n.label}</p>
                  <p className="text-[11px] text-slate-400">{n.sub}</p>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">{i + 1}</span>
              </button>
              {i < nodes.length - 1 && (
                <svg viewBox="0 0 20 18" className="w-5 h-4 mx-auto -my-0.5" style={{ transform: 'rotate(0deg)' }}>
                  <line x1="10" y1="0" x2="10" y2="12" stroke="#18E6E6" strokeWidth="2" className="flow-dash" />
                  <path d="M10 17 l-4 -5 h8 z" fill="#18E6E6" />
                </svg>
              )}
            </React.Fragment>
          );
        })}
      </div>
      <DiagramInfo text={sel ? nodes.find(n => n.id === sel)!.info : null} />
    </DiagramFrame>
  );
};

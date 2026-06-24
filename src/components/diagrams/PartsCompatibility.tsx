import React from 'react';
import { DiagramFrame, DiagramWarn } from './_shared';
import { ArrowLeft } from 'lucide-react';

const chain = [
  { step: '1', label: 'Frame', note: 'ابدأ بحجم الفريم', val: '5 بوصة' },
  { step: '2', label: 'Motors', note: 'تناسب حجم الفريم', val: '2306' },
  { step: '3', label: 'ESC', note: 'تيار > تيار الموتور +20%', val: '45A' },
  { step: '4', label: 'FC', note: 'منافذ UART كافية', val: '4×UART' },
  { step: '5', label: 'LiPo', note: 'توافق جهد ESC', val: '6S' },
];

export const PartsCompatibility: React.FC = () => (
  <DiagramFrame title="ترتيب اختيار القطع المتوافقة" hint="اختر بهذا الترتيب لتضمن التوافق">
    <div className="space-y-2">
      {chain.map((c, i) => (
        <React.Fragment key={c.step}>
          <div className="flex items-center gap-3 rounded-xl px-3 py-2 bg-white/4 border border-cyan-400/15">
            <span className="w-6 h-6 rounded-full bg-cyan-400/15 text-cyan-400 text-xs font-bold flex items-center justify-center flex-shrink-0">{c.step}</span>
            <div className="flex-1 text-right">
              <p className="text-sm font-bold text-white leading-tight">{c.label}</p>
              <p className="text-[11px] text-slate-400">{c.note}</p>
            </div>
            <span className="badge-cyan font-mono">{c.val}</span>
          </div>
          {i < chain.length - 1 && <ArrowLeft size={14} className="text-cyan-400/60 mx-auto rotate-90" />}
        </React.Fragment>
      ))}
    </div>
    <DiagramWarn tone="danger">⚠ قطع غير متوافقة قد تحترق فور التشغيل</DiagramWarn>
  </DiagramFrame>
);

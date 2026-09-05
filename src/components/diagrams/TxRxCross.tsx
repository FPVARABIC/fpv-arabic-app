import React from 'react';
import { DiagramFrame, DiagramInfo, C, useReveal } from './_shared';

/**
 * The TX/RX crossing rule, drawn both ways. Each panel is tappable: the
 * correct one explains why the wires cross, the wrong one explains what
 * actually happens when they do not (nothing — silently). `onWiringExplore`
 * reports which panel was opened so Lesson 9 can require both be read.
 */
const PANELS = {
  correct: {
    title: 'الصحيح — التوصيل المتقاطع',
    detail: 'TX يعني «أُرسل من هنا» وRX يعني «أستقبل هنا». الجهاز الذي يُرسل يحتاج من يستقبل في الطرف الآخر — فيذهب TX المستقبل إلى RX المتحكم، وTX المتحكم إلى RX المستقبل. الأرضي مشترك بينهما دائماً، وإلا لا معنى للإشارة.',
  },
  wrong: {
    title: 'الخطأ الشائع — لا يعمل أبدًا',
    detail: 'TX إلى TX: طرفان يُرسلان ولا أحد يستقبل. RX إلى RX: طرفان ينتظران ولا أحد يُرسل. لا يحترق شيء — وهذا ما يجعله خادعاً: كل شيء يبدو سليماً والمتحكم لا يرى المستقبل. أول ما تفحصه حين «لا يستجيب الراديو» هو هذا التقاطع.',
  },
} as const;

export type TxRxPanel = keyof typeof PANELS;

export interface TxRxCrossProps {
  /** Fired each time a learner opens a panel — lets a lesson require both. */
  onWiringExplore?: (panel: TxRxPanel) => void;
}

const PanelHeader: React.FC<{
  panel: TxRxPanel; active: boolean; onPick: (p: TxRxPanel) => void;
}> = ({ panel, active, onPick }) => {
  const ok = panel === 'correct';
  return (
    <button
      type="button"
      onClick={() => onPick(panel)}
      aria-pressed={active}
      data-testid={`txrx-panel-${panel}`}
      className={`w-full flex items-center gap-2 mb-1 rounded-lg px-2 py-1.5 border transition-all press ${active ? 'border-cyan-400/50 bg-cyan-400/10' : 'border-white/5 bg-white/3'}`}
    >
      <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: ok ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)', color: ok ? '#4ade80' : '#f87171' }}>{ok ? '✓' : '✗'}</span>
      <p className="text-xs font-semibold flex-1 text-right" style={{ color: ok ? '#4ade80' : '#f87171' }}>{PANELS[panel].title}</p>
      <span className="text-[10px] text-slate-500">{active ? 'إخفاء' : 'لماذا؟'}</span>
    </button>
  );
};

export const TxRxCross: React.FC<TxRxCrossProps> = ({ onWiringExplore }) => {
  const { sel, toggle } = useReveal<TxRxPanel>();
  const pick = (p: TxRxPanel) => {
    toggle(p);
    onWiringExplore?.(p);
  };
  return (
    <DiagramFrame title="قاعدة TX/RX" hint="المُرسِل يتصل بالمُستقبِل دائمًا — متقاطع وليس متطابق. اضغط كل حالة لتعرف لماذا">
      {/* ✓ CORRECT wiring */}
      <div className="mb-2">
        <PanelHeader panel="correct" active={sel === 'correct'} onPick={pick} />
        <svg viewBox="0 0 300 160" className="w-full">
          <rect x="15" y="30" width="90" height="100" rx="10" fill={C.frame} stroke={C.stroke} strokeWidth="1.6" />
          <text x="60" y="22" textAnchor="middle" fill="#7fe9e9" fontSize="12" fontWeight="bold">FC</text>
          <rect x="195" y="30" width="90" height="100" rx="10" fill={C.frame} stroke={C.stroke} strokeWidth="1.6" />
          <text x="240" y="22" textAnchor="middle" fill="#7fe9e9" fontSize="12" fontWeight="bold">Receiver</text>

          <circle cx="105" cy="60" r="6" fill={C.green} />
          <text x="90" y="64" textAnchor="end" fill="#e2e8f0" fontSize="12" fontWeight="bold">TX</text>
          <circle cx="105" cy="100" r="6" fill={C.blue} />
          <text x="90" y="104" textAnchor="end" fill="#e2e8f0" fontSize="12" fontWeight="bold">RX</text>

          <circle cx="195" cy="60" r="6" fill={C.blue} />
          <text x="210" y="64" fill="#e2e8f0" fontSize="12" fontWeight="bold">RX</text>
          <circle cx="195" cy="100" r="6" fill={C.green} />
          <text x="210" y="104" fill="#e2e8f0" fontSize="12" fontWeight="bold">TX</text>

          <path d="M105 60 C148 60, 152 100, 195 100" fill="none" stroke={C.green} strokeWidth="2.5" className="flow-dash" />
          <path d="M105 100 C148 100, 152 60, 195 60" fill="none" stroke={C.blue} strokeWidth="2.5" className="flow-dash" />

          <line x1="105" y1="130" x2="195" y2="130" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3,3" />
          <circle cx="105" cy="130" r="4" fill="#94a3b8" />
          <circle cx="195" cy="130" r="4" fill="#94a3b8" />
          <text x="150" y="148" textAnchor="middle" fill="#64748b" fontSize="10">GND مشترك</text>

          <text x="150" y="78" textAnchor="middle" fill="#4ade80" fontSize="9">TX→RX</text>
          <text x="150" y="95" textAnchor="middle" fill="#60a5fa" fontSize="9">RX→TX</text>
        </svg>
      </div>

      {/* ✗ WRONG wiring */}
      <div className="mb-2">
        <PanelHeader panel="wrong" active={sel === 'wrong'} onPick={pick} />
        <svg viewBox="0 0 300 100" className="w-full">
          <rect x="15" y="20" width="80" height="60" rx="8" fill={C.frame} stroke="rgba(248,113,113,0.4)" strokeWidth="1.5" />
          <text x="55" y="14" textAnchor="middle" fill="#f87171" fontSize="11">FC</text>
          <circle cx="95" cy="50" r="5" fill={C.red} />
          <text x="80" y="54" textAnchor="end" fill="#f87171" fontSize="11" fontWeight="bold">TX</text>

          <rect x="125" y="20" width="80" height="60" rx="8" fill={C.frame} stroke="rgba(248,113,113,0.4)" strokeWidth="1.5" />
          <text x="165" y="14" textAnchor="middle" fill="#f87171" fontSize="11">Receiver</text>
          <circle cx="125" cy="50" r="5" fill={C.red} />
          <text x="140" y="54" fill="#f87171" fontSize="11" fontWeight="bold">TX</text>

          <line x1="95" y1="50" x2="125" y2="50" stroke={C.red} strokeWidth="2" />
          <line x1="108" y1="40" x2="112" y2="60" stroke={C.red} strokeWidth="3" />
          <line x1="112" y1="40" x2="108" y2="60" stroke={C.red} strokeWidth="3" />

          <rect x="210" y="20" width="40" height="30" rx="8" fill={C.frame} stroke="rgba(248,113,113,0.4)" strokeWidth="1.5" />
          <circle cx="210" cy="35" r="5" fill={C.blue} />
          <text x="195" y="39" textAnchor="end" fill="#60a5fa" fontSize="11" fontWeight="bold">RX</text>

          <rect x="255" y="20" width="40" height="30" rx="8" fill={C.frame} stroke="rgba(248,113,113,0.4)" strokeWidth="1.5" />
          <circle cx="255" cy="35" r="5" fill={C.blue} />
          <text x="270" y="39" fill="#60a5fa" fontSize="11" fontWeight="bold">RX</text>

          <line x1="210" y1="35" x2="255" y2="35" stroke={C.red} strokeWidth="2" />
          <line x1="230" y1="25" x2="234" y2="45" stroke={C.red} strokeWidth="3" />
          <line x1="234" y1="25" x2="230" y2="45" stroke={C.red} strokeWidth="3" />

          <text x="110" y="90" textAnchor="middle" fill="#f87171" fontSize="10">TX↔TX = ❌ لا يعمل</text>
          <text x="232" y="65" textAnchor="middle" fill="#f87171" fontSize="10">RX↔RX = ❌</text>
        </svg>
      </div>

      <DiagramInfo text={sel ? PANELS[sel].detail : null} placeholder="اضغط «لماذا؟» على الحالة الصحيحة ثم على الخاطئة" />
    </DiagramFrame>
  );
};

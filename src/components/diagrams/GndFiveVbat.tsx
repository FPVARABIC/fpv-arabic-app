import React from 'react';
import { DiagramFrame, DiagramInfo, DiagramWarn, Legend, useReveal, C } from './_shared';

const info: Record<string, string> = {
  vbat: 'VBAT: جهد البطارية الكامل (14–25V) — للأجهزة القوية مثل VTX والكاميرا. احذر: جهد عالٍ جدًا للأجهزة الحساسة.',
  v5: '5V: جهد منخفض منظَّم — للأجهزة الحساسة مثل Receiver والـ GPS. يأتي من BEC داخل ESC أو FC.',
  gnd: 'GND: الأرضي المشترك — يجب أن يكون مشتركًا بين كل الأجهزة. بدون GND لا توجد إشارة.',
};


export interface GndFiveVbatProps {
  /** Fired the first time a learner opens a given rail — lets a consuming
   *  lesson track "explored every rail" without duplicating this diagram's
   *  own selection state. */
  onRailExplore?: (railId: string) => void;
}

export const GndFiveVbat: React.FC<GndFiveVbatProps> = ({ onRailExplore }) => {
  const { sel, toggle } = useReveal<string>();
  const handleToggle = (id: string) => {
    toggle(id);
    onRailExplore?.(id);
  };
  return (
    <>
      {/* Component-scoped only (does not touch index.css's global .flow-dash,
          which several other diagrams also rely on) — stops the continuous
          VBAT/5V flow animations for users who requested reduced motion,
          while every static cue (labels, click handling) is untouched. */}
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .gnd-five-vbat-anim { animation: none !important; }
        }
      `}</style>
      <DiagramFrame title="مصادر الطاقة: GND / 5V / VBAT" hint="اضغط أي مسار لمعرفة استخدامه">
      <svg viewBox="0 0 320 200" className="w-full">
        {/* Central FC/ESC board */}
        <rect x="115" y="50" width="90" height="100" rx="10" fill={C.frame} stroke={C.stroke} strokeWidth="1.6"/>
        <text x="160" y="42" textAnchor="middle" fill="#7fe9e9" fontSize="11" fontWeight="bold">FC / ESC</text>
        <text x="160" y="105" textAnchor="middle" fill="#475569" fontSize="9">Power Distribution</text>

        {/* VBAT rail — thick red */}
        <g onClick={() => handleToggle('vbat')} style={{cursor:'pointer'}} data-testid="gnd-five-vbat-item-vbat">
          <rect x="0" y="55" width="320" height="18" rx="4" fill={sel==='vbat' ? 'rgba(248,113,113,0.15)' : 'transparent'}/>
          <line x1="20" y1="64" x2="115" y2="64" stroke={C.red} strokeWidth={sel==='vbat' ? 6 : 4} className="flow-dash gnd-five-vbat-anim"/>
          <line x1="205" y1="64" x2="300" y2="64" stroke={C.red} strokeWidth={sel==='vbat' ? 6 : 4} className="flow-dash gnd-five-vbat-anim"/>
          <circle cx="20" cy="64" r="7" fill={C.red} opacity="0.85"/>
          <circle cx="300" cy="64" r="7" fill={C.red} opacity="0.85"/>
          <text x="8" y="56" fill={C.red} fontSize="9" fontWeight="bold">VBAT</text>
          {/* Left device */}
          <rect x="0" y="72" width="50" height="20" rx="4" fill="rgba(248,113,113,0.1)" stroke={`${C.red}50`} strokeWidth="1"/>
          <text x="25" y="85" textAnchor="middle" fill={C.red} fontSize="8">VTX</text>
          {/* Right device */}
          <rect x="270" y="72" width="50" height="20" rx="4" fill="rgba(248,113,113,0.1)" stroke={`${C.red}50`} strokeWidth="1"/>
          <text x="295" y="85" textAnchor="middle" fill={C.red} fontSize="8">Camera</text>
        </g>

        {/* 5V rail — amber */}
        <g onClick={() => handleToggle('v5')} style={{cursor:'pointer'}} data-testid="gnd-five-vbat-item-v5">
          <rect x="0" y="96" width="320" height="18" rx="4" fill={sel==='v5' ? 'rgba(251,191,36,0.15)' : 'transparent'}/>
          <line x1="20" y1="105" x2="115" y2="105" stroke={C.amber} strokeWidth={sel==='v5' ? 6 : 4} className="flow-dash gnd-five-vbat-anim"/>
          <line x1="205" y1="105" x2="300" y2="105" stroke={C.amber} strokeWidth={sel==='v5' ? 6 : 4} className="flow-dash gnd-five-vbat-anim"/>
          <circle cx="20" cy="105" r="7" fill={C.amber} opacity="0.85"/>
          <circle cx="300" cy="105" r="7" fill={C.amber} opacity="0.85"/>
          <text x="8" y="97" fill={C.amber} fontSize="9" fontWeight="bold">5V</text>
          {/* Left device */}
          <rect x="0" y="113" width="50" height="20" rx="4" fill="rgba(251,191,36,0.1)" stroke={`${C.amber}50`} strokeWidth="1"/>
          <text x="25" y="126" textAnchor="middle" fill={C.amber} fontSize="8">Receiver</text>
          {/* Right device */}
          <rect x="270" y="113" width="50" height="20" rx="4" fill="rgba(251,191,36,0.1)" stroke={`${C.amber}50`} strokeWidth="1"/>
          <text x="295" y="126" textAnchor="middle" fill={C.amber} fontSize="8">GPS</text>
        </g>

        {/* GND rail — gray */}
        <g onClick={() => handleToggle('gnd')} style={{cursor:'pointer'}} data-testid="gnd-five-vbat-item-gnd">
          <rect x="0" y="137" width="320" height="18" rx="4" fill={sel==='gnd' ? 'rgba(148,163,184,0.15)' : 'transparent'}/>
          <line x1="20" y1="146" x2="115" y2="146" stroke={C.ground} strokeWidth={sel==='gnd' ? 6 : 4} strokeDasharray="4,3"/>
          <line x1="205" y1="146" x2="300" y2="146" stroke={C.ground} strokeWidth={sel==='gnd' ? 6 : 4} strokeDasharray="4,3"/>
          <circle cx="20" cy="146" r="7" fill={C.ground} opacity="0.7"/>
          <circle cx="300" cy="146" r="7" fill={C.ground} opacity="0.7"/>
          <text x="8" y="138" fill={C.ground} fontSize="9" fontWeight="bold">GND</text>
          <text x="160" y="165" textAnchor="middle" fill={C.ground} fontSize="9">مشترك لكل الأجهزة</text>
        </g>

        {/* Battery symbol at left edge */}
        <rect x="0" y="155" width="22" height="35" rx="3" fill="none" stroke="#94a3b8" strokeWidth="1"/>
        <rect x="6" y="152" width="10" height="4" rx="1" fill="#94a3b8"/>
        <text x="11" y="180" textAnchor="middle" fill="#64748b" fontSize="7">BAT</text>
      </svg>

      <Legend items={[
        { color: C.red, label: 'VBAT — جهد بطارية كامل (14–25V)' },
        { color: C.amber, label: '5V — منظَّم للأجهزة الحساسة' },
        { color: C.ground, label: 'GND — أرضي مشترك ضروري' },
      ]}/>
      <DiagramInfo text={sel ? info[sel] : null}/>
      <DiagramWarn>🔴 لا توصل VBAT مباشرة إلى دخل 5V — ستحرق الجهاز فورًا</DiagramWarn>
      </DiagramFrame>
    </>
  );
};

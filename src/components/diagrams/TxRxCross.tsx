import React from 'react';
import { DiagramFrame, C } from './_shared';

export const TxRxCross: React.FC = () => (
  <DiagramFrame title="قاعدة TX/RX" hint="المُرسِل يتصل بالمُستقبِل دائمًا — متقاطع وليس متطابق">
    {/* ✓ CORRECT wiring */}
    <div className="mb-2">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{background:'rgba(74,222,128,0.2)', color:'#4ade80'}}>✓</div>
        <p className="text-xs font-semibold" style={{color:'#4ade80'}}>الصحيح — التوصيل المتقاطع</p>
      </div>
      <svg viewBox="0 0 300 160" className="w-full">
        {/* FC box */}
        <rect x="15" y="30" width="90" height="100" rx="10" fill={C.frame} stroke={C.stroke} strokeWidth="1.6"/>
        <text x="60" y="22" textAnchor="middle" fill="#7fe9e9" fontSize="12" fontWeight="bold">FC</text>
        {/* Receiver box */}
        <rect x="195" y="30" width="90" height="100" rx="10" fill={C.frame} stroke={C.stroke} strokeWidth="1.6"/>
        <text x="240" y="22" textAnchor="middle" fill="#7fe9e9" fontSize="12" fontWeight="bold">Receiver</text>

        {/* FC pins */}
        <circle cx="105" cy="60" r="6" fill={C.green}/>
        <text x="90" y="64" textAnchor="end" fill="#e2e8f0" fontSize="12" fontWeight="bold">TX</text>
        <circle cx="105" cy="100" r="6" fill={C.blue}/>
        <text x="90" y="104" textAnchor="end" fill="#e2e8f0" fontSize="12" fontWeight="bold">RX</text>

        {/* Receiver pins */}
        <circle cx="195" cy="60" r="6" fill={C.blue}/>
        <text x="210" y="64" fill="#e2e8f0" fontSize="12" fontWeight="bold">RX</text>
        <circle cx="195" cy="100" r="6" fill={C.green}/>
        <text x="210" y="104" fill="#e2e8f0" fontSize="12" fontWeight="bold">TX</text>

        {/* Crossed wires — GREEN TX→RX */}
        <path d="M105 60 C148 60, 152 100, 195 100" fill="none" stroke={C.green} strokeWidth="2.5" className="flow-dash"/>
        {/* Crossed wires — BLUE RX→TX */}
        <path d="M105 100 C148 100, 152 60, 195 60" fill="none" stroke={C.blue} strokeWidth="2.5" className="flow-dash"/>

        {/* GND wire */}
        <line x1="105" y1="130" x2="195" y2="130" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3,3"/>
        <circle cx="105" cy="130" r="4" fill="#94a3b8"/>
        <circle cx="195" cy="130" r="4" fill="#94a3b8"/>
        <text x="150" y="148" textAnchor="middle" fill="#64748b" fontSize="10">GND مشترك</text>

        {/* Labels */}
        <text x="150" y="78" textAnchor="middle" fill="#4ade80" fontSize="9">TX→RX</text>
        <text x="150" y="95" textAnchor="middle" fill="#60a5fa" fontSize="9">RX→TX</text>
      </svg>
    </div>

    {/* ✗ WRONG wiring */}
    <div className="mb-2">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{background:'rgba(248,113,113,0.2)', color:'#f87171'}}>✗</div>
        <p className="text-xs font-semibold" style={{color:'#f87171'}}>الخطأ الشائع — لا يعمل أبدًا</p>
      </div>
      <svg viewBox="0 0 300 100" className="w-full">
        {/* Wrong: TX-TX */}
        <rect x="15" y="20" width="80" height="60" rx="8" fill={C.frame} stroke="rgba(248,113,113,0.4)" strokeWidth="1.5"/>
        <text x="55" y="14" textAnchor="middle" fill="#f87171" fontSize="11">FC</text>
        <circle cx="95" cy="50" r="5" fill={C.red}/>
        <text x="80" y="54" textAnchor="end" fill="#f87171" fontSize="11" fontWeight="bold">TX</text>

        <rect x="125" y="20" width="80" height="60" rx="8" fill={C.frame} stroke="rgba(248,113,113,0.4)" strokeWidth="1.5"/>
        <text x="165" y="14" textAnchor="middle" fill="#f87171" fontSize="11">Receiver</text>
        <circle cx="125" cy="50" r="5" fill={C.red}/>
        <text x="140" y="54" fill="#f87171" fontSize="11" fontWeight="bold">TX</text>

        <line x1="95" y1="50" x2="125" y2="50" stroke={C.red} strokeWidth="2"/>
        {/* Big X */}
        <line x1="108" y1="40" x2="112" y2="60" stroke={C.red} strokeWidth="3"/>
        <line x1="112" y1="40" x2="108" y2="60" stroke={C.red} strokeWidth="3"/>

        {/* Wrong: RX-RX */}
        <rect x="210" y="20" width="40" height="30" rx="8" fill={C.frame} stroke="rgba(248,113,113,0.4)" strokeWidth="1.5"/>
        <circle cx="210" cy="35" r="5" fill={C.blue}/>
        <text x="195" y="39" textAnchor="end" fill="#60a5fa" fontSize="11" fontWeight="bold">RX</text>

        <rect x="255" y="20" width="40" height="30" rx="8" fill={C.frame} stroke="rgba(248,113,113,0.4)" strokeWidth="1.5"/>
        <circle cx="255" cy="35" r="5" fill={C.blue}/>
        <text x="270" y="39" fill="#60a5fa" fontSize="11" fontWeight="bold">RX</text>

        <line x1="210" y1="35" x2="255" y2="35" stroke={C.red} strokeWidth="2"/>
        <line x1="230" y1="25" x2="234" y2="45" stroke={C.red} strokeWidth="3"/>
        <line x1="234" y1="25" x2="230" y2="45" stroke={C.red} strokeWidth="3"/>

        <text x="110" y="90" textAnchor="middle" fill="#f87171" fontSize="10">TX↔TX = ❌ لا يعمل</text>
        <text x="232" y="65" textAnchor="middle" fill="#f87171" fontSize="10">RX↔RX = ❌</text>
      </svg>
    </div>
  </DiagramFrame>
);

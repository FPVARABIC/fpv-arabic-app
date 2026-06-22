import React from 'react';
import { DiagramFrame, DiagramWarn, C } from './_shared';

export const TxRxCross: React.FC = () => (
  <DiagramFrame title="قاعدة TX/RX" hint="المُرسِل يتصل بالمُستقبِل دائمًا — متقاطع وليس متطابق">
    <svg viewBox="0 0 300 180" className="w-full">
      {/* FC box */}
      <rect x="20" y="40" width="90" height="100" rx="10" fill={C.frame} stroke={C.stroke} strokeWidth="1.6" />
      <text x="65" y="32" textAnchor="middle" fill="#7fe9e9" fontSize="12" fontWeight="bold">FC</text>
      {/* Receiver box */}
      <rect x="190" y="40" width="90" height="100" rx="10" fill={C.frame} stroke={C.stroke} strokeWidth="1.6" />
      <text x="235" y="32" textAnchor="middle" fill="#7fe9e9" fontSize="12" fontWeight="bold">Receiver</text>

      {/* pins */}
      <circle cx="110" cy="65" r="5" fill={C.green} /><text x="95" y="69" textAnchor="end" fill="#cbd5e1" fontSize="11">TX</text>
      <circle cx="110" cy="115" r="5" fill={C.blue} /><text x="95" y="119" textAnchor="end" fill="#cbd5e1" fontSize="11">RX</text>
      <circle cx="190" cy="65" r="5" fill={C.blue} /><text x="205" y="69" fill="#cbd5e1" fontSize="11">RX</text>
      <circle cx="190" cy="115" r="5" fill={C.green} /><text x="205" y="119" fill="#cbd5e1" fontSize="11">TX</text>

      {/* crossed wires */}
      <path d="M110 65 C 150 65, 150 115, 190 115" fill="none" stroke={C.green} strokeWidth="2.4" className="flow-dash" />
      <path d="M110 115 C 150 115, 150 65, 190 65" fill="none" stroke={C.blue} strokeWidth="2.4" className="flow-dash" />

      <text x="150" y="160" textAnchor="middle" fill="#64748b" fontSize="10">TX → RX و RX → TX</text>
    </svg>
    <div className="grid grid-cols-2 gap-2 mt-2">
      <DiagramWarn>✗ TX مع TX = خطأ</DiagramWarn>
      <DiagramWarn>✗ RX مع RX = خطأ</DiagramWarn>
    </div>
    <p className="text-[11px] text-slate-500 text-center mt-2">ولا تنسَ GND المشترك بين الجهازين</p>
  </DiagramFrame>
);

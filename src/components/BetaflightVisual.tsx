import React from 'react';

/** Compact inline visuals shown on each Betaflight section card. Keyed by section id. */
export const BetaflightVisual: React.FC<{ id: string }> = ({ id }) => {
  switch (id) {
    case 'ports':
      return (
        <div className="flex gap-1.5 mt-2">
          {['UART1', 'UART2', 'UART3'].map((u, i) => (
            <div key={u} className={`flex-1 rounded-md py-1 text-center text-[9px] font-mono border ${i === 1 ? 'bg-cyan-400/15 border-cyan-400/40 text-cyan-300' : 'bg-white/4 border-white/8 text-slate-500'}`}>{u}</div>
          ))}
        </div>
      );
    case 'receiver':
      return (
        <div className="flex items-end gap-1 mt-2 h-7">
          {[60, 90, 40, 75].map((h, i) => (
            <div key={i} className="flex-1 rounded-sm bg-gradient-to-t from-cyan-400/30 to-cyan-400/70" style={{ height: `${h}%` }} />
          ))}
        </div>
      );
    case 'modes':
      return (
        <div className="flex gap-2 mt-2">
          {['ARM', 'ANGLE'].map((m, i) => (
            <div key={m} className="flex items-center gap-1.5">
              <div className={`w-7 h-4 rounded-full flex items-center px-0.5 ${i === 0 ? 'bg-cyan-400/30 justify-end' : 'bg-white/8 justify-start'}`}>
                <div className={`w-3 h-3 rounded-full ${i === 0 ? 'bg-cyan-400' : 'bg-slate-500'}`} />
              </div>
              <span className="text-[9px] text-slate-400 font-mono">{m}</span>
            </div>
          ))}
        </div>
      );
    case 'motors':
      return (
        <div className="mt-2 rounded-md bg-red-500/12 border border-red-500/30 text-red-300 text-[10px] font-semibold text-center py-1">
          ⚠ لا مراوح أثناء الاختبار
        </div>
      );
    case 'cli':
      return (
        <div className="terminal mt-2">
          <div className="terminal-bar">
            <span className="terminal-dot" style={{ background: '#f87171' }} />
            <span className="terminal-dot" style={{ background: '#fbbf24' }} />
            <span className="terminal-dot" style={{ background: '#4ade80' }} />
          </div>
          <div className="px-2.5 py-1.5 text-cyan-300">
            <span className="text-slate-500"># </span>diff all
          </div>
        </div>
      );
    default:
      return null;
  }
};

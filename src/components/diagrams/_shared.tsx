import React from 'react';

/** Shared visual tokens for educational diagrams */
export const C = {
  cyan: '#18E6E6',
  blue: '#00D4FF',
  green: '#4ade80',
  amber: '#fbbf24',
  red: '#f87171',
  purple: '#c084fc',
  ground: '#94a3b8',
  frame: 'rgba(6,24,39,0.85)',
  stroke: 'rgba(34,211,238,0.5)',
};

interface FrameProps {
  children: React.ReactNode;
  /** optional helper line shown under the title */
  hint?: string;
  title?: string;
}

/** Card wrapper that frames every educational diagram consistently. */
export const DiagramFrame: React.FC<FrameProps> = ({ children, hint, title }) => (
  <div className="card-feature relative ambient-glow overflow-hidden">
    <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #18E6E6, #00B4FF, #7c5aff)' }} />
    <div className="relative z-10 p-4">
      {title && (
        <div className="flex items-center gap-2 mb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 glow-node" />
          <span className="text-sm font-bold text-cyan-300">{title}</span>
        </div>
      )}
      {hint && <p className="text-[10px] text-slate-500 mb-2">{hint}</p>}
      {children}
    </div>
  </div>
);

interface InfoProps {
  /** currently selected explanation, or null */
  text: string | null;
  placeholder?: string;
}

/** Reveal panel that shows the explanation of the tapped diagram part. */
export const DiagramInfo: React.FC<InfoProps> = ({ text, placeholder = 'اضغط على أي جزء لعرض شرحه' }) => (
  <div className={`mt-3 rounded-xl px-3 py-2.5 text-sm transition-all border ${text ? 'bg-cyan-400/8 border-cyan-400/30 text-slate-100' : 'bg-white/3 border-white/5 text-slate-500'}`}>
    {text || placeholder}
  </div>
);

interface LegendProps {
  items: { color: string; label: string }[];
}

export const Legend: React.FC<LegendProps> = ({ items }) => (
  <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 justify-center">
    {items.map((it, i) => (
      <span key={i} className="flex items-center gap-1.5 text-[11px] text-slate-400">
        <span className="w-3 h-1.5 rounded-full" style={{ background: it.color }} />
        {it.label}
      </span>
    ))}
  </div>
);

/** Small inline danger ribbon used inside diagrams. */
export const DiagramWarn: React.FC<{ children: React.ReactNode; tone?: 'danger' | 'warning' }> = ({ children, tone = 'danger' }) => (
  <div className={`mt-3 flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${tone === 'danger' ? 'bg-red-500/12 border border-red-500/30 text-red-300' : 'bg-amber-500/12 border border-amber-500/30 text-amber-300'}`}>
    {children}
  </div>
);

/** Hook for single-select interactive diagrams. */
export function useReveal<T extends string>() {
  const [sel, setSel] = React.useState<T | null>(null);
  const toggle = (v: T) => setSel(prev => (prev === v ? null : v));
  return { sel, toggle };
}

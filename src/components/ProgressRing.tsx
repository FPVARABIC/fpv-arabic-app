import React from 'react';

interface ProgressRingProps { progress: number; size?: number; strokeWidth?: number; label?: string; }

export const ProgressRing: React.FC<ProgressRingProps> = ({ progress, size = 80, strokeWidth = 6, label }) => {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (progress / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(24,230,230,0.15)" strokeWidth={strokeWidth}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="url(#prog)" strokeWidth={strokeWidth}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 0.5s ease' }}/>
        <defs>
          <linearGradient id="prog" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#18E6E6"/>
            <stop offset="100%" stopColor="#00D4FF"/>
          </linearGradient>
        </defs>
        <text x="50%" y="50%" textAnchor="middle" dy=".3em" fill="#F8FAFC" fontSize={size * 0.22} fontWeight="bold">{progress}%</text>
      </svg>
      {label && <span className="text-xs text-slate-400">{label}</span>}
    </div>
  );
};

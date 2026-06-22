import React from 'react';

interface LogoProps { size?: 'sm' | 'md' | 'lg'; }

export const Logo: React.FC<LogoProps> = ({ size = 'md' }) => {
  const dim = { sm: 28, md: 40, lg: 64 };
  const txt = { sm: 'text-base', md: 'text-xl', lg: 'text-3xl' };
  const d = dim[size];
  const id = `fpv-glow-${size}`;

  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 64 64" width={d} height={d} fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id={`${id}-body`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#18E6E6" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="#00D4FF" stopOpacity="0"/>
          </radialGradient>
          <filter id={`${id}-blur`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="blur"/>
            <feComposite in="SourceGraphic" in2="blur" operator="over"/>
          </filter>
          <filter id={`${id}-glow`}>
            <feGaussianBlur stdDeviation="1" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* Arms */}
        <line x1="32" y1="32" x2="14" y2="14" stroke="#18E6E6" strokeWidth="1.8" strokeLinecap="round" opacity="0.8"/>
        <line x1="32" y1="32" x2="50" y2="14" stroke="#18E6E6" strokeWidth="1.8" strokeLinecap="round" opacity="0.8"/>
        <line x1="32" y1="32" x2="14" y2="50" stroke="#18E6E6" strokeWidth="1.8" strokeLinecap="round" opacity="0.8"/>
        <line x1="32" y1="32" x2="50" y2="50" stroke="#18E6E6" strokeWidth="1.8" strokeLinecap="round" opacity="0.8"/>

        {/* Propeller motor mounts */}
        <circle cx="13" cy="13" r="7" stroke="#00D4FF" strokeWidth="1.4" strokeDasharray="3 1.5" opacity="0.9" filter={`url(#${id}-glow)`}/>
        <circle cx="51" cy="13" r="7" stroke="#00D4FF" strokeWidth="1.4" strokeDasharray="3 1.5" opacity="0.9" filter={`url(#${id}-glow)`}/>
        <circle cx="13" cy="51" r="7" stroke="#00D4FF" strokeWidth="1.4" strokeDasharray="3 1.5" opacity="0.9" filter={`url(#${id}-glow)`}/>
        <circle cx="51" cy="51" r="7" stroke="#00D4FF" strokeWidth="1.4" strokeDasharray="3 1.5" opacity="0.9" filter={`url(#${id}-glow)`}/>

        {/* Propeller blades */}
        <ellipse cx="13" cy="13" rx="6" ry="2.2" fill="rgba(24,230,230,0.15)" stroke="#18E6E6" strokeWidth="0.8" transform="rotate(-45 13 13)"/>
        <ellipse cx="13" cy="13" rx="6" ry="2.2" fill="rgba(24,230,230,0.15)" stroke="#18E6E6" strokeWidth="0.8" transform="rotate(45 13 13)"/>
        <ellipse cx="51" cy="13" rx="6" ry="2.2" fill="rgba(24,230,230,0.15)" stroke="#18E6E6" strokeWidth="0.8" transform="rotate(45 51 13)"/>
        <ellipse cx="51" cy="13" rx="6" ry="2.2" fill="rgba(24,230,230,0.15)" stroke="#18E6E6" strokeWidth="0.8" transform="rotate(-45 51 13)"/>
        <ellipse cx="13" cy="51" rx="6" ry="2.2" fill="rgba(24,230,230,0.15)" stroke="#18E6E6" strokeWidth="0.8" transform="rotate(45 13 51)"/>
        <ellipse cx="13" cy="51" rx="6" ry="2.2" fill="rgba(24,230,230,0.15)" stroke="#18E6E6" strokeWidth="0.8" transform="rotate(-45 13 51)"/>
        <ellipse cx="51" cy="51" rx="6" ry="2.2" fill="rgba(24,230,230,0.15)" stroke="#18E6E6" strokeWidth="0.8" transform="rotate(-45 51 51)"/>
        <ellipse cx="51" cy="51" rx="6" ry="2.2" fill="rgba(24,230,230,0.15)" stroke="#18E6E6" strokeWidth="0.8" transform="rotate(45 51 51)"/>

        {/* Frame body center glow */}
        <circle cx="32" cy="32" r="10" fill={`url(#${id}-body)`}/>

        {/* Frame body */}
        <rect x="26" y="26" width="12" height="12" rx="3" stroke="#18E6E6" strokeWidth="1.6" fill="rgba(6,24,39,0.8)" filter={`url(#${id}-glow)`}/>

        {/* Center dot (camera/FC indicator) */}
        <circle cx="32" cy="32" r="2.5" fill="#18E6E6" opacity="0.9"/>
        <circle cx="32" cy="32" r="1.2" fill="#ffffff" opacity="0.8"/>
      </svg>

      <span className={`font-bold text-gradient tracking-wide ${txt[size]}`} style={{ fontFamily: 'Segoe UI, Tahoma, Arial, sans-serif' }}>
        FPV بالعربي
      </span>
    </div>
  );
};

import React from 'react';

interface LogoProps { size?: 'sm' | 'md' | 'lg'; }

export const Logo: React.FC<LogoProps> = ({ size = 'md' }) => {
  const sizes = { sm: { icon: 24, text: 'text-base' }, md: { icon: 32, text: 'text-xl' }, lg: { icon: 48, text: 'text-3xl' } };
  const s = sizes[size];
  return (
    <div className="flex items-center gap-2">
      <div className="relative" style={{ width: s.icon, height: s.icon }}>
        <svg viewBox="0 0 48 48" width={s.icon} height={s.icon} fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="24" cy="24" r="8" fill="none" stroke="#18E6E6" strokeWidth="2"/>
          <circle cx="24" cy="24" r="3" fill="#18E6E6"/>
          <ellipse cx="10" cy="10" rx="7" ry="3.5" fill="none" stroke="#00D4FF" strokeWidth="1.5" transform="rotate(-45 10 10)"/>
          <ellipse cx="38" cy="10" rx="7" ry="3.5" fill="none" stroke="#00D4FF" strokeWidth="1.5" transform="rotate(45 38 10)"/>
          <ellipse cx="10" cy="38" rx="7" ry="3.5" fill="none" stroke="#00D4FF" strokeWidth="1.5" transform="rotate(45 10 38)"/>
          <ellipse cx="38" cy="38" rx="7" ry="3.5" fill="none" stroke="#00D4FF" strokeWidth="1.5" transform="rotate(-45 38 38)"/>
          <line x1="16" y1="16" x2="10" y2="10" stroke="#18E6E6" strokeWidth="1.5"/>
          <line x1="32" y1="16" x2="38" y2="10" stroke="#18E6E6" strokeWidth="1.5"/>
          <line x1="16" y1="32" x2="10" y2="38" stroke="#18E6E6" strokeWidth="1.5"/>
          <line x1="32" y1="32" x2="38" y2="38" stroke="#18E6E6" strokeWidth="1.5"/>
        </svg>
      </div>
      <span className={`font-bold text-gradient ${s.text}`}>FPV بالعربي</span>
    </div>
  );
};

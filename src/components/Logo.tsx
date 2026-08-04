import React from 'react';

interface LogoProps { size?: 'sm' | 'md' | 'lg'; }

const heights: Record<NonNullable<LogoProps['size']>, number> = { sm: 80, md: 100, lg: 140 };

export const Logo: React.FC<LogoProps> = ({ size = 'md' }) => (
  <img
    src="/assets/logo.png"
    alt="FPVARABIC"
    style={{
      height: heights[size],
      width: 'auto',
      maxWidth: 'none',
      objectFit: 'contain',
      display: 'block',
      filter: 'drop-shadow(0 0 10px rgba(24,230,230,0.45))',
    }}
  />
);

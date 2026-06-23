import React from 'react';

interface LogoProps { size?: 'sm' | 'md' | 'lg'; }

const heights: Record<NonNullable<LogoProps['size']>, number> = { sm: 48, md: 64, lg: 108 };

export const Logo: React.FC<LogoProps> = ({ size = 'md' }) => (
  <img
    src="/assets/logo.png"
    alt="FPV بالعربي"
    height={heights[size]}
    style={{ height: heights[size], width: 'auto', objectFit: 'contain', display: 'block' }}
  />
);

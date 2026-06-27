import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const QuadcopterIcon: React.FC = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    {/* Arms */}
    <path d="M12 10.5L6 5.5"   stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M12 10.5L18 5.5"  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M12 13.5L6 18.5"  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M12 13.5L18 18.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    {/* Central body */}
    <rect x="9.5" y="9.5" width="5" height="5" rx="1.5" fill="currentColor"/>
    {/* Rotors */}
    <circle cx="6"  cy="5.5"  r="2.5" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.2"/>
    <circle cx="18" cy="5.5"  r="2.5" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.2"/>
    <circle cx="6"  cy="18.5" r="2.5" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.2"/>
    <circle cx="18" cy="18.5" r="2.5" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.2"/>
  </svg>
);

export const QuadcopterLauncher: React.FC = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Suppress when already on the bot assistant page
  if (pathname === '/bot') return null;

  return (
    <button
      onClick={() => navigate('/bot')}
      aria-label="فتح مساعد FPV"
      className="absolute press"
      style={{
        bottom: '80px',
        left: '16px',
        width: '48px',
        height: '48px',
        zIndex: 35,
        borderRadius: '16px',
        background: 'linear-gradient(135deg, rgba(8,22,38,0.92) 0%, rgba(4,16,30,0.96) 100%)',
        border: '1px solid rgba(34,211,238,0.30)',
        boxShadow: '0 0 12px rgba(34,211,238,0.18), 0 3px 10px rgba(0,0,0,0.5)',
        color: '#22d3ee',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(10px)',
        cursor: 'pointer',
        transition: 'box-shadow 0.2s, border-color 0.2s',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget;
        el.style.boxShadow = '0 0 22px rgba(34,211,238,0.4), 0 4px 12px rgba(0,0,0,0.5)';
        el.style.borderColor = 'rgba(34,211,238,0.55)';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget;
        el.style.boxShadow = '0 0 12px rgba(34,211,238,0.18), 0 3px 10px rgba(0,0,0,0.5)';
        el.style.borderColor = 'rgba(34,211,238,0.30)';
      }}
    >
      <QuadcopterIcon/>
    </button>
  );
};

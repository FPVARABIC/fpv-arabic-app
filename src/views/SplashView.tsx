import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useProgress } from '../hooks/useProgress';

export const SplashView: React.FC = () => {
  const navigate = useNavigate();
  const { setHasStarted } = useProgress();

  React.useEffect(() => {
    const t = setTimeout(() => {
      setHasStarted(true);
      navigate('/home', { replace: true });
    }, 2500);
    return () => clearTimeout(t);
  }, []);

  return (
    /* Same desktop frame as AppShell: dark surround, 390px column */
    <div
      className="min-h-screen flex justify-center"
      style={{ background: '#02080f' }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '390px',
          minHeight: '100vh',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 0 0 1px rgba(34,211,238,0.13), 0 0 70px rgba(24,230,230,0.08)',
        }}
      >
        {/* full-bleed splash artwork, fitted to phone frame */}
        <img
          src="/assets/splash.png"
          alt=""
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center top',
          }}
        />
        {/* bottom fade so the transition to home feels smooth */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, transparent 60%, rgba(4,16,30,0.9) 100%)',
            pointerEvents: 'none',
          }}
          aria-hidden
        />
        {/* loading dots */}
        <div
          style={{
            position: 'absolute',
            bottom: 48,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            gap: 8,
          }}
          aria-hidden
        >
          {[0, 0.2, 0.4].map((delay, i) => (
            <span
              key={i}
              className="animate-pulse"
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#22d3ee',
                animationDelay: `${delay}s`,
                display: 'block',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

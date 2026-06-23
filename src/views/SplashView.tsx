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
    <div
      style={{
        background: '#02080f',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* Phone-frame column — matches AppShell frame */}
      <div
        style={{
          width: '100%',
          maxWidth: '390px',
          position: 'relative',
          boxShadow: '0 0 0 1px rgba(34,211,238,0.13), 0 0 70px rgba(24,230,230,0.08)',
        }}
      >
        {/*
          In-flow image: width 100% + height auto means the image
          scales to the container width and shows its full height.
          At 390px wide, splash.png (853×1844) renders at ~390×844 —
          the full artwork is visible with no crop.
        */}
        <img
          src="/assets/splash.png"
          alt=""
          aria-hidden
          style={{ width: '100%', height: 'auto', display: 'block' }}
        />

        {/* Bottom gradient so the transition feels smooth */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '120px',
            background: 'linear-gradient(to bottom, transparent, rgba(4,16,30,0.85))',
            pointerEvents: 'none',
          }}
          aria-hidden
        />

        {/* Loading dots — absolute at bottom of image */}
        <div
          style={{
            position: 'absolute',
            bottom: 36,
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

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useProgress } from '../hooks/useProgress';

export const SplashView: React.FC = () => {
  const navigate = useNavigate();
  const { hasStarted, setHasStarted } = useProgress();

  React.useEffect(() => {
    if (hasStarted) {
      navigate('/home', { replace: true });
      return;
    }
    const t = setTimeout(() => {
      setHasStarted(true);
      navigate('/home', { replace: true });
    }, 2500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden" dir="rtl">
      {/* full-bleed splash artwork */}
      <img
        src="/assets/splash.png"
        alt=""
        aria-hidden
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* bottom fade into app shell */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, transparent 65%, rgba(4,16,30,0.85) 100%)' }}
        aria-hidden
      />
      {/* subtle loading indicator */}
      <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-1.5" aria-hidden>
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"/>
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" style={{ animationDelay: '0.2s' }}/>
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" style={{ animationDelay: '0.4s' }}/>
      </div>
    </div>
  );
};

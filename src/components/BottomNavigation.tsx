import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { House, Wrench, BookOpen, CircuitBoard, Gauge } from 'lucide-react';

const mainNav = [
  { icon: House,        label: 'الرئيسية', path: '/home' },
  { icon: Wrench,       label: 'البناء',   path: '/roadmap' },
  { icon: BookOpen,     label: 'الدروس',   path: '/lessons' },
  { icon: CircuitBoard, label: 'Betaflight', path: '/betaflight' },
  { icon: Gauge,        label: 'التقدم',   path: '/progress' },
];

export const BottomNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) =>
    location.pathname === path || (path !== '/home' && location.pathname.startsWith(path));

  return (
    <>
      {/* gradient fade — constrained to 390px column */}
      <div className="fixed bottom-0 left-0 right-0 z-20 h-12 pointer-events-none flex justify-center" aria-hidden>
        <div className="w-full max-w-[390px]" style={{ background: 'linear-gradient(to top, #04101e 10%, transparent)' }}/>
      </div>

      {/* nav bar — constrained to 390px column */}
      <div className="fixed bottom-0 left-0 right-0 z-30 flex justify-center">
        <nav
          className="w-full max-w-[390px]"
          style={{
            background: 'rgba(5,18,31,0.92)',
            backdropFilter: 'blur(20px)',
            borderTop: '1px solid rgba(34,211,238,0.25)',
          }}
        >
          <div className="flex items-center justify-around px-1 pt-3 pb-3" style={{ minHeight: 64 }}>
            {mainNav.map(item => {
              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`relative flex flex-col items-center gap-1 px-2 py-1.5 rounded-2xl press transition-all ${active ? 'text-cyan-300' : 'text-slate-400 hover:text-slate-300'}`}
                  style={active ? { background: 'linear-gradient(135deg, rgba(24,230,230,0.24), rgba(0,160,255,0.14))', boxShadow: '0 0 14px -5px rgba(34,211,238,0.55)' } : undefined}
                >
                  <div className="relative w-5 h-5 flex items-center justify-center">
                    {active && (
                      <svg
                        width="28" height="28" viewBox="0 0 28 28"
                        className="absolute spin-slow"
                        style={{ top: '-4px', left: '-4px', pointerEvents: 'none', zIndex: 0 }}
                        aria-hidden
                      >
                        <circle cx="14" cy="14" r="12" fill="none" stroke="#22d3ee" strokeWidth="1.5" strokeDasharray="18.85 56.55" strokeLinecap="round"/>
                        <circle cx="26" cy="14" r="2" fill="#d946ef"/>
                      </svg>
                    )}
                    <item.icon size={20} style={{ position: 'relative', zIndex: 1 }}/>
                  </div>
                  <span className={`text-xs ${active ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </>
  );
};

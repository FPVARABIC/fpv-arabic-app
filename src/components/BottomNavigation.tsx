import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Map, BookOpen, Cpu, BarChart2 } from 'lucide-react';

const mainNav = [
  { icon: Home,      label: 'الرئيسية', path: '/home' },
  { icon: Map,       label: 'البناء',   path: '/roadmap' },
  { icon: BookOpen,  label: 'الدروس',   path: '/lessons' },
  { icon: Cpu,       label: 'Betaflight', path: '/betaflight' },
  { icon: BarChart2, label: 'التقدم',   path: '/progress' },
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
            background: 'rgba(5,18,31,0.88)',
            backdropFilter: 'blur(18px)',
            borderTop: '1px solid transparent',
            borderImage: 'linear-gradient(90deg, transparent, rgba(34,211,238,0.45), transparent) 1',
          }}
        >
          <div className="flex items-center justify-around px-1 py-2.5" style={{ minHeight: 64 }}>
            {mainNav.map(item => {
              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`relative flex flex-col items-center gap-1 px-2 py-1.5 rounded-2xl press transition-all ${active ? 'text-cyan-300' : 'text-slate-500 hover:text-slate-300'}`}
                  style={active ? { background: 'linear-gradient(135deg, rgba(24,230,230,0.18), rgba(0,160,255,0.10))', boxShadow: '0 0 18px -6px rgba(24,230,230,0.6)' } : undefined}
                >
                  <item.icon size={20}/>
                  <span className={`text-[11px] ${active ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </>
  );
};

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Map, BookOpen, CheckSquare, MoreHorizontal, X, Settings, Cpu, Wrench, Bot, BarChart2, Info, Mail } from 'lucide-react';

const mainNav = [
  { icon: Home, label: 'الرئيسية', path: '/home' },
  { icon: Map, label: 'البناء', path: '/roadmap' },
  { icon: BookOpen, label: 'الدروس', path: '/lessons' },
  { icon: CheckSquare, label: 'Checklist', path: '/checklists' },
  { icon: MoreHorizontal, label: 'المزيد', path: '__more' },
];

const moreNav = [
  { icon: Cpu, label: 'Betaflight', path: '/betaflight' },
  { icon: Wrench, label: 'المشاكل', path: '/troubleshooting' },
  { icon: Bot, label: 'مساعد FPV', path: '/bot' },
  { icon: BarChart2, label: 'التقدم', path: '/progress' },
  { icon: Settings, label: 'الإعدادات', path: '/settings' },
  { icon: Info, label: 'حول التطبيق', path: '/about' },
  { icon: Mail, label: 'اتصل بنا', path: '/contact' },
];

export const BottomNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showMore, setShowMore] = useState(false);

  const isActive = (path: string) => location.pathname === path || (path !== '/home' && location.pathname.startsWith(path));

  return (
    <>
      {showMore && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setShowMore(false)}>
          <div className="absolute bottom-[4.5rem] left-0 right-0 mx-4 card-feature p-4 fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-cyan-300">القائمة الكاملة</span>
              <button onClick={() => setShowMore(false)}><X size={18} className="text-slate-400"/></button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {moreNav.map(item => (
                <button key={item.path} onClick={() => { navigate(item.path); setShowMore(false); }}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all ${isActive(item.path) ? 'bg-cyan-400/20 text-cyan-300' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                  <item.icon size={22}/>
                  <span className="text-[11px]">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* gradient fade so content dissolves into the nav */}
      <div className="fixed bottom-0 left-0 right-0 z-20 h-12 pointer-events-none"
        style={{ background: 'linear-gradient(to top, #04101e 10%, transparent)' }} aria-hidden/>

      <nav className="fixed bottom-0 left-0 right-0 z-30"
        style={{ background: 'rgba(5,18,31,0.88)', backdropFilter: 'blur(18px)', borderTop: '1px solid transparent',
          borderImage: 'linear-gradient(90deg, transparent, rgba(34,211,238,0.45), transparent) 1' }}>
        <div className="flex items-center justify-around px-2 py-2.5" style={{ minHeight: 64 }}>
          {mainNav.map(item => {
            const active = item.path === '__more' ? showMore : isActive(item.path);
            return (
              <button key={item.path} onClick={() => item.path === '__more' ? setShowMore(!showMore) : navigate(item.path)}
                className={`relative flex flex-col items-center gap-1 px-3.5 py-1.5 rounded-2xl press transition-all ${active ? 'text-cyan-300' : 'text-slate-500 hover:text-slate-300'}`}
                style={active ? { background: 'linear-gradient(135deg, rgba(24,230,230,0.18), rgba(0,160,255,0.10))', boxShadow: '0 0 18px -6px rgba(24,230,230,0.6)' } : undefined}>
                <item.icon size={22}/>
                <span className={`text-[11px] ${active ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};

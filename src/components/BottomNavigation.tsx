import React, { useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { House, Wrench, BookOpen, CircuitBoard, Package } from 'lucide-react';

const mainNav: { icon: typeof House; label: string; path: string; activeMatchPrefixes?: string[] }[] = [
  { icon: House,        label: 'الرئيسية', path: '/home' },
  { icon: Wrench,       label: 'البناء',   path: '/roadmap' },
  { icon: BookOpen,     label: 'الدروس',   path: '/lessons' },
  { icon: CircuitBoard, label: 'البرمجة',  path: '/programming', activeMatchPrefixes: ['/programming', '/betaflight'] },
  { icon: Package,      label: 'التجميع',  path: '/assembly' },
];

export const BottomNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (item: (typeof mainNav)[number]) => {
    if (item.activeMatchPrefixes) {
      return item.activeMatchPrefixes.some(prefix => location.pathname === prefix || location.pathname.startsWith(`${prefix}/`));
    }
    return location.pathname === item.path || (item.path !== '/home' && location.pathname.startsWith(item.path));
  };

  // Home is the one tab whose destination route (/home) hosts its own
  // internal screen state (CommunityHomeScreens' feed/post/search/saved/
  // compose/profile) that persists for as long as the /home route stays
  // mounted. A plain navigate('/home') is a no-op when the pathname is
  // already '/home' — React Router never remounts the route, so that
  // internal state would otherwise never reset, leaving the user stuck on
  // whatever Community sub-screen they were viewing. Passing a fresh
  // `homeReset` value in navigation state works regardless of whether the
  // pathname itself changes: useLocation() re-renders on every navigate()
  // call (a new location/key is produced even for an identical path), so
  // CommunityHomeScreens can watch location.state.homeReset and reset itself
  // every time Home is pressed — this is the single centralized signal every
  // "return to Home" action funnels through, rather than a one-off reset
  // wired into each individual Community sub-screen.
  // A monotonically incrementing ref, not Date.now()/Math.random() — those
  // are impure calls React's own lint rules reject inside a component's
  // render scope (even inside a callback defined there); mutating a ref is
  // the standard, rule-compliant way to mint a fresh, always-distinct value
  // on each click.
  const homeResetCounterRef = useRef(0);
  const handleNavClick = (item: (typeof mainNav)[number]) => {
    if (item.path === '/home') {
      homeResetCounterRef.current += 1;
      navigate('/home', { state: { homeReset: homeResetCounterRef.current } });
    } else {
      navigate(item.path);
    }
  };

  return (
    <>
      {/* gradient fade — constrained to 390px column */}
      <div className="fixed bottom-0 left-0 right-0 z-20 h-12 pointer-events-none flex justify-center" aria-hidden>
        <div className="w-full max-w-[390px]" style={{ background: 'linear-gradient(to top, rgba(4,16,30,0.6) 10%, transparent)' }}/>
      </div>

      {/* nav bar — constrained to 390px column */}
      <div className="fixed bottom-0 left-0 right-0 z-30 flex justify-center">
        <nav
          className="w-full max-w-[390px]"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.35) 0%, transparent 12px), #5EEAD4',
            borderTop: '1px solid rgba(103,232,249,0.2)',
          }}
        >
          <div className="flex items-center justify-around px-1 pt-3 pb-3" style={{ minHeight: 64 }}>
            {mainNav.map(item => {
              const active = isActive(item);
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavClick(item)}
                  className={`relative flex flex-col items-center gap-1 px-2 py-1.5 rounded-2xl press transition-all ${active ? 'text-[#12222a]' : 'text-[#3a484d] hover:text-[#26353c]'}`}
                  style={active ? { background: 'rgba(103,232,249,0.3)', boxShadow: '0 0 14px -4px rgba(103,232,249,0.7)' } : undefined}
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

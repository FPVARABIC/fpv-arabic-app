import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, BookOpen, Map, CheckSquare, Cpu, Wrench, BarChart2, ChevronLeft, Zap, HelpCircle } from 'lucide-react';
import { useBotOverlay } from '../contexts/BotOverlayContext';

const QuadcopterIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
    <path d="M12 10.5L6 5.5"   stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M12 10.5L18 5.5"  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M12 13.5L6 18.5"  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M12 13.5L18 18.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <rect x="9.5" y="9.5" width="5" height="5" rx="1.5" fill="currentColor"/>
    <circle cx="6"  cy="5.5"  r="2.5" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.2"/>
    <circle cx="18" cy="5.5"  r="2.5" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.2"/>
    <circle cx="6"  cy="18.5" r="2.5" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.2"/>
    <circle cx="18" cy="18.5" r="2.5" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.2"/>
  </svg>
);

const quickActions = [
  { icon: HelpCircle, label: 'لا أعرف من أين أبدأ', route: '/bot' },
  { icon: BookOpen, label: 'اختيار القطع', route: '/lessons/lesson-3' },
  { icon: Map, label: 'خريطة البناء', route: '/roadmap' },
  { icon: CheckSquare, label: 'Checklist قبل الطيران', route: '/checklists' },
  { icon: Cpu, label: 'مشكلة في Betaflight', route: '/betaflight' },
  { icon: Wrench, label: 'Receiver لا يعمل', route: '/troubleshooting' },
  { icon: Zap, label: 'المحركات لا تدور', route: '/betaflight/motors' },
  { icon: BarChart2, label: 'تقدمي في التعلم', route: '/progress' },
  { icon: BookOpen, label: 'درس التوصيل TX/RX', route: '/lessons/lesson-9' },
  { icon: QuadcopterIcon, label: 'مساعد FPV الكامل', route: '/bot' },
];

const BUTTON_SIZE = 56;
const DRAG_THRESHOLD = 5;
const STORAGE_KEY = 'floatingAssistantPos';

export const FloatingAssistant: React.FC = () => {
  const { openBot } = useBotOverlay();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ x: 334 - 16, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, posX: 0, posY: 0 });
  const [bounds, setBounds] = useState({ width: 390, height: 844, navHeight: 80 });

  const buttonRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();

  const calculateBounds = () => {
    const frame = document.querySelector('[data-app-frame="true"]') as HTMLElement;
    if (!frame) return;

    const frameRect = frame.getBoundingClientRect();
    const nav = document.querySelector('nav') as HTMLElement;
    const navHeight = nav ? nav.offsetHeight : 80;

    setBounds({
      width: frameRect.width,
      height: frameRect.height,
      navHeight,
    });
  };

  const getMaxPosition = () => ({
    x: Math.max(0, bounds.width - BUTTON_SIZE),
    y: Math.max(0, bounds.height - BUTTON_SIZE - bounds.navHeight - 16),
  });

  const clampPosition = (x: number, y: number) => {
    const max = getMaxPosition();
    return {
      x: Math.max(0, Math.min(x, max.x)),
      y: Math.max(0, Math.min(y, max.y)),
    };
  };

  useEffect(() => {
    calculateBounds();
    const timer = setTimeout(() => calculateBounds(), 100);
    window.addEventListener('resize', calculateBounds);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', calculateBounds);
    };
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const savedPos = JSON.parse(saved);
        const clamped = clampPosition(savedPos.x, savedPos.y);
        setPosition(clamped);
      } catch {
        // fallback to default
      }
    }
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (open) {
      setOpen(false);
      return;
    }

    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y,
    });
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLButtonElement>) => {
    if (open) {
      setOpen(false);
      return;
    }

    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({
      x: touch.clientX,
      y: touch.clientY,
      posX: position.x,
      posY: position.y,
    });
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      const clamped = clampPosition(dragStart.posX + deltaX, dragStart.posY + deltaY);
      setPosition(clamped);
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const deltaX = touch.clientX - dragStart.x;
      const deltaY = touch.clientY - dragStart.y;
      const clamped = clampPosition(dragStart.posX + deltaX, dragStart.posY + deltaY);
      setPosition(clamped);
    };

    const handleEnd = () => {
      setIsDragging(false);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, dragStart, bounds]);

  const handleClick = () => {
    const movementDistance = Math.sqrt(
      Math.pow(position.x - dragStart.posX, 2) + Math.pow(position.y - dragStart.posY, 2)
    );
    if (movementDistance < DRAG_THRESHOLD) {
      setOpen(o => !o);
    }
  };

  const handleAction = (route: string) => {
    setOpen(false);
    if (route === '/bot') {
      openBot();
    } else {
      navigate(route);
    }
  };

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm fade-in" onClick={() => setOpen(false)} />
      )}

      {open && (
        <div className="fixed bottom-0 left-0 right-0 z-50 fade-in" onClick={e => e.stopPropagation()}>
          <div className="max-w-lg mx-auto px-3 pb-3">
            <div className="card-feature p-5"
              style={{ borderRadius: '24px 24px 18px 18px',
                boxShadow: '0 -8px 40px rgba(34,211,238,0.14), 0 8px 32px rgba(0,0,0,0.6)' }}>
              <div className="w-10 h-1 rounded-full bg-white/15 mx-auto mb-4"/>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, rgba(24,230,230,0.18), rgba(0,160,255,0.12))', border: '1px solid rgba(34,211,238,0.3)' }}>
                    <QuadcopterIcon size={20} className="text-cyan-300" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-white">مساعد FPV</p>
                    <p className="text-xs text-slate-400">اختر ما تحتاجه للبدء بسرعة</p>
                  </div>
                </div>
                <button onClick={() => setOpen(false)}
                  className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                  <X size={16} className="text-slate-400" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {quickActions.map((action, i) => (
                  <button key={i} onClick={() => handleAction(action.route)}
                    className="card-subtle flex items-center gap-2.5 p-3 text-right press">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(24,230,230,0.12)', border: '1px solid rgba(34,211,238,0.22)' }}>
                      <action.icon size={15} className="text-cyan-300" />
                    </div>
                    <span className="text-xs text-slate-200 text-right leading-tight font-medium flex-1">{action.label}</span>
                    <ChevronLeft size={12} className="text-slate-500 flex-shrink-0" />
                  </button>
                ))}
              </div>

              <button onClick={() => handleAction('/bot')}
                className="btn-secondary w-full mt-4 text-sm">
                افتح المساعد الكامل <ChevronLeft size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        ref={buttonRef}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className={`absolute z-50 w-14 h-14 rounded-2xl flex items-center justify-center press transition-shadow ${open ? '' : 'pulse-ring'}`}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          background: 'linear-gradient(135deg, #0a93b8, #06b6d4)',
          boxShadow: open
            ? '0 0 28px rgba(34,211,238,0.6), 0 6px 20px rgba(0,0,0,0.5)'
            : '0 0 18px rgba(34,211,238,0.4), 0 6px 16px rgba(0,0,0,0.5)',
          border: '1px solid rgba(34,211,238,0.5)',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        onMouseEnter={e => { if (!isDragging) (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 36px rgba(34,211,238,0.75), 0 6px 20px rgba(0,0,0,0.5)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = open ? '0 0 28px rgba(34,211,238,0.6), 0 6px 20px rgba(0,0,0,0.5)' : '0 0 18px rgba(34,211,238,0.4), 0 6px 16px rgba(0,0,0,0.5)'; }}
        aria-label="مساعد FPV">
        {open ? <X size={22} className="text-white" /> : <QuadcopterIcon size={24} className="text-white" />}
      </button>
    </>
  );
};

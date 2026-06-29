import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { useBotOverlay } from '../contexts/BotOverlayContext';

const BUTTON_SIZE = 52;
const DRAG_THRESHOLD = 5;
const STORAGE_KEY = 'botLauncherPos';
const NAV_HEIGHT = 80;
const EDGE_MARGIN = 10;

const QuadcopterIcon: React.FC = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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

const getFrameRect = (): DOMRect | null => {
  const el = document.querySelector('[data-app-frame="true"]');
  return el ? el.getBoundingClientRect() : null;
};

// x: frame-relative (0…frameWidth). y: viewport-relative (0…innerHeight).
// Rendered as: left = frameLeft + x, top = y (position: fixed).
// Decoupling y from frameRect.top means the button stays viewport-pinned during scroll.
const clampPos = (x: number, y: number, frameWidth: number, vpHeight: number) => ({
  x: Math.max(EDGE_MARGIN, Math.min(x, frameWidth - BUTTON_SIZE - EDGE_MARGIN)),
  y: Math.max(EDGE_MARGIN, Math.min(y, vpHeight - BUTTON_SIZE - NAV_HEIGHT - EDGE_MARGIN)),
});

export const QuadcopterLauncher: React.FC = () => {
  const { pathname } = useLocation();
  const { isOpen, toggleBot } = useBotOverlay();

  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [frameLeft, setFrameLeft] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const dragStart = useRef({ clientX: 0, clientY: 0, posX: 0, posY: 0 });
  const hasDragged = useRef(false);
  // Stays current with position state; used in event-listener closures to avoid stale captures
  const posRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (position) posRef.current = position;
  }, [position]);

  // Mount: read frame geometry, restore saved position or compute default bottom-left
  useEffect(() => {
    const rect = getFrameRect();
    if (!rect) return;
    setFrameLeft(rect.left);
    const vp = window.innerHeight;
    let pos: { x: number; y: number };
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : null;
      pos = parsed
        ? clampPos(parsed.x, parsed.y, rect.width, vp)
        : { x: EDGE_MARGIN, y: vp - BUTTON_SIZE - NAV_HEIGHT - EDGE_MARGIN };
    } catch {
      pos = { x: EDGE_MARGIN, y: vp - BUTTON_SIZE - NAV_HEIGHT - EDGE_MARGIN };
    }
    posRef.current = pos;
    setPosition(pos);
  }, []);

  // Recalculate frameLeft and re-clamp on resize / orientation change
  const updateLayout = useCallback(() => {
    const rect = getFrameRect();
    if (!rect) return;
    setFrameLeft(rect.left);
    setPosition(prev => {
      if (!prev) return prev;
      return clampPos(prev.x, prev.y, rect.width, window.innerHeight);
    });
  }, []);

  useEffect(() => {
    window.addEventListener('resize', updateLayout);
    window.addEventListener('orientationchange', updateLayout);
    return () => {
      window.removeEventListener('resize', updateLayout);
      window.removeEventListener('orientationchange', updateLayout);
    };
  }, [updateLayout]);

  // Drag start
  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!position) return;
    hasDragged.current = false;
    setIsDragging(true);
    dragStart.current = { clientX: e.clientX, clientY: e.clientY, posX: position.x, posY: position.y };
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLButtonElement>) => {
    if (!position) return;
    hasDragged.current = false;
    setIsDragging(true);
    const t = e.touches[0];
    dragStart.current = { clientX: t.clientX, clientY: t.clientY, posX: position.x, posY: position.y };
  };

  // Drag move + end — window listeners, active only while isDragging
  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e: MouseEvent) => {
      const rect = getFrameRect(); // fresh frameRect every move
      if (!rect) return;
      const dx = e.clientX - dragStart.current.clientX;
      const dy = e.clientY - dragStart.current.clientY;
      if (Math.sqrt(dx * dx + dy * dy) >= DRAG_THRESHOLD) hasDragged.current = true;
      const clamped = clampPos(dragStart.current.posX + dx, dragStart.current.posY + dy, rect.width, window.innerHeight);
      posRef.current = clamped;
      setPosition(clamped);
    };

    const onTouchMove = (e: TouchEvent) => {
      const rect = getFrameRect(); // fresh frameRect every move
      if (!rect) return;
      const t = e.touches[0];
      const dx = t.clientX - dragStart.current.clientX;
      const dy = t.clientY - dragStart.current.clientY;
      if (Math.sqrt(dx * dx + dy * dy) >= DRAG_THRESHOLD) hasDragged.current = true;
      const clamped = clampPos(dragStart.current.posX + dx, dragStart.current.posY + dy, rect.width, window.innerHeight);
      posRef.current = clamped;
      setPosition(clamped);
    };

    const onEnd = () => {
      setIsDragging(false);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(posRef.current));
      if (!hasDragged.current) toggleBot();
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchend', onEnd);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchend', onEnd);
    };
  }, [isDragging, toggleBot]);

  if (pathname === '/bot') return null;
  if (!position) return null;

  const animating = !isDragging && !isOpen;
  const boxShadow = animating
    ? undefined // controlled by @keyframes ql-breath
    : isDragging
      ? '0 0 10px rgba(34,211,238,0.18), 0 4px 14px rgba(0,0,0,0.5)'
      : '0 0 28px rgba(34,211,238,0.6), 0 4px 14px rgba(0,0,0,0.5)';

  return (
    <>
      <style>{`
        @keyframes ql-breath {
          0%, 100% { box-shadow: 0 0 14px rgba(34,211,238,0.32), 0 4px 14px rgba(0,0,0,0.5); }
          50%       { box-shadow: 0 0 30px rgba(34,211,238,0.65), 0 4px 14px rgba(0,0,0,0.5); }
        }
      `}</style>
      <button
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        aria-label={isOpen ? 'إغلاق مساعد FPV' : 'فتح مساعد FPV'}
        aria-expanded={isOpen}
        className="press"
        style={{
          position: 'fixed',
          left: `${frameLeft + position.x}px`,
          top: `${position.y}px`,
          width: BUTTON_SIZE,
          height: BUTTON_SIZE,
          zIndex: 35,
          borderRadius: 16,
          background: isOpen
            ? 'linear-gradient(135deg, rgba(34,211,238,0.22) 0%, rgba(0,160,255,0.14) 100%)'
            : 'linear-gradient(135deg, rgba(8,22,38,0.92) 0%, rgba(4,16,30,0.96) 100%)',
          border: isOpen ? '1px solid rgba(34,211,238,0.6)' : '1px solid rgba(34,211,238,0.32)',
          color: '#22d3ee',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          cursor: isDragging ? 'grabbing' : 'grab',
          transition: animating
            ? 'border-color 0.2s, background 0.2s, opacity 0.2s'
            : 'border-color 0.2s, background 0.2s, box-shadow 0.2s, opacity 0.2s',
          animation: animating ? 'ql-breath 3s ease-in-out infinite' : 'none',
          boxShadow,
          opacity: isDragging ? 0.85 : 1,
          userSelect: 'none',
          WebkitUserSelect: 'none',
          touchAction: 'none',
        }}
      >
        {isOpen ? <X size={20} /> : <QuadcopterIcon />}
      </button>
    </>
  );
};

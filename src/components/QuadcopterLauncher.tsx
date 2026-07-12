import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { useBotOverlay } from '../contexts/BotOverlayContext';
import { botColors, botShadows, botMotionDurations, botMotionEasing, botFocusRing } from './botVisualTheme';

const BUTTON_SIZE = 52;
const DRAG_THRESHOLD = 5;
const STORAGE_KEY = 'botLauncherPos';
const NAV_HEIGHT = 80;
const EDGE_MARGIN = 10;

const ARM_ANGLES = [45, 135, 225, 315];
const BLADE_DELAYS = ['0s', '0.75s', '1.5s', '2.25s'];

const DroneIcon: React.FC = () => {
  const C = 12;
  const ARM_LEN = 5.5;
  const MOTOR_R = 2.2;
  const BLADE_HALF = 2.5;
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {ARM_ANGLES.map((deg, i) => {
        const r = (deg * Math.PI) / 180;
        const mx = C + ARM_LEN * Math.sin(r);
        const my = C - ARM_LEN * Math.cos(r);
        const bx = Math.cos(r);
        const by = Math.sin(r);
        return (
          <g key={i}>
            <line x1={C} y1={C} x2={mx} y2={my} stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            <circle cx={mx} cy={my} r={MOTOR_R} stroke="currentColor" strokeWidth="1.1" fill="currentColor" fillOpacity="0.15"/>
            <line
              x1={mx - bx * BLADE_HALF} y1={my - by * BLADE_HALF}
              x2={mx + bx * BLADE_HALF} y2={my + by * BLADE_HALF}
              stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"
              className="ql-blade"
              style={{ animationDelay: BLADE_DELAYS[i] }}
            />
          </g>
        );
      })}
      <circle cx={C} cy={C} r="1.8" fill="currentColor"/>
    </svg>
  );
};

// r=29, circumference≈182.21. Three stacked arcs create a comet-fade: faint tail→medium body→bright head.
const CometRing: React.FC<{ idle: boolean }> = ({ idle }) => (
  <svg
    width="64" height="64"
    viewBox="0 0 64 64"
    style={{
      position: 'absolute',
      inset: -6,
      pointerEvents: 'none',
      animation: idle ? 'ql-ring-spin 3.6s linear infinite' : 'none',
    }}
    className="ql-motion"
    aria-hidden="true"
  >
    <circle cx="32" cy="32" r="29" fill="none" stroke="rgba(96,165,250,0.18)" strokeWidth="1.2"
      strokeDasharray="75 107.21" strokeLinecap="round"/>
    <circle cx="32" cy="32" r="29" fill="none" stroke="rgba(96,165,250,0.45)" strokeWidth="1.4"
      strokeDasharray="45 137.21" strokeLinecap="round"/>
    <circle cx="32" cy="32" r="29" fill="none" stroke="rgba(96,165,250,0.9)" strokeWidth="1.8"
      strokeDasharray="20 162.21" strokeLinecap="round"/>
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
    const init = () => {
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
    };
    init();
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

  // Shared move handler for both input types — updates position + flags a drag
  // once past DRAG_THRESHOLD, exactly as before.
  const handleMove = useCallback((clientX: number, clientY: number) => {
    const rect = getFrameRect(); // fresh frameRect every move
    if (!rect) return;
    const dx = clientX - dragStart.current.clientX;
    const dy = clientY - dragStart.current.clientY;
    if (Math.sqrt(dx * dx + dy * dy) >= DRAG_THRESHOLD) hasDragged.current = true;
    const clamped = clampPos(dragStart.current.posX + dx, dragStart.current.posY + dy, rect.width, window.innerHeight);
    posRef.current = clamped;
    setPosition(clamped);
  }, []);

  const onMouseMoveRef = useRef((e: MouseEvent) => handleMove(e.clientX, e.clientY));
  const onTouchMoveRef = useRef((e: TouchEvent) => {
    const t = e.touches[0];
    if (t) handleMove(t.clientX, t.clientY);
  });

  // Attached/detached imperatively, synchronously, from the down-handlers
  // themselves — NOT from a useEffect gated on isDragging. That prior pattern
  // had a real race: setIsDragging(true) only takes effect after React's next
  // render, so if the real end-event (touchend especially) fires before that
  // render completes, the listener isn't attached yet and the tap is silently
  // dropped. Confirmed via raw dispatched TouchEvents: a 0ms touchstart→
  // touchend gap reproduces the drop every time; a 50ms gap doesn't. Attaching
  // here closes the race regardless of tap speed or device render latency.
  const onEndRef = useRef(() => {
    window.removeEventListener('mousemove', onMouseMoveRef.current);
    window.removeEventListener('touchmove', onTouchMoveRef.current);
    window.removeEventListener('mouseup', onEndRef.current);
    window.removeEventListener('touchend', onEndRef.current);
    setIsDragging(false);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posRef.current));
    if (!hasDragged.current) toggleBot();
  });

  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!position) return;
    hasDragged.current = false;
    setIsDragging(true);
    dragStart.current = { clientX: e.clientX, clientY: e.clientY, posX: position.x, posY: position.y };
    window.addEventListener('mousemove', onMouseMoveRef.current);
    window.addEventListener('mouseup', onEndRef.current);
  };

  // React delegates `onTouchStart` through a root-level listener registered
  // *passive* (a scroll-perf default since React 17) — calling preventDefault()
  // there is silently ignored by the browser ("Unable to preventDefault inside
  // passive event listener invocation"), so the native touchstart/touchend
  // pair still isn't suppressed and the browser follows up with synthetic
  // compatibility mousedown/mouseup ~8ms later, hitting the same shared
  // onEndRef and toggling the bot a second time. Attaching touchstart natively
  // with { passive: false } is the only way to make preventDefault effective.
  // A callback ref (not useEffect) is required here: this component returns
  // null on its first render (position starts null until the mount effect
  // runs), so a ref-attaching effect with `[]` deps would fire once against
  // buttonRef.current === null and never attach anything. A callback ref is
  // invoked by React exactly when the underlying DOM node itself changes.
  const nativeTouchStartHandler = useRef((e: TouchEvent) => {
    e.preventDefault();
    hasDragged.current = false;
    setIsDragging(true);
    const t = e.touches[0];
    dragStart.current = { clientX: t.clientX, clientY: t.clientY, posX: posRef.current.x, posY: posRef.current.y };
    window.addEventListener('touchmove', onTouchMoveRef.current, { passive: true });
    window.addEventListener('touchend', onEndRef.current);
  });

  const buttonElRef = useRef<HTMLButtonElement | null>(null);
  const buttonCallbackRef = useCallback((el: HTMLButtonElement | null) => {
    buttonElRef.current?.removeEventListener('touchstart', nativeTouchStartHandler.current);
    buttonElRef.current = el;
    el?.addEventListener('touchstart', nativeTouchStartHandler.current, { passive: false });
  }, []);

  if (pathname === '/bot') return null;
  if (!position) return null;

  const idle = !isOpen && !isDragging;

  return (
    <>
      <style>{`
        @keyframes ql-ring-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes ql-blade-pulse {
          0%, 100% { opacity: 0.5; }
          50%       { opacity: 1; }
        }
        @keyframes ql-bob {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-4px); }
        }
        @keyframes ql-halo-pulse {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50%       { opacity: 0.62; transform: scale(1.12); }
        }
        .ql-blade {
          animation: ql-blade-pulse 1.5s ease-in-out infinite;
        }
        .ql-launcher-btn:hover:not(:active) {
          transform: scale(1.03);
        }
        .ql-launcher-btn:focus-visible {
          outline: ${botFocusRing.outline};
          outline-offset: ${botFocusRing.outlineOffset};
        }
        @media (prefers-reduced-motion: reduce) {
          .ql-motion {
            animation: none !important;
          }
          .ql-blade {
            animation: none !important;
          }
          .ql-launcher-btn:hover:not(:active) {
            transform: none;
          }
          .ql-launcher-btn:active {
            transform: none !important;
          }
        }
      `}</style>
      {/* Wrapper: carries position:fixed and bob animation so ring+halo+button bob together */}
      <div
        className="ql-motion"
        style={{
          position: 'fixed',
          left: `${frameLeft + position.x}px`,
          top: `${position.y}px`,
          width: BUTTON_SIZE,
          height: BUTTON_SIZE,
          zIndex: 35,
          animation: idle ? 'ql-bob 4s ease-in-out infinite' : 'none',
        }}
      >
        {/* Ambient halo */}
        <div
          aria-hidden
          className="ql-motion"
          style={{
            position: 'absolute',
            inset: -16,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(37,99,235,0.32) 0%, rgba(30,64,175,0.10) 55%, transparent 75%)', // botColors.primary → botColors.pressed
            animation: idle ? 'ql-halo-pulse 5s ease-in-out infinite' : 'none',
            pointerEvents: 'none',
          }}
        />
        {/* Comet-trail ring */}
        <CometRing idle={idle} />
        {/* Button: absolute within wrapper */}
        <button
          ref={buttonCallbackRef}
          onMouseDown={handleMouseDown}
          aria-label={isOpen ? 'إغلاق مساعد FPV' : 'فتح مساعد FPV'}
          aria-expanded={isOpen}
          className="press ql-launcher-btn"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            background: isOpen
              ? 'linear-gradient(135deg, rgba(37,99,235,0.28) 0%, rgba(30,64,175,0.18) 100%)' // botColors.primary → botColors.pressed
              : 'linear-gradient(135deg, rgba(10,16,36,0.92) 0%, rgba(6,11,26,0.96) 100%)',
            border: isOpen
              ? `1px solid rgba(96,165,250,0.7)` // botColors.accent
              : `1px solid rgba(37,99,235,0.35)`, // botColors.primary
            color: idle ? botColors.softAccent : botColors.text,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            cursor: isDragging ? 'grabbing' : 'grab',
            transition: `border-color 0.2s, background 0.2s, box-shadow 0.2s, opacity 0.2s, transform ${botMotionDurations.fast}ms ${botMotionEasing.standard}`,
            boxShadow: isDragging
              ? '0 0 10px rgba(37,99,235,0.18), 0 4px 14px rgba(0,0,0,0.5)'
              : isOpen
                ? `${botShadows.glowStrong}, 0 4px 14px rgba(0,0,0,0.5)`
                : `${botShadows.glow}, 0 4px 14px rgba(0,0,0,0.5)`,
            opacity: isDragging ? 0.85 : 1,
            userSelect: 'none',
            WebkitUserSelect: 'none',
            touchAction: 'none',
          }}
        >
          {isOpen ? <X size={20} /> : <DroneIcon />}
        </button>
      </div>
    </>
  );
};

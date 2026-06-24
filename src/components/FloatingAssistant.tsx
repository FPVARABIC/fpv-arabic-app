import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot } from 'lucide-react';

const BUTTON_SIZE = 56;
const DRAG_THRESHOLD = 5;
const STORAGE_KEY = 'floatingAssistantPos';

export const FloatingAssistant: React.FC = () => {
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
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y,
    });
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLButtonElement>) => {
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
      navigate('/bot');
    }
  };

  return (
    <button
      ref={buttonRef}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      className="absolute z-50 w-14 h-14 rounded-2xl flex items-center justify-center press transition-shadow pulse-ring"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        background: 'linear-gradient(135deg, #0a93b8, #06b6d4)',
        boxShadow: '0 0 18px rgba(34,211,238,0.4), 0 6px 16px rgba(0,0,0,0.5)',
        border: '1px solid rgba(34,211,238,0.5)',
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      onMouseEnter={e => { if (!isDragging) (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 36px rgba(34,211,238,0.75), 0 6px 20px rgba(0,0,0,0.5)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 18px rgba(34,211,238,0.4), 0 6px 16px rgba(0,0,0,0.5)'; }}
      aria-label="مساعد FPV">
      <Bot size={24} className="text-white" />
    </button>
  );
};


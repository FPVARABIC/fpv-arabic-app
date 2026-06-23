import React from 'react';
import { BottomNavigation } from './BottomNavigation';
import { FloatingAssistant } from './FloatingAssistant';

interface AppShellProps {
  children: React.ReactNode;
  showNav?: boolean;
  tint?: 'cyan' | 'blue' | 'purple' | 'green';
}

export const AppShell: React.FC<AppShellProps> = ({ children, showNav = true, tint = 'cyan' }) => (
  <div className="min-h-screen tech-grid relative">
    {/* floating ambient orbs */}
    <div className="orbs" aria-hidden>
      <div className="orb orb-1"/>
      <div className="orb orb-2"/>
      <div className="orb orb-3"/>
    </div>
    {/* per-page gradient tint */}
    <div className={`fixed inset-0 pointer-events-none page-tint-${tint}`} style={{ zIndex: 0 }} aria-hidden/>
    <div className="max-w-[390px] mx-auto min-h-screen flex flex-col relative" style={{ zIndex: 1 }}>
      <main className={`flex-1 overflow-y-auto ${showNav ? 'pb-24' : ''}`}>
        {children}
      </main>
      {showNav && <BottomNavigation/>}
      {showNav && <FloatingAssistant/>}
    </div>
  </div>
);

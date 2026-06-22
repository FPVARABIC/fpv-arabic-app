import React from 'react';
import { BottomNavigation } from './BottomNavigation';
import { FloatingAssistant } from './FloatingAssistant';

interface AppShellProps { children: React.ReactNode; showNav?: boolean; }

export const AppShell: React.FC<AppShellProps> = ({ children, showNav = true }) => (
  <div className="min-h-screen tech-grid">
    <div className="max-w-lg mx-auto min-h-screen flex flex-col">
      <main className={`flex-1 overflow-y-auto ${showNav ? 'pb-20' : ''}`}>
        {children}
      </main>
      {showNav && <BottomNavigation/>}
      {showNav && <FloatingAssistant/>}
    </div>
  </div>
);

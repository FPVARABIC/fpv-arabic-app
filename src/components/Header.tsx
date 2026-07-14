import React from 'react';
import { Logo } from './Logo';

interface HeaderProps { title?: string; showLogo?: boolean; rightAction?: React.ReactNode; }

export const Header: React.FC<HeaderProps> = ({ title, showLogo = false, rightAction }) => (
  <header className="flex items-center justify-between px-4 py-3 border-b border-cyan-400/10">
    <div className="flex-1">
      {showLogo ? <Logo size="sm"/> : title ? <h1 className="text-lg font-bold text-slate-900">{title}</h1> : null}
    </div>
    {rightAction && <div>{rightAction}</div>}
  </header>
);

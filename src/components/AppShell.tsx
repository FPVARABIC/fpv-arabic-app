import React from 'react';
import { BottomNavigation } from './BottomNavigation';
import { BotOverlayProvider } from '../contexts/BotOverlayContext';
import { QuadcopterLauncher } from './QuadcopterLauncher';
import { BotV2Overlay } from './BotV2Overlay';

interface AppShellProps {
  children: React.ReactNode;
  showNav?: boolean;
  tint?: 'cyan' | 'blue' | 'purple' | 'green';
}

export const AppShell: React.FC<AppShellProps> = ({ children, showNav = true, tint = 'cyan' }) => (
  /* Desktop: dark background with subtle tech grid */
  <div
    className="min-h-screen tech-grid flex justify-center"
    style={{ background: '#02080f' }}
  >
    {/* Phone-frame column: 390px, app gradient, glowing edge */}
    <BotOverlayProvider>
      <div
        data-app-frame="true"
        className="relative flex flex-col"
        style={{
          width: '100%',
          maxWidth: '390px',
          minHeight: '100vh',
          zIndex: 1,
          background: 'linear-gradient(160deg, #040d1a 0%, #061827 55%, #04101e 100%)',
          boxShadow: '0 0 0 1px rgba(34,211,238,0.13), 0 0 70px rgba(24,230,230,0.08), 0 0 120px rgba(0,0,0,0.9)',
          overflow: 'hidden',
        }}
      >
        {/* hero background — below all content layers */}
        <div className="absolute" style={{ top: 0, left: 0, right: 0, height: '100vh', backgroundImage: "url('/assets/home-hero-canyon.png')", backgroundSize: '100% 100%', backgroundPosition: 'center center', zIndex: -1 }} aria-hidden />
        <div className="absolute inset-0" style={{ background: 'rgba(2,8,15,0.45)', zIndex: -1 }} aria-hidden />
        {/* ambient orbs — absolute, clipped to column */}
        <div className="orbs" aria-hidden>
          <div className="orb orb-1"/>
          <div className="orb orb-2"/>
          <div className="orb orb-3"/>
        </div>
        {/* per-page gradient tint — absolute within column */}
        <div
          className={`absolute inset-0 pointer-events-none page-tint-${tint}`}
          style={{ zIndex: 0 }}
          aria-hidden
        />
        <main
          className={`relative flex-1 overflow-y-auto ${showNav ? 'pb-24' : ''}`}
          style={{ zIndex: 1 }}
        >
          {children}
        </main>
        {showNav && <BottomNavigation/>}
        <QuadcopterLauncher/>
        <BotV2Overlay/>
      </div>
    </BotOverlayProvider>
  </div>
);

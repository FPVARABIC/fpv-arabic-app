import React from 'react';

interface AssemblyLayoutProps {
  children: React.ReactNode;
}

export const AssemblyLayout: React.FC<AssemblyLayoutProps> = ({ children }) => (
  <div
    data-assembly-frame="true"
    className="relative flex flex-col"
    style={{ minHeight: 'calc(100% + 6rem)', background: '#fafaf8', marginBottom: '-6rem' }}
  >
    {children}
    {/* Real, non-negative-margined clearance spacer. The minHeight/
        marginBottom pair above pulls whatever follows this box up by 96px
        (needed so short content doesn't show a dark strip from AppShell's
        own <main> bottom padding showing through) -- but that same pull
        overlaps the last real content (e.g. StageNavigation's buttons on a
        tall BuildFlow stage) with the fixed bottom-nav bar, with zero
        scroll room to clear it. Inert on short stages (minHeight already
        dominates there); only contributes real extra scroll room once
        content is tall enough to need it. Verified with real content: 112px
        gives 47.25px of real clearance margin at true max scroll.
    */}
    <div style={{ height: 112 }} aria-hidden />
  </div>
);

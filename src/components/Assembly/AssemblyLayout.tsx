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
  </div>
);

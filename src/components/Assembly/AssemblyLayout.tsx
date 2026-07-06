import React from 'react';

interface AssemblyLayoutProps {
  children: React.ReactNode;
}

export const AssemblyLayout: React.FC<AssemblyLayoutProps> = ({ children }) => (
  <div className="min-h-screen flex justify-center" style={{ background: '#f0ebe0' }}>
    <div
      data-assembly-frame="true"
      className="relative flex flex-col"
      style={{ width: '100%', maxWidth: '390px', minHeight: '100vh', background: '#fafaf8' }}
    >
      {children}
    </div>
  </div>
);

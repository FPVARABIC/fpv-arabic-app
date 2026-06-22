import React from 'react';

interface SectionTitleProps { title: string; subtitle?: string; }

export const SectionTitle: React.FC<SectionTitleProps> = ({ title, subtitle }) => (
  <div className="mb-4">
    <h2 className="text-xl font-bold text-white">{title}</h2>
    {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
  </div>
);

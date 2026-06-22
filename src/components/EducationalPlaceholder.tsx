import React from 'react';
import { ImageIcon } from 'lucide-react';

interface Props { label: string; }

export const EducationalPlaceholder: React.FC<Props> = ({ label }) => (
  <div className="glass-card-sm flex flex-col items-center justify-center py-8 gap-3 my-4">
    <div className="w-12 h-12 rounded-full bg-cyan-400/10 flex items-center justify-center border border-cyan-400/20">
      <ImageIcon size={22} className="text-cyan-400/60"/>
    </div>
    <p className="text-sm text-slate-400 text-center">{label}</p>
    <p className="text-xs text-slate-600">صورة توضيحية تعليمية</p>
  </div>
);

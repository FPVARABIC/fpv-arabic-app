import React from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

interface SafetyWarningProps { message: string; type?: 'warning' | 'danger'; }

export const SafetyWarning: React.FC<SafetyWarningProps> = ({ message, type = 'warning' }) => {
  const cls = type === 'danger' ? 'danger-card' : 'warning-card';
  const color = type === 'danger' ? 'text-red-400' : 'text-amber-400';
  const Icon = type === 'danger' ? ShieldAlert : AlertTriangle;
  return (
    <div className={cls}>
      <div className="flex items-start gap-2">
        <Icon size={16} className={`${color} flex-shrink-0 mt-0.5`}/>
        <p className={`text-sm ${color}`}>{message}</p>
      </div>
    </div>
  );
};

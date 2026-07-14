import React from 'react';
import { Info, AlertTriangle, ShieldAlert } from 'lucide-react';
import type { WarningLevel } from '../../data/expresslrs/types';

interface ExpressLrsCalloutProps {
  level: WarningLevel;
  message: string;
}

const STYLES: Record<WarningLevel, { bg: string; border: string; text: string; icon: React.FC<{ size?: number; style?: React.CSSProperties }> }> = {
  info: { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af', icon: Info },
  warning: { bg: '#fffbeb', border: '#fde68a', text: '#92400e', icon: AlertTriangle },
  danger: { bg: '#fef2f2', border: '#fecaca', text: '#991b1b', icon: ShieldAlert },
};

/**
 * Light-theme warning callout, locally scoped to the ExpressLRS setup guide.
 * Not the dark-styled SafetyWarning/.warning-card classes — those assume a
 * dark AppShell background and would fail contrast on this page's #f8fafc
 * light background.
 */
export const ExpressLrsCallout: React.FC<ExpressLrsCalloutProps> = ({ level, message }) => {
  const s = STYLES[level];
  const Icon = s.icon;
  return (
    <div
      data-testid={`expresslrs-callout-${level}`}
      className="p-3 rounded-xl flex items-start gap-2"
      style={{ background: s.bg, border: `1px solid ${s.border}` }}
    >
      <Icon size={16} style={{ color: s.text, flexShrink: 0, marginTop: 2 }}/>
      <p className="text-sm leading-relaxed" style={{ color: s.text }}>{message}</p>
    </div>
  );
};

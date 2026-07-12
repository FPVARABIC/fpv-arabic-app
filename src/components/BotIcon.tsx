import React from 'react';
import { botColors } from './botVisualTheme';

export interface BotIconProps {
  /** Pixel size (width and height). Defaults to 24 — scales cleanly from
   *  launcher size (52) down to message-avatar size (16) since it is pure
   *  vector geometry, no raster asset. */
  size?: number;
  /** Stroke/fill color. Defaults to the Royal Blue accent tone, chosen for
   *  legibility on dark backgrounds; pass botColors.primary/hover/pressed
   *  for other surfaces. */
  color?: string;
  /** Accessible label for meaningful (non-decorative) usage. When present,
   *  the icon renders as role="img" with this aria-label. When absent, the
   *  icon renders aria-hidden="true" for decorative usage. */
  label?: string;
  className?: string;
}

/**
 * BOT V2 — Reusable assistant icon (Royal Blue FPV identity).
 *
 * A single quadcopter-silhouette SVG (four arms, four motors, a center
 * flight-controller body) — the same FPV visual language already used
 * elsewhere in the app, now exposed as one reusable, purely presentational
 * component instead of being duplicated inline per screen. Pure SVG path
 * geometry: no raster image, no external icon-library dependency, fully
 * scalable via the `size` prop, remains legible at launcher/header/message
 * avatar sizes and on dark backgrounds.
 *
 * Not yet used by any Bot V2 screen — introduced as a shared primitive
 * only; wiring it into the Overlay/Assistant View/Launcher/Header happens
 * in a future phase.
 */
export const BotIcon: React.FC<BotIconProps> = ({ size = 24, color = botColors.accent, label, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
  >
    <path d="M12 10.5L6 5.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <path d="M12 10.5L18 5.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <path d="M12 13.5L6 18.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <path d="M12 13.5L18 18.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <rect x="9.5" y="9.5" width="5" height="5" rx="1.5" fill={color} />
    <circle cx="6" cy="5.5" r="2.5" stroke={color} strokeWidth="1.5" fill={color} fillOpacity="0.18" />
    <circle cx="18" cy="5.5" r="2.5" stroke={color} strokeWidth="1.5" fill={color} fillOpacity="0.18" />
    <circle cx="6" cy="18.5" r="2.5" stroke={color} strokeWidth="1.5" fill={color} fillOpacity="0.18" />
    <circle cx="18" cy="18.5" r="2.5" stroke={color} strokeWidth="1.5" fill={color} fillOpacity="0.18" />
  </svg>
);

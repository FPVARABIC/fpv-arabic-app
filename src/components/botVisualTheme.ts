/**
 * BOT V2 — Shared visual design system (Royal Blue identity).
 *
 * Single source of truth for Bot V2's visual identity. Exposes ONLY
 * reusable visual values — colors, gradients, borders, radii, spacing,
 * avatar sizes, bubble/chip/button styles, shadows, and motion tokens.
 * No components, no behavior, no logic live here.
 *
 * Architecture-first phase: no existing Bot V2 screen (Overlay, Assistant
 * View, Launcher, Header, Input, Chips, message bubbles, SafetyWarning)
 * imports or uses these tokens yet — introducing them here does not change
 * anything visually. A future phase migrates screens to consume them.
 *
 * Warning/danger/success semantics are deliberately NOT redefined here —
 * SafetyWarning's existing color scheme is untouched and out of scope.
 */

// ── Palette ─────────────────────────────────────────────────────────────────

export const botColors = {
  primary: '#2563EB',
  hover: '#1D4ED8',
  pressed: '#1E40AF',
  deepSurface: '#1E3A8A',
  border: '#3B82F6',
  accent: '#60A5FA',
  softAccent: '#93C5FD',
  text: '#FFFFFF',
} as const;

// ── Gradients ─────────────────────────────────────────────────────────────

export const botGradients = {
  primary: `linear-gradient(135deg, ${botColors.primary} 0%, ${botColors.pressed} 100%)`,
  surface: `linear-gradient(180deg, ${botColors.deepSurface} 0%, ${botColors.pressed} 100%)`,
  accentGlow: `radial-gradient(circle, ${botColors.accent} 0%, transparent 70%)`,
} as const;

// ── Corner radius ─────────────────────────────────────────────────────────

export const botRadii = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 9999,
} as const;

// ── Borders ───────────────────────────────────────────────────────────────

export const botBorders = {
  hairline: `1px solid ${botColors.border}`,
  soft: '1px solid rgba(59, 130, 246, 0.3)', // botColors.border at 30% opacity
  focus: `2px solid ${botColors.accent}`,
} as const;

// ── Spacing ───────────────────────────────────────────────────────────────

export const botSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

// ── Avatar sizes ──────────────────────────────────────────────────────────

export const botAvatarSizes = {
  launcher: 52,
  header: 36,
  message: 32,
} as const;

// ── Bubble style ──────────────────────────────────────────────────────────

export const botBubbleStyle = {
  borderRadius: botRadii.lg,
  padding: 12,
  background: 'rgba(30, 58, 138, 0.35)', // botColors.deepSurface tint
  border: botBorders.soft,
} as const;

// ── Chip style ────────────────────────────────────────────────────────────

export const botChipStyle = {
  borderRadius: botRadii.pill,
  paddingBlock: 6,
  paddingInline: 12,
  background: 'rgba(37, 99, 235, 0.12)', // botColors.primary tint
  border: '1px solid rgba(37, 99, 235, 0.3)',
  color: botColors.text,
} as const;

// ── Button style ──────────────────────────────────────────────────────────

export const botButtonStyle = {
  primary: {
    background: botColors.primary,
    hoverBackground: botColors.hover,
    pressedBackground: botColors.pressed,
    color: botColors.text,
    borderRadius: botRadii.pill,
  },
} as const;

// ── Shadows ───────────────────────────────────────────────────────────────

export const botShadows = {
  soft: '0 4px 14px rgba(30, 58, 138, 0.35)',
  glow: '0 0 18px rgba(37, 99, 235, 0.42)',
  glowStrong: '0 0 28px rgba(37, 99, 235, 0.65)',
} as const;

// ── Motion: durations, easing, transitions, focus ring ─────────────────────
// Shared constants only — no animation is implemented or applied anywhere
// in this phase.

export const botMotionDurations = {
  fast: 150,
  base: 250,
  slow: 400,
} as const;

export const botMotionEasing = {
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
  accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
} as const;

export const botTransitions = {
  color: `color ${botMotionDurations.fast}ms ${botMotionEasing.standard}`,
  background: `background ${botMotionDurations.base}ms ${botMotionEasing.standard}`,
  transform: `transform ${botMotionDurations.base}ms ${botMotionEasing.decelerate}`,
} as const;

export const botFocusRing = {
  outline: `2px solid ${botColors.accent}`,
  outlineOffset: '2px',
} as const;

/**
 * Named motion tokens (fade / slide / scale) — shared definitions only, not
 * wired into any component in this phase. A future phase applies these via
 * whichever animation approach a given screen already uses (inline
 * transition, CSS keyframes, etc.) without needing to invent new values.
 */
export const botMotionTokens = {
  fade: {
    from: { opacity: 0 },
    to: { opacity: 1 },
    duration: botMotionDurations.base,
    easing: botMotionEasing.standard,
  },
  slideUp: {
    from: { transform: 'translateY(12px)', opacity: 0 },
    to: { transform: 'translateY(0)', opacity: 1 },
    duration: botMotionDurations.base,
    easing: botMotionEasing.decelerate,
  },
  scaleIn: {
    from: { transform: 'scale(0.96)', opacity: 0 },
    to: { transform: 'scale(1)', opacity: 1 },
    duration: botMotionDurations.fast,
    easing: botMotionEasing.decelerate,
  },
} as const;

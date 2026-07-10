/**
 * Typed access to the v3 design tokens for inline styles and JS logic.
 *
 * The CSS file (`./v3-tokens.css`) is the single source of truth for the values.
 * Use this module when you need a token in an inline `style` object or in logic;
 * for className strings prefer Tailwind arbitrary values
 * (e.g. `text-[var(--v3-text-strong)]`) so the class is statically visible.
 *
 * Keep the keys here in sync with `v3-tokens.css`.
 */

/** CSS `var(...)` references for the v3 color palette. */
export const v3Color = {
  bg: 'var(--v3-bg)',
  bgNear: 'var(--v3-bg-near)',
  panel: 'var(--v3-panel)',
  card: 'var(--v3-card)',
  cardHover: 'var(--v3-card-hover)',
  control: 'var(--v3-control)',
  selected: 'var(--v3-selected)',

  primary: 'var(--v3-primary)',
  primaryDim: 'var(--v3-primary-dim)',
  primaryHover: 'var(--v3-primary-hover)',
  primaryActive: 'var(--v3-primary-active)',
  primarySoft: 'var(--v3-primary-soft)',
  launch: 'var(--v3-launch)',
  design: 'var(--v3-design)',

  success: 'var(--v3-success)',
  warning: 'var(--v3-warning)',
  danger: 'var(--v3-danger)',
  info: 'var(--v3-info)',

  textStrong: 'var(--v3-text-strong)',
  text: 'var(--v3-text)',
  textSecondary: 'var(--v3-text-secondary)',
  textMuted: 'var(--v3-text-muted)',
  textFaint: 'var(--v3-text-faint)',
  textOnPrimary: 'var(--v3-text-on-primary)',

  border: 'var(--v3-border)',
  borderSoft: 'var(--v3-border-soft)',
  divider: 'var(--v3-divider)',
  focus: 'var(--v3-focus)',
} as const;

/** CSS `var(...)` references for the v3 geometry tokens. */
export const v3Radius = {
  sm: 'var(--v3-radius-sm)',
  md: 'var(--v3-radius-md)',
  lg: 'var(--v3-radius-lg)',
  xl: 'var(--v3-radius-xl)',
  full: 'var(--v3-radius-full)',
} as const;

/** CSS `var(...)` references for the v3 motion tokens. */
export const v3Motion = {
  fast: 'var(--v3-fast)',
  standard: 'var(--v3-standard)',
  emphasis: 'var(--v3-emphasis)',
  ease: 'var(--v3-ease)',
  easeEnter: 'var(--v3-ease-enter)',
  easeExit: 'var(--v3-ease-exit)',
} as const;

/** CSS `var(...)` references for the v3 elevation tokens. */
export const v3Shadow = {
  panel: 'var(--v3-shadow-panel)',
  glowPrimary: 'var(--v3-glow-primary)',
  focusRing: 'var(--v3-focus-ring)',
} as const;

/** Maximum content width for v3 page layouts. */
export const V3_CONTENT_MAX_WIDTH = 1328;

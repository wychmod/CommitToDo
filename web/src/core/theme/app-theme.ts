import { adjustColor } from './colors-helpers';

/**
 * Design tokens for the *application* shell — distinct from the marketing
 * Landing aesthetic. We keep them centralized here so screens never hard-code
 * hex values; everything resolves through CSS variables.
 */

export type ThemeMode = 'dark' | 'light';

const DEFAULT_BRAND = '#16C7C7';
const DEFAULT_ACCENT = '#A6FF4D';

const sharedDark: Record<string, string> = {
  // Surfaces ----------------------------------------------------------------
  '--color-canvas': '#061313',
  '--color-canvas-elevated': '#0b1c1d',
  '--color-surface': '#102829',
  '--color-surface-soft': '#163435',
  '--color-surface-strong': '#1f4a4c',
  '--color-surface-quiet': '#0a1a1b',

  // Borders -----------------------------------------------------------------
  '--color-border': 'rgba(132, 210, 205, 0.22)',
  '--color-border-strong': 'rgba(132, 210, 205, 0.36)',
  '--color-border-quiet': 'rgba(132, 210, 205, 0.10)',

  // Text --------------------------------------------------------------------
  '--color-ink': '#eaf7f3',
  '--color-ink-muted': '#bfd3ce',
  '--color-ink-subtle': '#95aaa6',
  '--color-ink-tertiary': '#78908c',
  '--color-text-primary': '#eaf7f3',
  '--color-text-secondary': '#bfd3ce',
  '--color-text-muted': '#95aaa6',
  '--color-text-subtle': '#78908c',

  // Brand & status ----------------------------------------------------------
  '--color-primary': '#18d6d0',
  '--color-primary-hover': '#3be1db',
  '--color-primary-soft': 'rgba(24, 214, 208, 0.12)',
  '--color-primary-strong': '#0f9f9f',
  '--color-on-primary': '#031414',
  '--color-accent': '#a6ff4d',
  '--color-accent-soft': 'rgba(166, 255, 77, 0.12)',
  '--color-warning': '#ffc75a',
  '--color-warning-soft': 'rgba(255, 199, 90, 0.10)',
  '--color-danger': '#ff5c7a',
  '--color-danger-soft': 'rgba(255, 92, 122, 0.10)',
  '--color-success': '#5dffa7',
  '--color-success-soft': 'rgba(93, 255, 167, 0.10)',

  // Status pill mapping (used by StatusBadge) -------------------------------
  '--color-status-todo': '#94a3b8',
  '--color-status-in-progress': '#18d6d0',
  '--color-status-done': '#5dffa7',
  '--color-status-blocked': '#ffc75a',
  '--color-status-archived': '#6f8783',
  '--color-status-conflict': '#ff5c7a',

  // Priority dot ------------------------------------------------------------
  '--color-priority-high': '#ff5c7a',
  '--color-priority-medium': '#ffc75a',
  '--color-priority-low': '#5dffa7',

  // Heatmap ramp ------------------------------------------------------------
  '--color-heat-0': '#0f2424',
  '--color-heat-1': 'rgba(24, 214, 208, 0.25)',
  '--color-heat-2': 'rgba(24, 214, 208, 0.50)',
  '--color-heat-3': 'rgba(93, 255, 167, 0.78)',
  '--color-heat-4': 'rgba(166, 255, 77, 0.95)',

  // Misc --------------------------------------------------------------------
  '--color-edge-highlight': 'rgba(255, 255, 255, 0.06)',
  '--color-shadow-quiet': 'rgba(0, 0, 0, 0.35)',
  '--color-overlay': 'rgba(0, 0, 0, 0.55)',
  '--color-scrim-soft': 'rgba(6, 19, 19, 0.72)',
};

const sharedLight: Record<string, string> = {
  '--color-canvas': '#f5fbf8',
  '--color-canvas-elevated': '#ffffff',
  '--color-surface': '#edf7f3',
  '--color-surface-soft': '#e1f0ec',
  '--color-surface-strong': '#cdded8',
  '--color-surface-quiet': '#f8fcfb',

  '--color-border': 'rgba(23, 86, 82, 0.16)',
  '--color-border-strong': 'rgba(23, 86, 82, 0.28)',
  '--color-border-quiet': 'rgba(23, 86, 82, 0.08)',

  '--color-ink': '#102523',
  '--color-ink-muted': '#36534e',
  '--color-ink-subtle': '#58726d',
  '--color-ink-tertiary': '#7d958f',
  '--color-text-primary': '#102523',
  '--color-text-secondary': '#36534e',
  '--color-text-muted': '#58726d',
  '--color-text-subtle': '#7d958f',

  '--color-primary': '#008f8a',
  '--color-primary-hover': '#00a39c',
  '--color-primary-soft': 'rgba(0, 143, 138, 0.10)',
  '--color-primary-strong': '#066d68',
  '--color-on-primary': '#f4fff9',
  '--color-accent': '#4f9f00',
  '--color-accent-soft': 'rgba(79, 159, 0, 0.10)',
  '--color-warning': '#a46a00',
  '--color-warning-soft': 'rgba(164, 106, 0, 0.10)',
  '--color-danger': '#c73355',
  '--color-danger-soft': 'rgba(199, 51, 85, 0.10)',
  '--color-success': '#2e8b3d',
  '--color-success-soft': 'rgba(46, 139, 61, 0.10)',

  '--color-status-todo': '#64748b',
  '--color-status-in-progress': '#008f8a',
  '--color-status-done': '#2e8b3d',
  '--color-status-blocked': '#a46a00',
  '--color-status-archived': '#64748b',
  '--color-status-conflict': '#c73355',

  '--color-priority-high': '#c73355',
  '--color-priority-medium': '#a46a00',
  '--color-priority-low': '#2e8b3d',

  '--color-heat-0': '#e6efeb',
  '--color-heat-1': 'rgba(0, 143, 138, 0.18)',
  '--color-heat-2': 'rgba(0, 143, 138, 0.35)',
  '--color-heat-3': 'rgba(46, 139, 61, 0.55)',
  '--color-heat-4': 'rgba(46, 139, 61, 0.80)',

  '--color-edge-highlight': 'rgba(0, 0, 0, 0.06)',
  '--color-shadow-quiet': 'rgba(0, 0, 0, 0.12)',
  '--color-overlay': 'rgba(0, 0, 0, 0.45)',
  '--color-scrim-soft': 'rgba(245, 251, 248, 0.85)',
};

/**
 * Apply the active theme to :root by writing CSS variables. Falls through to
 * the user-selected `brand` color so we can theme the primary accent at
 * runtime without redeploying CSS.
 */
export function applyAppTheme(
  mode: ThemeMode,
  brand: string = DEFAULT_BRAND,
  accent: string = DEFAULT_ACCENT
): void {
  const root = document.documentElement;
  const palette = mode === 'dark' ? sharedDark : sharedLight;

  const all: Record<string, string> = {
    ...palette,
    // Recompute primary family from chosen brand to support per-user theming
    '--color-primary': brand,
    '--color-primary-hover': adjustColor(brand, 12),
    '--color-primary-soft': hexToAlpha(brand, 0.12),
    '--color-primary-strong': adjustColor(brand, -15),
  };

  for (const [key, value] of Object.entries(all)) {
    root.style.setProperty(key, value);
  }

  // Heatmap ramp reacts to brand too (we keep accent as separate)
  root.style.setProperty('--color-accent', accent);

  // Theme class drives `prefers-color-scheme`-aware media defaults if needed
  root.dataset.theme = mode;
}

function hexToAlpha(hex: string, alpha: number): string {
  const sanitized = hex.replace('#', '');
  const value =
    sanitized.length === 3
      ? sanitized
          .split('')
          .map((c) => c + c)
          .join('')
      : sanitized;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const APP_THEME_BRAND_DEFAULT = DEFAULT_BRAND;
export const APP_THEME_ACCENT_DEFAULT = DEFAULT_ACCENT;

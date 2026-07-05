export const MOBILE_BREAKPOINT = 768;
export const NAV_BREAKPOINT = 840;
export const SPLIT_BREAKPOINT = 1024;
export const DESKTOP_BREAKPOINT = 1280;
export const DESKTOP_XL_BREAKPOINT = 1440;

export const spacing = {
  micro: 2,
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  section: 96,
} as const;

export const radius = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  pill: 999,
  full: 999,
} as const;

export const shadow = {
  sm: '0 1px 2px rgba(0,0,0,0.05)',
  md: '0 2px 6px rgba(0,0,0,0.1)',
  lg: '0 4px 12px rgba(0,0,0,0.15)',
} as const;

export const animation = {
  fast: '150ms',
  normal: '250ms',
  slow: '350ms',
  easeOutQuart: 'cubic-bezier(0.25, 1, 0.5, 1)',
  easeOutExpo: 'cubic-bezier(0.16, 1, 0.3, 1)',
} as const;

export const touchTargets = {
  navItemHeight: 48,
  ctaHeight: 40,
  ctaHeightLg: 48,
  listItemMinHeight: 48,
  tapTargetMin: 44,
} as const;

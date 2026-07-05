export const colorTokens = {
  canvas: '#0f172a',
  surface1: '#1e293b',
  surface2: '#334155',
  surface3: '#475569',
  surface4: '#64748b',

  hairline: '#1e293b',
  hairlineStrong: '#334155',
  hairlineTertiary: '#475569',

  ink: '#f1f5f9',
  inkMuted: '#94a3b8',
  inkSubtle: '#64748b',
  inkTertiary: '#475569',

  edgeHighlight: 'rgba(255, 255, 255, 0.06)',

  primary: '#3b82f6',
  primaryHover: '#60a5fa',
  primaryFocus: '#2563eb',
  primaryDark: '#1d4ed8',
  onPrimary: '#ffffff',
  primaryGradientFrom: '#3b82f6',
  primaryGradientTo: '#8b5cf6',

  success: '#10b981',
  successLight: 'rgba(16, 185, 129, 0.1)',
  warning: '#f59e0b',
  warningLight: 'rgba(245, 158, 11, 0.1)',
  error: '#ef4444',
  errorLight: 'rgba(239, 68, 68, 0.1)',
  info: '#3b82f6',

  overlay: 'rgba(0, 0, 0, 0.5)',
  inverseCanvas: '#f8fafc',
  inverseInk: '#0f172a',

  priorityHigh: '#ef4444',
  priorityMedium: '#f59e0b',
  priorityLow: '#10b981',

  statusTodo: '#94a3b8',
  statusInProgress: '#3b82f6',
  statusDone: '#10b981',
  statusCancelled: '#6b7280',

  heatmapEmpty: '#1e293b',
  heatmap1: '#064e3b',
  heatmap2: '#065f46',
  heatmap3: '#047857',
  heatmap4: '#10b981',
} as const;

export type ColorToken = keyof typeof colorTokens;

export const lightColorTokens: Record<ColorToken, string> = {
  ...colorTokens,
  canvas: '#f8fafc',
  surface1: '#ffffff',
  surface2: '#f1f5f9',
  surface3: '#e2e8f0',
  surface4: '#cbd5e1',

  hairline: '#e2e8f0',
  hairlineStrong: '#cbd5e1',
  hairlineTertiary: '#94a3b8',

  ink: '#0f172a',
  inkMuted: '#475569',
  inkSubtle: '#64748b',
  inkTertiary: '#94a3b8',

  edgeHighlight: 'rgba(0, 0, 0, 0.06)',

  overlay: 'rgba(0, 0, 0, 0.5)',
  inverseCanvas: '#0f172a',
  inverseInk: '#f1f5f9',
};

/**
 * 将十六进制颜色变亮或变暗。
 * @param hex 6 位或 3 位十六进制色值
 * @param percent 百分比，正值变亮，负值变暗
 */
export function adjustColor(hex: string, percent: number): string {
  const sanitized = hex.replace('#', '');
  const fullHex =
    sanitized.length === 3
      ? sanitized
          .split('')
          .map((c) => c + c)
          .join('')
      : sanitized;

  const num = parseInt(fullHex, 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + Math.round((255 * percent) / 100)));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + Math.round((255 * percent) / 100)));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + Math.round((255 * percent) / 100)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export function applyThemeColor(color: string): void {
  const root = document.documentElement;
  root.style.setProperty('--color-primary', color);
  root.style.setProperty('--color-primary-hover', adjustColor(color, 20));
  root.style.setProperty('--color-primary-focus', adjustColor(color, -10));
  root.style.setProperty('--color-primary-dark', adjustColor(color, -20));
  root.style.setProperty('--color-info', color);
}

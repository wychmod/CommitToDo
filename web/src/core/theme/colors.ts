export const colorTokens = {
  canvas: '#071414',
  surface1: '#0e2324',
  surface2: '#163234',
  surface3: '#24484a',
  surface4: '#3a6666',

  hairline: '#123033',
  hairlineStrong: '#1f4a4c',
  hairlineTertiary: '#37676a',

  ink: '#f4fff9',
  inkMuted: '#a9c2bc',
  inkSubtle: '#73918d',
  inkTertiary: '#4d6d6b',

  edgeHighlight: 'rgba(255, 255, 255, 0.06)',

  primary: '#16c7c7',
  primaryHover: '#2bd8d8',
  primaryFocus: '#0f9f9f',
  primaryDark: '#087777',
  onPrimary: '#031414',
  primaryGradientFrom: '#16c7c7',
  primaryGradientTo: '#2bd8d8',

  success: '#10b981',
  successLight: 'rgba(16, 185, 129, 0.1)',
  warning: '#f59e0b',
  warningLight: 'rgba(245, 158, 11, 0.1)',
  error: '#ef4444',
  errorLight: 'rgba(239, 68, 68, 0.1)',
  info: '#16c7c7',

  overlay: 'rgba(0, 0, 0, 0.5)',
  inverseCanvas: '#f5fbf8',
  inverseInk: '#071414',

  priorityHigh: '#ef4444',
  priorityMedium: '#f59e0b',
  priorityLow: '#10b981',

  statusTodo: '#94a3b8',
  statusInProgress: '#16c7c7',
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
  canvas: '#f5fbf8',
  surface1: '#ffffff',
  surface2: '#eaf5f1',
  surface3: '#d8e8e3',
  surface4: '#bdd2ce',

  hairline: '#d8e8e3',
  hairlineStrong: '#bdd2ce',
  hairlineTertiary: '#8aa9a4',

  ink: '#071414',
  inkMuted: '#385956',
  inkSubtle: '#607c78',
  inkTertiary: '#8aa9a4',

  edgeHighlight: 'rgba(0, 0, 0, 0.06)',

  overlay: 'rgba(0, 0, 0, 0.5)',
  inverseCanvas: '#071414',
  inverseInk: '#f4fff9',
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

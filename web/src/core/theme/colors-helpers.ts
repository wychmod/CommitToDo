/**
 * Color helper utilities shared by theme implementations.
 *
 * - `adjustColor` lightens/darkens a hex color by `percent`.
 * - `hexToAlpha` returns an rgba() string at the requested alpha.
 * - `mixColors` blends two hex colors with the given weight ratio.
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

export function hexToAlpha(hex: string, alpha: number): string {
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

export function mixColors(a: string, b: string, weight: number = 0.5): string {
  const wa = Math.min(1, Math.max(0, weight));
  const wb = 1 - wa;
  const pa = parseHex(a);
  const pb = parseHex(b);
  const r = Math.round(pa.r * wa + pb.r * wb);
  const g = Math.round(pa.g * wa + pb.g * wb);
  const bl = Math.round(pa.b * wa + pb.b * wb);
  return `#${[r, g, bl].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function parseHex(hex: string): { r: number; g: number; b: number } {
  const sanitized = hex.replace('#', '');
  const full =
    sanitized.length === 3
      ? sanitized
          .split('')
          .map((c) => c + c)
          .join('')
      : sanitized;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

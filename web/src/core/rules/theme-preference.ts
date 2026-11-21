/**
 * 主题取值与回落（R19）。
 *
 * 只有 `light` / `dark` 两档，初始浅色；只由用户手动切换，
 * 不读取 `prefers-color-scheme`，系统主题变化不影响应用。
 */

export type Theme = 'light' | 'dark';

export const DEFAULT_THEME: Theme = 'light';

/** 缺省、`null`、旧数据缺字段与非法字符串一律回落浅色。 */
export function normalizeTheme(value: unknown): Theme {
  return value === 'dark' ? 'dark' : 'light';
}

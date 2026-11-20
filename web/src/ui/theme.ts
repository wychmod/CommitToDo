/**
 * 主题只由用户手动切换（TECH-ARCHITECTURE.md §2.4）：
 * 不读取 `prefers-color-scheme`，默认浅色，选择写回 `settings.theme`。
 *
 * 这里只收字面量，避免 ui 层反向依赖 data。
 */
export type ThemeName = 'light' | 'dark';

export function applyTheme(theme: ThemeName) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

import { useEffect, type ReactNode } from 'react';
import { useSettingsState } from '@/data/hooks';
import { applyTheme } from '@/ui/theme';

/**
 * 把偏好落到文档根节点（R19 / K-01）。
 *
 * 主题只由用户手动切换并写 `settings.theme`，不读取系统偏好；
 * 密度通过 `data-density` 让全局样式换用对应的树行高、列表行高与日期显隐。
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettingsState();

  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  useEffect(() => {
    document.documentElement.dataset.density = settings.treeDensity;
  }, [settings.treeDensity]);

  return <>{children}</>;
}

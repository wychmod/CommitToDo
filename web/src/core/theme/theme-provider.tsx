import { useEffect } from 'react';
import { useSettingsStore } from '../../presentation/stores/settings-store';
import { applyAppTheme, APP_THEME_BRAND_DEFAULT } from './app-theme';

export interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps): JSX.Element {
  const isDarkMode = useSettingsStore((s) => s.isDarkMode);
  const themeColor = useSettingsStore((s) => s.themeColor);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    document.documentElement.classList.toggle('light', !isDarkMode);

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', isDarkMode ? '#061313' : '#f5fbf8');
    }
  }, [isDarkMode]);

  useEffect(() => {
    applyAppTheme(isDarkMode ? 'dark' : 'light', themeColor || APP_THEME_BRAND_DEFAULT);
  }, [isDarkMode, themeColor]);

  return <>{children}</>;
}

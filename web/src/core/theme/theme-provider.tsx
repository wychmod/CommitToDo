import { useEffect } from 'react';
import { useSettingsStore } from '../../presentation/stores/settings-store';
import { applyThemeColor } from './colors';

export interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps): JSX.Element {
  const { isDarkMode, themeColor } = useSettingsStore();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    document.documentElement.classList.toggle('light', !isDarkMode);

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', isDarkMode ? '#0F172A' : '#F8FAFC');
    }
  }, [isDarkMode]);

  useEffect(() => {
    applyThemeColor(themeColor);
  }, [themeColor]);

  return <>{children}</>;
}

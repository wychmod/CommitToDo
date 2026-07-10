import { useEffect } from 'react';
import { useSettingsStore } from '../../presentation/stores/settings-store';
import { applyAppTheme, APP_THEME_BRAND_DEFAULT } from './app-theme';

export interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps): JSX.Element {
  const isDarkMode = useSettingsStore((s) => s.isDarkMode);
  const themeMode = useSettingsStore((s) => s.themeMode);
  const setThemeMode = useSettingsStore((s) => s.setThemeMode);
  const themeColor = useSettingsStore((s) => s.themeColor);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    document.documentElement.classList.toggle('light', !isDarkMode);
    document.documentElement.dataset.theme = isDarkMode ? 'dark' : 'light';

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', isDarkMode ? '#061313' : '#f5fbf8');
    }
  }, [isDarkMode]);

  useEffect(() => {
    applyAppTheme(isDarkMode ? 'dark' : 'light', themeColor || APP_THEME_BRAND_DEFAULT);
  }, [isDarkMode, themeColor]);

  useEffect(() => {
    if (typeof window === 'undefined' || themeMode !== 'system') return undefined;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (): void => {
      // Re-applying the same mode re-evaluates the resolved dark value in the store.
      setThemeMode('system');
    };

    media.addEventListener('change', handleChange);
    return () => {
      media.removeEventListener('change', handleChange);
    };
  }, [themeMode, setThemeMode]);

  return <>{children}</>;
}

import { create } from 'zustand';

export type ThemeMode = 'dark' | 'light' | 'system';
export type Density = 'comfortable' | 'compact';

export interface AppSettings {
  isDarkMode: boolean;
  themeMode: ThemeMode;
  themeColor: string;
  density: Density;
  enableNotifications: boolean;
  reminderHours: number;
  defaultLeadMinutes: number;
  enableAutoBackup: boolean;
}

export interface SettingsStore extends AppSettings {
  setDarkMode: (value: boolean) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setThemeColor: (color: string) => void;
  setDensity: (density: Density) => void;
  setNotifications: (value: boolean) => void;
  setReminderHours: (hours: number) => void;
  setDefaultLeadMinutes: (minutes: number) => void;
  setAutoBackup: (value: boolean) => void;
}

const STORAGE_KEY = 'commit-settings';
export const defaultThemeColor = '#16C7C7';

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'dark' || value === 'light' || value === 'system';
}

function isDensity(value: unknown): value is Density {
  return value === 'comfortable' || value === 'compact';
}

function resolveDarkMode(themeMode: ThemeMode): boolean {
  if (themeMode === 'dark') return true;
  if (themeMode === 'light') return false;
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return true;
}

function loadSettings(): Partial<AppSettings> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const settings = raw ? (JSON.parse(raw) as Partial<AppSettings>) : {};
    if (settings.themeColor?.toUpperCase() === '#3B82F6') {
      settings.themeColor = defaultThemeColor;
    }
    return settings;
  } catch {
    return {};
  }
}

function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage errors (e.g. private mode).
  }
}

const defaults: AppSettings = {
  isDarkMode: true,
  themeMode: 'dark',
  themeColor: defaultThemeColor,
  density: 'comfortable',
  enableNotifications: true,
  reminderHours: 1,
  defaultLeadMinutes: 60,
  enableAutoBackup: false,
};

const loaded = loadSettings();
const themeMode = isThemeMode(loaded.themeMode)
  ? loaded.themeMode
  : typeof loaded.isDarkMode === 'boolean'
    ? loaded.isDarkMode
      ? 'dark'
      : 'light'
    : defaults.themeMode;

const initial: AppSettings = {
  ...defaults,
  ...loaded,
  themeMode,
  isDarkMode: resolveDarkMode(themeMode),
  density: isDensity(loaded.density) ? loaded.density : defaults.density,
  defaultLeadMinutes:
    typeof loaded.defaultLeadMinutes === 'number'
      ? loaded.defaultLeadMinutes
      : typeof loaded.reminderHours === 'number'
        ? loaded.reminderHours * 60
        : defaults.defaultLeadMinutes,
};

export const useSettingsStore = create<SettingsStore>((set) => ({
  ...initial,

  setDarkMode: (value) => {
    set((state) => {
      const next = {
        ...state,
        isDarkMode: value,
        themeMode: (value ? 'dark' : 'light') as ThemeMode,
      };
      saveSettings(next);
      return next;
    });
  },

  setThemeMode: (mode) => {
    set((state) => {
      const next = {
        ...state,
        themeMode: mode,
        isDarkMode: resolveDarkMode(mode),
      };
      saveSettings(next);
      return next;
    });
  },

  setThemeColor: (color) => {
    set((state) => {
      const next = { ...state, themeColor: color };
      saveSettings(next);
      return next;
    });
  },

  setDensity: (density) => {
    set((state) => {
      const next = { ...state, density };
      saveSettings(next);
      return next;
    });
  },

  setNotifications: (value) => {
    set((state) => {
      const next = { ...state, enableNotifications: value };
      saveSettings(next);
      return next;
    });
  },

  setReminderHours: (hours) => {
    set((state) => {
      const next = {
        ...state,
        reminderHours: hours,
        defaultLeadMinutes: hours * 60,
      };
      saveSettings(next);
      return next;
    });
  },

  setDefaultLeadMinutes: (minutes) => {
    set((state) => {
      const next = {
        ...state,
        defaultLeadMinutes: minutes,
        reminderHours: Math.round(minutes / 60),
      };
      saveSettings(next);
      return next;
    });
  },

  setAutoBackup: (value) => {
    set((state) => {
      const next = { ...state, enableAutoBackup: value };
      saveSettings(next);
      return next;
    });
  },
}));

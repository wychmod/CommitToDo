import { create } from 'zustand';

export interface AppSettings {
  isDarkMode: boolean;
  themeColor: string;
  enableNotifications: boolean;
  reminderHours: number;
  enableAutoBackup: boolean;
}

export interface SettingsStore extends AppSettings {
  setDarkMode: (value: boolean) => void;
  setThemeColor: (color: string) => void;
  setNotifications: (value: boolean) => void;
  setReminderHours: (hours: number) => void;
  setAutoBackup: (value: boolean) => void;
}

const STORAGE_KEY = 'commit-settings';

function loadSettings(): Partial<AppSettings> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<AppSettings>) : {};
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
  themeColor: '#3B82F6',
  enableNotifications: true,
  reminderHours: 1,
  enableAutoBackup: false,
};

const initial = { ...defaults, ...loadSettings() };

export const useSettingsStore = create<SettingsStore>((set) => ({
  ...initial,

  setDarkMode: (value) => {
    set((state) => {
      const next = { ...state, isDarkMode: value };
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

  setNotifications: (value) => {
    set((state) => {
      const next = { ...state, enableNotifications: value };
      saveSettings(next);
      return next;
    });
  },

  setReminderHours: (hours) => {
    set((state) => {
      const next = { ...state, reminderHours: hours };
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

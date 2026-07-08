import { Moon, Sun } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useSettingsStore } from '@/presentation/stores/settings-store';

export function LandingHeaderActions(): JSX.Element {
  const isDarkMode = useSettingsStore((s) => s.isDarkMode);
  const setDarkMode = useSettingsStore((s) => s.setDarkMode);

  return (
    <div className="flex items-center gap-3">
      <div className="hidden items-center gap-2 tablet:flex">
        <span
          className="h-[6px] w-[6px] rounded-full bg-[var(--v3-primary)]"
          aria-hidden="true"
        />
        <span className="font-mono text-[11px] text-[var(--v3-text-secondary)]">
          Local-first · PWA · IndexedDB
        </span>
        <span
          className="mx-2 h-6 w-px bg-[var(--v3-border)]"
          aria-hidden="true"
        />
      </div>

      <button
        type="button"
        className="v3-icon-btn"
        aria-label={isDarkMode ? '切换到浅色模式' : '切换到深色模式'}
        aria-pressed={isDarkMode}
        onClick={() => setDarkMode(!isDarkMode)}
      >
        {isDarkMode ? (
          <Moon size={18} strokeWidth={1.5} aria-hidden="true" />
        ) : (
          <Sun size={18} strokeWidth={1.5} aria-hidden="true" />
        )}
      </button>

      <Link
        to="/workspace"
        className="v3-btn v3-btn-secondary hidden h-[34px] px-4 text-[13px] tablet:inline-flex"
      >
        登录
      </Link>

      <Link
        to="/workspace"
        className="v3-btn v3-btn-primary h-[34px] px-4 text-[13px]"
      >
        开始使用
      </Link>
    </div>
  );
}

import { AppIcon, AppIconName } from '../../icons/app-icons';
import { useSettingsStore } from '../../stores/settings-store';
import { cn } from '../../../core/utils/formatters';
import { formatHudClock, formatHudDate, useNow } from './use-now';

export interface HudTopbarProps {
  className?: string;
}

/**
 * Thin technical-HUD strip sitting at the top of the home canvas.
 *
 * - Left:   product mark · version · branch
 * - Center: live system status (auto-updating dot, but text is static
 *           because we don't want to flicker the engineering readouts)
 * - Right:  live clock + theme toggle
 *
 * Pure presentational; renders semantic Tailwind tokens only.
 */
export function HudTopbar({ className }: HudTopbarProps): JSX.Element {
  const now = useNow(1000);
  const isDarkMode = useSettingsStore((s) => s.isDarkMode);
  const setDarkMode = useSettingsStore((s) => s.setDarkMode);

  const clock = formatHudClock(now);
  const date = formatHudDate(now);

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-md border-b border-hairline bg-canvas/60 px-md py-xs text-mono-sm text-ink-subtle backdrop-blur-sm',
        'hud-rise hud-stagger-1',
        className
      )}
      role="banner"
      aria-label="System status bar"
    >
      {/* Left — identity */}
      <div className="flex min-w-0 items-center gap-sm">
        <div className="flex items-center gap-xs truncate">
          <span className="font-medium tracking-wide text-ink-muted">
            COMMITTODO/OS
          </span>
          <span className="text-ink-tertiary">·</span>
          <span className="tabular text-ink-tertiary">v0.1.0</span>
          <span className="text-ink-tertiary">·</span>
          <span className="text-ink-tertiary">MAIN</span>
        </div>
      </div>

      {/* Center — status (hidden on mobile to keep things calm) */}
      <div className="hidden items-center gap-xs tablet:flex">
        <span className="h-1.5 w-1.5 rounded-full bg-success hud-pulse" aria-hidden />
        <span className="text-ink-muted">SYSTEM</span>
        <span className="text-ink-tertiary">·</span>
        <span className="font-medium tracking-wide text-success">ONLINE</span>
        <span className="text-ink-tertiary">·</span>
        <span className="text-ink-muted">agents ready</span>
      </div>

      {/* Right — clock + theme */}
      <div className="flex items-center gap-sm">
        <span className="hidden text-ink-tertiary mobile:inline-block">
          {date}
        </span>
        <span className="hidden text-ink-tertiary mobile:inline-block">·</span>
        <span className="tabular text-ink-muted">{clock}</span>
        <button
          type="button"
          onClick={() => setDarkMode(!isDarkMode)}
          className="ml-xs flex h-7 w-7 items-center justify-center rounded-md border border-hairline text-ink-muted transition-colors hover:border-hairline-strong hover:bg-surface-2 hover:text-ink"
          aria-label={isDarkMode ? '切换到亮色模式' : '切换到暗色模式'}
        >
          {isDarkMode ? (
            <AppIcon name={AppIconName.sun} className="h-3.5 w-3.5" />
          ) : (
            <AppIcon name={AppIconName.moon} className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}

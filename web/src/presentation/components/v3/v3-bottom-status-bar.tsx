import '@/core/theme/v3-tokens.css';

import * as React from 'react';
import { CloudOff, Command, Database } from 'lucide-react';

import { cn } from '@/core/utils/formatters';
import { useCommandPaletteStore } from '@/presentation/components/command-palette/command-palette.store';

export interface V3BottomStatusBarProps {
  className?: string;
}

type OnlineState = 'online' | 'offline';

/**
 * V3 bottom status bar.
 *
 * 48px fixed footer that communicates local-first persistence state, offline
 * availability and the command palette shortcut.
 */
export function V3BottomStatusBar({
  className,
}: V3BottomStatusBarProps): JSX.Element {
  const openPalette = useCommandPaletteStore((s) => s.openPalette);
  const [onlineState, setOnlineState] = React.useState<OnlineState>('online');
  const [isMac, setIsMac] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = (): void => setOnlineState('online');
    const handleOffline = (): void => setOnlineState('offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    if (!window.navigator.onLine) setOnlineState('offline');
    setIsMac(/mac|iphone|ipad|ipod/i.test(navigator.platform));
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const kbdHint = isMac ? '⌘K' : 'Ctrl+K';

  return (
    <footer
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40 flex h-[var(--v3-status-bar-height)] items-center justify-between border-t border-[var(--v3-border-soft)] bg-[var(--v3-header)] px-4 text-[13px]',
        className
      )}
      role="contentinfo"
    >
      <div className="flex items-center gap-2 text-[var(--v3-text-secondary)]">
        <Database size={14} strokeWidth={1.5} aria-hidden="true" />
        <span className="hidden mobile:inline">IndexedDB</span>
        <span aria-hidden="true" className="hidden mobile:inline">·</span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className={cn(
              'h-2 w-2 rounded-full',
              onlineState === 'online' ? 'bg-[var(--v3-primary)]' : 'bg-[var(--v3-warning)]'
            )}
            aria-hidden="true"
          />
          {onlineState === 'online' ? '已保存' : '离线模式'}
        </span>
      </div>

      <div className="flex items-center gap-2 text-[var(--v3-text-muted)]">
        {onlineState === 'offline' ? (
          <>
            <CloudOff size={14} strokeWidth={1.5} aria-hidden="true" />
            <span>离线可用</span>
          </>
        ) : (
          <>
            <span className="h-2 w-2 rounded-full bg-[var(--v3-primary)]" aria-hidden="true" />
            <span>离线可用</span>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={openPalette}
        className="inline-flex items-center gap-2 rounded-[var(--v3-radius-md)] px-2 py-1 text-[var(--v3-text-secondary)] transition-[background-color,color] duration-(--v3-fast) hover:bg-[var(--v3-control)] hover:text-[var(--v3-text-strong)] focus-visible:outline-none focus-visible:[box-shadow:var(--v3-focus-ring)]"
      >
        <Command size={16} strokeWidth={1.5} aria-hidden="true" />
        <kbd className="font-sans">{kbdHint}</kbd>
        <span>命令面板</span>
      </button>
    </footer>
  );
}

import { useEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from '../../../core/utils/formatters';

export type SyncState = 'synced' | 'syncing' | 'offline';

export interface SyncStatusProps {
  state?: SyncState;
  pendingChanges?: number;
  className?: string;
}

/**
 * Tiny indicator that lives in the topbar. Detects offline automatically via
 * `navigator.onLine`. The pending count will come from the future sync layer
 * — for now we keep it static.
 */
export function SyncStatus({
  state = 'synced',
  pendingChanges = 0,
  className,
}: SyncStatusProps): JSX.Element {
  const [autoState, setAutoState] = useState<SyncState>(state);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = (): void => setAutoState((s) => (s === 'offline' ? 'synced' : s));
    const handleOffline = (): void => setAutoState('offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    if (!window.navigator.onLine) setAutoState('offline');
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const effective: SyncState = autoState;
  const tone: 'synced' | 'syncing' | 'offline' =
    effective === 'offline' ? 'offline' : effective === 'syncing' ? 'syncing' : 'synced';

  const label: string =
    effective === 'offline'
      ? '离线'
      : effective === 'syncing'
        ? '同步中'
        : pendingChanges > 0
          ? `本地 · ${pendingChanges} 待同步`
          : '本地 · 已同步';

  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          className={cn(
            'topbar-action px-2.5 text-ink-muted',
            'data-[state=open]:bg-surface',
            className
          )}
          aria-label={label}
          data-status={tone}
          title={label}
        >
          <span className="topbar-sync-dot" data-status={tone} aria-hidden />
          <span className="hidden mobile:inline">{label}</span>
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="end"
          sideOffset={6}
          className="z-50 w-[260px] rounded-md border border-border-strong bg-canvas-elevated p-3 shadow-lg"
        >
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-md',
                tone === 'offline' ? 'bg-warning-soft text-warning' : 'bg-primary-soft text-primary'
              )}
            >
              {tone === 'offline' ? (
                <CloudOff className="h-4 w-4" aria-hidden />
              ) : tone === 'syncing' ? (
                <RefreshCw className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Cloud className="h-4 w-4" aria-hidden />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-ink">
                {tone === 'offline'
                  ? '离线模式'
                  : tone === 'syncing'
                    ? '正在同步…'
                    : '本地 · IndexedDB'}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                {tone === 'offline'
                  ? '网络不可用，可以继续编辑任务，会在恢复后保存。'
                  : tone === 'syncing'
                    ? '正在把本地变更同步到后端…'
                    : '数据保存在浏览器本地，支持 PWA 离线安装。'}
              </p>
            </div>
          </div>
          <div className="mt-3 border-t border-border-quiet pt-3 text-[11px] text-ink-subtle">
            云同步将在登录系统接入后开放。
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

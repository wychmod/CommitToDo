import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Layers, Plus } from 'lucide-react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from '../../../core/utils/formatters';

export interface WorkspaceSwitcherProps {
  className?: string;
}

/**
 * Single-tenant local workspace indicator. Lives in the topbar; the future
 * cloud / org switcher will reuse the same shell but render a list of orgs.
 */
export function WorkspaceSwitcher({ className }: WorkspaceSwitcherProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close on outside click — Popover handles this naturally.
  useEffect(() => {
    if (!open) return undefined;
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          ref={triggerRef}
          type="button"
          className={cn(
            'topbar-action',
            'pl-3 pr-2 max-w-[180px] truncate',
            'data-[state=open]:bg-surface data-[state=open]:border-border',
            className
          )}
          aria-label="切换工作空间"
          data-state={open ? 'open' : 'closed'}
        >
          <Layers className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span className="truncate">本地工作空间</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-ink-subtle" aria-hidden />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={6}
          className="z-50 min-w-[240px] rounded-md border border-border-strong bg-canvas-elevated p-1 shadow-lg"
        >
          <div className="px-2 pb-1 pt-1">
            <p className="text-[10px] uppercase tracking-[0.12em] text-ink-subtle">
              当前工作空间
            </p>
            <p className="mt-1 truncate text-sm text-ink">Local Workspace</p>
            <p className="mt-0.5 text-xs text-ink-muted">
              IndexedDB / 离线优先 / 本地保存
            </p>
          </div>
          <div className="my-1 h-px bg-border-quiet" aria-hidden />
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-ink-muted transition-colors hover:bg-surface hover:text-ink"
            disabled
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            <span>新建工作空间（即将支持）</span>
          </button>
          <div className="px-2 pb-1 pt-1 text-[11px] text-ink-subtle">
            未来可切换团队 / 组织 / 云端工作空间。
          </div>
          <PopoverPrimitive.Arrow className="fill-border-strong" />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

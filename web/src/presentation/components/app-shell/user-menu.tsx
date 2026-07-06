import { useState } from 'react';
import { User as UserIcon, Settings as SettingsIcon, Keyboard, LogOut } from 'lucide-react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { useNavigate } from 'react-router-dom';

import { cn } from '../../../core/utils/formatters';

export interface UserMenuProps {
  className?: string;
}

/**
 * Local-user menu. Will be replaced with a real auth-aware variant once the
 * cloud account system lands; the structure (avatar + label + dropdown of
 * navigation shortcuts) stays the same.
 */
export function UserMenu({ className }: UserMenuProps): JSX.Element {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label="用户菜单"
          className={cn(
            'topbar-icon-btn border border-border',
            'hover:border-border-strong',
            className
          )}
        >
          <UserIcon className="h-4 w-4" aria-hidden />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-[220px] rounded-md border border-border-strong bg-canvas-elevated p-1 shadow-lg"
        >
          <div className="px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.12em] text-ink-subtle">
              当前状态
            </p>
            <p className="mt-1 text-sm font-medium text-ink">本地模式</p>
            <p className="mt-0.5 text-xs text-ink-muted">
              数据保存在本机 IndexedDB
            </p>
          </div>
          <div className="my-1 h-px bg-border-quiet" aria-hidden />
          <MenuItem
            icon={SettingsIcon}
            label="账号设置"
            hint="即将支持"
            onClick={() => {
              setOpen(false);
              navigate('settings');
            }}
            disabled
          />
          <MenuItem
            icon={SettingsIcon}
            label="工作空间设置"
            onClick={() => {
              setOpen(false);
              navigate('settings');
            }}
          />
          <MenuItem
            icon={Keyboard}
            label="快捷键"
            hint="⌘K 命令面板"
            onClick={() => {
              setOpen(false);
            }}
          />
          <div className="my-1 h-px bg-border-quiet" aria-hidden />
          <MenuItem
            icon={LogOut}
            label="退出本地模式"
            disabled
            hint="暂未启用登录"
          />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

interface MenuItemProps {
  icon: typeof UserIcon;
  label: string;
  hint?: string;
  disabled?: boolean;
  onClick?: () => void;
}

function MenuItem({
  icon: Icon,
  label,
  hint,
  disabled,
  onClick,
}: MenuItemProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors',
        disabled
          ? 'cursor-not-allowed text-ink-subtle'
          : 'text-ink hover:bg-surface'
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      <span className="flex-1">{label}</span>
      {hint ? <span className="text-[11px] text-ink-subtle">{hint}</span> : null}
    </button>
  );
}

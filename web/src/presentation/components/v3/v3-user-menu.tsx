import * as PopoverPrimitive from '@radix-ui/react-popover';
import { LogOut, Settings, User } from 'lucide-react';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';

import { useDemoAuthStore } from '@/presentation/stores/demo-auth-store';
import type { DemoAuthSession } from '@/presentation/screens/auth/auth-types';

function providerLabel(provider: DemoAuthSession['user']['provider']): string {
  return provider === 'github' ? 'GitHub 演示登录' : '账号密码演示登录';
}

interface GuestContentProps {
  onLogin(): void;
  onSettings(): void;
}

function GuestContent({ onLogin, onSettings }: GuestContentProps): JSX.Element {
  return (
    <>
      <div className="px-3 py-2">
        <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--v3-text-muted)]">
          当前状态
        </p>
        <p className="mt-1 text-[14px] font-medium text-[var(--v3-text-strong)]">
          本地模式
        </p>
        <p className="mt-0.5 text-[12px] text-[var(--v3-text-muted)]">
          数据保存在本机 IndexedDB
        </p>
      </div>
      <div className="my-1 h-px bg-[var(--v3-divider)]" aria-hidden="true" />
      <button
        type="button"
        onClick={onLogin}
        className="flex w-full items-center gap-2 rounded-[var(--v3-radius-sm)] px-2 py-1.5 text-left text-[13px] text-[var(--v3-text)] transition-colors hover:bg-[var(--v3-control)]"
      >
        <User size={14} strokeWidth={1.5} aria-hidden="true" />
        <span>登录演示账号</span>
      </button>
      <button
        type="button"
        onClick={onSettings}
        className="flex w-full items-center gap-2 rounded-[var(--v3-radius-sm)] px-2 py-1.5 text-left text-[13px] text-[var(--v3-text)] transition-colors hover:bg-[var(--v3-control)]"
      >
        <Settings size={14} strokeWidth={1.5} aria-hidden="true" />
        <span>设置</span>
      </button>
    </>
  );
}

interface AuthedContentProps {
  session: DemoAuthSession;
  onSettings(): void;
  onLogout(): void;
}

function AuthedContent({
  session,
  onSettings,
  onLogout,
}: AuthedContentProps): JSX.Element {
  return (
    <>
      <div className="px-3 py-2">
        <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--v3-text-muted)]">
          当前账号
        </p>
        <p className="mt-1 text-[14px] font-medium text-[var(--v3-text-strong)]">
          {session.user.username}
        </p>
        <p className="mt-0.5 text-[12px] text-[var(--v3-text-muted)]">
          {providerLabel(session.user.provider)}
        </p>
        <p className="mt-0.5 text-[12px] text-[var(--v3-text-muted)]">
          业务数据仍保存在本机
        </p>
      </div>
      <div className="my-1 h-px bg-[var(--v3-divider)]" aria-hidden="true" />
      <button
        type="button"
        onClick={onSettings}
        className="flex w-full items-center gap-2 rounded-[var(--v3-radius-sm)] px-2 py-1.5 text-left text-[13px] text-[var(--v3-text)] transition-colors hover:bg-[var(--v3-control)]"
      >
        <Settings size={14} strokeWidth={1.5} aria-hidden="true" />
        <span>设置</span>
      </button>
      <button
        type="button"
        onClick={onLogout}
        className="flex w-full items-center gap-2 rounded-[var(--v3-radius-sm)] px-2 py-1.5 text-left text-[13px] text-[var(--v3-danger)] transition-colors hover:bg-[var(--v3-control)]"
      >
        <LogOut size={14} strokeWidth={1.5} aria-hidden="true" />
        <span>退出登录</span>
      </button>
    </>
  );
}

/**
 * V3 user menu for the top command bar.
 *
 * Guest (local mode) offers a demo-login entry plus settings. An authenticated
 * `admin` session shows the account, the demo provider label and a local-first
 * reminder. Logout clears the demo session and returns to the landing page -
 * IndexedDB business data and settings are never touched.
 */
export function V3UserMenu(): JSX.Element {
  const navigate = useNavigate();
  const session = useDemoAuthStore((s) => s.session);
  const signOut = useDemoAuthStore((s) => s.signOut);
  const [open, setOpen] = React.useState(false);

  const closeAnd = (path: string): void => {
    setOpen(false);
    navigate(path);
  };

  const handleLogout = (): void => {
    setOpen(false);
    signOut();
    navigate('/', { replace: true });
  };

  const triggerLabel = session
    ? `${session.user.username} 用户菜单`
    : '用户菜单';

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label={triggerLabel}
          className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] text-[var(--v3-text-secondary)] transition-[background-color,border-color,color] duration-(--v3-fast) hover:border-[var(--v3-border)] hover:bg-[var(--v3-control)] hover:text-[var(--v3-text-strong)] focus-visible:outline-none focus-visible:[box-shadow:var(--v3-focus-ring)]"
        >
          {session ? (
            <span className="text-[14px] font-semibold text-[var(--v3-text-strong)]">
              A
            </span>
          ) : (
            <User size={16} strokeWidth={1.5} aria-hidden="true" />
          )}
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-[220px] rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-card)] p-1 shadow-[var(--v3-shadow-panel)]"
        >
          {session ? (
            <AuthedContent
              session={session}
              onSettings={() => closeAnd('/settings')}
              onLogout={handleLogout}
            />
          ) : (
            <GuestContent
              onLogin={() => closeAnd('/login')}
              onSettings={() => closeAnd('/settings')}
            />
          )}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

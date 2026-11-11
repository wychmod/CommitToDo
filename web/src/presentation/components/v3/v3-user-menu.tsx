import * as PopoverPrimitive from '@radix-ui/react-popover';
import { Github, LogOut, Mail, Phone, Settings, ShieldCheck, User } from 'lucide-react';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuthStore } from '@/presentation/stores/auth-store';
import type { UserProfile } from '@/domain/entities/user-profile';
import type { AuthProvider } from '@/presentation/screens/auth/auth-types';

function providerLabel(provider: AuthProvider): string {
  switch (provider) {
    case 'github':
      return 'GitHub 登录';
    case 'phone':
      return '手机号登录';
    case 'email':
    default:
      return '邮箱登录';
  }
}

function providerIcon(provider: AuthProvider): typeof Mail {
  switch (provider) {
    case 'github':
      return Github;
    case 'phone':
      return Phone;
    default:
      return Mail;
  }
}

function displayName(profile: UserProfile | null): string {
  if (!profile) return '用户';
  return profile.displayName ?? profile.email ?? profile.principalId.slice(0, 8);
}

function avatarInitial(profile: UserProfile | null): string {
  const name = displayName(profile);
  return name.charAt(0).toUpperCase();
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
        <span>登录</span>
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
  profile: UserProfile | null;
  provider: AuthProvider;
  onSecurity(): void;
  onSettings(): void;
  onLogout(): void;
}

function AuthedContent({
  profile,
  provider,
  onSecurity,
  onSettings,
  onLogout,
}: AuthedContentProps): JSX.Element {
  const Icon = providerIcon(provider);

  return (
    <>
      <div className="px-3 py-2">
        <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--v3-text-muted)]">
          当前账号
        </p>
        <p className="mt-1 text-[14px] font-medium text-[var(--v3-text-strong)]">
          {displayName(profile)}
        </p>
        {profile?.email ? (
          <p className="mt-0.5 text-[12px] text-[var(--v3-text-muted)]">
            {profile.email}
          </p>
        ) : null}
        <p className="mt-0.5 flex items-center gap-1 text-[12px] text-[var(--v3-text-muted)]">
          <Icon size={12} strokeWidth={1.5} aria-hidden="true" />
          <span>{providerLabel(provider)}</span>
        </p>
        <p className="mt-0.5 text-[12px] text-[var(--v3-text-muted)]">
          业务数据仍保存在本机
        </p>
      </div>
      <div className="my-1 h-px bg-[var(--v3-divider)]" aria-hidden="true" />
      <button
        type="button"
        onClick={onSecurity}
        className="flex w-full items-center gap-2 rounded-[var(--v3-radius-sm)] px-2 py-1.5 text-left text-[13px] text-[var(--v3-text)] transition-colors hover:bg-[var(--v3-control)]"
      >
        <ShieldCheck size={14} strokeWidth={1.5} aria-hidden="true" />
        <span>账户与安全</span>
      </button>
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
 * Guest (local mode) offers login + settings. An authenticated session shows
 * the real CloudBase profile, provider label and a local-first reminder. Logout
 * signs out via CloudBase and returns to the landing page; IndexedDB business
 * data is never touched.
 */
export function V3UserMenu(): JSX.Element {
  const navigate = useNavigate();
  const status = useAuthStore((s) => s.status);
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);
  const [open, setOpen] = React.useState(false);

  const isAuthenticated = status === 'authenticated' && session !== null;
  const provider: AuthProvider = session?.provider === 'github' ? 'github' : session?.provider === 'phone' ? 'phone' : 'email';

  const closeAnd = (path: string): void => {
    setOpen(false);
    navigate(path);
  };

  const handleLogout = async (): Promise<void> => {
    setOpen(false);
    await signOut();
    navigate('/', { replace: true });
  };

  const triggerLabel = isAuthenticated
    ? `${displayName(profile)} 用户菜单`
    : '用户菜单';

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label={triggerLabel}
          className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] text-[var(--v3-text-secondary)] transition-[background-color,border-color,color] duration-(--v3-fast) hover:border-[var(--v3-border)] hover:bg-[var(--v3-control)] hover:text-[var(--v3-text-strong)] focus-visible:outline-none focus-visible:[box-shadow:var(--v3-focus-ring)]"
        >
          {isAuthenticated ? (
            <span className="text-[14px] font-semibold text-[var(--v3-text-strong)]">
              {avatarInitial(profile)}
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
          {isAuthenticated ? (
            <AuthedContent
              profile={profile}
              provider={provider}
              onSecurity={() => closeAnd('/settings/security')}
              onSettings={() => closeAnd('/settings')}
              onLogout={() => void handleLogout()}
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

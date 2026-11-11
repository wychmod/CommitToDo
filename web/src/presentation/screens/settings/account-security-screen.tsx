import '@/core/theme/v3-tokens.css';

import { Github, Mail, Phone, Shield, ShieldCheck } from 'lucide-react';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';

import { V3AppShell, V3Button, V3Card } from '@/presentation/components/v3';
import { useAuthStore } from '@/presentation/stores/auth-store';
import type { AuthIdentity } from '@/domain/entities/auth-identity';
import type { SecurityEvent } from '@/domain/repositories/i-auth-security-repository';
import { BindPhoneDialog } from './bind-phone-dialog';
import { readCloudBaseAuthFeatures } from '@/core/cloudbase/cloudbase-config';

/**
 * Account security screen for managing login methods, phone binding,
 * and viewing security activity.
 */
export function AccountSecurityScreen(): JSX.Element {
  const navigate = useNavigate();
  const { profile, session, securityEvents, loadSecurityEvents } = useAuthStore();
  const [bindPhoneOpen, setBindPhoneOpen] = React.useState(false);
  const authFeatures = readCloudBaseAuthFeatures();

  React.useEffect(() => {
    void loadSecurityEvents();
  }, [loadSecurityEvents]);

  return (
    <V3AppShell>
      <div className="flex min-h-[calc(100vh-var(--v3-app-chrome))]">
        <div className="flex-1 px-6 py-8 desktop:px-10">
          <header className="flex flex-col gap-2">
            <div>
              <span className="text-[12px] font-medium uppercase tracking-[0.12em] text-[var(--v3-primary)]">
                Security
              </span>
              <h1 className="mt-1 text-[42px] font-bold leading-[1.05] text-[var(--v3-text-strong)]">
                账户与安全
              </h1>
              <p className="mt-2 text-[15px] text-[var(--v3-text-secondary)]">
                管理登录方式、手机号绑定和安全记录。
              </p>
            </div>
          </header>

          <div className="mt-10 flex max-w-[720px] flex-col gap-8">
            {/* Account summary */}
            <AccountSummaryCard
              displayName={profile?.displayName ?? null}
              email={profile?.email ?? session?.email ?? null}
              principalId={profile?.principalId ?? session?.userId ?? null}
              avatarUrl={profile?.avatarUrl ?? null}
            />

            {/* Login methods */}
            <LoginMethodsSection
              identities={profile?.identities ?? []}
              phoneBindingEnabled={authFeatures.phone}
              onBindPhone={() => setBindPhoneOpen(true)}
            />

            {/* Security activity */}
            <SecurityActivitySection events={securityEvents} />

            {/* Back to settings */}
            <V3Button variant="secondary" onClick={() => navigate('/settings')}>
              返回设置
            </V3Button>
          </div>
        </div>
      </div>

      {authFeatures.phone ? (
        <BindPhoneDialog open={bindPhoneOpen} onOpenChange={setBindPhoneOpen} />
      ) : null}
    </V3AppShell>
  );
}

interface AccountSummaryCardProps {
  displayName: string | null;
  email: string | null;
  principalId: string | null;
  avatarUrl: string | null;
}

function AccountSummaryCard({
  displayName,
  email,
  principalId,
  avatarUrl,
}: AccountSummaryCardProps): JSX.Element {
  return (
    <V3Card className="flex items-center gap-4 p-5">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={displayName ?? '用户头像'}
          className="h-14 w-14 rounded-full object-cover"
        />
      ) : (
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--v3-control)] text-[20px] font-semibold text-[var(--v3-primary)]">
          {(displayName ?? email ?? 'U').charAt(0).toUpperCase()}
        </span>
      )}
      <div className="flex flex-col gap-0.5">
        <p className="text-[18px] font-semibold text-[var(--v3-text-strong)]">
          {displayName ?? '未设置昵称'}
        </p>
        {email ? (
          <p className="text-[14px] text-[var(--v3-text-secondary)]">{email}</p>
        ) : null}
        {principalId ? (
          <p className="text-[12px] text-[var(--v3-text-muted)]">
            ID: {principalId.slice(0, 8)}…
          </p>
        ) : null}
      </div>
    </V3Card>
  );
}

interface LoginMethodsSectionProps {
  identities: AuthIdentity[];
  phoneBindingEnabled: boolean;
  onBindPhone(): void;
}

function LoginMethodsSection({ identities, phoneBindingEnabled, onBindPhone }: LoginMethodsSectionProps): JSX.Element {
  const emailIdentity = identities.find((i) => i.provider === 'email');
  const phoneIdentity = identities.find((i) => i.provider === 'phone');
  const githubIdentity = identities.find((i) => i.provider === 'github');

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-[18px] font-semibold text-[var(--v3-text-strong)]">
        登录方式
      </h2>
      <V3Card className="flex flex-col divide-y divide-[var(--v3-divider)] p-0">
        <IdentityRow
          icon={Mail}
          label="邮箱"
          masked={emailIdentity?.identifierMasked ?? null}
          verified={!!emailIdentity?.verifiedAt}
          isPrimary={emailIdentity?.isPrimary ?? false}
        />
        <IdentityRow
          icon={Phone}
          label="手机号"
          masked={phoneIdentity?.identifierMasked ?? null}
          verified={!!phoneIdentity?.verifiedAt}
          isPrimary={phoneIdentity?.isPrimary ?? false}
          bindable={phoneBindingEnabled && !phoneIdentity}
          onBind={onBindPhone}
        />
        <IdentityRow
          icon={Github}
          label="GitHub"
          masked={githubIdentity?.identifierMasked ?? null}
          verified={!!githubIdentity?.verifiedAt}
          isPrimary={githubIdentity?.isPrimary ?? false}
        />
      </V3Card>
    </section>
  );
}

interface IdentityRowProps {
  icon: typeof Mail;
  label: string;
  masked: string | null;
  verified: boolean;
  isPrimary: boolean;
  bindable?: boolean;
  onBind?(): void;
}

function IdentityRow({
  icon: Icon,
  label,
  masked,
  verified,
  isPrimary,
  bindable,
  onBind,
}: IdentityRowProps): JSX.Element {
  return (
    <div className="flex items-center justify-between px-5 py-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--v3-control)] text-[var(--v3-text-secondary)]">
          <Icon size={18} strokeWidth={1.5} aria-hidden="true" />
        </span>
        <div className="flex flex-col">
          <p className="text-[14px] font-medium text-[var(--v3-text-strong)]">
            {label}
            {isPrimary ? (
              <span className="ml-2 rounded-[var(--v3-radius-sm)] bg-[var(--v3-primary-soft)] px-1.5 py-0.5 text-[11px] text-[var(--v3-primary)]">
                主要
              </span>
            ) : null}
          </p>
          {masked ? (
            <p className="text-[13px] text-[var(--v3-text-secondary)]">{masked}</p>
          ) : (
            <p className="text-[13px] text-[var(--v3-text-muted)]">未绑定</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {verified ? (
          <span className="flex items-center gap-1 text-[12px] text-[var(--v3-success)]">
            <ShieldCheck size={14} strokeWidth={1.5} aria-hidden="true" />
            已验证
          </span>
        ) : bindable ? (
          <V3Button variant="secondary" className="h-8 px-3 text-[12px]" onClick={onBind}>
            绑定
          </V3Button>
        ) : (
          <span className="flex items-center gap-1 text-[12px] text-[var(--v3-text-muted)]">
            <Shield size={14} strokeWidth={1.5} aria-hidden="true" />
            未验证
          </span>
        )}
      </div>
    </div>
  );
}

function SecurityActivitySection({ events }: { events: SecurityEvent[] }): JSX.Element {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-[18px] font-semibold text-[var(--v3-text-strong)]">
        最近安全活动
      </h2>
      <V3Card className="flex flex-col gap-3 p-5">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-4 text-center">
            <Shield size={32} strokeWidth={1} className="text-[var(--v3-text-muted)]" aria-hidden="true" />
            <p className="text-[14px] text-[var(--v3-text-secondary)]">暂无安全活动记录</p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--v3-divider)]">
            {events.map((event) => (
              <li key={event.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <span className="text-[13px] text-[var(--v3-text-strong)]">{event.eventType}</span>
                <time className="text-[12px] text-[var(--v3-text-muted)]">
                  {new Date(event.createdAt).toLocaleString()}
                </time>
              </li>
            ))}
          </ul>
        )}
      </V3Card>
    </section>
  );
}

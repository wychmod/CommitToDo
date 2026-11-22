import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthShell } from '@/components/auth/auth-shell';
import {
  AuthField,
  AuthForm,
  AuthHeading,
  AuthMessage,
  AuthMeta,
  AuthSubmit,
  AuthSwitch,
  AuthTextLink,
} from '@/components/auth/auth-form';
import { authErrorMessage } from '@/components/auth/auth-error';
import { readLastEmail, rememberEmail } from '@/components/auth/last-email';
import { markTakeoverPending } from '@/components/auth/takeover-notice';
import { resolveAuthNext } from '@/core/rules/auth-next';
import { isValidEmail, normalizeEmail } from '@/core/rules/auth-form';
import { assignOwnerTo } from '@/data/assign-owner';
import { signIn } from '@/data/cloud/auth';
import { t } from '@/i18n';
import { useAuthStore } from '@/stores/auth.store';

/**
 * P09 登录（PRD V2-01 OP-01 / OP-03 / OP-07）。
 *
 * 成功后先归属本机数据再写会话，最后按 `next` 回跳；失败就地提示并保留输入。
 * 已登录时不显示表单，直接回 `/today`。
 */
export function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const principalId = useAuthStore((state) => state.principalId);
  const setSession = useAuthStore((state) => state.setSession);

  const next = resolveAuthNext(params.get('next'));
  const resetDone = params.get('reset') === '1';

  const [email, setEmail] = useState(readLastEmail);
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (principalId && !busy) return <Navigate to="/today" replace />;

  const handleSubmit = async () => {
    setEmailError(null);
    setPasswordError(null);
    setFormError(null);

    const normalized = normalizeEmail(email);
    let invalid = false;
    if (!isValidEmail(normalized)) {
      setEmailError(t('auth.error.email'));
      invalid = true;
    }
    if (password.length === 0) {
      setPasswordError(t('auth.error.passwordEmpty'));
      invalid = true;
    }
    if (invalid) return;

    setBusy(true);
    const result = await signIn(normalized, password);
    if (!result.ok) {
      setBusy(false);
      setFormError(t(authErrorMessage(result.error.code)));
      return;
    }

    const assigned = await assignOwnerTo(result.value.principalId);
    if (!assigned.ok) {
      setBusy(false);
      setFormError(t('auth.error.ownership'));
      return;
    }
    if (assigned.value.moved > 0) markTakeoverPending();

    rememberEmail(result.value.email || normalized);
    setSession(result.value);
    navigate(next, { replace: true });
  };

  return (
    <AuthShell>
      <AuthHeading title={t('auth.login.title')} description={t('auth.login.description')} />

      {resetDone ? <AuthMessage tone="success">{t('auth.recover.done')}</AuthMessage> : null}
      {formError ? <AuthMessage>{formError}</AuthMessage> : null}

      <AuthForm onSubmit={() => void handleSubmit()} busy={busy}>
        <AuthField
          id="login-email"
          label={t('auth.email')}
          value={email}
          onChange={(value) => {
            setEmail(value);
            setEmailError(null);
          }}
          type="email"
          autoComplete="email"
          placeholder={t('auth.email.placeholder')}
          error={emailError}
          disabled={busy}
          autoFocus
        />
        <AuthField
          id="login-password"
          label={t('auth.password')}
          value={password}
          onChange={(value) => {
            setPassword(value);
            setPasswordError(null);
          }}
          type="password"
          autoComplete="current-password"
          placeholder={t('auth.password.placeholder')}
          error={passwordError}
          disabled={busy}
        />

        <AuthMeta>
          <AuthTextLink to="/auth/recover">{t('auth.login.forgot')}</AuthTextLink>
        </AuthMeta>

        <AuthSubmit busy={busy}>{t('auth.login.submit')}</AuthSubmit>
      </AuthForm>

      <AuthSwitch
        lead={t('auth.login.switchLead')}
        to={`/auth/signup?next=${encodeURIComponent(next)}`}
        action={t('auth.login.toSignup')}
      />
    </AuthShell>
  );
}

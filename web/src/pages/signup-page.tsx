import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthShell } from '@/components/auth/auth-shell';
import {
  AuthField,
  AuthForm,
  AuthHeading,
  AuthHint,
  AuthMessage,
  AuthSubmit,
  AuthTextLink,
} from '@/components/auth/auth-form';
import { authErrorMessage } from '@/components/auth/auth-error';
import { readLastEmail, rememberEmail } from '@/components/auth/last-email';
import { resolveAuthNext } from '@/core/rules/auth-next';
import { isValidEmail, normalizeEmail, passwordsMatch } from '@/core/rules/auth-form';
import { assignOwnerTo } from '@/data/assign-owner';
import { signUp } from '@/data/cloud/auth';
import { t } from '@/i18n';
import { useAuthStore } from '@/stores/auth.store';
import styles from './auth-page.module.css';

/**
 * P10 注册（PRD V2-01 OP-02 / OP-03 / OP-07）。
 *
 * 两次密码不一致不发请求；注册成功即登录并把本机数据归属到新账号，
 * 随后按 `next` 回跳。已登录时不显示表单。
 */
export function SignupPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const principalId = useAuthStore((state) => state.principalId);
  const setSession = useAuthStore((state) => state.setSession);

  const next = resolveAuthNext(params.get('next'));

  const [email, setEmail] = useState(readLastEmail);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (principalId && !busy) return <Navigate to="/today" replace />;

  const handleSubmit = async () => {
    setEmailError(null);
    setPasswordError(null);
    setConfirmError(null);
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
    if (password.length > 0 && !passwordsMatch(password, confirm)) {
      setConfirmError(t('auth.error.passwordMismatch'));
      invalid = true;
    }
    if (invalid) return;

    setBusy(true);
    const result = await signUp(normalized, password);
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

    rememberEmail(result.value.email || normalized);
    setSession(result.value);
    navigate(next, { replace: true });
  };

  return (
    <AuthShell>
      <AuthHeading title={t('auth.signup.title')} description={t('auth.signup.description')} />

      {formError ? <AuthMessage>{formError}</AuthMessage> : null}

      <AuthForm onSubmit={() => void handleSubmit()} busy={busy}>
        <AuthField
          id="signup-email"
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
          id="signup-password"
          label={t('auth.password')}
          value={password}
          onChange={(value) => {
            setPassword(value);
            setPasswordError(null);
          }}
          type="password"
          autoComplete="new-password"
          placeholder={t('auth.password.newPlaceholder')}
          error={passwordError}
          disabled={busy}
        />
        <AuthField
          id="signup-confirm"
          label={t('auth.password.confirm')}
          value={confirm}
          onChange={(value) => {
            setConfirm(value);
            setConfirmError(null);
          }}
          type="password"
          autoComplete="new-password"
          placeholder={t('auth.password.confirmPlaceholder')}
          error={confirmError}
          disabled={busy}
        />

        <AuthSubmit busy={busy}>{t('auth.signup.submit')}</AuthSubmit>
        <AuthHint>{t('auth.signup.hint')}</AuthHint>
      </AuthForm>

      <div className={styles.links}>
        <AuthTextLink to={`/auth/login?next=${encodeURIComponent(next)}`}>
          {t('auth.signup.toLogin')}
        </AuthTextLink>
        <AuthTextLink to="/today">{t('auth.localWorkspace')}</AuthTextLink>
      </div>
    </AuthShell>
  );
}

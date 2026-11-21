import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthShell } from '@/components/auth/auth-shell';
import {
  AuthField,
  AuthForm,
  AuthHeading,
  AuthMessage,
  AuthSubmit,
  AuthTextLink,
} from '@/components/auth/auth-form';
import { authErrorMessage } from '@/components/auth/auth-error';
import { readLastEmail, rememberEmail } from '@/components/auth/last-email';
import { isValidEmail, normalizeEmail, passwordsMatch } from '@/core/rules/auth-form';
import { completePasswordReset, requestPasswordReset } from '@/data/cloud/auth';
import { t } from '@/i18n';
import { MailIcon } from '@/ui/icons';
import styles from './auth-page.module.css';

type RecoverPhase = 'email' | 'sent' | 'reset';

const RESET_TOKEN_PARAMS = ['nonce', 'token', 'code', 'ticket'] as const;
const RESEND_COOLDOWN = 60;

function readResetToken(params: URLSearchParams): string {
  for (const name of RESET_TOKEN_PARAMS) {
    const value = params.get(name);
    if (value) return value;
  }
  return '';
}

/**
 * P11 找回密码（PRD V2-01 OP-04）。
 *
 * 同一路由按 `step=reset` 区分「填写邮箱 / 已发送 / 设置新密码」三个视图。
 * 邮箱不存在也显示「已发送」；失效链接只说明原因并给出重新发送入口。
 */
export function RecoverPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const token = readResetToken(params);
  const [phase, setPhase] = useState<RecoverPhase>(
    params.get('step') === 'reset' ? 'reset' : 'email',
  );
  const [email, setEmail] = useState(() => params.get('email') ?? readLastEmail());
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((current) => current - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const sendEmail = async () => {
    setEmailError(null);
    setFormError(null);

    const normalized = normalizeEmail(email);
    if (!isValidEmail(normalized)) {
      setEmailError(t('auth.error.email'));
      return;
    }

    setBusy(true);
    const redirectTo = `${window.location.origin}/auth/recover?step=reset`;
    const result = await requestPasswordReset(normalized, redirectTo);
    setBusy(false);
    if (!result.ok) {
      setFormError(t(authErrorMessage(result.error.code)));
      return;
    }

    rememberEmail(normalized);
    setEmail(normalized);
    setPhase('sent');
    setCooldown(RESEND_COOLDOWN);
  };

  const resetPassword = async () => {
    setPasswordError(null);
    setConfirmError(null);
    setFormError(null);

    let invalid = false;
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
    const result = await completePasswordReset({
      email: normalizeEmail(email),
      token,
      password,
    });
    setBusy(false);
    if (!result.ok) {
      setFormError(t(authErrorMessage(result.error.code)));
      return;
    }

    navigate('/auth/login?reset=1', { replace: true });
  };

  const resetIncomplete = token.length === 0 || normalizeEmail(email).length === 0;
  const stepIndex = phase === 'email' ? 0 : phase === 'sent' ? 1 : 2;

  return (
    <AuthShell>
      <ol className={styles.steps}>
        {[
          t('auth.recover.step.email'),
          t('auth.recover.step.sent'),
          t('auth.recover.step.reset'),
        ].map((label, index) => (
          <li
            key={label}
            className={styles.step}
            data-state={index === stepIndex ? 'current' : index < stepIndex ? 'done' : 'idle'}
          >
            <span className={styles.stepBar} aria-hidden="true" />
            {label}
          </li>
        ))}
      </ol>

      {phase === 'email' ? (
        <>
          <AuthHeading
            title={t('auth.recover.title.email')}
            description={t('auth.recover.description.email')}
          />
          {formError ? <AuthMessage>{formError}</AuthMessage> : null}
          <AuthForm onSubmit={() => void sendEmail()} busy={busy}>
            <AuthField
              id="recover-email"
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
            <AuthSubmit busy={busy}>{t('auth.recover.send')}</AuthSubmit>
          </AuthForm>
          <div className={styles.links}>
            <AuthTextLink to="/auth/login">{t('auth.recover.toLogin')}</AuthTextLink>
          </div>
        </>
      ) : null}

      {phase === 'sent' ? (
        <>
          <span className={styles.sentIcon} aria-hidden="true">
            <MailIcon size={20} />
          </span>
          <AuthHeading
            title={t('auth.recover.title.sent')}
            description={t('auth.recover.description.sent')}
          />
          {formError ? <AuthMessage>{formError}</AuthMessage> : null}
          <div className={styles.sentEmail}>
            <span className={styles.sentEmailText}>{email}</span>
            <button
              type="button"
              className={styles.linkButton}
              onClick={() => {
                setPhase('email');
                setFormError(null);
              }}
            >
              {t('auth.recover.changeEmail')}
            </button>
          </div>
          <div className={styles.sentActions}>
            <button
              type="button"
              className={styles.secondary}
              disabled={busy || cooldown > 0}
              onClick={() => void sendEmail()}
            >
              {cooldown > 0
                ? `${cooldown} ${t('auth.recover.resendAfter')}`
                : t('auth.recover.resend')}
            </button>
            <AuthTextLink to="/auth/login">{t('auth.recover.toLogin')}</AuthTextLink>
          </div>
        </>
      ) : null}

      {phase === 'reset' ? (
        <>
          <AuthHeading
            title={t('auth.recover.title.reset')}
            description={t('auth.recover.description.reset')}
          />
          {resetIncomplete ? <AuthMessage>{t('auth.recover.invalid')}</AuthMessage> : null}
          {formError ? <AuthMessage>{formError}</AuthMessage> : null}

          {resetIncomplete ? (
            <button type="button" className={styles.secondary} onClick={() => setPhase('email')}>
              {t('auth.recover.resend')}
            </button>
          ) : (
            <AuthForm onSubmit={() => void resetPassword()} busy={busy}>
              <AuthField
                id="recover-password"
                label={t('auth.password.new')}
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
                autoFocus
              />
              <AuthField
                id="recover-confirm"
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
              <AuthSubmit busy={busy}>{t('auth.recover.save')}</AuthSubmit>
            </AuthForm>
          )}

          <div className={styles.links}>
            <button type="button" className={styles.linkButton} onClick={() => setPhase('email')}>
              {t('auth.recover.back')}
            </button>
            <AuthTextLink to="/auth/login">{t('auth.recover.toLogin')}</AuthTextLink>
          </div>
        </>
      ) : null}
    </AuthShell>
  );
}

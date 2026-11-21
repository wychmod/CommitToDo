import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { t } from '@/i18n';
import { CheckIcon, EyeIcon, EyeOffIcon, ArrowIcon } from '@/ui/icons';
import styles from './auth-form.module.css';

interface AuthFormProps {
  children: ReactNode;
  onSubmit: () => void;
  busy?: boolean;
}

/** 认证表单容器：统一 `noValidate`，校验与提示都由页面控制。 */
export function AuthForm({ children, onSubmit, busy = false }: AuthFormProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    onSubmit();
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {children}
    </form>
  );
}

export function AuthHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className={styles.heading}>
      <h1 className={styles.title}>{title}</h1>
      {description ? <p className={styles.description}>{description}</p> : null}
    </div>
  );
}

export type AuthFieldType = 'text' | 'email' | 'password';

interface AuthFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: AuthFieldType;
  autoComplete: string;
  placeholder?: string;
  error?: string | null;
  autoFocus?: boolean;
  disabled?: boolean;
}

/** 单个字段：标签、输入与内联错误；密码字段带显示/隐藏切换。 */
export function AuthField({
  id,
  label,
  value,
  onChange,
  type = 'text',
  autoComplete,
  placeholder,
  error = null,
  autoFocus = false,
  disabled = false,
}: AuthFieldProps) {
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword && revealed ? 'text' : type;
  const errorId = `${id}-error`;

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <div className={styles.control}>
        <input
          id={id}
          className={styles.input}
          type={inputType}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
        {isPassword ? (
          <button
            type="button"
            className={styles.reveal}
            aria-label={revealed ? t('auth.password.hide') : t('auth.password.show')}
            aria-pressed={revealed}
            onClick={() => setRevealed((current) => !current)}
          >
            {revealed ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
          </button>
        ) : null}
      </div>
      {error ? (
        <p className={styles.error} id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function AuthSubmit({
  busy,
  disabled = false,
  children,
}: {
  busy: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button className={styles.submit} type="submit" disabled={busy || disabled}>
      <span>{busy ? t('auth.submitting') : children}</span>
      <span className={styles.submitArrow} aria-hidden="true">
        <ArrowIcon size={18} />
      </span>
    </button>
  );
}

export function AuthMessage({
  tone = 'error',
  children,
}: {
  tone?: 'error' | 'info' | 'success';
  children: ReactNode;
}) {
  return (
    <p className={styles.message} data-tone={tone} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </p>
  );
}

/** 字段下方的行内动作，如「忘记密码？」。 */
export function AuthMeta({ children }: { children: ReactNode }) {
  return <div className={styles.meta}>{children}</div>;
}

export function AuthTextLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link className={styles.textLink} to={to}>
      {children}
    </Link>
  );
}

/** 表单底部的账号切换入口，与上方内容用分隔线隔开。 */
export function AuthSwitch({ lead, to, action }: { lead?: string; to: string; action: string }) {
  return (
    <p className={styles.switch}>
      {lead ? <span>{lead}</span> : null}
      <AuthTextLink to={to}>{action}</AuthTextLink>
    </p>
  );
}

/** 注册前的条款确认；只做可读文字，不挂尚未上线的条款页。 */
export function AuthConsent({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={styles.consent}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>
        {t('auth.signup.consent.lead')}
        <span className={styles.consentTerm}>{t('auth.signup.consent.terms')}</span>
        {t('auth.signup.consent.join')}
        <span className={styles.consentTerm}>{t('auth.signup.consent.privacy')}</span>
        {t('auth.signup.consent.tail')}
      </span>
    </label>
  );
}

export interface AuthStep {
  label: string;
}

/** 找回密码的三步指示器：当前步高亮，已完成步打勾。 */
export function AuthSteps({ steps, current }: { steps: readonly AuthStep[]; current: number }) {
  return (
    <ol className={styles.steps} aria-label={t('auth.recover.stepLabel')}>
      {steps.map((step, index) => (
        <li
          key={step.label}
          aria-current={index === current ? 'step' : undefined}
          data-state={index === current ? 'current' : index < current ? 'done' : 'idle'}
        >
          <span aria-hidden="true">
            {index < current ? <CheckIcon size={16} /> : String(index + 1)}
          </span>
          {step.label}
        </li>
      ))}
    </ol>
  );
}

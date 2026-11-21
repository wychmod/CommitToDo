import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { t } from '@/i18n';
import { EyeIcon, EyeOffIcon } from '@/ui/icons';
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

export function AuthSubmit({ busy, children }: { busy: boolean; children: ReactNode }) {
  return (
    <button className={styles.submit} type="submit" disabled={busy}>
      {busy ? t('auth.submitting') : children}
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

/** 主操作下方的次要说明，如「登录后可在设置中开启同步」。 */
export function AuthHint({ children }: { children: ReactNode }) {
  return <p className={styles.hint}>{children}</p>;
}

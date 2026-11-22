import { useState } from 'react';
import { useSession } from '@/session/session-context';
import { copy } from '@/i18n';

export function LoginPage() {
  const { state, error, signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const configMissing = state === 'config_error';

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || configMissing) return;
    setSubmitting(true);
    try {
      await signIn(email, password);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="admin-login">
      <form className="admin-login__card" onSubmit={handleSubmit}>
        <h1>{copy.login.title}</h1>
        <p className="admin-muted">{copy.login.description}</p>

        {configMissing ? <p className="admin-alert admin-alert--error">{copy.login.configMissing}</p> : null}
        {!configMissing && error ? <p className="admin-alert admin-alert--error">{error}</p> : null}

        <label className="admin-field">
          <span>{copy.login.email}</span>
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            disabled={configMissing}
          />
        </label>
        <label className="admin-field">
          <span>{copy.login.password}</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            disabled={configMissing}
          />
        </label>

        <button type="submit" className="admin-button admin-button--primary" disabled={submitting || configMissing}>
          {submitting ? copy.login.submitting : copy.login.submit}
        </button>
        <p className="admin-muted admin-login__hint">
          未配置环境变量时，请先在 admin/.env.local 写入 VITE_CLOUDBASE_ENV_ID。
        </p>
      </form>
    </div>
  );
}

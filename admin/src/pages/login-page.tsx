import { useState, type FormEvent } from 'react';
import { BrandMark } from '@/components/brand';
import { PublicHeader } from '@/components/public-header';
import { useSession } from '@/session/session-context';
import { copy } from '@/i18n';

export function LoginPage() {
  const { state, error, signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const configMissing = state === 'config_error';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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
    <div className="admin-public">
      <PublicHeader showUsage />
      <main className="admin-login">
        <div className="admin-login__layout">
          <section className="admin-login__brand">
            <span className="admin-login__mark">
              <BrandMark size={56} />
            </span>
            <h1 className="admin-login__wordmark">{copy.app.wordmark}</h1>
            <p className="admin-login__suffix">{copy.app.wordmarkSuffix}</p>
            <p className="admin-login__caption">{copy.login.brandCaption}</p>

            <div className="admin-login__diagram" aria-hidden="true">
              <svg viewBox="0 0 280 120">
                <path className="admin-login__track admin-login__track--coral" d="M18 28h118c22 0 34 10 44 24" />
                <path className="admin-login__track admin-login__track--honey" d="M18 60h156" />
                <path className="admin-login__track admin-login__track--sky" d="M18 92h118c22 0 34-10 44-24" />
                <circle className="admin-login__track-dot admin-login__track-dot--coral" cx="18" cy="28" r="3.2" />
                <circle className="admin-login__track-dot admin-login__track-dot--honey" cx="18" cy="60" r="3.2" />
                <circle className="admin-login__track-dot admin-login__track-dot--sky" cx="18" cy="92" r="3.2" />
                <rect className="admin-login__node" x="188" y="42" width="44" height="36" rx="9" />
                <path className="admin-login__shield" d="M210 52l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10v-5z" />
                <path className="admin-login__check" d="M206.5 60.5l2.8 2.8 5-5.4" />
              </svg>
              <span className="admin-login__diagram-label">{copy.login.accessLabel}</span>
            </div>
          </section>

          <form className="admin-login__card" onSubmit={handleSubmit}>
            <header className="admin-login__card-head">
              <h2>{copy.login.title}</h2>
              <p>{copy.login.description}</p>
            </header>

            {configMissing ? (
              <p className="admin-inline-error" role="alert">
                {copy.login.configMissing}
              </p>
            ) : error ? (
              <p className="admin-inline-error" role="alert">
                {error}
              </p>
            ) : null}

            <label className="admin-field">
              <span className="admin-field__label">{copy.login.email}</span>
              <input
                className="admin-input"
                type="email"
                name="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={configMissing}
              />
            </label>

            <label className="admin-field">
              <span className="admin-field__label">{copy.login.password}</span>
              <input
                className="admin-input"
                type="password"
                name="password"
                autoComplete="current-password"
                placeholder={copy.login.passwordPlaceholder}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                disabled={configMissing}
              />
            </label>

            <button
              type="submit"
              className="admin-btn admin-btn--primary admin-btn--block"
              disabled={submitting || configMissing}
            >
              {submitting ? copy.login.submitting : copy.login.submit}
            </button>
          </form>
        </div>
        <p className="admin-login__footer">{copy.login.footer}</p>
      </main>
    </div>
  );
}

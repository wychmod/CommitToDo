import { useSession } from '@/session/session-context';
import { copy } from '@/i18n';

export function DeniedPage() {
  const { state, email, error, requestId, signOut, retry } = useSession();

  const forbidden = state === 'forbidden';
  const unverified = state === 'unverified';
  const title = forbidden
    ? copy.denied.forbiddenTitle
    : unverified
      ? copy.denied.unverifiedTitle
      : copy.denied.identityTitle;
  const body = forbidden
    ? copy.denied.forbiddenBody
    : unverified
      ? copy.denied.unverifiedBody
      : copy.denied.identityBody;

  return (
    <div className="admin-login">
      <section className={`admin-access admin-access--${forbidden ? 'forbidden' : unverified ? 'unverified' : 'error'}`}>
        <h1>{title}</h1>
        <p>{body}</p>
        <dl className="admin-access__meta">
          <dt>{copy.denied.currentEmail}</dt>
          <dd>{email || copy.denied.unknownEmail}</dd>
        </dl>
        {!forbidden && !unverified && error ? (
          <p className="admin-alert admin-alert--error">
            {error}
            {requestId ? `（${copy.common.requestId}: ${requestId}）` : ''}
          </p>
        ) : null}
        <div className="admin-actions">
          {forbidden || unverified ? null : (
            <button type="button" className="admin-button" onClick={() => void retry()}>
              {copy.denied.retry}
            </button>
          )}
          <button type="button" className="admin-button admin-button--ghost" onClick={() => void signOut()}>
            {copy.app.signOut}
          </button>
        </div>
      </section>
    </div>
  );
}

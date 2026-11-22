import { copy } from '@/i18n';

export function ErrorPanel({
  title = copy.common.errorTitle,
  message,
  code,
  requestId,
  onRetry,
}: {
  title?: string;
  message: string;
  code?: string;
  requestId?: string;
  onRetry?: () => void;
}) {
  return (
    <section className="admin-panel admin-error" role="alert">
      <h2 className="admin-error__title">{title}</h2>
      <p className="admin-error__message">{message || copy.common.unknownError}</p>
      {code || requestId ? (
        <dl className="admin-error__meta">
          {code ? (
            <>
              <dt>{copy.common.errorCode}</dt>
              <dd>{code}</dd>
            </>
          ) : null}
          {requestId ? (
            <>
              <dt>{copy.common.requestId}</dt>
              <dd>{requestId}</dd>
            </>
          ) : null}
        </dl>
      ) : null}
      {onRetry ? (
        <button type="button" className="admin-btn" onClick={onRetry}>
          {copy.common.retry}
        </button>
      ) : null}
    </section>
  );
}

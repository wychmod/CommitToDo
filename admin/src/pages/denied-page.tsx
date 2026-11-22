import { PublicHeader } from '@/components/public-header';
import { useSession } from '@/session/session-context';
import { copy } from '@/i18n';

type AccessVariant = 'forbidden' | 'unverified' | 'identity';

function StatusGlyph({ variant }: { variant: AccessVariant }) {
  if (variant === 'forbidden') {
    return (
      <svg className="admin-access__glyph" viewBox="0 0 28 28" aria-hidden="true">
        <path className="admin-access__glyph-line" d="M6 18h6c4 0 5-3 8-7" />
        <circle className="admin-access__glyph-node admin-access__glyph-node--closed" cx="21" cy="9" r="3.4" />
      </svg>
    );
  }
  if (variant === 'unverified') {
    return (
      <svg className="admin-access__glyph" viewBox="0 0 28 28" aria-hidden="true">
        <path className="admin-access__glyph-line" d="M6 18h6c4 0 5-3 8-7" />
        <circle className="admin-access__glyph-node admin-access__glyph-node--hollow" cx="21" cy="9" r="3.4" />
      </svg>
    );
  }
  return (
    <svg className="admin-access__glyph" viewBox="0 0 28 28" aria-hidden="true">
      <path className="admin-access__glyph-line" d="M6 18h5" />
      <path className="admin-access__glyph-line admin-access__glyph-line--dashed" d="M13 18h6c4 0 5-3 8-7" />
      <circle className="admin-access__glyph-node admin-access__glyph-node--filled" cx="21" cy="9" r="3.4" />
    </svg>
  );
}

export function DeniedPage() {
  const { state, email, signOut, retry } = useSession();

  const variant: AccessVariant =
    state === 'forbidden' ? 'forbidden' : state === 'unverified' ? 'unverified' : 'identity';

  const title =
    variant === 'forbidden'
      ? copy.denied.forbiddenTitle
      : variant === 'unverified'
        ? copy.denied.unverifiedTitle
        : copy.denied.identityTitle;

  const body =
    variant === 'forbidden'
      ? copy.denied.forbiddenBody
      : variant === 'unverified'
        ? copy.denied.unverifiedBody
        : copy.denied.identityBody;

  return (
    <div className="admin-public">
      <PublicHeader />
      <main className="admin-access">
        <section className={`admin-access__card admin-access__card--${variant}`}>
          <span className="admin-access__icon" aria-hidden="true">
            <StatusGlyph variant={variant} />
          </span>
          <h1 className="admin-access__title">{title}</h1>
          <p className="admin-access__body">{body}</p>

          <dl className="admin-access__account">
            <dt>{copy.denied.currentEmail}</dt>
            <dd>{email || copy.denied.unknownEmail}</dd>
          </dl>

          <div className="admin-access__actions">
            {variant === 'identity' ? (
              <button type="button" className="admin-btn admin-btn--primary" onClick={() => void retry()}>
                {copy.denied.retry}
              </button>
            ) : null}
            <button type="button" className="admin-btn" onClick={() => void signOut()}>
              {copy.app.signOut}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

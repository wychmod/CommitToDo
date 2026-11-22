import { useCallback, useEffect, useState } from 'react';
import { callAdminApi, errorMessage, isApiError, type AuditListData, type AuditRow } from '@/lib/admin-api';
import { formatDateTime } from '@/lib/format';
import { LedgerIcon } from '@/components/icons';
import { EmptyState } from '@/components/empty-state';
import { ErrorPanel } from '@/components/error-panel';
import { TableSkeleton } from '@/components/skeleton';
import { Chip, StatusLabel } from '@/components/status-chip';
import { copy } from '@/i18n';

interface PageError {
  code?: string;
  message: string;
  requestId?: string;
}

function ChangeFields({ row }: { row: AuditRow }) {
  if (!row.changedFields || !row.changedFields.length) {
    return <span className="admin-faint">—</span>;
  }
  return (
    <span className="admin-chip-row">
      {row.changedFields.map((field) => (
        <Chip key={field} tone="accent">
          {field}
        </Chip>
      ))}
    </span>
  );
}

export function AuditPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<PageError | null>(null);

  const load = useCallback(
    async (reset: boolean) => {
      if (reset) {
        setLoading(true);
        setRows([]);
        setCursor(null);
      } else {
        setLoadingMore(true);
      }
      setError(null);
      try {
        const result = await callAdminApi<AuditListData>('audit.list', {
          limit: 50,
          cursor: reset ? undefined : cursor || undefined,
        });
        setRows((previous) => (reset ? result.rows : [...previous, ...result.rows]));
        setCursor(result.nextCursor);
      } catch (caught) {
        setError({
          code: isApiError(caught) ? caught.code : undefined,
          message: errorMessage(caught),
          requestId: isApiError(caught) ? caught.requestId : '',
        });
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [cursor],
  );

  useEffect(() => {
    void load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="admin-page">
      <header className="admin-page__head">
        <div className="admin-page__titles">
          <div className="admin-title-row">
            <h1>{copy.audit.title}</h1>
            <Chip>{copy.audit.readChip}</Chip>
          </div>
          <p className="admin-page__subtitle">{copy.audit.description}</p>
        </div>
        <button
          type="button"
          className="admin-btn"
          onClick={() => void load(true)}
          disabled={loading}
        >
          {copy.audit.refresh}
        </button>
      </header>

      {loading ? <TableSkeleton rows={7} /> : null}

      {error ? (
        <ErrorPanel
          message={error.message}
          code={error.code}
          requestId={error.requestId}
          onRetry={() => void load(true)}
        />
      ) : null}

      {!loading && !error ? (
        <div className="admin-panel">
          <div className="admin-panel__head">
            <span className="admin-panel__title">{copy.audit.cardTitle}</span>
            <StatusLabel tone="ready">{copy.audit.ready}</StatusLabel>
          </div>

          {!rows.length ? (
            <EmptyState
              icon={<LedgerIcon />}
              title={copy.audit.emptyTitle}
              description={copy.audit.emptyBody}
            />
          ) : (
            <>
              <div className="admin-table-desktop">
                <table className="admin-table admin-table--audit">
                  <thead>
                    <tr>
                      <th>{copy.audit.time}</th>
                      <th>{copy.audit.actor}</th>
                      <th>{copy.audit.action}</th>
                      <th>{copy.audit.target}</th>
                      <th>{copy.audit.fields}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => (
                      <tr key={String(row._id || index)}>
                        <td className="admin-mono admin-nowrap">{formatDateTime(row.at)}</td>
                        <td>{row.actorEmail || '—'}</td>
                        <td className="admin-mono">{row.action || '—'}</td>
                        <td>
                          <span className="admin-mono">{row.collection || '—'}</span>
                          <span className="admin-faint"> / </span>
                          <span className="admin-mono">{row.docId || '—'}</span>
                        </td>
                        <td>
                          <ChangeFields row={row} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="admin-list-cards admin-table-mobile">
                {rows.map((row, index) => (
                  <article className="admin-audit-card" key={String(row._id || index)}>
                    <div className="admin-audit-card__top">
                      <span className="admin-mono">{formatDateTime(row.at)}</span>
                      <span className="admin-mono admin-audit-card__action">{row.action || '—'}</span>
                    </div>
                    <div className="admin-audit-card__actor">{row.actorEmail || '—'}</div>
                    <div className="admin-audit-card__target">
                      <span className="admin-mono">{row.collection || '—'}</span>
                      <span className="admin-faint"> / </span>
                      <span className="admin-mono">{row.docId || '—'}</span>
                    </div>
                    <div className="admin-chip-row">
                      <ChangeFields row={row} />
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}

          {cursor && rows.length ? (
            <div className="admin-panel__foot">
              <button
                type="button"
                className="admin-btn"
                onClick={() => void load(false)}
                disabled={loadingMore}
              >
                {loadingMore ? copy.audit.loadingMore : copy.audit.loadMore}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

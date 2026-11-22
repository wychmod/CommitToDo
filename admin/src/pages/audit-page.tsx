import { useCallback, useEffect, useState } from 'react';
import { callAdminApi, errorMessage, isApiError, type AuditListData, type AuditRow } from '@/lib/admin-api';
import { formatDateTime } from '@/lib/format';
import { DataTable, type Column } from '@/components/data-table';
import { StatePanel } from '@/components/state-panel';
import { copy } from '@/i18n';

export function AuditPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<{ code?: string; message: string } | null>(null);

  const load = useCallback(async (reset: boolean) => {
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
      });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [cursor]);

  useEffect(() => {
    void load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns: Column<AuditRow>[] = [
    { key: 'at', label: copy.audit.time, render: (row) => formatDateTime(row.at) },
    { key: 'actorEmail', label: copy.audit.actor, render: (row) => row.actorEmail || '—' },
    { key: 'action', label: copy.audit.action, render: (row) => row.action || '—' },
    {
      key: 'target',
      label: copy.audit.target,
      render: (row) => `${row.collection || '—'} / ${row.docId || '—'}`,
    },
    {
      key: 'fields',
      label: copy.audit.fields,
      render: (row) => (row.changedFields && row.changedFields.length ? row.changedFields.join(', ') : '—'),
    },
  ];

  const missing = error?.code === 'admin_collection_missing';

  return (
    <section className="admin-page">
      <header className="admin-page__header">
        <div>
          <h1>{copy.audit.title}</h1>
          <p className="admin-muted">{copy.audit.description}</p>
        </div>
        <button type="button" className="admin-button" onClick={() => void load(true)} disabled={loading}>
          {copy.overview.refresh}
        </button>
      </header>

      {loading ? <StatePanel title={copy.audit.loading} /> : null}
      {!loading && error ? (
        <StatePanel
          tone={missing ? 'warning' : 'error'}
          title={missing ? copy.common.collectionMissing : copy.common.error}
          description={error.message}
          actionLabel={missing ? undefined : copy.common.retry}
          onAction={missing ? undefined : () => void load(true)}
        />
      ) : null}
      {!loading && !error ? (
        <>
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(row, index) => String(row._id || index)}
            empty={copy.audit.empty}
          />
          {cursor ? (
            <div className="admin-actions">
              <button
                type="button"
                className="admin-button"
                onClick={() => void load(false)}
                disabled={loadingMore}
              >
                {loadingMore ? copy.audit.loading : copy.audit.loadMore}
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

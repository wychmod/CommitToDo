import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  callAdminApi,
  errorMessage,
  isApiError,
  type TableRowsData,
} from '@/lib/admin-api';
import { formatValue } from '@/lib/format';
import { DataTable, type Column } from '@/components/data-table';
import { StatePanel } from '@/components/state-panel';
import { copy } from '@/i18n';

const PREFERRED_KEYS = [
  '_id',
  'id',
  'ownerId',
  'title',
  'summary',
  'date',
  'at',
  'status',
  'createdAt',
  'updatedAt',
  'branchId',
  'taskId',
  'action',
  'event',
  'localDate',
];

function buildColumns(rows: Record<string, unknown>[]): Column<Record<string, unknown>>[] {
  const keys = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) keys.add(key);
  }
  const ordered = [
    ...PREFERRED_KEYS.filter((key) => keys.has(key)),
    ...Array.from(keys)
      .filter((key) => !PREFERRED_KEYS.includes(key))
      .sort(),
  ].slice(0, 9);
  return ordered.map((key) => ({
    key,
    label: key,
    render: (row) => <span className="admin-cell">{formatValue(row[key])}</span>,
  }));
}

export function TableDetailPage() {
  const { collection = '' } = useParams<{ collection: string }>();
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [ownerId, setOwnerId] = useState('');
  const [appliedOwnerId, setAppliedOwnerId] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<{ code?: string; message: string } | null>(null);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);

  const load = useCallback(
    async (reset: boolean) => {
      if (!collection) return;
      if (reset) {
        setLoading(true);
        setRows([]);
        setCursor(null);
        setSelected(null);
      } else {
        setLoadingMore(true);
      }
      setError(null);
      try {
        const result = await callAdminApi<TableRowsData>('tables.rows', {
          collection,
          limit: 50,
          cursor: reset ? undefined : cursor || undefined,
          ownerId: appliedOwnerId || undefined,
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
    },
    [appliedOwnerId, collection, cursor],
  );

  useEffect(() => {
    void load(true);
    // 只在表或筛选条件变化时重置分页；cursor 变化不应触发全量重载。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collection, appliedOwnerId]);

  const columns = useMemo(() => buildColumns(rows), [rows]);
  const missing = error?.code === 'admin_collection_missing';

  return (
    <section className="admin-page">
      <header className="admin-page__header">
        <div>
          <Link to="/tables" className="admin-link">
            ← {copy.tableDetail.back}
          </Link>
          <h1>
            {copy.tableDetail.title} <code>{collection}</code>
          </h1>
          <p className="admin-muted">{copy.tables.description}</p>
        </div>
        <form
          className="admin-filter"
          onSubmit={(event) => {
            event.preventDefault();
            setAppliedOwnerId(ownerId.trim());
          }}
        >
          <label>
            <span>{copy.tableDetail.ownerFilter}</span>
            <input value={ownerId} onChange={(event) => setOwnerId(event.target.value)} placeholder="ownerId" />
          </label>
          <button type="submit" className="admin-button">
            {copy.tableDetail.filter}
          </button>
        </form>
      </header>

      {loading ? <StatePanel title={copy.tableDetail.loading} /> : null}
      {!loading && error ? (
        <StatePanel
          tone={missing ? 'warning' : 'error'}
          title={missing ? copy.tableDetail.notReady : copy.common.error}
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
            rowKey={(row, index) => String(row._id || row.id || index)}
            empty={copy.tableDetail.empty}
            onRowClick={(row) => setSelected(row)}
          />
          {cursor ? (
            <div className="admin-actions">
              <button
                type="button"
                className="admin-button"
                onClick={() => void load(false)}
                disabled={loadingMore}
              >
                {loadingMore ? copy.tableDetail.loading : copy.tableDetail.loadMore}
              </button>
            </div>
          ) : null}
        </>
      ) : null}

      {selected ? (
        <aside className="admin-drawer">
          <header className="admin-drawer__header">
            <h2>{copy.tableDetail.rowDetail}</h2>
            <button type="button" className="admin-button admin-button--ghost" onClick={() => setSelected(null)}>
              {copy.tableDetail.close}
            </button>
          </header>
          <pre>{JSON.stringify(selected, null, 2)}</pre>
        </aside>
      ) : null}
    </section>
  );
}

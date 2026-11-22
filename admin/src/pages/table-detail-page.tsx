import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  callAdminApi,
  errorMessage,
  isApiError,
  type TableRowsData,
} from '@/lib/admin-api';
import { formatValue } from '@/lib/format';
import { ArrowLeftIcon, ChevronRightIcon, CloseIcon, DatabaseIcon, SearchBranchIcon } from '@/components/icons';
import { EmptyState } from '@/components/empty-state';
import { ErrorPanel } from '@/components/error-panel';
import { TableSkeleton } from '@/components/skeleton';
import { Chip, StatusLabel } from '@/components/status-chip';
import { copy, tableLabels } from '@/i18n';

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
  'rev',
];

const MAX_COLUMNS = 6;

interface PageError {
  code?: string;
  message: string;
  requestId?: string;
}

interface Column {
  key: string;
}

function buildColumns(rows: Record<string, unknown>[]): Column[] {
  const keys = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) keys.add(key);
  }
  const ordered = [
    ...PREFERRED_KEYS.filter((key) => keys.has(key)),
    ...Array.from(keys)
      .filter((key) => !PREFERRED_KEYS.includes(key))
      .sort(),
  ];
  return ordered.slice(0, MAX_COLUMNS).map((key) => ({ key }));
}

function isMonoKey(key: string): boolean {
  return /(^id$|^_id$|Id$|_id$|^rev$|^event$|^action$|^localDate$)/.test(key);
}

function rowKeyOf(row: Record<string, unknown>, index: number): string {
  const value = row._id ?? row.id;
  return value == null ? String(index) : String(value);
}

export function TableDetailPage() {
  const { collection = '' } = useParams<{ collection: string }>();
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [maskedFields, setMaskedFields] = useState<string[]>([]);
  const [ownerId, setOwnerId] = useState('');
  const [appliedOwnerId, setAppliedOwnerId] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<PageError | null>(null);
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
        setMaskedFields(result.maskedFields ?? []);
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
    [appliedOwnerId, collection, cursor],
  );

  useEffect(() => {
    void load(true);
    // 只在表或筛选条件变化时重置分页；cursor 变化不应触发全量重载。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collection, appliedOwnerId]);

  useEffect(() => {
    if (!selected) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelected(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selected]);

  const columns = useMemo(() => buildColumns(rows), [rows]);
  const missing = error?.code === 'admin_collection_missing';
  const label = tableLabels[collection] || collection;
  const revValue = selected?.rev;

  const handleFilter = (next: string) => {
    if (next === appliedOwnerId) {
      void load(true);
      return;
    }
    setAppliedOwnerId(next);
  };

  const clearFilter = () => {
    setOwnerId('');
    setAppliedOwnerId('');
  };

  return (
    <section className="admin-page">
      <header className="admin-page__head admin-page__head--browser">
        <div className="admin-page__titles">
          <Link className="admin-back" to="/tables">
            <ArrowLeftIcon />
            {copy.tableDetail.back}
          </Link>
          <div className="admin-browser-title">
            <h1>
              {copy.tableDetail.title} <code className="admin-browser-title__id">{collection}</code>
            </h1>
            <Chip>{copy.tableDetail.readChip}</Chip>
          </div>
        </div>
        <form
          className="admin-filter"
          onSubmit={(event) => {
            event.preventDefault();
            handleFilter(ownerId.trim());
          }}
        >
          <label className="admin-filter__field">
            <span className="admin-filter__label">{copy.tableDetail.ownerFilter}</span>
            <input
              className="admin-input"
              name="ownerId"
              value={ownerId}
              onChange={(event) => setOwnerId(event.target.value)}
              placeholder={copy.tableDetail.ownerPlaceholder}
            />
          </label>
          <button type="submit" className="admin-btn admin-btn--primary">
            {copy.tableDetail.filter}
          </button>
        </form>
      </header>

      {loading ? <TableSkeleton rows={7} /> : null}

      {!loading && error && !missing ? (
        <ErrorPanel
          message={error.message}
          code={error.code}
          requestId={error.requestId}
          onRetry={() => void load(true)}
        />
      ) : null}

      {!loading && missing ? (
        <div className="admin-panel">
          <div className="admin-panel__head">
            <span className="admin-panel__title">{label}</span>
            <StatusLabel tone="notready">{copy.tableDetail.notReady}</StatusLabel>
          </div>
          <EmptyState
            icon={<DatabaseIcon />}
            title={copy.tableDetail.notReady}
            description={copy.tableDetail.notReadyBody.replace('{collection}', collection)}
          />
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="admin-panel">
          <div className="admin-panel__head">
            <span className="admin-panel__title">{label}</span>
            <StatusLabel tone="ready">{copy.tables.ready}</StatusLabel>
          </div>

          {!rows.length ? (
            appliedOwnerId ? (
              <EmptyState
                icon={<SearchBranchIcon />}
                title={copy.tableDetail.emptyTitle}
                description={copy.tableDetail.emptyBody}
                action={
                  <button type="button" className="admin-btn" onClick={clearFilter}>
                    {copy.tableDetail.clearFilter}
                  </button>
                }
              />
            ) : (
              <EmptyState
                icon={<DatabaseIcon />}
                title={copy.tableDetail.noRowsTitle}
                description={copy.tableDetail.noRowsBody}
              />
            )
          ) : (
            <>
              <div className="admin-table-desktop">
                <table className="admin-table admin-table--rows">
                  <thead>
                    <tr>
                      {columns.map((column) => (
                        <th key={column.key}>{column.key}</th>
                      ))}
                      <th aria-hidden="true" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => {
                      const key = rowKeyOf(row, index);
                      return (
                        <tr
                          key={key}
                          className={selected === row ? 'admin-table__row--selected' : undefined}
                          tabIndex={0}
                          onClick={() => setSelected(row)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') setSelected(row);
                          }}
                        >
                          {columns.map((column) => (
                            <td key={column.key}>
                              <span className={`admin-cell${isMonoKey(column.key) ? ' admin-mono' : ''}`}>
                                {formatValue(row[column.key])}
                              </span>
                            </td>
                          ))}
                          <td className="admin-cell--action">
                            <span className="admin-row-link">
                              {copy.tableDetail.detail}
                              <ChevronRightIcon />
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="admin-list-cards admin-table-mobile">
                {rows.map((row, index) => (
                  <button
                    type="button"
                    className="admin-row-card"
                    key={rowKeyOf(row, index)}
                    onClick={() => setSelected(row)}
                  >
                    <span className="admin-row-card__body">
                      {columns.slice(0, 3).map((column) => (
                        <span className="admin-row-card__item" key={column.key}>
                          <span className="admin-row-card__label">{column.key}</span>
                          <span className={`admin-row-card__value${isMonoKey(column.key) ? ' admin-mono' : ''}`}>
                            {formatValue(row[column.key])}
                          </span>
                        </span>
                      ))}
                    </span>
                    <ChevronRightIcon />
                  </button>
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
                {loadingMore ? copy.tableDetail.loadingMore : copy.tableDetail.loadMore}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {selected ? (
        <div className="admin-drawer-layer">
          <div className="admin-drawer__scrim" onClick={() => setSelected(null)} aria-hidden="true" />
          <aside className="admin-drawer" role="dialog" aria-modal="true" aria-label={copy.tableDetail.drawerTitle}>
            <header className="admin-drawer__head">
              <div className="admin-drawer__heading">
                <h2>{copy.tableDetail.drawerTitle}</h2>
                <code className="admin-drawer__collection">{collection}</code>
              </div>
              <button
                type="button"
                className="admin-icon-btn"
                onClick={() => setSelected(null)}
                aria-label={copy.tableDetail.close}
              >
                <CloseIcon />
              </button>
            </header>

            <div className="admin-drawer__body">
              <p className="admin-drawer__headline">
                {formatValue(selected.title ?? selected.summary ?? selected._id ?? selected.id)}
              </p>
              <div className="admin-drawer__chips">
                <Chip>{copy.tableDetail.readChip}</Chip>
                {revValue != null ? (
                  <Chip>{copy.tableDetail.rev.replace('{rev}', String(revValue))}</Chip>
                ) : null}
              </div>

              <dl className="admin-fields">
                {Object.entries(selected).map(([key, value]) => (
                  <div className="admin-fields__row" key={key}>
                    <dt>{key}</dt>
                    <dd className={isMonoKey(key) ? 'admin-mono' : undefined}>{formatValue(value)}</dd>
                  </div>
                ))}
              </dl>

              {maskedFields.length ? (
                <div className="admin-drawer__masked">
                  <span className="admin-drawer__masked-label">{copy.tableDetail.masked}</span>
                  {maskedFields.map((field) => (
                    <Chip key={field}>{field}</Chip>
                  ))}
                </div>
              ) : null}

              <section className="admin-raw">
                <h3>{copy.tableDetail.raw}</h3>
                <pre>{JSON.stringify(selected, null, 2)}</pre>
              </section>

              <p className="admin-drawer__note">{copy.tableDetail.editClosed}</p>
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  );
}

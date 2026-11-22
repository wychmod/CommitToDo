import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { callAdminApi, errorMessage, isApiError, type TableListData, type TableMeta } from '@/lib/admin-api';
import { ChevronRightIcon } from '@/components/icons';
import { EmptyState } from '@/components/empty-state';
import { ErrorPanel } from '@/components/error-panel';
import { TableSkeleton } from '@/components/skeleton';
import { Chip, StatusLabel, type StatusTone } from '@/components/status-chip';
import { copy, tableLabels } from '@/i18n';

interface PageError {
  code?: string;
  message: string;
  requestId?: string;
}

const TABLE_TONES: Record<string, string> = {
  branches: 'sky',
  tasks: 'mint',
  commits: 'honey',
  milestones: 'iris',
  badges: 'rose',
  settings: 'teal',
  year_reviews: 'coral',
  users: 'sky',
  devices: 'mint',
  events: 'honey',
  backups: 'iris',
  outbox: 'coral',
  conflicts: 'rose',
  migration_state: 'teal',
  counters: 'honey',
  ops_events: 'sky',
  user_first_seen: 'mint',
  admin_audit_log: 'coral',
};

function labelOf(table: TableMeta): string {
  return tableLabels[table.name] || table.label || table.name;
}

function toneOf(name: string): string {
  return TABLE_TONES[name] || 'sky';
}

function readyStateOf(table: TableMeta): { tone: StatusTone; label: string } {
  const ready = (table as { ready?: boolean }).ready;
  if (ready === true) return { tone: 'ready', label: copy.tables.ready };
  if (ready === false) return { tone: 'notready', label: copy.tables.notReady };
  return { tone: 'unknown', label: copy.tables.unknown };
}

export function TablesPage() {
  const [tables, setTables] = useState<TableMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<PageError | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await callAdminApi<TableListData>('tables.list');
      setTables(result.tables);
    } catch (caught) {
      setError({
        code: isApiError(caught) ? caught.code : undefined,
        message: errorMessage(caught),
        requestId: isApiError(caught) ? caught.requestId : '',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="admin-page">
      <header className="admin-page__head">
        <div className="admin-page__titles">
          <h1>{copy.tables.title}</h1>
          <p className="admin-page__subtitle">{copy.tables.description}</p>
          {!loading && !error ? (
            <p className="admin-page__count">{copy.tables.count.replace('{count}', String(tables.length))}</p>
          ) : null}
        </div>
      </header>

      {loading ? <TableSkeleton rows={8} /> : null}

      {error ? (
        <ErrorPanel
          message={error.message}
          code={error.code}
          requestId={error.requestId}
          onRetry={() => void load()}
        />
      ) : null}

      {!loading && !error && !tables.length ? (
        <div className="admin-panel">
          <EmptyState title={copy.tables.emptyTitle} description={copy.tables.emptyBody} />
        </div>
      ) : null}

      {!loading && !error && tables.length ? (
        <>
          <div className="admin-panel admin-panel--table admin-table-desktop">
            <table className="admin-table admin-table--catalog">
              <thead>
                <tr>
                  <th>{copy.tables.name}</th>
                  <th>{copy.tables.collection}</th>
                  <th>{copy.tables.permission}</th>
                  <th>{copy.tables.state}</th>
                  <th className="admin-cell--num">{copy.tables.rows}</th>
                  <th aria-hidden="true" />
                </tr>
              </thead>
              <tbody>
                {tables.map((table) => {
                  const status = readyStateOf(table);
                  return (
                    <tr key={table.name}>
                      <td>
                        <span className="admin-table-name">
                          <span className={`admin-mark admin-mark--${toneOf(table.name)}`} aria-hidden="true">
                            <span className="admin-mark__node" />
                            <span className="admin-mark__line" />
                          </span>
                          <span>{labelOf(table)}</span>
                        </span>
                      </td>
                      <td>
                        <code className="admin-mono">{table.name}</code>
                      </td>
                      <td>
                        <Chip>{copy.tables.read}</Chip>
                      </td>
                      <td>
                        <StatusLabel tone={status.tone}>{status.label}</StatusLabel>
                      </td>
                      <td className="admin-cell--num admin-faint">—</td>
                      <td className="admin-cell--action">
                        <Link className="admin-row-link" to={`/tables/${encodeURIComponent(table.name)}`}>
                          {copy.tables.browse}
                          <ChevronRightIcon />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="admin-list-cards admin-table-mobile">
            {tables.map((table) => {
              const status = readyStateOf(table);
              return (
                <Link
                  className="admin-list-card"
                  key={table.name}
                  to={`/tables/${encodeURIComponent(table.name)}`}
                >
                  <span className="admin-list-card__top">
                    <span className="admin-list-card__name">
                      <span className={`admin-mark admin-mark--${toneOf(table.name)}`} aria-hidden="true">
                        <span className="admin-mark__node" />
                        <span className="admin-mark__line" />
                      </span>
                      {labelOf(table)}
                    </span>
                    <StatusLabel tone={status.tone}>{status.label}</StatusLabel>
                  </span>
                  <span className="admin-list-card__meta">
                    <code className="admin-mono">{table.name}</code>
                    <Chip>{copy.tables.read}</Chip>
                    <span className="admin-faint">—</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </>
      ) : null}
    </section>
  );
}

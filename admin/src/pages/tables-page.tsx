import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { callAdminApi, errorMessage, type TableListData, type TableMeta } from '@/lib/admin-api';
import { DataTable, type Column } from '@/components/data-table';
import { StatePanel } from '@/components/state-panel';
import { copy } from '@/i18n';

export function TablesPage() {
  const [tables, setTables] = useState<TableMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await callAdminApi<TableListData>('tables.list');
      setTables(result.tables);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: Column<TableMeta>[] = [
    {
      key: 'label',
      label: copy.tables.label,
      render: (row) => (
        <Link to={`/tables/${encodeURIComponent(row.name)}`} className="admin-link">
          {row.label}
        </Link>
      ),
    },
    { key: 'name', label: copy.tables.name },
    {
      key: 'permission',
      label: copy.tables.permission,
      render: (row) => (row.write ? copy.tables.write : copy.tables.read),
    },
    {
      key: 'ready',
      label: copy.tables.state,
      render: (row) => (
        <span className={`admin-pill ${row.ready ? 'admin-pill--ok' : 'admin-pill--muted'}`}>
          {row.ready ? copy.tables.ready : copy.tables.notReady}
        </span>
      ),
    },
    {
      key: 'open',
      label: '',
      render: (row) => (
        <Link to={`/tables/${encodeURIComponent(row.name)}`} className="admin-link">
          {copy.tables.open}
        </Link>
      ),
    },
  ];

  return (
    <section className="admin-page">
      <header className="admin-page__header">
        <div>
          <h1>{copy.tables.title}</h1>
          <p className="admin-muted">{copy.tables.description}</p>
        </div>
        <button type="button" className="admin-button" onClick={() => void load()} disabled={loading}>
          {copy.overview.refresh}
        </button>
      </header>

      {loading ? <StatePanel title={copy.tables.loading} /> : null}
      {!loading && error ? (
        <StatePanel
          tone="error"
          title={copy.common.error}
          description={error}
          actionLabel={copy.common.retry}
          onAction={() => void load()}
        />
      ) : null}
      {!loading && !error ? (
        <DataTable
          columns={columns}
          rows={tables}
          rowKey={(row) => row.name}
          empty={copy.tables.empty}
        />
      ) : null}
    </section>
  );
}

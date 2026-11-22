import { useCallback, useEffect, useState } from 'react';
import { callAdminApi, errorMessage, type MetricsOverviewData } from '@/lib/admin-api';
import { formatDate, daysAgo } from '@/lib/format';
import { MetricCard } from '@/components/metric-card';
import { StatePanel } from '@/components/state-panel';
import { copy } from '@/i18n';

export function OverviewPage() {
  const [from, setFrom] = useState(() => formatDate(daysAgo(6)));
  const [to, setTo] = useState(() => formatDate(new Date()));
  const [data, setData] = useState<MetricsOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await callAdminApi<MetricsOverviewData>('metrics.overview', { from, to });
      setData(result);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="admin-page">
      <header className="admin-page__header">
        <div>
          <h1>{copy.overview.title}</h1>
          <p className="admin-muted">{copy.overview.description}</p>
        </div>
        <div className="admin-range">
          <label>
            <span>{copy.overview.range}</span>
            <input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} />
          </label>
          <span className="admin-range__sep">→</span>
          <label>
            <span aria-hidden="true">&nbsp;</span>
            <input type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} />
          </label>
          <button type="button" className="admin-button" onClick={() => void load()} disabled={loading}>
            {copy.overview.refresh}
          </button>
        </div>
      </header>

      {loading ? <StatePanel title={copy.overview.loading} /> : null}
      {!loading && error ? (
        <StatePanel
          tone="error"
          title={copy.common.error}
          description={error}
          actionLabel={copy.common.retry}
          onAction={() => void load()}
        />
      ) : null}

      {!loading && !error && data ? (
        <>
          {data.notes.length ? (
            <div className="admin-alert admin-alert--warning">
              <strong>{copy.overview.notes}</strong>
              <ul>
                {data.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className="admin-muted">
            统计区间 {data.range.from} 至 {data.range.to}（{data.range.timezone}）；运营事件表
            {data.availability.opsEvents ? ' 已就绪' : ' 未就绪'}，首见表
            {data.availability.userFirstSeen ? ' 已就绪' : ' 未就绪'}。
          </p>
          <div className="admin-metric-grid">
            {data.metrics.map((item) => (
              <MetricCard key={item.key} item={item} />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}

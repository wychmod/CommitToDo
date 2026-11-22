import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  callAdminApi,
  errorMessage,
  isApiError,
  type MetricItem,
  type MetricsOverviewData,
} from '@/lib/admin-api';
import { daysAgo, formatDate } from '@/lib/format';
import { MetricCard } from '@/components/metric-card';
import { ErrorPanel } from '@/components/error-panel';
import { KpiSkeleton } from '@/components/skeleton';
import { StatusLabel } from '@/components/status-chip';
import { NoticeIcon } from '@/components/icons';
import { copy } from '@/i18n';

interface PageError {
  code?: string;
  message: string;
  requestId?: string;
}

export function OverviewPage() {
  const [from, setFrom] = useState(() => formatDate(daysAgo(6)));
  const [to, setTo] = useState(() => formatDate(new Date()));
  const [data, setData] = useState<MetricsOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<PageError | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await callAdminApi<MetricsOverviewData>('metrics.overview', { from, to });
      setData(result);
    } catch (caught) {
      setError({
        code: isApiError(caught) ? caught.code : undefined,
        message: errorMessage(caught),
        requestId: isApiError(caught) ? caught.requestId : '',
      });
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const byKey = useMemo(() => {
    const map = new Map<string, MetricItem>();
    for (const item of data?.metrics ?? []) map.set(item.key, item);
    return map;
  }, [data]);

  const kpis = [
    { label: copy.overview.labels.dau, item: byKey.get('dau') },
    { label: copy.overview.labels.wau, item: byKey.get('wau') },
    { label: copy.overview.labels.mau, item: byKey.get('mau') },
    { label: copy.overview.labels.signups, item: byKey.get('newUsers') },
    { label: copy.overview.labels.retentionD1, item: byKey.get('retentionD1') },
    { label: copy.overview.labels.retentionD7, item: byKey.get('retentionD7') },
  ];

  const notReady = data ? !data.availability.opsEvents || !data.availability.userFirstSeen : false;

  return (
    <section className="admin-page">
      <header className="admin-page__head">
        <div className="admin-page__titles">
          <h1>{copy.overview.title}</h1>
          <p className="admin-page__subtitle">{copy.overview.description}</p>
        </div>
        <div className="admin-date-range">
          <input
            className="admin-input admin-input--date"
            type="date"
            aria-label={copy.overview.fromLabel}
            value={from}
            max={to}
            onChange={(event) => setFrom(event.target.value)}
          />
          <span className="admin-date-range__dash" aria-hidden="true">
            –
          </span>
          <input
            className="admin-input admin-input--date"
            type="date"
            aria-label={copy.overview.toLabel}
            value={to}
            min={from}
            onChange={(event) => setTo(event.target.value)}
          />
          <button
            type="button"
            className="admin-btn"
            onClick={() => void load()}
            disabled={loading}
          >
            {copy.overview.refresh}
          </button>
        </div>
      </header>

      {loading && !data ? <KpiSkeleton /> : null}

      {error ? (
        <ErrorPanel
          message={error.message}
          code={error.code}
          requestId={error.requestId}
          onRetry={() => void load()}
        />
      ) : null}

      {data && !error ? (
        <>
          {notReady ? (
            <div className="admin-notice" role="status">
              <NoticeIcon />
              <strong className="admin-notice__title">{copy.overview.notReadyTitle}</strong>
              <span className="admin-notice__body">{copy.overview.notReadyBody}</span>
            </div>
          ) : null}

          <div className="admin-sources">
            <div className="admin-source">
              <code className="admin-source__name">{copy.overview.sourceOps}</code>
              <StatusLabel tone={data.availability.opsEvents ? 'ready' : 'notready'}>
                {data.availability.opsEvents ? copy.overview.ready : copy.overview.notReady}
              </StatusLabel>
            </div>
            <div className="admin-source">
              <code className="admin-source__name">{copy.overview.sourceFirstSeen}</code>
              <StatusLabel tone={data.availability.userFirstSeen ? 'ready' : 'notready'}>
                {data.availability.userFirstSeen ? copy.overview.ready : copy.overview.notReady}
              </StatusLabel>
            </div>
          </div>

          <div className="admin-kpi-grid">
            {kpis.map((kpi) => (
              <MetricCard key={kpi.label} label={kpi.label} item={kpi.item} />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}

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
import {
  CalendarIcon,
  CheckIcon,
  DeviceIcon,
  PersonIcon,
  PersonPlusIcon,
  PulseIcon,
  TableIcon,
} from '@/components/icons';
import {
  BackupPanel,
  CommitsPanel,
  RetentionPanel,
  SyncPanel,
  TrendPanel,
} from '@/components/overview-charts';
import { copy } from '@/i18n';

interface PageError {
  code?: string;
  message: string;
  requestId?: string;
}

/** 画稿只保留 5 个 KPI；M6/M7 留存移入右侧留存卡，M9–M13 归入底部三块。 */
const KPI_KEYS = ['dau', 'dauDevice', 'wau', 'mau', 'newUsers'] as const;

const KPI_ICONS = {
  dau: <PersonIcon />,
  dauDevice: <DeviceIcon />,
  wau: <PulseIcon />,
  mau: <CalendarIcon />,
  newUsers: <PersonPlusIcon />,
};

export function OverviewPage() {
  const [from, setFrom] = useState(() => formatDate(daysAgo(21)));
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

  const kpis = KPI_KEYS.map((key) => ({
    key,
    label: copy.overview.labels[key],
    item: byKey.get(key),
  }));

  const notReady = data ? !data.availability.opsEvents || !data.availability.userFirstSeen : false;

  return (
    <section className="admin-page">
      <header className="admin-page__head">
        <div className="admin-page__titles">
          <h1>{copy.overview.title}</h1>
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
            <div className="admin-sources admin-sources--cards">
              <div className="admin-source admin-source--card">
                <span className="admin-source__head">
                  <TableIcon />
                  <span className="admin-source__name">{copy.overview.sourceOps}</span>
                  <StatusLabel tone={data.availability.opsEvents ? 'ready' : 'notready'}>
                    {data.availability.opsEvents ? copy.overview.ready : copy.overview.notReady}
                  </StatusLabel>
                </span>
                <span className="admin-source__desc">{copy.overview.sourceOpsDesc}</span>
              </div>
              <div className="admin-source admin-source--card">
                <span className="admin-source__head">
                  <TableIcon />
                  <span className="admin-source__name">{copy.overview.sourceFirstSeen}</span>
                  <StatusLabel tone={data.availability.userFirstSeen ? 'ready' : 'notready'}>
                    {data.availability.userFirstSeen
                      ? copy.overview.ready
                      : copy.overview.notReady}
                  </StatusLabel>
                </span>
                <span className="admin-source__desc">{copy.overview.sourceFirstSeenDesc}</span>
              </div>
            </div>
          ) : (
            <div className="admin-sources">
              <span className="admin-source">
                <TableIcon />
                <span className="admin-source__name">{copy.overview.sourceOps}</span>
                <span className="admin-source__sep">·</span>
                <span className="admin-source__state">
                  <CheckIcon />
                  {copy.overview.ready}
                </span>
              </span>
              <span className="admin-sources__divider" aria-hidden="true" />
              <span className="admin-source">
                <TableIcon />
                <span className="admin-source__name">{copy.overview.sourceFirstSeen}</span>
                <span className="admin-source__sep">·</span>
                <span className="admin-source__state">
                  <CheckIcon />
                  {copy.overview.ready}
                </span>
              </span>
              {data.sample ? (
                <span className="admin-sources__sample">{copy.overview.sample}</span>
              ) : null}
            </div>
          )}

          <div className="admin-kpi-grid">
            {kpis.map((kpi) => (
              <MetricCard
                key={kpi.key}
                label={kpi.label}
                item={kpi.item}
                icon={KPI_ICONS[kpi.key]}
              />
            ))}
          </div>

          <div className="admin-chart-grid">
            <TrendPanel
              series={data.series}
              hint={data.availability.opsEvents ? undefined : copy.overview.notReadyHint}
            />
            <RetentionPanel retention={data.retention} />
          </div>

          <div className="admin-ops-grid">
            <SyncPanel sync={data.sync} />
            <BackupPanel backup={data.backup} />
            <CommitsPanel commits={data.commits} />
          </div>
        </>
      ) : null}
    </section>
  );
}

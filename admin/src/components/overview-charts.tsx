import type { ReactNode } from 'react';
import type {
  BackupBlock,
  CommitsBlock,
  FunnelBlock,
  OverviewPoint,
  RetentionBlock,
  SyncBlock,
  UsageBlock,
} from '@/lib/admin-api';
import { ArchiveIcon, CheckIcon, SyncIcon } from '@/components/icons';
import { copy } from '@/i18n';

const WIDTH = 640;
const HEIGHT = 228;
const PAD = { top: 16, right: 12, bottom: 30, left: 42 };

function numberText(value: number | null, unit?: string): string {
  if (value == null) return '—';
  if (unit === '%') return `${value.toFixed(1)}%`;
  return new Intl.NumberFormat('zh-CN').format(value);
}

function percentInt(value: number | null): string {
  return value == null ? '—' : `${Math.round(value)}%`;
}

function shortDate(value: string): string {
  return value.length >= 10 ? value.slice(5) : value;
}

export function TrendPanel({
  series,
  hint,
}: {
  series: OverviewPoint[] | null;
  hint?: string;
}) {
  const ready = Boolean(series && series.length);
  const points = series ?? [];
  const hasCompare = points.some((point) => typeof point.compare === 'number');
  const max = Math.max(
    1,
    ...points.flatMap((point) => [point.active, hasCompare ? Number(point.compare) : 0]),
  );
  const rawStep = max / 6;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const ratio = rawStep / magnitude;
  const niceRatio = ratio <= 1 ? 1 : ratio <= 2 ? 2 : ratio <= 2.5 ? 2.5 : ratio <= 5 ? 5 : 10;
  const tickStep = niceRatio * magnitude;
  const top = tickStep * 6;
  const stepX = (WIDTH - PAD.left - PAD.right) / Math.max(points.length - 1, 1);
  const x = (index: number) => PAD.left + index * stepX;
  const y = (value: number) => HEIGHT - PAD.bottom - (value / top) * (HEIGHT - PAD.top - PAD.bottom);
  const line = (key: 'active' | 'compare') =>
    points
      .map((point, index) => {
        const value = key === 'active' ? point.active : Number(point.compare ?? 0);
        return `${index === 0 ? 'M' : 'L'}${x(index).toFixed(1)} ${y(value).toFixed(1)}`;
      })
      .join(' ');
  const ticks = Array.from({ length: 7 }, (_, index) => ({
    y: y(tickStep * index),
    label: String(Math.round(tickStep * index)),
  }));
  const labelIndexes = new Set<number>();
  for (let index = 0; index < points.length; index += 3) labelIndexes.add(index);
  if (points.length) labelIndexes.add(points.length - 1);

  return (
    <article className="admin-chart-card">
      <header className="admin-chart-card__head">
        <div className="admin-chart-card__titles">
          <h2>{copy.overview.trendTitle}</h2>
        </div>
        <div className="admin-chart-card__legend">
          <span className="admin-legend admin-legend--accent">
            <i aria-hidden="true" />
            {copy.overview.trendActive}
          </span>
          <span className="admin-legend admin-legend--honey">
            <i aria-hidden="true" />
            {copy.overview.trendSignups}
          </span>
        </div>
      </header>

      {ready ? (
        <svg
          className="admin-trend"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-label={`${copy.overview.trendTitle}：${copy.overview.trendActive} / ${copy.overview.trendSignups}`}
        >
          {ticks.map((tick) => (
            <g key={tick.label + tick.y}>
              <line
                className="admin-trend__grid"
                x1={PAD.left}
                y1={tick.y}
                x2={WIDTH - PAD.right}
                y2={tick.y}
              />
              <text className="admin-trend__axis" x={PAD.left - 8} y={tick.y + 4} textAnchor="end">
                {tick.label}
              </text>
            </g>
          ))}

          <path className="admin-trend__line admin-trend__line--active" d={line('active')} />
          {hasCompare ? (
            <path className="admin-trend__line admin-trend__line--honey" d={line('compare')} />
          ) : null}

          {points.map((point, index) => (
            <circle
              key={`dot-${point.date}`}
              className="admin-trend__dot"
              cx={x(index)}
              cy={y(point.active)}
              r={3}
            />
          ))}
          {hasCompare
            ? points.map((point, index) => (
                <circle
                  key={`compare-dot-${point.date}`}
                  className="admin-trend__dot admin-trend__dot--honey"
                  cx={x(index)}
                  cy={y(Number(point.compare ?? 0))}
                  r={3}
                />
              ))
            : null}

          {points.map((point, index) =>
            labelIndexes.has(index) ? (
              <text
                key={`label-${point.date}`}
                className="admin-trend__axis"
                x={x(index)}
                y={HEIGHT - 8}
                textAnchor={index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'}
              >
                {shortDate(point.date)}
              </text>
            ) : null,
          )}
        </svg>
      ) : (
        <p className="admin-chart-empty">{hint || copy.overview.emptyChart}</p>
      )}
    </article>
  );
}

export function RetentionPanel({ retention }: { retention: RetentionBlock }) {
  return (
    <article className="admin-chart-card">
      <header className="admin-chart-card__head">
        <div className="admin-chart-card__titles">
          <h2>{copy.overview.retentionTitle}</h2>
        </div>
      </header>

      <div className="admin-retention__stats">
        {retention.stats.map((stat) => {
          const empty = stat.status !== 'ready';
          return (
            <div className="admin-retention__stat" key={stat.day}>
              <span className="admin-retention__label">D{stat.day} 留存</span>
              <strong
                className={`admin-retention__value${
                  empty ? ` admin-retention__value--${stat.status}` : ''
                }`}
              >
                {stat.status === 'ready'
                  ? percentInt(stat.value)
                  : stat.status === 'insufficient'
                    ? copy.overview.insufficient
                    : copy.overview.unavailable}
              </strong>
            </div>
          );
        })}
      </div>

      {retention.cohorts.length ? (
        <table className="admin-mini-table">
          <thead>
            <tr>
              <th>{copy.overview.retentionCohort}</th>
              <th>{copy.overview.retentionSize}</th>
              <th>D1</th>
              <th>D7</th>
              <th>D30</th>
            </tr>
          </thead>
          <tbody>
            {retention.cohorts.map((cohort) => (
              <tr key={cohort.cohortDate}>
                <td>{cohort.cohortDate}</td>
                <td>{cohort.cohortSize}</td>
                <td>
                  <span className={cohort.d1 == null ? undefined : 'admin-mini-table__pct'}>
                    {percentInt(cohort.d1)}
                  </span>
                </td>
                <td>
                  <span className={cohort.d7 == null ? undefined : 'admin-mini-table__pct'}>
                    {percentInt(cohort.d7)}
                  </span>
                </td>
                <td>
                  <span className={cohort.d30 == null ? undefined : 'admin-mini-table__pct'}>
                    {percentInt(cohort.d30)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="admin-chart-empty">
          {retention.status === 'not_ready'
            ? copy.overview.notReadyHint
            : copy.overview.emptyChart}
        </p>
      )}
    </article>
  );
}

function OpsHead({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <header className="admin-ops-card__head">
      <span className="admin-ops-card__icon">{icon}</span>
      <h2>{title}</h2>
    </header>
  );
}

export function SyncPanel({ sync }: { sync: SyncBlock }) {
  const ready = sync.status === 'ready';
  return (
    <article className="admin-ops-card">
      <OpsHead icon={<SyncIcon />} title={copy.overview.syncTitle} />
      <span className="admin-ops-card__label">{copy.overview.syncRateLabel}</span>
      <strong className={`admin-ops-card__value${ready ? '' : ' admin-ops-card__value--empty'}`}>
        {ready ? numberText(sync.successRate, '%') : '—'}
      </strong>
      {ready ? null : <p className="admin-ops-card__meta">{copy.overview.notReadyHint}</p>}
    </article>
  );
}

export function BackupPanel({ backup }: { backup: BackupBlock }) {
  const ready = backup.status === 'ready';
  return (
    <article className="admin-ops-card">
      <OpsHead icon={<ArchiveIcon />} title={copy.overview.backupTitle} />
      <div className="admin-ops-stats">
        <div className="admin-ops-stat">
          <span>{copy.overview.backupSuccessLabel}</span>
          <strong className={`admin-ops-stat__value${ready ? '' : ' admin-ops-stat__value--empty'}`}>
            {ready ? numberText(backup.success) : '—'}
          </strong>
        </div>
        <div className="admin-ops-stat">
          <span>{copy.overview.backupFailureLabel}</span>
          <strong className={`admin-ops-stat__value${ready ? '' : ' admin-ops-stat__value--empty'}`}>
            {ready ? numberText(backup.failure) : '—'}
          </strong>
        </div>
      </div>
      {ready ? null : <p className="admin-ops-card__meta">{copy.overview.notReadyHint}</p>}
    </article>
  );
}

export function CommitsPanel({ commits }: { commits: CommitsBlock }) {
  const ready = commits.status === 'ready';
  return (
    <article className="admin-ops-card admin-ops-card--honey">
      <OpsHead icon={<CheckIcon />} title={copy.overview.commitsTitle} />
      <div className="admin-ops-stats">
        <div className="admin-ops-stat">
          <span>{copy.overview.commitsUsersLabel}</span>
          <strong className={`admin-ops-stat__value${ready ? '' : ' admin-ops-stat__value--empty'}`}>
            {ready ? numberText(commits.activeUsers) : '—'}
          </strong>
        </div>
        <div className="admin-ops-stat">
          <span>{copy.overview.commitsTotalLabel}</span>
          <strong className={`admin-ops-stat__value${ready ? '' : ' admin-ops-stat__value--empty'}`}>
            {ready ? numberText(commits.total) : '—'}
          </strong>
        </div>
      </div>
      {ready ? null : <p className="admin-ops-card__meta">{copy.overview.notReadyHint}</p>}
    </article>
  );
}

export function UsagePanel({ usage }: { usage: UsageBlock }) {
  const ready = usage.status === 'ready';
  return (
    <article className="admin-chart-card admin-funnel-card">
      <header className="admin-chart-card__head">
        <div className="admin-chart-card__titles">
          <h2>{copy.overview.usageTitle}</h2>
        </div>
        <span className="admin-chart-card__meta">{copy.overview.usageMeta}</span>
      </header>
      {ready ? (
        <>
          <ul className="admin-usage-grid">
            {usage.counts.map((item) => (
              <li className="admin-usage-item" key={item.event}>
                <span className="admin-usage-item__label">{item.label}</span>
                <strong className="admin-usage-item__value">{numberText(item.value)}</strong>
              </li>
            ))}
          </ul>
          {usage.note ? <p className="admin-chart-empty">{usage.note}</p> : null}
        </>
      ) : (
        <p className="admin-chart-empty">{copy.overview.notReadyHint}</p>
      )}
    </article>
  );
}

export function FunnelPanel({ funnel }: { funnel: FunnelBlock }) {
  const ready = funnel.status === 'ready';
  const source =
    funnel.cohortSource === 'user_first_seen'
      ? copy.overview.funnelSourceFirstSeen
      : copy.overview.funnelSourceEvents;
  return (
    <article className="admin-chart-card admin-funnel-card">
      <header className="admin-chart-card__head">
        <div className="admin-chart-card__titles">
          <h2>{copy.overview.funnelTitle}</h2>
        </div>
        {ready ? (
          <span className="admin-chart-card__meta">
            {copy.overview.funnelMeta
              .replace('{days}', String(funnel.windowDays))
              .replace('{source}', source)}
          </span>
        ) : null}
      </header>
      {ready ? (
        <>
          <ul className="admin-funnel">
            {funnel.steps.map((step) => (
              <li className="admin-funnel__row" key={step.key}>
                <span className="admin-funnel__label">{step.label}</span>
                <span className="admin-funnel__bar" aria-hidden="true">
                  <i style={{ width: `${Math.max(step.rate ?? 0, 0)}%` }} />
                </span>
                <span className="admin-funnel__value">{numberText(step.users)}</span>
                <span className="admin-funnel__rate">
                  {step.rate == null ? '—' : `${step.rate.toFixed(1)}%`}
                </span>
              </li>
            ))}
          </ul>
          <p className="admin-funnel__foot">
            {copy.overview.funnelStrict} {numberText(funnel.strictUsers)} ·{' '}
            {funnel.strictRate == null ? '—' : `${funnel.strictRate.toFixed(1)}%`}
          </p>
        </>
      ) : (
        <p className="admin-chart-empty">
          {funnel.status === 'insufficient'
            ? copy.overview.funnelInsufficient
            : copy.overview.notReadyHint}
        </p>
      )}
    </article>
  );
}

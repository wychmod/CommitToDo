import type { MetricItem } from '@/lib/admin-api';
import { formatMetricValue } from '@/lib/format';
import { copy } from '@/i18n';

const UNIT_BY_KEY: Record<string, string> = {
  syncSuccessRate: '%',
};

export function MetricCard({ item }: { item: MetricItem }) {
  const statusLabel =
    item.status === 'ready'
      ? copy.overview.ready
      : item.status === 'insufficient'
        ? copy.overview.insufficient
        : copy.overview.notReady;
  const unit = UNIT_BY_KEY[item.key];
  return (
    <article className={`admin-metric admin-metric--${item.status}`}>
      <header>
        <span className="admin-metric__label">{item.label}</span>
        <span className="admin-badge">{statusLabel}</span>
      </header>
      <strong className="admin-metric__value">{formatMetricValue(item.value, unit)}</strong>
      {item.note ? <p className="admin-metric__note">{item.note}</p> : null}
      <footer className="admin-metric__source">{item.source}</footer>
    </article>
  );
}

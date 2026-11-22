import type { MetricItem } from '@/lib/admin-api';
import { formatMetricValue } from '@/lib/format';
import { copy } from '@/i18n';

export function MetricCard({ label, item }: { label: string; item?: MetricItem }) {
  const status = item?.status ?? 'not_ready';
  const value =
    item && item.status === 'ready' && item.value != null ? formatMetricValue(item.value) : '—';
  const stateText =
    status === 'insufficient' ? copy.overview.insufficient : status === 'not_ready' ? copy.overview.unavailable : '';

  return (
    <article className={`admin-kpi admin-kpi--${status}`}>
      <span className="admin-kpi__label">{label}</span>
      <strong className="admin-kpi__value">{value}</strong>
      <span className={`admin-kpi__state${stateText ? '' : ' admin-kpi__state--empty'}`}>
        {stateText}
      </span>
    </article>
  );
}

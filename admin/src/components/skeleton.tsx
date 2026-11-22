import { copy } from '@/i18n';

function SkeletonLine({ variant = 'full' }: { variant?: 'full' | 'short' | 'label' | 'value' }) {
  return <span className={`admin-skeleton admin-skeleton--${variant}`} />;
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="admin-panel admin-skeleton-panel" aria-label={copy.common.loading}>
      <div className="admin-panel__head">
        <SkeletonLine variant="label" />
        <SkeletonLine variant="short" />
      </div>
      <div className="admin-skeleton-rows">
        {Array.from({ length: rows }).map((_, index) => (
          <div className="admin-skeleton-row" key={index}>
            <SkeletonLine variant="value" />
            <SkeletonLine />
            <SkeletonLine variant="short" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function KpiSkeleton() {
  return (
    <div className="admin-skeleton-kpis" aria-label={copy.common.loading}>
      {Array.from({ length: 6 }).map((_, index) => (
        <div className="admin-skeleton-kpi" key={index}>
          <SkeletonLine variant="label" />
          <SkeletonLine variant="value" />
          <SkeletonLine variant="short" />
        </div>
      ))}
    </div>
  );
}

export function BootSkeleton() {
  return (
    <div className="admin-boot" aria-label={copy.status.loading}>
      <div className="admin-boot__card">
        <SkeletonLine variant="label" />
        <SkeletonLine variant="value" />
        <SkeletonLine />
      </div>
    </div>
  );
}

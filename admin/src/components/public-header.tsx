import { BrandLockup } from '@/components/brand';
import { copy } from '@/i18n';

export function PublicHeader({ showUsage = false }: { showUsage?: boolean }) {
  return (
    <header className="admin-public__header">
      <div className="admin-public__bar">
        <BrandLockup />
        {showUsage ? <span className="admin-public__usage">{copy.app.internal}</span> : null}
      </div>
    </header>
  );
}

import { Link } from 'react-router-dom';
import { t } from '@/i18n';
import { EmptyState } from '@/ui/empty-state';
import { PageShell } from '@/ui/page-shell';
import styles from './pages.module.css';

/** P08 数据与备份：导出与导入在 M10 落地，本份先给空态与出口。 */
export function DataPage() {
  return (
    <PageShell titleKey="page.data.title" bodyKey="page.data.body">
      <EmptyState
        messageKey="page.data.empty"
        action={
          <Link className={styles.action} to="/today">
            {t('page.data.action')}
          </Link>
        }
      />
    </PageShell>
  );
}

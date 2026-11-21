import { Link } from 'react-router-dom';
import { Annotation } from '@/components/annotation';
import { useRecentCommits } from '@/data/hooks';
import { t } from '@/i18n';
import { EmptyState } from '@/ui/empty-state';
import { LoadingShell } from '@/ui/loading-shell';
import { PageShell } from '@/ui/page-shell';
import styles from './pages.module.css';

/** P04 历程：时间树待实现，先接通最近提交与停滞注解。 */
export function HistoryPage() {
  const commits = useRecentCommits(undefined, 20);

  return (
    <PageShell titleKey="page.history.title" bodyKey="page.history.body">
      <div className={styles.notice}>
        <Annotation concept="stall" textKey="annotation.stall" />
      </div>
      {!commits ? (
        <LoadingShell />
      ) : commits.length === 0 ? (
        <EmptyState
          messageKey="page.history.empty"
          action={
            <Link className={styles.action} to="/today">
              {t('page.history.action')}
            </Link>
          }
        />
      ) : (
        <ul className={styles.list}>
          {commits.map((commit) => (
            <li key={commit.id}>
              {commit.summary} · {commit.date}
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}

import { useRecentCommits } from '@/data/hooks';
import { t } from '@/i18n';
import { LoadingShell } from '@/ui/loading-shell';
import { PageShell } from '@/ui/page-shell';
import styles from './pages.module.css';

/** P04 历程：时间树待实现，先接通最近提交。 */
export function HistoryPage() {
  const commits = useRecentCommits(undefined, 20);

  return (
    <PageShell titleKey="page.history.title" bodyKey="page.history.body">
      {!commits ? (
        <LoadingShell />
      ) : commits.length === 0 ? (
        <p className={styles.quiet}>{t('page.history.empty')}</p>
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

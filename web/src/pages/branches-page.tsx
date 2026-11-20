import { Link } from 'react-router-dom';
import { useBranches } from '@/data/hooks';
import { t } from '@/i18n';
import { LoadingShell } from '@/ui/loading-shell';
import { PageShell } from '@/ui/page-shell';
import styles from './pages.module.css';

/** P02 分支树：树与分组待实现，先接通读路径。 */
export function BranchesPage() {
  const branches = useBranches();

  return (
    <PageShell titleKey="page.branches.title" bodyKey="page.branches.body">
      {!branches ? (
        <LoadingShell />
      ) : branches.length === 0 ? (
        <p className={styles.quiet}>{t('page.branches.empty')}</p>
      ) : (
        <ul className={styles.list}>
          {branches.map((branch) => (
            <li key={branch.id}>
              <Link to={`/branches/${branch.id}`}>{branch.title}</Link>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}

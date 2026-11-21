import { Link } from 'react-router-dom';
import { Annotation } from '@/components/annotation';
import { useBranches } from '@/data/hooks';
import { t } from '@/i18n';
import { EmptyState } from '@/ui/empty-state';
import { LoadingShell } from '@/ui/loading-shell';
import { PageShell } from '@/ui/page-shell';
import styles from './pages.module.css';

/**
 * P02 分支树。
 *
 * 空态动作走 `/branches?new=1`，由分支新建流程（M02）接管；
 * 本份只负责外壳、空态结构与注解入口，不实现分支业务。
 */
export function BranchesPage() {
  const branches = useBranches();
  const hasBranches = Boolean(branches && branches.length > 0);
  const action = (
    <Link className={styles.action} to="/branches?new=1">
      {t('page.branches.action')}
    </Link>
  );

  return (
    <PageShell
      titleKey="page.branches.title"
      bodyKey="page.branches.body"
      action={hasBranches ? action : undefined}
    >
      <div className={styles.notice}>
        <Annotation concept="branch" textKey="annotation.branch" />
      </div>
      {!branches ? (
        <LoadingShell />
      ) : branches.length === 0 ? (
        <EmptyState messageKey="page.branches.empty" action={action} />
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

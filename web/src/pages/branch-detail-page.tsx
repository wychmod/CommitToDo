import { useParams } from 'react-router-dom';
import { Annotation } from '@/components/annotation';
import { BackButton } from '@/components/back-button';
import { useBranch } from '@/data/hooks';
import { LoadingShell } from '@/ui/loading-shell';
import { PageShell } from '@/ui/page-shell';
import styles from './pages.module.css';

/** P03 分支详情：待办、提交、子分支、里程碑等分区待实现（M04）。 */
export function BranchDetailPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const branch = useBranch(branchId);

  return (
    <PageShell titleKey="page.branchDetail.title" back={<BackButton fallbackTo="/branches" />}>
      <div className={styles.notice}>
        <Annotation concept="merge" textKey="annotation.merge" />
      </div>
      {!branch ? (
        <LoadingShell />
      ) : (
        <>
          <h2>{branch.title}</h2>
          {branch.goal ? <p className={styles.quiet}>{branch.goal}</p> : null}
        </>
      )}
    </PageShell>
  );
}

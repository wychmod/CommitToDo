import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { localClockTime, localDate } from '@/core/clock';
import { useSampleTree } from '@/data/hooks';
import { clearSampleTree } from '@/data/sample-namespace';
import { t } from '@/i18n';
import { ConfirmDialog } from '@/components/today/confirm-dialog';
import { EmptyState } from '@/ui/empty-state';
import { LoadingShell } from '@/ui/loading-shell';
import { PageShell } from '@/ui/page-shell';
import styles from './sample-page.module.css';

/**
 * O06-sample-tree 示例树（PRD M12 A-02）。
 *
 * 只读展示独立命名空间里的分支、提交与里程碑；横幅固定在顶部，
 * 删除示例经一次确认后物理清除示例行并回到今天页，真实数据不受影响。
 */
export function SamplePage() {
  const navigate = useNavigate();
  const sample = useSampleTree();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const byId = new Map(sample.branches.map((branch) => [branch.id, branch]));
  const empty = sample.status === 'ready' && sample.branches.length === 0;

  const remove = async () => {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    const result = await clearSampleTree();
    if (result.ok) {
      navigate('/today');
      return;
    }
    setBusy(false);
    setFailed(true);
  };

  return (
    <PageShell titleKey="page.sample.title" bodyKey="page.sample.body">
      <div className={styles.banner} role="note">
        <span className={styles.bannerText}>{t('sample.banner')}</span>
        <button
          type="button"
          className={styles.delete}
          onClick={() => setConfirming(true)}
          disabled={busy}
        >
          {t('sample.delete')}
        </button>
      </div>

      {sample.status === 'loading' ? <LoadingShell /> : null}

      {sample.status === 'error' ? (
        <div className={styles.errorBox} role="alert">
          <p>{t('sample.loadFailed')}</p>
          <button type="button" className={styles.retry} onClick={sample.retry}>
            {t('error.retry')}
          </button>
        </div>
      ) : null}

      {empty ? (
        <EmptyState
          messageKey="sample.empty"
          action={
            <button type="button" className={styles.primary} onClick={() => navigate('/today')}>
              {t('sample.backToday')}
            </button>
          }
        />
      ) : null}

      {sample.status === 'ready' && sample.branches.length > 0 ? (
        <div className={styles.sections}>
          <p className={styles.readonly}>{t('sample.readonly')}</p>

          <section className={styles.section} aria-labelledby="sample-branches">
            <h2 id="sample-branches" className={styles.sectionTitle}>
              {t('sample.branches')}
            </h2>
            <ul className={styles.list}>
              {sample.branches.map((branch) => (
                <li key={branch.id} className={styles.branch} data-depth={branch.depth}>
                  <span className={styles.branchTitle}>{branch.title}</span>
                  <span className={styles.meta}>
                    {branch.depth}
                    {t('sample.level')} · {branch.commitCount}
                  </span>
                  {branch.goal ? <span className={styles.note}>{branch.goal}</span> : null}
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.section} aria-labelledby="sample-commits">
            <h2 id="sample-commits" className={styles.sectionTitle}>
              {t('sample.commits')}
            </h2>
            <ul className={styles.list}>
              {sample.commits.map((commit) => (
                <li key={commit.id} className={styles.row}>
                  <span className={styles.rowTitle}>{commit.summary}</span>
                  <span className={styles.meta}>
                    {byId.get(commit.branchId)?.title ?? commit.branchId} · {commit.date}{' '}
                    {localClockTime(commit.at)}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.section} aria-labelledby="sample-milestones">
            <h2 id="sample-milestones" className={styles.sectionTitle}>
              {t('sample.milestones')}
            </h2>
            <ul className={styles.list}>
              {sample.milestones.map((milestone) => (
                <li key={milestone.id} className={styles.row}>
                  <span className={styles.rowTitle}>{milestone.title}</span>
                  <span className={styles.meta}>
                    {byId.get(milestone.branchId)?.title ?? milestone.branchId} ·{' '}
                    {localDate(milestone.achievedAt)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}

      {failed ? (
        <p className={styles.error} role="alert">
          {t('sample.deleteFailed')}
        </p>
      ) : null}

      {confirming ? (
        <ConfirmDialog
          titleKey="sample.confirmTitle"
          bodyKey="sample.confirmBody"
          confirmKey="sample.confirmAction"
          busy={busy}
          onConfirm={() => void remove()}
          onClose={() => setConfirming(false)}
        />
      ) : null}
    </PageShell>
  );
}

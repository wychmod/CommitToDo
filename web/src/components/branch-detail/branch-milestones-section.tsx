import { useMemo } from 'react';
import { currentTzOffset } from '@/core/clock';
import { formatMilestoneDate } from '@/core/rules/milestone-date';
import type { Milestone } from '@/data/types';
import { t } from '@/i18n';
import { useShellStore } from '@/stores/shell.store';
import styles from './branch-milestones-section.module.css';

interface BranchMilestonesSectionProps {
  milestones: readonly Milestone[];
  status: 'loading' | 'ready' | 'error';
  retry: () => void;
}

/**
 * 分支详情 · 里程碑行（M04 §4.5）。
 *
 * 只列标题与按精度渲染的日期；新建与详情分别交给 M07 的浮层。
 */
export function BranchMilestonesSection({
  milestones,
  status,
  retry,
}: BranchMilestonesSectionProps) {
  const openMilestoneDetail = useShellStore((state) => state.openMilestoneDetail);
  const openOverlay = useShellStore((state) => state.openOverlay);

  const visible = useMemo(
    () =>
      milestones
        .filter((item) => item.deletedAt === null)
        .sort((a, b) => b.achievedAt - a.achievedAt),
    [milestones],
  );

  return (
    <section className={styles.section} aria-labelledby="branch-milestones-title">
      <div className={styles.head}>
        <h2 id="branch-milestones-title" className={styles.title}>
          {t('branchDetail.section.milestones')}
          <span className={styles.count}>{visible.length}</span>
        </h2>
        <button type="button" className={styles.add} onClick={() => openOverlay('milestone-new')}>
          {t('branchDetail.milestones.new')}
        </button>
      </div>

      {status === 'loading' ? (
        <p className={styles.state} role="status">
          {t('state.loading')}
        </p>
      ) : null}

      {status === 'error' ? (
        <div className={styles.errorBox} role="alert">
          <p>{t('branchDetail.sectionLoadFailed')}</p>
          <button type="button" className={styles.retry} onClick={retry}>
            {t('branchDetail.retry')}
          </button>
        </div>
      ) : null}

      {status === 'ready' && visible.length === 0 ? (
        <p className={styles.state}>{t('branchDetail.milestones.empty')}</p>
      ) : null}

      {status === 'ready' && visible.length > 0 ? (
        <ul className={styles.list}>
          {visible.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={styles.item}
                onClick={() => openMilestoneDetail(item.id)}
              >
                <span className={styles.date}>
                  {formatMilestoneDate(
                    item.achievedAt,
                    item.datePrecision,
                    currentTzOffset(item.achievedAt),
                  )}
                </span>
                <span className={styles.name}>{item.title}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

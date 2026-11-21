import { useMemo } from 'react';
import { currentTzOffset } from '@/core/clock';
import { formatMilestoneDate } from '@/core/rules/milestone-date';
import { orderMilestones } from '@/core/rules/milestone-order';
import type { Milestone } from '@/data/types';
import { t } from '@/i18n';
import { useShellStore } from '@/stores/shell.store';
import styles from './branch-milestones-section.module.css';

interface BranchMilestonesSectionProps {
  branchId: string;
  readonly: boolean;
  milestones: readonly Milestone[];
  status: 'loading' | 'ready' | 'error';
  retry: () => void;
}

/**
 * 分支详情 · 里程碑行（M04 §4.5 / M07 OP-04）。
 *
 * 只列标题与按精度渲染的日期；同月按 `createdAt` 稳定排序。
 * 新建预填本分支，保存后本行短暂高亮（`milestoneFocusId`）。
 */
export function BranchMilestonesSection({
  branchId,
  readonly,
  milestones,
  status,
  retry,
}: BranchMilestonesSectionProps) {
  const openMilestoneDetail = useShellStore((state) => state.openMilestoneDetail);
  const openMilestoneNew = useShellStore((state) => state.openMilestoneNew);
  const focusId = useShellStore((state) => state.milestoneFocusId);

  const visible = useMemo(
    () => orderMilestones(milestones.filter((item) => item.deletedAt === null)).reverse(),
    [milestones],
  );

  return (
    <section className={styles.section} aria-labelledby="branch-milestones-title">
      <div className={styles.head}>
        <h2 id="branch-milestones-title" className={styles.title}>
          {t('branchDetail.section.milestones')}
          <span className={styles.count}>{visible.length}</span>
        </h2>
        <button
          type="button"
          className={styles.add}
          disabled={readonly}
          title={readonly ? t('milestone.form.readonlyBranch') : undefined}
          onClick={() => openMilestoneNew(branchId)}
        >
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
                data-highlighted={focusId === item.id ? 'true' : undefined}
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

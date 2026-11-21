import { useEffect } from 'react';
import { currentTzOffset } from '@/core/clock';
import { formatCommitTime } from '@/core/rules/commit-time-format';
import { formatMilestoneDate } from '@/core/rules/milestone-date';
import { branchTrail } from '@/core/rules/quick-add';
import { useMilestoneDetail } from '@/data/hooks';
import { t } from '@/i18n';
import { useShellStore } from '@/stores/shell.store';
import styles from './milestone-detail-panel.module.css';

/**
 * S04 里程碑详情（M07 OP-06）。
 *
 * 只读展示标题、按精度渲染的日期、所属分支路径、备注与创建时间；
 * 没有编辑与删除入口，所属分支已归档时写明只读。
 */
export function MilestoneDetailPanel() {
  const milestoneId = useShellStore((state) => state.overlayMilestoneId);
  const closeOverlay = useShellStore((state) => state.closeOverlay);
  const detail = useMilestoneDetail(milestoneId);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeOverlay();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [closeOverlay]);

  const renderBody = () => {
    if (detail.status === 'loading') {
      return (
        <p className={styles.state} role="status">
          {t('state.loading')}
        </p>
      );
    }
    if (detail.status === 'error') {
      return (
        <div className={styles.errorBox} role="alert">
          <p>{t('milestone.detail.loadFailed')}</p>
          <button type="button" className={styles.ghost} onClick={detail.retry}>
            {t('milestone.detail.retry')}
          </button>
        </div>
      );
    }
    const milestone = detail.milestone;
    if (!milestone) {
      return (
        <div className={styles.errorBox} role="alert">
          <p>{t('milestone.detail.notFound')}</p>
          <button type="button" className={styles.ghost} onClick={closeOverlay}>
            {t('shell.close')}
          </button>
        </div>
      );
    }

    const byId = new Map(detail.branches.map((branch) => [branch.id, branch]));
    const path = detail.branch ? branchTrail(detail.branch, byId) : milestone.branchId;
    const archived = detail.branch !== null && detail.branch.archivedAt !== null;

    return (
      <>
        <h3 className={styles.heading}>{milestone.title}</h3>

        <dl className={styles.facts}>
          <div className={styles.fact}>
            <dt>{t('milestone.detail.date')}</dt>
            <dd>
              {formatMilestoneDate(
                milestone.achievedAt,
                milestone.datePrecision,
                currentTzOffset(milestone.achievedAt),
              )}
            </dd>
          </div>
          <div className={styles.fact}>
            <dt>{t('milestone.detail.branch')}</dt>
            <dd>{path}</dd>
          </div>
          <div className={styles.fact}>
            <dt>{t('milestone.detail.createdAt')}</dt>
            <dd>{formatCommitTime(milestone.createdAt, currentTzOffset(milestone.createdAt))}</dd>
          </div>
        </dl>

        <section className={styles.noteBlock} aria-label={t('milestone.detail.note')}>
          <h3 className={styles.noteLabel}>{t('milestone.detail.note')}</h3>
          <p className={styles.note}>{milestone.note ?? t('milestone.detail.noNote')}</p>
        </section>

        {archived ? <p className={styles.readonly}>{t('milestone.detail.archivedNote')}</p> : null}
      </>
    );
  };

  return (
    <div className={styles.backdrop} role="presentation" onPointerDown={closeOverlay}>
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={t('overlay.milestone-detail.title')}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <h2 className={styles.title}>{t('overlay.milestone-detail.title')}</h2>
          <button type="button" className={styles.close} onClick={closeOverlay}>
            {t('shell.close')}
          </button>
        </header>
        {renderBody()}
      </div>
    </div>
  );
}

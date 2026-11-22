import { useEffect, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { currentTzOffset } from '@/core/clock';
import { branchShadeForDepth, normalizeBranchColor } from '@/core/rules/branch-color';
import { formatCommitTime } from '@/core/rules/commit-time-format';
import { formatMilestoneDate } from '@/core/rules/milestone-date';
import { branchTrail } from '@/core/rules/quick-add';
import { useMilestoneDetail } from '@/data/hooks';
import { t } from '@/i18n';
import { useShellStore } from '@/stores/shell.store';
import { CloseIcon } from '@/ui/icons';
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
  const navigate = useNavigate();
  const detail = useMilestoneDetail(milestoneId);
  const milestone = detail.status === 'ready' ? detail.milestone : null;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeOverlay();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [closeOverlay]);

  const byId =
    detail.status === 'ready'
      ? new Map(detail.branches.map((branch) => [branch.id, branch]))
      : new Map();
  const branch = detail.status === 'ready' ? detail.branch : null;
  const path = branch && milestone ? branchTrail(branch, byId) : (milestone?.branchId ?? '');
  const archived = branch !== null && branch.archivedAt !== null;
  const color = branch ? normalizeBranchColor(branch.color) : 'sky';
  const shade = branch ? branchShadeForDepth(branch.depth) : 1;

  const locate = () => {
    if (!milestone) return;
    navigate(`/history?milestone=${encodeURIComponent(milestone.id)}`);
    closeOverlay();
  };

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

    return (
      <>
        <div className={styles.chips}>
          <span className={styles.chip}>{t('milestone.detail.chip')}</span>
          {branch ? (
            <span
              className={styles.identity}
              style={{ '--branch': `var(--${color}-${shade})` } as CSSProperties}
            >
              <i className={styles.branchDot} aria-hidden="true" />
              {path}
            </span>
          ) : null}
        </div>

        <div className={styles.keys}>
          <div className={styles.keyRow}>
            <span>{t('milestone.detail.branch')}</span>
            <span>{path}</span>
          </div>
          <div className={styles.keyRow}>
            <span>{t('milestone.detail.createdAt')}</span>
            <span>
              {formatCommitTime(milestone.createdAt, currentTzOffset(milestone.createdAt))}
            </span>
          </div>
        </div>

        <section className={styles.noteBlock} aria-label={t('milestone.detail.note')}>
          <span className={styles.noteLabel}>{t('milestone.detail.note')}</span>
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
          <div className={styles.headText}>
            <span className={styles.kicker}>{t('overlay.milestone-detail.kicker')}</span>
            <h2 className={styles.title}>
              {milestone ? milestone.title : t('overlay.milestone-detail.title')}
            </h2>
            {milestone ? (
              <p className={styles.date}>
                {formatMilestoneDate(
                  milestone.achievedAt,
                  milestone.datePrecision,
                  currentTzOffset(milestone.achievedAt),
                )}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className={styles.close}
            aria-label={t('shell.close')}
            onClick={closeOverlay}
          >
            <CloseIcon size={16} />
          </button>
        </header>

        <div className={styles.body}>{renderBody()}</div>

        <footer className={styles.actions}>
          <button type="button" className={styles.ghost} onClick={closeOverlay}>
            {t('shell.close')}
          </button>
          <button type="button" className={styles.primary} disabled={!milestone} onClick={locate}>
            {t('milestone.detail.locate')}
          </button>
        </footer>
      </div>
    </div>
  );
}

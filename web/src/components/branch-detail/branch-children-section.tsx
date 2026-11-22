import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { branchShadeForDepth, normalizeBranchColor } from '@/core/rules/branch-color';
import type { Branch } from '@/data/types';
import { t, type MessageKey } from '@/i18n';
import styles from './branch-children-section.module.css';

const STATUS_KEYS: Record<Branch['status'], MessageKey> = {
  active: 'branches.status.active',
  merged: 'branches.status.merged',
  dropped: 'branches.status.dropped',
};

interface BranchChildrenSectionProps {
  branch: Branch;
  branches: readonly Branch[];
  createReason: MessageKey | null;
  onNewChild: () => void;
}

/**
 * 分支详情 · 子分支区（M04 §4.4）。
 *
 * 只列直属子分支，按 `order` 排序；已归档子分支照常显示并带标记。
 * 进度沿用分支自身四计数（不含子分支，R7）。
 */
export function BranchChildrenSection({
  branch,
  branches,
  createReason,
  onNewChild,
}: BranchChildrenSectionProps) {
  const children = useMemo(
    () =>
      branches
        .filter((row) => row.parentId === branch.id && row.deletedAt === null)
        .sort((a, b) => (a.order === b.order ? a.createdAt - b.createdAt : a.order - b.order)),
    [branch.id, branches],
  );

  return (
    <section
      id="branch-children"
      className={styles.section}
      aria-labelledby="branch-children-title"
    >
      <div className={styles.head}>
        <h2 id="branch-children-title" className={styles.title}>
          {t('branchDetail.section.children')}
          <span className={styles.count}>{children.length}</span>
        </h2>
        <button
          type="button"
          className={styles.add}
          onClick={onNewChild}
          disabled={createReason !== null}
          title={createReason ? t(createReason) : undefined}
        >
          {t('branchDetail.children.new')}
        </button>
      </div>

      {children.length === 0 ? (
        <p className={styles.empty}>{t('branchDetail.children.empty')}</p>
      ) : (
        <ul className={styles.list}>
          {children.map((child) => {
            const color = child.depth === 0 ? 'neutral' : normalizeBranchColor(child.color);
            const shade = branchShadeForDepth(child.depth);
            return (
              <li key={child.id} className={styles.item} data-status={child.status}>
                <Link className={styles.link} to={`/branches/${child.id}`} title={child.title}>
                  <span
                    className={styles.dot}
                    style={{ backgroundColor: `var(--${color}-${shade})` }}
                    aria-hidden="true"
                  />
                  <span className={styles.name}>{child.title}</span>
                  <span className={styles.status}>{t(STATUS_KEYS[child.status])}</span>
                  {child.archivedAt !== null ? (
                    <span className={styles.archived}>{t('branchDetail.status.archived')}</span>
                  ) : null}
                  <span className={styles.progress} aria-label={t('branches.progressLabel')}>
                    {child.taskDone}/{child.taskTotal}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

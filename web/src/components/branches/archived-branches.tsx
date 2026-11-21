import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { currentTzOffset } from '@/core/clock';
import { assessUnarchive } from '@/core/rules/branch-lifecycle';
import { assessRestoreQuota } from '@/core/rules/branch-quota';
import {
  groupArchivedBranches,
  type ArchivedGroup,
  type ArchivedRow,
} from '@/core/rules/branch-visibility';
import { formatMilestoneDate } from '@/core/rules/milestone-date';
import type { Branch, BranchStatus } from '@/data/types';
import { t, type MessageKey } from '@/i18n';
import { ChevronDownIcon, ChevronRightIcon, MoreIcon } from '@/ui/icons';
import styles from './archived-branches.module.css';

const STATUS_KEYS: Record<BranchStatus, MessageKey> = {
  active: 'branches.status.active',
  merged: 'branches.status.merged',
  dropped: 'branches.status.dropped',
};

interface ArchivedBranchesProps {
  branches: readonly Branch[];
  onUnarchive: (branch: Branch) => void;
}

function unarchiveReason(
  branch: Branch,
  byId: ReadonlyMap<string, Branch>,
  branches: readonly Branch[],
): MessageKey | null {
  const assessment = assessUnarchive(branch, byId);
  if (!assessment.allowed) {
    return assessment.reason === 'ancestor-archived'
      ? 'branchDetail.lifecycle.ancestorArchived'
      : 'branches.reason.readonly';
  }
  const parent = branch.parentId ? byId.get(branch.parentId) : undefined;
  if (!parent) return 'branches.reason.readonly';
  return assessRestoreQuota(parent.id, parent.depth, branches).allowed
    ? null
    : 'branches.reason.restoreFull';
}

function archivedOn(branch: Branch): string {
  if (branch.archivedAt === null) return '';
  return formatMilestoneDate(branch.archivedAt, 'day', currentTzOffset(branch.archivedAt));
}

interface ArchivedRowItemProps {
  row: ArchivedRow<Branch>;
  reason: MessageKey | null;
  onUnarchive: (branch: Branch) => void;
}

/** 归档行：行内动作收在「更多」，不依赖悬停。 */
function ArchivedRowItem({ row, reason, onUnarchive }: ArchivedRowItemProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { branch, indent, individuallyArchived } = row;

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) {
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!anchorRef.current?.contains(event.target as Node)) close(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close(true);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [close, open]);

  return (
    <li className={styles.row} data-indent={Math.min(indent, 3)}>
      <span className={styles.name} title={branch.title}>
        {branch.title}
      </span>
      <span className={styles.status}>{t(STATUS_KEYS[branch.status])}</span>
      {individuallyArchived ? (
        <span className={styles.date}>
          {t('branches.archived.archivedOn')}
          {archivedOn(branch)}
        </span>
      ) : (
        <span className={styles.inherited}>{t('branches.archived.inherited')}</span>
      )}
      <div className={styles.menuAnchor} ref={anchorRef}>
        <button
          ref={triggerRef}
          type="button"
          className={styles.more}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={t('branches.more')}
          onClick={() => setOpen((value) => !value)}
        >
          <MoreIcon size={18} />
        </button>
        {open ? (
          <div className={styles.menu} role="menu" aria-label={t('branches.more')}>
            <Link
              className={styles.menuItem}
              role="menuitem"
              to={`/history?branch=${branch.id}`}
              onClick={() => close(false)}
            >
              {t('branches.archived.viewHistory')}
            </Link>
            {individuallyArchived ? (
              <button
                type="button"
                role="menuitem"
                className={styles.menuItem}
                disabled={reason !== null}
                onClick={() => {
                  if (reason) return;
                  close(false);
                  onUnarchive(branch);
                }}
              >
                <span>{t('branches.unarchive')}</span>
                {reason ? <span className={styles.menuReason}>{t(reason)}</span> : null}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </li>
  );
}

interface ArchivedGroupSectionProps {
  group: ArchivedGroup<Branch>;
  branches: readonly Branch[];
  onUnarchive: (branch: Branch) => void;
}

function ArchivedGroupSection({ group, branches, onUnarchive }: ArchivedGroupSectionProps) {
  const [open, setOpen] = useState(true);
  const byId = new Map(branches.map((branch) => [branch.id, branch]));

  return (
    <section className={styles.group}>
      <button
        type="button"
        className={styles.groupHead}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <ChevronDownIcon size={16} /> : <ChevronRightIcon size={16} />}
        <span className={styles.groupTitle}>{group.groupTitle}</span>
        <span className={styles.groupCount}>
          {group.archivedCount}
          {t('branches.archived.countSuffix')}
        </span>
      </button>
      {open ? (
        <ul className={styles.list}>
          {group.rows.map((row) => (
            <ArchivedRowItem
              key={row.branch.id}
              row={row}
              reason={row.individuallyArchived ? unarchiveReason(row.branch, byId, branches) : null}
              onUnarchive={onUnarchive}
            />
          ))}
        </ul>
      ) : null}
    </section>
  );
}

/**
 * 归档区（S02，V1-01 OP-05）。
 *
 * 按一级分支分组；顶层只列最外层归档分支，后代作为缩进行随祖先展示，
 * 因此同一子树不会重复列出。未单独归档的后代只提供「在历程查看」。
 */
export function ArchivedBranches({ branches, onUnarchive }: ArchivedBranchesProps) {
  const groups = groupArchivedBranches(branches);
  if (groups.length === 0) return null;

  return (
    <div className={styles.stack}>
      {groups.map((group) => (
        <ArchivedGroupSection
          key={group.groupId}
          group={group}
          branches={branches}
          onUnarchive={onUnarchive}
        />
      ))}
    </div>
  );
}

import { Fragment, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { currentTzOffset } from '@/core/clock';
import { branchShadeForDepth, normalizeBranchColor } from '@/core/rules/branch-color';
import type { BranchReadonlyReason } from '@/core/rules/branch-state';
import { formatMilestoneDate } from '@/core/rules/milestone-date';
import type { Branch } from '@/data/types';
import { updateBranchGoal } from '@/data/update-branch-goal';
import { t } from '@/i18n';
import { ChevronRightIcon } from '@/ui/icons';
import { branchReadonlyKey } from './readonly';
import styles from './branch-header.module.css';

interface GoalEditorProps {
  branch: Branch;
  readonly: boolean;
}

/** 页头目标：空时占位，点击就地编辑；保存失败保留输入与编辑态。 */
function GoalEditor({ branch, readonly }: GoalEditorProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(branch.goal ?? '');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(branch.goal ?? '');
  }, [branch.goal, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const start = () => {
    setDraft(branch.goal ?? '');
    setFailed(false);
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setFailed(false);
    setDraft(branch.goal ?? '');
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setFailed(false);
    const result = await updateBranchGoal({ branchId: branch.id, goal: draft });
    setBusy(false);
    if (result.ok) setEditing(false);
    else setFailed(true);
  };

  if (!editing) {
    const text = branch.goal?.trim() ? branch.goal : t('branchDetail.goal.placeholder');
    return readonly ? (
      <p className={styles.goal} data-empty={branch.goal ? undefined : 'true'}>
        {text}
      </p>
    ) : (
      <button
        type="button"
        className={styles.goalButton}
        data-empty={branch.goal ? undefined : 'true'}
        onClick={start}
      >
        {text}
      </button>
    );
  }

  return (
    <form className={styles.goalForm} onSubmit={save}>
      <label className={styles.goalField}>
        <span className={styles.goalLabel}>{t('branchDetail.goal.edit')}</span>
        <input
          ref={inputRef}
          className={styles.goalInput}
          value={draft}
          placeholder={t('branchDetail.goal.placeholder')}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') cancel();
          }}
        />
      </label>
      {failed ? (
        <p className={styles.goalError} role="alert">
          {t('branchDetail.goal.error')}
        </p>
      ) : null}
      <div className={styles.goalActions}>
        <button type="button" className={styles.ghost} onClick={cancel} disabled={busy}>
          {t('branchDetail.goal.cancel')}
        </button>
        <button type="submit" className={styles.primary} disabled={busy}>
          {busy ? t('branchDetail.goal.saving') : t('branchDetail.goal.save')}
        </button>
      </div>
    </form>
  );
}

interface BranchHeaderProps {
  branch: Branch;
  branches: readonly Branch[];
  readonlyReason: BranchReadonlyReason | null;
}

function statusText(branch: Branch, byId: ReadonlyMap<string, Branch>): string {
  if (branch.status === 'merged') {
    const into = branch.finishedIntoId ? byId.get(branch.finishedIntoId)?.title : null;
    const date = branch.finishedAt
      ? formatMilestoneDate(branch.finishedAt, 'day', currentTzOffset(branch.finishedAt))
      : null;
    if (into) {
      return `${t('branchDetail.mergedPrefix')}${into}${t('branchDetail.mergedSuffix')}${
        date ? `${t('today.header.separator')}${date}` : ''
      }`;
    }
    return t('branches.status.merged');
  }
  if (branch.status === 'dropped') {
    const date = branch.droppedAt
      ? formatMilestoneDate(branch.droppedAt, 'day', currentTzOffset(branch.droppedAt))
      : null;
    const parts = [t('branches.status.dropped')];
    if (date) parts.push(date);
    if (branch.dropReason) parts.push(`${t('branchDetail.lastDropPrefix')}${branch.dropReason}`);
    return parts.join(t('today.header.separator'));
  }
  return t('branches.status.active');
}

/**
 * 分支详情页头（M04 OP-01 / OP-02 / OP-07）。
 *
 * 路径可点上返回；状态含合并去向与日期；目标就地编辑；
 * 只读分支只展示原因，不出现编辑入口。
 */
export function BranchHeader({ branch, branches, readonlyReason }: BranchHeaderProps) {
  const byId = new Map(branches.map((row) => [row.id, row]));
  const chain: Branch[] = [];
  let current: Branch | undefined = branch;
  let guard = 0;
  while (current && guard < 32) {
    chain.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
    guard += 1;
  }

  const color = branch.depth === 0 ? 'neutral' : normalizeBranchColor(branch.color);
  const shade = branchShadeForDepth(branch.depth);
  const active = branch.status === 'active';
  const note = `${branch.pinnedAt !== null ? t('branchDetail.status.pinned') : ''}${
    branch.archivedAt !== null
      ? `${branch.pinnedAt !== null ? t('today.header.separator') : ''}${t('branchDetail.status.archived')}`
      : ''
  }`;
  const ancestors = chain.slice(0, -1).filter((item) => item.depth > 0);

  return (
    <div className={styles.head}>
      <nav className={styles.ancestry} aria-label={t('branchDetail.breadcrumb')}>
        <Link to="/branches">{t('branchDetail.ancestry.root')}</Link>
        {ancestors.map((item) => (
          <Fragment key={item.id}>
            <ChevronRightIcon className={styles.chevron} size={13} />
            <Link to={`/branches/${item.id}`}>{item.title}</Link>
          </Fragment>
        ))}
      </nav>

      <div className={styles.titleRow}>
        <h1 className={styles.title}>{branch.title}</h1>
        <span
          className={styles.dot}
          style={{ backgroundColor: `var(--${color}-${shade})` }}
          aria-hidden="true"
        />
        {active ? (
          <span className={styles.activeChip}>
            <i className={styles.activeDot} aria-hidden="true" />
            {t('branches.status.active')}
          </span>
        ) : (
          <span className={styles.status}>{statusText(branch, byId)}</span>
        )}
        {note ? <span className={styles.statusNote}>{note}</span> : null}
      </div>

      {readonlyReason ? (
        <p className={styles.readonly} role="note">
          {t(branchReadonlyKey(readonlyReason))}
        </p>
      ) : null}

      <GoalEditor branch={branch} readonly={readonlyReason !== null} />
    </div>
  );
}

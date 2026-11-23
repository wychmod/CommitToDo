import { useEffect, useRef, useState, type FormEvent } from 'react';
import { currentTzOffset, systemClock } from '@/core/clock';
import { commitNeighbors } from '@/core/rules/commit-neighbors';
import { commitWriteState } from '@/core/rules/commit-lock';
import { formatCommitTime } from '@/core/rules/commit-time-format';
import { resolveUndoBranchId } from '@/core/rules/undo-target';
import { useCommitDetail } from '@/data/hooks';
import type { Task } from '@/data/types';
import { undoCommit } from '@/data/undo-commit';
import { updateCommit } from '@/data/update-commit';
import { t } from '@/i18n';
import { useShellStore } from '@/stores/shell.store';
import { Dialog } from '@/ui/dialog';
import { ConfirmDialog } from '@/components/today/confirm-dialog';
import styles from './commit-detail-panel.module.css';

function taskStatusKey(status: Task['status']) {
  if (status === 'done') return 'commitDetail.taskDone' as const;
  if (status === 'cancelled') return 'commitDetail.taskCancelled' as const;
  return 'commitDetail.taskOpen' as const;
}

/**
 * O03 提交详情（PRD M05）。
 *
 * 只读展示时间、原分支、文案、关联待办与前后节点；
 * 当天内可改文案、可撤销，跨天后两个入口都收起并写明原因。
 */
export function CommitDetailPanel() {
  const commitId = useShellStore((state) => state.overlayCommitId);
  const closeOverlay = useShellStore((state) => state.closeOverlay);
  const openTaskDetail = useShellStore((state) => state.openTaskDetail);
  const openCommitDetail = useShellStore((state) => state.openCommitDetail);
  const detail = useCommitDetail(commitId);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [undoFailed, setUndoFailed] = useState(false);
  const [now, setNow] = useState(() => systemClock.now());
  const undoButtonRef = useRef<HTMLButtonElement>(null);

  const commit = detail.commit;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(systemClock.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (commit && !editing) setDraft(commit.summary);
  }, [commit, editing]);

  const closeConfirm = () => {
    setConfirming(false);
    undoButtonRef.current?.focus();
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!commit || saving) return;
    setSaving(true);
    setSaveFailed(false);
    const result = await updateCommit({ commitId: commit.id, summary: draft });
    setSaving(false);
    if (result.ok) setEditing(false);
    else setSaveFailed(true);
  };

  const confirmUndo = async () => {
    if (!commit || undoing) return;
    setUndoing(true);
    setUndoFailed(false);
    const result = await undoCommit({ commitId: commit.id });
    setUndoing(false);
    setConfirming(false);
    if (!result.ok) setUndoFailed(true);
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
          <p>{t('commitDetail.loadFailed')}</p>
          <button type="button" className={styles.ghost} onClick={detail.retry}>
            {t('commitDetail.retry')}
          </button>
        </div>
      );
    }
    if (!commit) {
      return (
        <div className={styles.errorBox} role="alert">
          <p>{t('commitDetail.notFound')}</p>
          <button type="button" className={styles.ghost} onClick={closeOverlay}>
            {t('shell.close')}
          </button>
        </div>
      );
    }

    const tz = currentTzOffset(now);
    const write = commitWriteState({
      date: commit.date,
      tzOffsetMinutes: tz,
      nowMs: now,
      voided: commit.voidedAt !== null,
    });
    const byId = new Map(detail.branches.map((branch) => [branch.id, branch]));
    const source = byId.get(commit.sourceBranchId);
    const owner = byId.get(commit.branchId);
    const task = detail.task;
    const targetBranchId = task ? resolveUndoBranchId(task.branchId, byId) : null;
    const moved = task !== null && targetBranchId !== null && targetBranchId !== task.branchId;
    const neighbors = commitNeighbors(detail.siblings, commit);
    const canUndo =
      write.canUndo && task !== null && task.status === 'done' && task.deletedAt === null;

    const undoNote = canUndo
      ? null
      : task === null
        ? 'commitDetail.noTask'
        : task.status !== 'done'
          ? 'commitDetail.taskNotDone'
          : write.locked
            ? 'commitDetail.lockedNote'
            : 'commitDetail.voidedNote';

    const undoBody = moved
      ? `${t('commitDetail.undoMovePrefix')}${
          (targetBranchId && byId.get(targetBranchId)?.title) ?? targetBranchId
        }${t('commitDetail.undoMoveSuffix')}`
      : t('commitDetail.undoBody');

    return (
      <>
        <div className={styles.meta}>
          <span className={styles.time}>
            {formatCommitTime(commit.at, currentTzOffset(commit.at))}
          </span>
          <span
            className={styles.badge}
            data-voided={commit.voidedAt !== null ? 'true' : undefined}
          >
            {commit.voidedAt !== null ? t('commitDetail.voided') : t('commitDetail.valid')}
          </span>
        </div>
        {commit.voidedAt !== null ? (
          <p className={styles.note}>
            {t('commitDetail.voidedAtPrefix')}
            {formatCommitTime(commit.voidedAt, currentTzOffset(commit.voidedAt))}
          </p>
        ) : null}

        <dl className={styles.facts}>
          <div className={styles.fact}>
            <dt>{t('commitDetail.originalBranch')}</dt>
            <dd>{source?.title ?? commit.sourceBranchId}</dd>
          </div>
          {owner && owner.id !== commit.sourceBranchId ? (
            <div className={styles.fact}>
              <dt>{t('commitDetail.currentBranch')}</dt>
              <dd>{owner.title}</dd>
            </div>
          ) : null}
        </dl>

        <section className={styles.summaryBlock} aria-labelledby="commit-summary-label">
          <div className={styles.summaryHead}>
            <h3 id="commit-summary-label" className={styles.summaryLabel}>
              {t('commitDetail.editLabel')}
            </h3>
            {write.canEdit && !editing ? (
              <button
                type="button"
                className={styles.ghost}
                onClick={() => {
                  setDraft(commit.summary);
                  setSaveFailed(false);
                  setEditing(true);
                }}
              >
                {t('commitDetail.edit')}
              </button>
            ) : null}
          </div>

          {editing ? (
            <form className={styles.editForm} onSubmit={save}>
              <input
                className={styles.input}
                value={draft}
                autoFocus
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    event.stopPropagation();
                    setEditing(false);
                    setSaveFailed(false);
                  }
                }}
              />
              {saveFailed ? (
                <p className={styles.error} role="alert">
                  {t('commitDetail.saveError')}
                </p>
              ) : null}
              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.ghost}
                  onClick={() => {
                    setEditing(false);
                    setSaveFailed(false);
                  }}
                  disabled={saving}
                >
                  {t('commitDetail.cancel')}
                </button>
                <button type="submit" className={styles.primary} disabled={saving}>
                  {saving ? t('commitDetail.saving') : t('commitDetail.save')}
                </button>
              </div>
            </form>
          ) : (
            <p className={styles.summary}>{commit.summary}</p>
          )}
          {write.locked && commit.voidedAt === null ? (
            <p className={styles.note}>{t('commitDetail.lockedNote')}</p>
          ) : null}
        </section>

        <section className={styles.taskBlock} aria-label={t('commitDetail.task')}>
          <h3 className={styles.summaryLabel}>{t('commitDetail.task')}</h3>
          {task ? (
            <button
              type="button"
              className={styles.taskLink}
              onClick={() => openTaskDetail(task.id)}
            >
              <span className={styles.taskTitle}>{task.title}</span>
              <span className={styles.taskStatus}>{t(taskStatusKey(task.status))}</span>
            </button>
          ) : (
            <p className={styles.note}>{t('commitDetail.taskMissing')}</p>
          )}
        </section>

        <section className={styles.undoBlock} aria-label={t('commitDetail.undo')}>
          <button
            ref={undoButtonRef}
            type="button"
            className={styles.danger}
            disabled={!canUndo || undoing}
            onClick={() => {
              setUndoFailed(false);
              setConfirming(true);
            }}
          >
            {t('commitDetail.undo')}
          </button>
          {undoNote ? <p className={styles.note}>{t(undoNote)}</p> : null}
          {undoFailed ? (
            <div className={styles.errorBox} role="alert">
              <p>{t('commitDetail.undoFailed')}</p>
              <button
                type="button"
                className={styles.ghost}
                onClick={() => {
                  setUndoFailed(false);
                  setConfirming(true);
                }}
              >
                {t('commitDetail.retry')}
              </button>
            </div>
          ) : null}
        </section>

        <nav className={styles.neighbors} aria-label={t('commitDetail.neighbors')}>
          {neighbors.prev ? (
            <button
              type="button"
              className={styles.neighbor}
              onClick={() => openCommitDetail(neighbors.prev!.id)}
            >
              <span className={styles.neighborLabel}>{t('commitDetail.prev')}</span>
              <span className={styles.neighborSummary}>{neighbors.prev.summary}</span>
            </button>
          ) : null}
          {neighbors.next ? (
            <button
              type="button"
              className={styles.neighbor}
              onClick={() => openCommitDetail(neighbors.next!.id)}
            >
              <span className={styles.neighborLabel}>{t('commitDetail.next')}</span>
              <span className={styles.neighborSummary}>{neighbors.next.summary}</span>
            </button>
          ) : null}
        </nav>

        {confirming ? (
          <ConfirmDialog
            titleKey="commitDetail.undoTitle"
            bodyKey="commitDetail.undoBody"
            bodyText={undoBody}
            confirmKey="commitDetail.confirmUndo"
            busy={undoing}
            onConfirm={() => void confirmUndo()}
            onClose={closeConfirm}
          />
        ) : null}
      </>
    );
  };

  return (
    <Dialog
      bare
      onClose={closeOverlay}
      label={t('overlay.commit-detail.title')}
      backdropClassName={styles.backdrop}
      className={styles.panel}
    >
      <header className={styles.header}>
        <h2 className={styles.title}>{t('overlay.commit-detail.title')}</h2>
        <button type="button" className={styles.close} onClick={closeOverlay}>
          {t('shell.close')}
        </button>
      </header>
      {renderBody()}
    </Dialog>
  );
}

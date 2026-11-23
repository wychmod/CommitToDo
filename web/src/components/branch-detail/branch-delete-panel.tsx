import { useState } from 'react';
import type { DeleteBlockReason } from '@/core/rules/delete-guard';
import { deleteEmptyBranch } from '@/data/delete-empty-branch';
import { useBranchDeleteGuard } from '@/data/hooks';
import type { Branch } from '@/data/types';
import { t, type MessageKey } from '@/i18n';
import { Button } from '@/ui/button';
import { Dialog, DialogActions, DialogHeader } from '@/ui/dialog';
import styles from './branch-delete-panel.module.css';

const REASON_KEYS: Record<DeleteBlockReason, MessageKey> = {
  root: 'branchDetail.delete.reason.root',
  deleted: 'branchDetail.delete.reason.deleted',
  archived: 'branchDetail.delete.reason.archived',
  merged: 'branchDetail.delete.reason.merged',
  dropped: 'branchDetail.delete.reason.dropped',
  'has-tasks': 'branchDetail.delete.reason.tasks',
  'has-commits': 'branchDetail.delete.reason.commits',
  'has-milestones': 'branchDetail.delete.reason.milestones',
  'has-children': 'branchDetail.delete.reason.children',
  'has-history': 'branchDetail.delete.reason.history',
};

interface BranchDeletePanelProps {
  branch: Branch;
  branches: readonly Branch[];
  onClose: () => void;
  onDeleted: (parentId: string | null) => void;
}

function trailOf(target: Branch, byId: ReadonlyMap<string, Branch>): string {
  const titles: string[] = [];
  let current: Branch | undefined = target;
  let guard = 0;
  while (current && guard < 32) {
    titles.unshift(current.title);
    current = current.parentId ? byId.get(current.parentId) : undefined;
    guard += 1;
  }
  return titles.join(' / ');
}

/**
 * 删除空分支确认（B10，M08 OP-06）。
 *
 * 先检查整棵子树；不满足条件时逐条列出原因且不显示确认按钮。
 * 满足条件时写明不可恢复、不保留历史、不产生徽章；写入失败保留面板可重试。
 */
export function BranchDeletePanel({
  branch,
  branches,
  onClose,
  onDeleted,
}: BranchDeletePanelProps) {
  const view = useBranchDeleteGuard(branch.id);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const byId = new Map(branches.map((row) => [row.id, row]));
  const guard = view.guard;
  const trail = trailOf(branch, byId);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    const result = await deleteEmptyBranch({ branchId: branch.id });
    if (result.ok) {
      onDeleted(result.value.parentId);
      return;
    }
    setBusy(false);
    setFailed(true);
  };

  return (
    <Dialog onClose={onClose} busy={busy}>
      <DialogHeader title={t('branchDetail.delete.title')} />

      <p className={styles.trail}>{trail}</p>

      {view.status === 'loading' ? (
        <p className={styles.state} role="status">
          {t('branchDetail.delete.loading')}
        </p>
      ) : null}

      {view.status === 'error' ? (
        <div className={styles.blocked} role="alert">
          <p>{t('branchDetail.delete.loadFailed')}</p>
          <Button onClick={view.retry}>{t('branchDetail.retry')}</Button>
        </div>
      ) : null}

      {view.status === 'ready' && (!guard || !guard.allowed) ? (
        <div className={styles.blocked} role="alert">
          <p>{t('branchDetail.delete.blocked')}</p>
          <ul className={styles.reasons}>
            {(guard?.reasons ?? ['deleted']).map((reason) => (
              <li key={reason}>{t(REASON_KEYS[reason])}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {view.status === 'ready' && guard?.allowed ? (
        <div className={styles.warningBox}>
          <p>{t('branchDetail.delete.warning')}</p>
        </div>
      ) : null}

      {failed ? (
        <p className={styles.error} role="alert">
          {t('branchDetail.delete.failed')}
        </p>
      ) : null}

      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          {t('shell.cancel')}
        </Button>
        {view.status === 'ready' && guard?.allowed ? (
          <Button variant="danger" onClick={submit} disabled={busy}>
            {busy ? t('branches.saving') : t('branchDetail.delete.confirm')}
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}

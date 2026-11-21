import { useEffect, useState } from 'react';
import { assessUnarchive, isDropReasonValid } from '@/core/rules/branch-lifecycle';
import { assessRestoreQuota } from '@/core/rules/branch-quota';
import { archiveBranch } from '@/data/archive-branch';
import { pauseBranch } from '@/data/pause-branch';
import { unarchiveBranch } from '@/data/unarchive-branch';
import type { Branch, BranchStatus } from '@/data/types';
import { t, type MessageKey } from '@/i18n';
import styles from './branch-lifecycle-panel.module.css';

const STATUS_KEYS: Record<BranchStatus, MessageKey> = {
  active: 'branches.status.active',
  merged: 'branches.status.merged',
  dropped: 'branches.status.dropped',
};

export type BranchLifecycleMode = 'pause' | 'archive' | 'unarchive';

interface BranchLifecyclePanelProps {
  mode: BranchLifecycleMode;
  branch: Branch;
  branches: readonly Branch[];
  onClose: () => void;
  onDone: (branch: Branch) => void;
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

function titleKey(mode: BranchLifecycleMode): MessageKey {
  if (mode === 'pause') return 'branchDetail.lifecycle.pauseTitle';
  if (mode === 'archive') return 'branchDetail.lifecycle.archiveTitle';
  return 'branchDetail.lifecycle.unarchiveTitle';
}

/**
 * 放下 / 归档 / 取消归档确认面板（B08、B09、B11，V1-01 OP-01/03/04）。
 *
 * 写入失败时保留输入与选择并提示重试；取消归档在提交前先校验祖先与名额，
 * 不可用时逐条说明且不显示确认按钮。
 */
export function BranchLifecyclePanel({
  mode,
  branch,
  branches,
  onClose,
  onDone,
}: BranchLifecyclePanelProps) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [busy, onClose]);

  const byId = new Map(branches.map((row) => [row.id, row]));
  const trail = trailOf(branch, byId);
  const parent = branch.parentId ? byId.get(branch.parentId) : undefined;
  const unarchiveAssessment = mode === 'unarchive' ? assessUnarchive(branch, byId) : null;
  const quota =
    mode === 'unarchive' && parent ? assessRestoreQuota(parent.id, parent.depth, branches) : null;
  const unarchiveBlocked =
    mode === 'unarchive' && (!unarchiveAssessment?.allowed || (quota !== null && !quota.allowed));
  const reasonValid = mode !== 'pause' || isDropReasonValid(reason);

  const submit = async () => {
    if (busy || unarchiveBlocked || !reasonValid) return;
    setBusy(true);
    setFailed(false);
    const result =
      mode === 'pause'
        ? await pauseBranch({ branchId: branch.id, reason })
        : mode === 'archive'
          ? await archiveBranch({ branchId: branch.id })
          : await unarchiveBranch({ branchId: branch.id });
    if (result.ok) {
      onDone(result.value);
      return;
    }
    setBusy(false);
    setFailed(true);
  };

  const confirmLabel =
    mode === 'pause'
      ? 'branchDetail.lifecycle.pauseConfirm'
      : mode === 'archive'
        ? 'branchDetail.lifecycle.archiveConfirm'
        : 'branchDetail.lifecycle.unarchiveConfirm';
  const failedLabel =
    mode === 'pause'
      ? 'branchDetail.lifecycle.pauseFailed'
      : mode === 'archive'
        ? 'branchDetail.lifecycle.archiveFailed'
        : 'branchDetail.lifecycle.unarchiveFailed';

  return (
    <div className={styles.backdrop} role="presentation" onClick={busy ? undefined : onClose}>
      <section
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={t(titleKey(mode))}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.head}>
          <h2 className={styles.title}>{t(titleKey(mode))}</h2>
          <button type="button" className={styles.close} onClick={onClose} disabled={busy}>
            {t('shell.close')}
          </button>
        </header>

        <p className={styles.trail}>{trail}</p>

        {mode === 'pause' ? (
          <>
            <p className={styles.lead}>{t('branchDetail.lifecycle.pauseLead')}</p>
            <p className={styles.note}>{t('branchDetail.lifecycle.pauseTasks')}</p>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>
                {t('branchDetail.lifecycle.pauseReasonLabel')}
              </span>
              <textarea
                className={styles.textarea}
                value={reason}
                rows={4}
                placeholder={t('branchDetail.lifecycle.pauseReasonPlaceholder')}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
            {!reasonValid ? (
              <p className={styles.hint}>{t('branchDetail.lifecycle.pauseRequired')}</p>
            ) : null}
          </>
        ) : null}

        {mode === 'archive' ? (
          <div className={styles.facts}>
            <p>{t('branchDetail.lifecycle.archiveLeave')}</p>
            <p>{t('branchDetail.lifecycle.archiveQuota')}</p>
            <p>{t('branchDetail.lifecycle.archiveKeep')}</p>
            <p>{t('branchDetail.lifecycle.archiveReversible')}</p>
          </div>
        ) : null}

        {mode === 'unarchive' ? (
          unarchiveBlocked ? (
            <div className={styles.blocked} role="alert">
              <p>{t('branchDetail.lifecycle.unarchiveBlocked')}</p>
              <ul className={styles.reasons}>
                {unarchiveAssessment?.reason === 'ancestor-archived' ? (
                  <li>{t('branchDetail.lifecycle.ancestorArchived')}</li>
                ) : null}
                {quota !== null && !quota.allowed ? (
                  <li>{t('branchDetail.lifecycle.quotaFull')}</li>
                ) : null}
              </ul>
            </div>
          ) : (
            <div className={styles.facts}>
              <p>
                {t('branchDetail.lifecycle.unarchivePathPrefix')}
                {trail}
              </p>
              <p>
                {t('branchDetail.lifecycle.unarchiveStatusPrefix')}
                {t(STATUS_KEYS[branch.status])}
              </p>
              {quota ? (
                <p>
                  {t('branchDetail.lifecycle.unarchiveQuotaPrefix')}
                  {quota.used}
                  {t('branchDetail.lifecycle.unarchiveQuotaSuffix')}
                </p>
              ) : null}
            </div>
          )
        ) : null}

        {failed ? (
          <p className={styles.error} role="alert">
            {t(failedLabel)}
          </p>
        ) : null}

        <footer className={styles.actions}>
          <button type="button" className={styles.ghost} onClick={onClose} disabled={busy}>
            {t('shell.cancel')}
          </button>
          {!unarchiveBlocked ? (
            <button
              type="button"
              className={styles.primary}
              onClick={submit}
              disabled={busy || !reasonValid}
            >
              {busy ? t('branches.saving') : t(confirmLabel)}
            </button>
          ) : null}
        </footer>
      </section>
    </div>
  );
}

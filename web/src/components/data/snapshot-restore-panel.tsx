import { useState } from 'react';
import {
  BACKUP_COUNT_KEYS,
  isBackupRestorable,
  readBackupManifest,
  type BackupCountKey,
} from '@/core/rules/backup-manifest';
import { restoreSnapshot } from '@/data/snapshot-restore';
import type { Backup, BackupKind } from '@/data/types';
import { t, type MessageKey } from '@/i18n';
import { Button } from '@/ui/button';
import { Dialog, DialogActions, DialogHeader } from '@/ui/dialog';
import styles from './snapshot-restore-panel.module.css';

interface SnapshotRestorePanelProps {
  backup: Backup;
  onClose: () => void;
  onRestored: () => void;
}

type State = 'idle' | 'busy' | 'failed';

const KIND_LABELS: Readonly<Record<BackupKind, MessageKey>> = {
  auto: 'data.snapshot.kind.auto',
  manual: 'data.snapshot.kind.manual',
  'pre-restore': 'data.snapshot.kind.pre-restore',
  remote: 'data.snapshot.kind.remote',
};

const COUNT_LABELS: Readonly<Record<BackupCountKey, MessageKey>> = {
  branches: 'data.overview.branches',
  tasks: 'data.overview.tasks',
  commits: 'data.overview.commits',
  milestones: 'data.overview.milestones',
  badges: 'data.overview.badges',
};

/**
 * 从快照恢复面板（PRD V1-06 S08-snapshot-restore）。
 *
 * 版本或正文不可用时只显示摘要与原因，不渲染确认按钮；确认后先写恢复前副本，
 * 再整体替换。失败按 `field` 说明发生在写副本还是替换阶段。
 */
export function SnapshotRestorePanel({ backup, onClose, onRestored }: SnapshotRestorePanelProps) {
  const [state, setState] = useState<State>('idle');
  const [failure, setFailure] = useState<MessageKey | null>(null);

  const manifest = readBackupManifest(backup.payload);
  const restorable =
    isBackupRestorable(backup.schemaVersion) && isBackupRestorable(manifest?.schemaVersion ?? null);
  const counts = manifest?.counts ?? null;

  const handleRestore = async (): Promise<void> => {
    setState('busy');
    setFailure(null);
    const result = await restoreSnapshot({ backupId: backup.id });
    if (result.ok) {
      onRestored();
      return;
    }
    setState('failed');
    if (result.error.field === 'pre-restore') {
      setFailure('data.snapshot.restoreFailedPreRestore');
    } else if (result.error.field === 'replace') {
      setFailure('data.snapshot.restoreFailedReplace');
    } else if (result.error.code === 'backup.version_unsupported') {
      setFailure('data.snapshot.versionMismatch');
    } else {
      setFailure('data.snapshot.restoreInvalid');
    }
  };

  return (
    <Dialog onClose={onClose} busy={state === 'busy'} size="md">
      <DialogHeader title={t('data.snapshot.restoreTitle')} />

      <div className={styles.summary}>
        <dl className={styles.meta}>
          <dt>{t('data.snapshot.restoreTime')}</dt>
          <dd>{new Date(backup.createdAt).toLocaleString()}</dd>
          <dt>{t('data.snapshot.restoreKind')}</dt>
          <dd>{t(KIND_LABELS[backup.kind])}</dd>
          <dt>{t('data.snapshot.restoreSchema')}</dt>
          <dd>{backup.schemaVersion}</dd>
        </dl>
        {counts ? (
          <>
            <p className={styles.countsTitle}>{t('data.snapshot.restoreCounts')}</p>
            <ul className={styles.counts}>
              {BACKUP_COUNT_KEYS.map((key) => (
                <li key={key}>
                  <span>{t(COUNT_LABELS[key])}</span>
                  <strong>{counts[key]}</strong>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>

      {restorable ? (
        <div className={styles.warningBox}>
          <p>{t('data.snapshot.restoreWarningReplace')}</p>
          <p>{t('data.snapshot.restoreWarningBackup')}</p>
          <p>{t('data.snapshot.restoreWarningReload')}</p>
        </div>
      ) : (
        <p className={styles.error} role="alert">
          {isBackupRestorable(backup.schemaVersion)
            ? t('data.snapshot.restoreInvalid')
            : t('data.snapshot.versionMismatch')}
        </p>
      )}

      {failure ? (
        <p className={styles.error} role="alert">
          {t(failure)}
        </p>
      ) : null}

      <DialogActions>
        <Button onClick={onClose} disabled={state === 'busy'}>
          {t('shell.cancel')}
        </Button>
        {restorable ? (
          <Button
            variant="primary"
            onClick={() => void handleRestore()}
            disabled={state === 'busy'}
          >
            {state === 'busy' ? t('data.snapshot.restoreBusy') : t('data.snapshot.restoreConfirm')}
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}

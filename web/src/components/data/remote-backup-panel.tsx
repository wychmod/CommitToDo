import { useRef, useState } from 'react';
import { deleteRemoteBackup } from '@/data/delete-remote-backup';
import type { DataOverviewCounts } from '@/data/hooks';
import { uploadRemoteBackup } from '@/data/upload-remote-backup';
import { t, type MessageKey } from '@/i18n';
import { Button } from '@/ui/button';
import { Dialog, DialogActions, DialogHeader } from '@/ui/dialog';
import styles from './remote-backup-panel.module.css';

interface RemoteBackupPanelProps {
  mode: 'upload' | 'delete';
  counts: DataOverviewCounts;
  /** 删除模式下的异地备份 id。 */
  backupId?: string;
  onClose: () => void;
  onUploaded: () => void;
  onDeleted: () => void;
}

type State = 'confirm' | 'busy' | 'failed' | 'cancelled';

const COUNT_LABELS: Readonly<Record<keyof DataOverviewCounts, MessageKey>> = {
  branches: 'data.overview.branches',
  tasks: 'data.overview.tasks',
  commits: 'data.overview.commits',
  milestones: 'data.overview.milestones',
  badges: 'data.overview.badges',
};

/**
 * 异地备份确认与进度（PRD V1-06 OP-07）。
 *
 * 上传前必须先展示明文说明，确认后才出现进度；取消不写本机记录。
 * 删除远端包在本面板内二次确认，只影响远端文件。
 */
export function RemoteBackupPanel({
  mode,
  counts,
  backupId = '',
  onClose,
  onUploaded,
  onDeleted,
}: RemoteBackupPanelProps) {
  const [state, setState] = useState<State>('confirm');
  const [failure, setFailure] = useState<MessageKey | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const startUpload = async (): Promise<void> => {
    const controller = new AbortController();
    controllerRef.current = controller;
    setState('busy');
    setFailure(null);

    const result = await uploadRemoteBackup({ signal: controller.signal });
    controllerRef.current = null;

    if (result.ok) {
      onUploaded();
      return;
    }
    if (result.error.field === 'cancelled' || controller.signal.aborted) {
      setState('cancelled');
      setFailure('data.remote.cancelled');
      return;
    }
    setState('failed');
    setFailure('data.remote.failed');
  };

  const cancelUpload = (): void => {
    controllerRef.current?.abort();
  };

  const startDelete = async (): Promise<void> => {
    setState('busy');
    setFailure(null);
    const result = await deleteRemoteBackup({ backupId });
    if (result.ok) {
      onDeleted();
      return;
    }
    setState('failed');
    setFailure('data.snapshot.deleteFailed');
  };

  const busy = state === 'busy';
  const isUpload = mode === 'upload';

  const title = isUpload ? t('data.remote.confirmTitle') : t('data.snapshot.deleteTitle');

  return (
    <Dialog onClose={onClose} busy={busy} size="md">
      <DialogHeader title={title} />

      {isUpload ? (
        <>
          <p className={styles.hint}>{t('data.remote.confirmBody')}</p>
          <p className={styles.hint}>{t('data.remote.loginRequired')}</p>
          <ul className={styles.counts}>
            {(Object.keys(COUNT_LABELS) as Array<keyof DataOverviewCounts>).map((key) => (
              <li key={key}>
                <span>{t(COUNT_LABELS[key])}</span>
                <strong>{counts[key]}</strong>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className={styles.hint}>{t('data.snapshot.deleteBody')}</p>
      )}

      {failure ? (
        <p className={styles.error} role="alert">
          {t(failure)}
        </p>
      ) : null}

      <DialogActions>
        <Button onClick={isUpload && busy ? cancelUpload : onClose} disabled={!isUpload && busy}>
          {isUpload && busy ? t('data.remote.cancel') : t('shell.cancel')}
        </Button>
        {isUpload ? (
          <Button variant="primary" onClick={() => void startUpload()} disabled={busy}>
            {busy ? t('data.remote.uploading') : t('data.remote.confirm')}
          </Button>
        ) : (
          <Button variant="danger-outline" onClick={() => void startDelete()} disabled={busy}>
            {busy ? t('data.snapshot.deleteBusy') : t('data.snapshot.deleteConfirm')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

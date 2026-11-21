import { useRef, useState } from 'react';
import { deleteRemoteBackup } from '@/data/delete-remote-backup';
import type { DataOverviewCounts } from '@/data/hooks';
import { uploadRemoteBackup } from '@/data/upload-remote-backup';
import { t, type MessageKey } from '@/i18n';
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

  return (
    <div className={styles.backdrop} role="presentation" onClick={busy ? undefined : onClose}>
      <section
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={isUpload ? t('data.remote.confirmTitle') : t('data.snapshot.deleteTitle')}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.head}>
          <h2 className={styles.title}>
            {isUpload ? t('data.remote.confirmTitle') : t('data.snapshot.deleteTitle')}
          </h2>
          <button type="button" className={styles.close} onClick={onClose} disabled={busy}>
            {t('shell.close')}
          </button>
        </header>

        {isUpload ? (
          <>
            <p className={styles.hint}>{t('data.remote.confirmBody')}</p>
            <p className={styles.hint}>{t('data.remote.loginFree')}</p>
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

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.ghost}
            onClick={isUpload && busy ? cancelUpload : onClose}
            disabled={!isUpload && busy}
          >
            {isUpload && busy ? t('data.remote.cancel') : t('shell.cancel')}
          </button>
          {isUpload ? (
            <button
              type="button"
              className={styles.primary}
              onClick={() => void startUpload()}
              disabled={busy}
            >
              {busy ? t('data.remote.uploading') : t('data.remote.confirm')}
            </button>
          ) : (
            <button
              type="button"
              className={styles.danger}
              onClick={() => void startDelete()}
              disabled={busy}
            >
              {busy ? t('data.snapshot.deleteBusy') : t('data.snapshot.deleteConfirm')}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

import { useCallback, useState } from 'react';
import { BackButton } from '@/components/back-button';
import { ClearDataPanel } from '@/components/data/clear-data-panel';
import { downloadTextFile } from '@/components/data/export-download';
import { RestoreDataPanel } from '@/components/data/restore-data-panel';
import { RemoteBackupPanel } from '@/components/data/remote-backup-panel';
import { SnapshotRestorePanel } from '@/components/data/snapshot-restore-panel';
import { currentTzOffset, systemClock, toLocalDate } from '@/core/clock';
import { backupFreshness, isBackupRestorable } from '@/core/rules/backup-manifest';
import { anonymousDeviceName } from '@/data/cloud/device';
import { createManualBackup } from '@/data/create-manual-backup';
import { downloadRemoteBackup } from '@/data/download-remote-backup';
import { exportData } from '@/data/export-data';
import { useBackupListView, useDataOverview } from '@/data/hooks';
import type { Backup, BackupKind } from '@/data/types';
import { t, type MessageKey } from '@/i18n';
import { ONBOARDING_STORAGE_KEY, useOnboardingStore } from '@/stores/onboarding.store';
import { DeviceIcon, SvgIcon, type SvgIconProps } from '@/ui/icons';
import { PageShell } from '@/ui/page-shell';
import styles from './data-page.module.css';

const KIND_LABELS: Readonly<Record<BackupKind, MessageKey>> = {
  auto: 'data.snapshot.kind.auto',
  manual: 'data.snapshot.kind.manual',
  'pre-restore': 'data.snapshot.kind.pre-restore',
  remote: 'data.snapshot.kind.remote',
};

/** 画稿里的文件行图标，自绘内联，不引图标库。 */
function DownloadGlyph(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M12 4v10" />
      <path d="m8 10 4 4 4-4" />
      <path d="M5 19h14" />
    </SvgIcon>
  );
}

function UploadGlyph(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M12 16V6" />
      <path d="m8 9 4-4 4 4" />
      <path d="M5 19h14" />
    </SvgIcon>
  );
}

function FileGlyph(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4" />
    </SvgIcon>
  );
}

function CloudGlyph(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M7 18a4 4 0 0 1 .6-8 5.5 5.5 0 0 1 10.6 1.6A3.4 3.4 0 0 1 17.5 18Z" />
    </SvgIcon>
  );
}

/** 清空或恢复后要一起丢掉的本机 UI 状态（筛选、展开、注解已看、滚动位置与引导）。 */
function clearLocalUiState(): void {
  try {
    useOnboardingStore.getState().reset();
    window.localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    window.localStorage.removeItem('history.filter');
    for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
      const key = window.localStorage.key(index);
      if (key && key.startsWith('hint.')) window.localStorage.removeItem(key);
    }
    window.sessionStorage.removeItem('history.expanded');
    for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = window.sessionStorage.key(index);
      if (key && key.startsWith('scroll:')) window.sessionStorage.removeItem(key);
    }
  } catch {
    // 清本机 UI 状态失败不影响业务数据已恢复的结果。
  }
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/** 表格里的时间：`M.D` 与 `HH:mm` 分开，便于表头对齐。 */
function backupDayClock(at: number): { day: string; clock: string } {
  const date = new Date(at);
  return {
    day: `${date.getMonth() + 1}.${date.getDate()}`,
    clock: `${pad2(date.getHours())}:${pad2(date.getMinutes())}`,
  };
}

function isTodayAt(at: number): boolean {
  return new Date(at).toDateString() === new Date().toDateString();
}

/** 恢复前副本的时间：「M 月 D 日 HH:mm」。 */
function copyTimeLabel(at: number): string {
  const date = new Date(at);
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日 ${pad2(date.getHours())}:${pad2(
    date.getMinutes(),
  )}`;
}

/** 异地备份的日期：「M 月 D 日」。 */
function monthDayLabel(at: number): string {
  const date = new Date(at);
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日`;
}

function backupCountsLabel(backup: Backup): string {
  return `${backup.branchCount} ${t('data.snapshot.shortBranch')} · ${backup.commitCount} ${t(
    'data.snapshot.shortCommit',
  )}`;
}

type Panel =
  | { type: 'restore-file' }
  | { type: 'clear' }
  | { type: 'snapshot'; backup: Backup }
  | { type: 'remote-upload' }
  | { type: 'remote-delete'; backupId: string }
  | null;

type BusyState = 'idle' | 'busy' | 'done' | 'failed';

/**
 * P08 数据与备份（PRD M10 + V1-06，结构以画稿 p08-data 为准）。
 *
 * 两栏：左「本地备份」表格式列表（备份时间 / 备份内容 / 恢复），右栏依次是
 * 「备份文件」「上次恢复前的副本」「异地备份」；底部通栏是清空本地数据。
 * 自动行浅色区分，类型以文字标注；恢复入口只给最近一份可恢复的快照。
 */
export function DataPage() {
  const overview = useDataOverview();
  const backups = useBackupListView();
  const [panel, setPanel] = useState<Panel>(null);
  const [exportedInSession, setExportedInSession] = useState(false);
  const [exportState, setExportState] = useState<BusyState>('idle');
  const [manualState, setManualState] = useState<BusyState>('idle');
  const [remoteState, setRemoteState] = useState<BusyState>('idle');
  const [copyFailed, setCopyFailed] = useState(false);

  const runExport = useCallback(async (): Promise<boolean> => {
    setExportState('busy');
    const result = await exportData();
    if (!result.ok || !downloadTextFile(result.value.text, result.value.fileName)) {
      setExportState('failed');
      return false;
    }
    setExportState('done');
    setExportedInSession(true);
    return true;
  }, []);

  const runManualBackup = useCallback(async (): Promise<void> => {
    setManualState('busy');
    const result = await createManualBackup();
    setManualState(result.ok ? 'done' : 'failed');
  }, []);

  const handleDownload = useCallback(async (backupId: string): Promise<void> => {
    setRemoteState('busy');
    const result = await downloadRemoteBackup({ backupId });
    if (!result.ok || !downloadTextFile(result.value.text, result.value.fileName)) {
      setRemoteState('failed');
      return;
    }
    setRemoteState('done');
  }, []);

  const handleDownloadCopy = useCallback((backup: Backup): void => {
    const localDate = toLocalDate(backup.createdAt, currentTzOffset(systemClock.now()));
    const started = downloadTextFile(backup.payload, `committo-restore-copy-${localDate}.json`);
    setCopyFailed(!started);
  }, []);

  const handleRestored = useCallback(() => {
    clearLocalUiState();
    window.location.assign('/today');
  }, []);

  const handleCleared = useCallback(() => {
    clearLocalUiState();
    window.location.assign('/today');
  }, []);

  const ready = overview.status === 'ready';
  const exporting = exportState === 'busy';
  const backupsReady = backups.status === 'ready';
  const rows = backups.rows;
  const localBackups = rows.filter((row) => row.kind === 'auto' || row.kind === 'manual');
  const preRestore = rows.find((row) => row.kind === 'pre-restore') ?? null;
  const remoteBackup = rows.find((row) => row.kind === 'remote') ?? null;
  const restoreTarget = localBackups.find((row) => isBackupRestorable(row.schemaVersion)) ?? null;
  const freshness = backupFreshness(rows[0]?.createdAt ?? null, Date.now());

  return (
    <PageShell
      narrow
      titleKey="page.data.title"
      bodyKey="page.data.body"
      back={<BackButton fallbackTo="/me" />}
      action={
        <span className={styles.localTag}>
          <DeviceIcon size={16} />
          {t('data.page.localTag')}
        </span>
      }
    >
      <div className={styles.sections}>
        <div className={styles.layout}>
          <div className={styles.mainColumn}>
            <section className={styles.panel} aria-labelledby="data-snapshots">
              <header className={styles.panelHead}>
                <div>
                  <h2 id="data-snapshots" className={styles.sectionTitle}>
                    {t('data.snapshot.panelTitle')}
                  </h2>
                  <p className={styles.panelHint}>{t('data.snapshot.panelHint')}</p>
                </div>
                <button
                  type="button"
                  className={styles.quietAction}
                  onClick={() => void runManualBackup()}
                  disabled={manualState === 'busy'}
                >
                  {manualState === 'busy' ? t('data.snapshot.busy') : t('data.snapshot.action')}
                </button>
              </header>

              {manualState === 'done' ? (
                <p className={styles.noteDone} role="status">
                  {t('data.snapshot.done')}
                </p>
              ) : null}
              {manualState === 'failed' ? (
                <p className={styles.noteError} role="alert">
                  {t('data.snapshot.failed')}
                </p>
              ) : null}
              {backupsReady && rows.length > 0 && freshness.stale ? (
                <p className={styles.notice} role="status">
                  {t('data.snapshot.freshness')}
                </p>
              ) : null}

              {backups.status === 'loading' ? (
                <div className={styles.panelBody}>
                  <p className={styles.quiet} role="status">
                    {t('state.loading')}
                  </p>
                  <div className={styles.skeletonList} aria-hidden="true">
                    <span className={styles.skeletonRow} />
                    <span className={styles.skeletonRow} />
                    <span className={styles.skeletonRow} />
                  </div>
                </div>
              ) : null}
              {backups.status === 'error' ? (
                <div className={styles.errorRow} role="alert">
                  <span>{t('data.snapshot.loadFailed')}</span>
                  <button type="button" className={styles.retry} onClick={backups.retry}>
                    {t('error.retry')}
                  </button>
                </div>
              ) : null}
              {backupsReady && localBackups.length === 0 ? (
                <div className={styles.panelBody}>
                  <p className={styles.quiet}>{t('data.snapshot.empty')}</p>
                  <p className={styles.quiet}>{t('data.snapshot.emptyHint')}</p>
                </div>
              ) : null}
              {backupsReady && localBackups.length > 0 ? (
                <>
                  <div className={styles.tableHead} aria-hidden="true">
                    <span>{t('data.snapshot.colTime')}</span>
                    <span>{t('data.snapshot.colContent')}</span>
                    <span />
                  </div>
                  <ul className={styles.tableBody}>
                    {localBackups.map((backup) => {
                      const restorable = isBackupRestorable(backup.schemaVersion);
                      const { day, clock } = backupDayClock(backup.createdAt);
                      return (
                        <li
                          key={backup.id}
                          className={backup.kind === 'auto' ? styles.tableRowAuto : styles.tableRow}
                        >
                          <span className={styles.timeCell}>
                            <time
                              className={styles.time}
                              dateTime={new Date(backup.createdAt).toISOString()}
                            >
                              {day} <span className={styles.clock}>{clock}</span>
                            </time>
                            {isTodayAt(backup.createdAt) ? (
                              <span className={styles.todayTag}>{t('data.snapshot.today')}</span>
                            ) : null}
                          </span>
                          <span className={styles.summary}>
                            <span className={styles.kind}>{t(KIND_LABELS[backup.kind])}</span>
                            <span className={styles.counts}>{backupCountsLabel(backup)}</span>
                            {restorable ? null : (
                              <span className={styles.rowNote}>
                                {t('data.snapshot.versionMismatch')}
                              </span>
                            )}
                          </span>
                          <span className={styles.rowAction}>
                            {restoreTarget?.id === backup.id ? (
                              <button
                                type="button"
                                className={styles.rowButton}
                                onClick={() => setPanel({ type: 'snapshot', backup })}
                              >
                                {t('data.snapshot.restoreShort')}
                              </button>
                            ) : null}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </>
              ) : null}
            </section>
          </div>

          <div className={styles.sideColumn}>
            <section className={styles.panel} aria-labelledby="data-files">
              <header className={styles.panelHead}>
                <div>
                  <h2 id="data-files" className={styles.sectionTitle}>
                    {t('data.file.title')}
                  </h2>
                </div>
              </header>
              <div className={styles.fileRow}>
                <span className={styles.rowIcon}>
                  <DownloadGlyph size={18} />
                </span>
                <div className={styles.fileText}>
                  <strong>{t('data.file.exportTitle')}</strong>
                  <p>{t('data.file.exportHint')}</p>
                </div>
                <button
                  type="button"
                  className={`${styles.quietAction} ${styles.fileButton}`}
                  onClick={() => void runExport()}
                  disabled={!ready || !overview.hasData || exporting}
                >
                  {exporting ? t('data.export.busy') : t('data.export.action')}
                </button>
              </div>
              {exportState === 'done' ? (
                <p className={styles.noteDone} role="status">
                  {t('data.export.done')}
                </p>
              ) : null}
              {exportState === 'failed' ? (
                <p className={styles.noteError} role="alert">
                  {t('data.export.failed')}
                </p>
              ) : null}
              <div className={styles.fileRow}>
                <span className={styles.rowIcon}>
                  <UploadGlyph size={18} />
                </span>
                <div className={styles.fileText}>
                  <strong>{t('data.restore.title')}</strong>
                  <p>{t('data.file.restoreHint')}</p>
                </div>
                <button
                  type="button"
                  className={`${styles.action} ${styles.fileButton}`}
                  onClick={() => setPanel({ type: 'restore-file' })}
                >
                  {t('data.restore.action')}
                </button>
              </div>
              {ready && !overview.hasData ? (
                <p className={styles.panelNote}>{t('data.export.empty')}</p>
              ) : null}
            </section>

            <section className={styles.panel} aria-labelledby="data-copy">
              <header className={styles.panelHead}>
                <div>
                  <h2 id="data-copy" className={styles.sectionTitle}>
                    {t('data.copy.title')}
                  </h2>
                </div>
              </header>
              {preRestore ? (
                <div className={styles.fileRow}>
                  <span className={styles.rowIcon}>
                    <FileGlyph size={17} />
                  </span>
                  <div className={styles.fileText}>
                    <strong>{copyTimeLabel(preRestore.createdAt)}</strong>
                    <p>{t('data.copy.hint')}</p>
                  </div>
                  <button
                    type="button"
                    className={`${styles.quietAction} ${styles.fileButton}`}
                    onClick={() => handleDownloadCopy(preRestore)}
                  >
                    {t('data.copy.download')}
                  </button>
                </div>
              ) : (
                <div className={styles.panelBody}>
                  <p className={styles.quiet}>{t('data.copy.empty')}</p>
                </div>
              )}
              {copyFailed ? (
                <p className={styles.noteError} role="alert">
                  {t('data.copy.failed')}
                </p>
              ) : null}
            </section>

            <section className={styles.panel} aria-labelledby="data-remote">
              <header className={styles.panelHead}>
                <div>
                  <h2 id="data-remote" className={styles.sectionTitle}>
                    {t('data.remote.title')}
                  </h2>
                  <p className={styles.panelHint}>{t('data.remote.subtitle')}</p>
                </div>
              </header>
              <div className={styles.fileRow}>
                <span className={styles.rowIcon}>
                  <CloudGlyph size={17} />
                </span>
                <div className={styles.fileText}>
                  <strong>
                    {remoteBackup
                      ? `${t('data.remote.latest')} · ${monthDayLabel(remoteBackup.createdAt)}`
                      : t('data.remote.empty')}
                  </strong>
                  <p>
                    {remoteBackup
                      ? `${t('data.snapshot.remoteDevice')} · ${anonymousDeviceName()}`
                      : t('data.remote.hint')}
                  </p>
                </div>
                <button
                  type="button"
                  className={`${styles.quietAction} ${styles.fileButton}`}
                  onClick={() => setPanel({ type: 'remote-upload' })}
                >
                  {t('data.remote.upload')}
                </button>
              </div>
              {remoteBackup ? (
                <div className={styles.fileRow}>
                  <span className={styles.rowIcon}>
                    <DownloadGlyph size={16} />
                  </span>
                  <div className={styles.fileText}>
                    <strong>{t('data.remote.latestFile')}</strong>
                    <p>{t('data.snapshot.downloadHint')}</p>
                  </div>
                  <div className={styles.rowButtons}>
                    <button
                      type="button"
                      className={`${styles.quietAction} ${styles.fileButton}`}
                      onClick={() => void handleDownload(remoteBackup.id)}
                      disabled={remoteState === 'busy'}
                    >
                      {t('data.remote.download')}
                    </button>
                    <button
                      type="button"
                      className={styles.rowDanger}
                      onClick={() => setPanel({ type: 'remote-delete', backupId: remoteBackup.id })}
                    >
                      {t('data.snapshot.deleteRemote')}
                    </button>
                  </div>
                </div>
              ) : null}
              {remoteState === 'failed' ? (
                <p className={styles.noteError} role="alert">
                  {t('data.snapshot.downloadFailed')}
                </p>
              ) : null}
              {remoteState === 'done' ? (
                <p className={styles.noteDone} role="status">
                  {t('data.snapshot.downloadHint')}
                </p>
              ) : null}
            </section>
          </div>
        </div>

        <section className={styles.dangerZone} aria-labelledby="data-clear">
          <div>
            <h2 id="data-clear" className={styles.dangerTitle}>
              {t('data.clear.title')}
            </h2>
            <p className={styles.panelHint}>{t('data.clear.warning')}</p>
          </div>
          <button
            type="button"
            className={styles.dangerAction}
            onClick={() => setPanel({ type: 'clear' })}
          >
            {t('data.clear.action')}
          </button>
        </section>
      </div>

      {panel?.type === 'restore-file' ? (
        <RestoreDataPanel
          hasData={overview.hasData}
          exportedInSession={exportedInSession}
          onExport={runExport}
          onClose={() => setPanel(null)}
        />
      ) : null}

      {panel?.type === 'clear' ? (
        <ClearDataPanel
          hasData={overview.hasData}
          exportedInSession={exportedInSession}
          onExport={runExport}
          onClose={() => setPanel(null)}
          onCleared={handleCleared}
        />
      ) : null}

      {panel?.type === 'snapshot' ? (
        <SnapshotRestorePanel
          backup={panel.backup}
          onClose={() => setPanel(null)}
          onRestored={handleRestored}
        />
      ) : null}

      {panel?.type === 'remote-upload' ? (
        <RemoteBackupPanel
          mode="upload"
          counts={overview.counts}
          onClose={() => setPanel(null)}
          onUploaded={() => {
            setPanel(null);
            setRemoteState('idle');
          }}
          onDeleted={() => setPanel(null)}
        />
      ) : null}

      {panel?.type === 'remote-delete' ? (
        <RemoteBackupPanel
          mode="delete"
          counts={overview.counts}
          backupId={panel.backupId}
          onClose={() => setPanel(null)}
          onUploaded={() => setPanel(null)}
          onDeleted={() => {
            setPanel(null);
            setRemoteState('idle');
          }}
        />
      ) : null}
    </PageShell>
  );
}

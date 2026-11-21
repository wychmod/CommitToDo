import { useCallback, useState } from 'react';
import { BackButton } from '@/components/back-button';
import { ClearDataPanel } from '@/components/data/clear-data-panel';
import { downloadTextFile } from '@/components/data/export-download';
import { RestoreDataPanel } from '@/components/data/restore-data-panel';
import { RemoteBackupPanel } from '@/components/data/remote-backup-panel';
import { SnapshotRestorePanel } from '@/components/data/snapshot-restore-panel';
import { backupFreshness, isBackupRestorable } from '@/core/rules/backup-manifest';
import { anonymousDeviceName } from '@/data/cloud/device';
import { createManualBackup } from '@/data/create-manual-backup';
import { downloadRemoteBackup } from '@/data/download-remote-backup';
import { exportData } from '@/data/export-data';
import { useBackupListView, useDataOverview, type DataOverviewCounts } from '@/data/hooks';
import type { Backup, BackupKind } from '@/data/types';
import { t, type MessageKey } from '@/i18n';
import { ONBOARDING_STORAGE_KEY, useOnboardingStore } from '@/stores/onboarding.store';
import { PageShell } from '@/ui/page-shell';
import styles from './data-page.module.css';

const STATS: ReadonlyArray<{ key: keyof DataOverviewCounts; label: MessageKey }> = [
  { key: 'branches', label: 'data.overview.branches' },
  { key: 'tasks', label: 'data.overview.tasks' },
  { key: 'commits', label: 'data.overview.commits' },
  { key: 'milestones', label: 'data.overview.milestones' },
  { key: 'badges', label: 'data.overview.badges' },
];

const KIND_LABELS: Readonly<Record<BackupKind, MessageKey>> = {
  auto: 'data.snapshot.kind.auto',
  manual: 'data.snapshot.kind.manual',
  'pre-restore': 'data.snapshot.kind.pre-restore',
  remote: 'data.snapshot.kind.remote',
};

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

/** 快照时间：今天显示「今天 HH:mm」，其余显示「M-D HH:mm」。 */
function formatBackupTime(at: number): string {
  const date = new Date(at);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const clock = `${hours}:${minutes}`;
  if (date.toDateString() === new Date().toDateString()) {
    return `${t('data.snapshot.today')} ${clock}`;
  }
  return `${date.getMonth() + 1}-${date.getDate()} ${clock}`;
}

function backupCountsLabel(backup: Backup): string {
  return [
    `${backup.branchCount} ${t('data.snapshot.unitBranch')}`,
    `${backup.taskCount} ${t('data.snapshot.unitTask')}`,
    `${backup.commitCount} ${t('data.snapshot.unitCommit')}`,
  ].join(' / ');
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
 * P08 数据与备份（PRD M10 + V1-06）。
 *
 * 概览、备份列表、异地备份与文件四个区块。备份列表把自动、手动、恢复前与异地
 * 四类合成一列按时间倒序；自动行浅色区分，类型以文字标注，不分组、不截断。
 */
export function DataPage() {
  const overview = useDataOverview();
  const backups = useBackupListView();
  const [panel, setPanel] = useState<Panel>(null);
  const [exportedInSession, setExportedInSession] = useState(false);
  const [exportState, setExportState] = useState<BusyState>('idle');
  const [manualState, setManualState] = useState<BusyState>('idle');
  const [remoteState, setRemoteState] = useState<BusyState>('idle');

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
  const latestBackup = backups.rows[0] ?? null;
  const freshness = backupFreshness(latestBackup?.createdAt ?? null, Date.now());
  const remoteBackup = backups.rows.find((row) => row.kind === 'remote') ?? null;

  return (
    <PageShell
      titleKey="page.data.title"
      bodyKey="page.data.body"
      back={<BackButton fallbackTo="/me" />}
    >
      <div className={styles.sections}>
        {backupsReady && latestBackup && freshness.stale ? (
          <p className={styles.freshness} role="status">
            {t('data.snapshot.freshness')}
          </p>
        ) : null}

        <section className={styles.section} aria-labelledby="data-overview">
          <h2 id="data-overview" className={styles.sectionTitle}>
            {t('data.overview.title')}
          </h2>
          {overview.status === 'loading' ? (
            <p className={styles.quiet} role="status">
              {t('state.loading')}
            </p>
          ) : null}
          {overview.status === 'error' ? (
            <div className={styles.errorRow} role="alert">
              <span>{t('error.title')}</span>
              <button type="button" className={styles.retry} onClick={overview.retry}>
                {t('error.retry')}
              </button>
            </div>
          ) : null}
          {ready ? (
            <>
              <ul className={styles.stats}>
                {STATS.map((item) => (
                  <li key={item.key} className={styles.stat}>
                    <span className={styles.statLabel}>{t(item.label)}</span>
                    <strong className={styles.statValue}>{overview.counts[item.key]}</strong>
                  </li>
                ))}
              </ul>
              <p className={styles.quiet}>
                {t('data.overview.lastBackup')}：
                {overview.lastBackup
                  ? `${new Date(overview.lastBackup.createdAt).toLocaleString()} · ${t(
                      KIND_LABELS[overview.lastBackup.kind],
                    )}`
                  : t('data.overview.neverBackedUp')}
              </p>
              <p className={styles.quiet}>
                {t('data.overview.lastExport')}：
                {overview.lastExportAt
                  ? new Date(overview.lastExportAt).toLocaleString()
                  : t('data.overview.neverExported')}
              </p>
            </>
          ) : null}
        </section>

        <section className={styles.section} aria-labelledby="data-snapshots">
          <h2 id="data-snapshots" className={styles.sectionTitle}>
            {t('data.snapshot.title')}
          </h2>
          <button
            type="button"
            className={styles.action}
            onClick={() => void runManualBackup()}
            disabled={manualState === 'busy'}
          >
            {manualState === 'busy' ? t('data.snapshot.busy') : t('data.snapshot.action')}
          </button>
          {manualState === 'done' ? (
            <p className={styles.done} role="status">
              {t('data.snapshot.done')}
            </p>
          ) : null}
          {manualState === 'failed' ? (
            <p className={styles.error} role="alert">
              {t('data.snapshot.failed')}
            </p>
          ) : null}

          {backups.status === 'loading' ? (
            <>
              <p className={styles.quiet} role="status">
                {t('state.loading')}
              </p>
              <div className={styles.skeletonList} aria-hidden="true">
                <span className={styles.skeletonRow} />
                <span className={styles.skeletonRow} />
                <span className={styles.skeletonRow} />
              </div>
            </>
          ) : null}
          {backups.status === 'error' ? (
            <div className={styles.errorRow} role="alert">
              <span>{t('data.snapshot.loadFailed')}</span>
              <button type="button" className={styles.retry} onClick={backups.retry}>
                {t('error.retry')}
              </button>
            </div>
          ) : null}
          {backupsReady && backups.rows.length === 0 ? (
            <>
              <p className={styles.quiet}>{t('data.snapshot.empty')}</p>
              <p className={styles.quiet}>{t('data.snapshot.emptyHint')}</p>
            </>
          ) : null}
          {backupsReady && backups.rows.length > 0 ? (
            <ul className={styles.backupList}>
              {backups.rows.map((backup) => {
                const restorable = isBackupRestorable(backup.schemaVersion);
                const isRemote = backup.kind === 'remote';
                return (
                  <li
                    key={backup.id}
                    className={backup.kind === 'auto' ? styles.backupRowAuto : styles.backupRow}
                  >
                    <div className={styles.backupRowHead}>
                      <span className={styles.backupTime}>
                        {formatBackupTime(backup.createdAt)}
                      </span>
                      <span className={styles.backupKind}>{t(KIND_LABELS[backup.kind])}</span>
                    </div>
                    <p className={styles.backupCounts}>{backupCountsLabel(backup)}</p>
                    {isRemote ? (
                      <p className={styles.quiet}>
                        {t('data.snapshot.remoteDevice')} · {anonymousDeviceName()}
                      </p>
                    ) : null}
                    {!isRemote && !restorable ? (
                      <p className={styles.quiet}>{t('data.snapshot.versionMismatch')}</p>
                    ) : null}
                    <div className={styles.backupActions}>
                      {isRemote ? (
                        <>
                          <button
                            type="button"
                            className={styles.retry}
                            onClick={() => void handleDownload(backup.id)}
                            disabled={remoteState === 'busy'}
                          >
                            {t('data.snapshot.download')}
                          </button>
                          <button
                            type="button"
                            className={styles.rowDanger}
                            onClick={() => setPanel({ type: 'remote-delete', backupId: backup.id })}
                          >
                            {t('data.snapshot.deleteRemote')}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className={styles.retry}
                          onClick={() => setPanel({ type: 'snapshot', backup })}
                        >
                          {t('data.snapshot.restore')}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}
          {remoteState === 'failed' ? (
            <p className={styles.error} role="alert">
              {t('data.snapshot.downloadFailed')}
            </p>
          ) : null}
          {remoteState === 'done' ? (
            <p className={styles.done} role="status">
              {t('data.snapshot.downloadHint')}
            </p>
          ) : null}
        </section>

        <section className={styles.section} aria-labelledby="data-remote">
          <h2 id="data-remote" className={styles.sectionTitle}>
            {t('data.remote.title')}
          </h2>
          <p className={styles.quiet}>{t('data.remote.hint')}</p>
          <button
            type="button"
            className={styles.action}
            onClick={() => setPanel({ type: 'remote-upload' })}
          >
            {t('data.remote.upload')}
          </button>
          {remoteBackup ? null : <p className={styles.quiet}>{t('data.remote.empty')}</p>}
        </section>

        <section className={styles.section} aria-labelledby="data-export">
          <h2 id="data-export" className={styles.sectionTitle}>
            {t('data.export.title')}
          </h2>
          <button
            type="button"
            className={styles.action}
            onClick={() => void runExport()}
            disabled={!ready || !overview.hasData || exporting}
          >
            {exporting ? t('data.export.busy') : t('data.export.action')}
          </button>
          <p className={styles.quiet}>
            {ready && !overview.hasData ? t('data.export.empty') : t('data.export.hint')}
          </p>
          {exportState === 'done' ? (
            <p className={styles.done} role="status">
              {t('data.export.done')}
            </p>
          ) : null}
          {exportState === 'failed' ? (
            <p className={styles.error} role="alert">
              {t('data.export.failed')}
            </p>
          ) : null}
        </section>

        <section className={styles.section} aria-labelledby="data-restore">
          <h2 id="data-restore" className={styles.sectionTitle}>
            {t('data.restore.title')}
          </h2>
          <p className={styles.quiet}>{t('data.restore.hint')}</p>
          <button
            type="button"
            className={styles.action}
            onClick={() => setPanel({ type: 'restore-file' })}
          >
            {t('data.restore.action')}
          </button>
        </section>

        <section className={styles.section} aria-labelledby="data-clear">
          <h2 id="data-clear" className={styles.sectionTitle}>
            {t('data.clear.title')}
          </h2>
          <p className={styles.quiet}>{t('data.clear.warning')}</p>
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

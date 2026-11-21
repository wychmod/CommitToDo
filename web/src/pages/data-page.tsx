import { useCallback, useState } from 'react';
import { BackButton } from '@/components/back-button';
import { ClearDataPanel } from '@/components/data/clear-data-panel';
import { downloadExport } from '@/components/data/export-download';
import { RestoreDataPanel } from '@/components/data/restore-data-panel';
import { exportData } from '@/data/export-data';
import { useDataOverview, type DataOverviewCounts } from '@/data/hooks';
import { t, type MessageKey } from '@/i18n';
import { PageShell } from '@/ui/page-shell';
import styles from './data-page.module.css';

const STATS: ReadonlyArray<{ key: keyof DataOverviewCounts; label: MessageKey }> = [
  { key: 'branches', label: 'data.overview.branches' },
  { key: 'tasks', label: 'data.overview.tasks' },
  { key: 'commits', label: 'data.overview.commits' },
  { key: 'milestones', label: 'data.overview.milestones' },
  { key: 'badges', label: 'data.overview.badges' },
];

/** 清空后要一起丢掉的本机 UI 状态（筛选、展开、注解已看与滚动位置）。 */
function clearLocalUiState(): void {
  try {
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
    // 清本机 UI 状态失败不影响业务数据已清空的结果。
  }
}

type Panel = 'restore' | 'clear' | null;
type ExportState = 'idle' | 'busy' | 'done' | 'failed';

/**
 * P08 数据与备份（PRD M10）。
 *
 * 概览、导出、从文件恢复与清空四个区块；导入与清空成功后重载到今天页，
 * 恢复前的强制导出与两步确认由两个面板各自负责。
 */
export function DataPage() {
  const overview = useDataOverview();
  const [panel, setPanel] = useState<Panel>(null);
  const [exportedInSession, setExportedInSession] = useState(false);
  const [exportState, setExportState] = useState<ExportState>('idle');

  const runExport = useCallback(async (): Promise<boolean> => {
    setExportState('busy');
    const result = await exportData();
    if (!result.ok || !downloadExport(result.value)) {
      setExportState('failed');
      return false;
    }
    setExportState('done');
    setExportedInSession(true);
    return true;
  }, []);

  const handleCleared = useCallback(() => {
    clearLocalUiState();
    window.location.assign('/today');
  }, []);

  const ready = overview.status === 'ready';
  const exporting = exportState === 'busy';

  return (
    <PageShell
      titleKey="page.data.title"
      bodyKey="page.data.body"
      back={<BackButton fallbackTo="/me" />}
    >
      <div className={styles.sections}>
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
                {t('data.overview.lastExport')}：
                {overview.lastExportAt
                  ? new Date(overview.lastExportAt).toLocaleString()
                  : t('data.overview.neverExported')}
              </p>
            </>
          ) : null}
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
          <button type="button" className={styles.action} onClick={() => setPanel('restore')}>
            {t('data.restore.action')}
          </button>
        </section>

        <section className={styles.section} aria-labelledby="data-clear">
          <h2 id="data-clear" className={styles.sectionTitle}>
            {t('data.clear.title')}
          </h2>
          <p className={styles.quiet}>{t('data.clear.warning')}</p>
          <button type="button" className={styles.dangerAction} onClick={() => setPanel('clear')}>
            {t('data.clear.action')}
          </button>
        </section>
      </div>

      {panel === 'restore' ? (
        <RestoreDataPanel
          hasData={overview.hasData}
          exportedInSession={exportedInSession}
          onExport={runExport}
          onClose={() => setPanel(null)}
        />
      ) : null}

      {panel === 'clear' ? (
        <ClearDataPanel
          hasData={overview.hasData}
          exportedInSession={exportedInSession}
          onExport={runExport}
          onClose={() => setPanel(null)}
          onCleared={handleCleared}
        />
      ) : null}
    </PageShell>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { localDate } from '@/core/clock';
import { badgeHref, badgeNameKey, badgeSourceKey } from '@/components/badges/badge-presentation';
import { BadgeToken } from '@/components/badges/badge-token';
import { isBadgeBackfillSkipped } from '@/components/badges/backfill-guard';
import { BackupIcon, HelpIcon, SunIcon, TuneIcon } from '@/components/me/me-icons';
import { createManualBackup } from '@/data/create-manual-backup';
import { grantBadge } from '@/data/grant-badge';
import { useBadgeRows, useBackupListView, type BadgeListViewRow } from '@/data/hooks';
import { t } from '@/i18n';
import { ArrowIcon, ChevronRightIcon, DeviceIcon } from '@/ui/icons';
import { LoadingShell } from '@/ui/loading-shell';
import { PageShell } from '@/ui/page-shell';
import styles from './me-page.module.css';

const RECENT_BADGE_LIMIT = 4;

type BackupState = 'idle' | 'busy' | 'failed';

/** 徽章日期按画稿显示为「MM.DD」。 */
function formatBadgeDate(at: number): string {
  return localDate(at).slice(5).replace('-', '.');
}

/** 备份时间显示为「MM.DD HH:mm」。 */
function formatBackupTime(at: number): string {
  const date = new Date(at);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}.${day} ${hours}:${minutes}`;
}

function MiniBadge({ row }: { row: BadgeListViewRow }) {
  const catalogId = row.badge.catalogId;
  const content = (
    <>
      <BadgeToken catalogId={catalogId} size="md" />
      <span className={styles.miniCopy}>
        <strong className={styles.miniName}>{t(badgeNameKey(catalogId))}</strong>
        <span className={styles.miniSource}>{t(badgeSourceKey(catalogId))}</span>
        <time className={styles.miniDate} dateTime={localDate(row.badge.grantedAt)}>
          {formatBadgeDate(row.badge.grantedAt)}
        </time>
      </span>
    </>
  );

  if (row.state === 'ok' && row.jump) {
    return (
      <li>
        <Link className={styles.miniBadge} to={badgeHref(row.jump)}>
          {content}
        </Link>
      </li>
    );
  }

  return (
    <li>
      <div className={styles.miniBadge}>{content}</div>
    </li>
  );
}

/**
 * P06 我的：左侧徽章网格，右侧数据与备份卡与偏好导航。
 *
 * 结构对照 `design/source/me-data.mjs` 的 P06：徽章按获得时间倒序取最近四枚，
 * 数据卡展示最近一次手动或自动备份的时间，偏好导航指向设置的三个分区。
 */
export function MePage() {
  const view = useBadgeRows();
  const backups = useBackupListView();
  const [backupState, setBackupState] = useState<BackupState>('idle');

  // 进入「我的」时补查漏发的徽章；导入后的本次会话跳过（OP-08）。
  useEffect(() => {
    if (view.status !== 'ready') return;
    void grantBadge(undefined, { skipBackfill: isBadgeBackfillSkipped() });
  }, [view.status]);

  const recentBadges = view.rows
    .filter(
      (row, index) =>
        view.rows.findIndex((other) => other.badge.catalogId === row.badge.catalogId) === index,
    )
    .slice(0, RECENT_BADGE_LIMIT);

  // 状态行只反映本机快照；异地备份不算「本地备份已完成」。
  const latestBackup = backups.rows.find((row) => row.kind !== 'remote') ?? null;

  const runManualBackup = async (): Promise<void> => {
    setBackupState('busy');
    const result = await createManualBackup();
    setBackupState(result.ok ? 'idle' : 'failed');
  };

  const backupStatusText =
    backups.status === 'loading'
      ? t('me.data.backupLoading')
      : backups.status === 'error'
        ? t('me.data.backupUnknown')
        : latestBackup
          ? t('me.data.backupDone')
          : t('me.data.backupNone');

  return (
    <PageShell
      titleKey="page.me.title"
      bodyKey="page.me.body"
      action={
        <span className={styles.localTag}>
          <DeviceIcon size={16} />
          {t('me.localTag')}
        </span>
      }
    >
      <div className={styles.layout}>
        <section className={styles.panel} aria-labelledby="me-badges">
          <header className={styles.panelHead}>
            <div>
              <h2 id="me-badges" className={styles.panelTitle}>
                {t('me.badges.title')}
              </h2>
              <p className={styles.panelHint}>{t('me.badges.hint')}</p>
            </div>
            {view.status === 'ready' ? (
              <Link className={styles.chip} to="/me/badges" aria-label={t('badge.wall.title')}>
                {t('badge.wall.headerPrefix')} {view.wall.earnedCount} {t('me.badges.unit')}
              </Link>
            ) : null}
          </header>

          {view.status === 'loading' ? <LoadingShell /> : null}

          {view.status === 'error' ? (
            <div className={styles.inlineError} role="alert">
              <span>{t('page.me.badgeFailed')}</span>
              <button type="button" className={styles.retry} onClick={view.retry}>
                {t('error.retry')}
              </button>
            </div>
          ) : null}

          {view.status === 'ready' && recentBadges.length === 0 ? (
            <p className={styles.empty}>{t('page.me.badgeEmpty')}</p>
          ) : null}

          {view.status === 'ready' && recentBadges.length > 0 ? (
            <ul className={styles.badgeGrid}>
              {recentBadges.map((row) => (
                <MiniBadge key={row.badge.id} row={row} />
              ))}
            </ul>
          ) : null}
        </section>

        <div className={styles.side}>
          <section className={styles.panel} aria-labelledby="me-data">
            <header className={styles.panelHead}>
              <div>
                <h2 id="me-data" className={styles.panelTitle}>
                  {t('me.data.title')}
                </h2>
                <p className={styles.panelHint}>{t('me.data.hint')}</p>
              </div>
              <span className={styles.rowIcon}>
                <BackupIcon size={18} />
              </span>
            </header>

            <div className={styles.backupStatus}>
              <i
                className={
                  backups.status === 'error' || backupState === 'failed'
                    ? styles.dotFailed
                    : styles.dot
                }
              />
              <div>
                <strong>{backupStatusText}</strong>
                {latestBackup ? (
                  <time
                    className={styles.backupTime}
                    dateTime={new Date(latestBackup.createdAt).toISOString()}
                  >
                    {formatBackupTime(latestBackup.createdAt)}
                  </time>
                ) : null}
              </div>
            </div>

            {backupState === 'failed' ? (
              <p className={styles.backupError} role="alert">
                {t('me.data.backupFailed')}
              </p>
            ) : null}

            <div className={styles.cardActions}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => void runManualBackup()}
                disabled={backupState === 'busy'}
              >
                {backupState === 'busy' ? t('me.data.backupBusy') : t('me.data.backupNow')}
              </button>
              <Link className={styles.arrowLink} to="/data">
                {t('me.data.open')}
                <ArrowIcon size={16} />
              </Link>
            </div>
          </section>

          <section className={styles.panel} aria-labelledby="me-preferences">
            <header className={styles.panelHead}>
              <h2 id="me-preferences" className={styles.panelTitle}>
                {t('me.preference.title')}
              </h2>
            </header>
            <nav className={styles.nav} aria-label={t('me.preference.title')}>
              <Link className={styles.navRow} to="/settings#appearance">
                <span className={styles.rowIcon}>
                  <SunIcon size={16} />
                </span>
                <span className={styles.navCopy}>
                  <strong>{t('me.preference.appearance')}</strong>
                  <small>{t('me.preference.appearanceHint')}</small>
                </span>
                <ChevronRightIcon size={16} />
              </Link>
              <Link className={styles.navRow} to="/settings#notes">
                <span className={styles.rowIcon}>
                  <HelpIcon size={16} />
                </span>
                <span className={styles.navCopy}>
                  <strong>{t('me.preference.notes')}</strong>
                  <small>{t('me.preference.notesHint')}</small>
                </span>
                <ChevronRightIcon size={16} />
              </Link>
              <Link className={styles.navRow} to="/me/help">
                <span className={styles.rowIcon}>
                  <HelpIcon size={16} />
                </span>
                <span className={styles.navCopy}>
                  <strong>{t('page.help.title')}</strong>
                  <small>{t('help.entry.hint')}</small>
                </span>
                <ChevronRightIcon size={16} />
              </Link>
              <Link className={styles.navRow} to="/settings#about">
                <span className={styles.rowIcon}>
                  <TuneIcon size={16} />
                </span>
                <span className={styles.navCopy}>
                  <strong>{t('me.preference.about')}</strong>
                  <small>{t('me.preference.aboutHint')}</small>
                </span>
                <ChevronRightIcon size={16} />
              </Link>
            </nav>
          </section>
        </div>
      </div>
    </PageShell>
  );
}

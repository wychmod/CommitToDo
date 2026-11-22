import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { localDate } from '@/core/clock';
import {
  BADGE_CATEGORY_ORDER,
  visibleBadgeTotal,
  type BadgeCategory,
  type BadgeWallGroup,
  type BadgeWallItem,
} from '@/core/rules/badge-catalog';
import { badgeHref, badgeNameKey, badgeSourceKey } from '@/components/badges/badge-presentation';
import { BadgeToken } from '@/components/badges/badge-token';
import { useBadgeRows, type BadgeListViewRow } from '@/data/hooks';
import { t, type MessageKey } from '@/i18n';
import { LoadingShell } from '@/ui/loading-shell';
import { PageShell } from '@/ui/page-shell';
import styles from './badge-wall-page.module.css';

interface DetailRow {
  key: MessageKey;
  value: string;
}

type EarnedItem = BadgeWallItem & { earned: { id: string; grantedAt: number } };

function categoryKey(category: BadgeCategory): MessageKey {
  return `badge.category.${category}` as MessageKey;
}

/** 徽章日期按画稿显示为「MM.DD」。 */
function formatBadgeDate(at: number): string {
  return localDate(at).slice(5).replace('-', '.');
}

function hasEarned(item: BadgeWallItem): item is EarnedItem {
  return item.earned !== null;
}

function formatMonthBreakdown(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  const rows = value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const record = entry as Record<string, unknown>;
      const month = typeof record.month === 'string' ? record.month : null;
      const count = typeof record.count === 'number' ? record.count : null;
      if (!month || count === null) return null;
      return `${month} (${count})`;
    })
    .filter((entry): entry is string => entry !== null);
  return rows.length > 0 ? rows.join(' · ') : null;
}

function snapshotRows(snapshot: Record<string, unknown>): DetailRow[] {
  const rows: DetailRow[] = [];
  const pushText = (key: MessageKey, value: unknown): void => {
    if (typeof value === 'string' && value.trim().length > 0) {
      rows.push({ key, value });
    }
  };
  const pushNumber = (key: MessageKey, value: unknown): void => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      rows.push({ key, value: String(value) });
    }
  };

  pushText('badge.detail.branch', snapshot.title);
  if (!snapshot.title) pushText('badge.detail.branch', snapshot.path);
  pushText('badge.detail.parent', snapshot.parentTitle);
  pushNumber('badge.detail.commits', snapshot.commitCount);
  pushNumber('badge.detail.children', snapshot.childCount);
  pushNumber('badge.detail.days', snapshot.days);
  pushNumber('badge.detail.count', snapshot.count);
  pushNumber('badge.detail.year', snapshot.year);
  pushText('badge.detail.note', snapshot.note);
  pushText('badge.detail.reason', snapshot.dropReason);
  pushText('badge.detail.startDate', snapshot.startDate);
  pushText('badge.detail.day365', snapshot.day365);
  pushText('badge.detail.backfillDate', snapshot.backfillDate);
  pushText('badge.detail.previousDate', snapshot.previousDate);
  pushText('badge.detail.months', snapshot.month);
  if (Array.isArray(snapshot.dates)) {
    const dates = snapshot.dates.filter((entry): entry is string => typeof entry === 'string');
    if (dates.length > 0) rows.push({ key: 'badge.detail.dates', value: dates.join(' · ') });
  }

  const fromMonth = typeof snapshot.fromMonth === 'string' ? snapshot.fromMonth : null;
  const toMonth = typeof snapshot.toMonth === 'string' ? snapshot.toMonth : null;
  if (fromMonth && toMonth) {
    rows.push({ key: 'badge.detail.months', value: `${fromMonth} - ${toMonth}` });
  }
  const monthly = formatMonthBreakdown(snapshot.months);
  if (monthly) rows.push({ key: 'badge.detail.monthCount', value: monthly });

  if (Array.isArray(snapshot.branches)) {
    const branches = snapshot.branches
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const record = entry as Record<string, unknown>;
        const title = typeof record.title === 'string' ? record.title : null;
        const firstDate = typeof record.firstDate === 'string' ? record.firstDate : null;
        if (!title) return null;
        return firstDate ? `${title} ${firstDate}` : title;
      })
      .filter((entry): entry is string => entry !== null);
    if (branches.length > 0) {
      rows.push({ key: 'badge.detail.branch', value: branches.join(' · ') });
    }
  }

  return rows;
}

/** 「已获得」最近区的一枚，点击打开详情。 */
function RecentBadge({ item, onOpen }: { item: EarnedItem; onOpen: (id: string) => void }) {
  return (
    <li>
      <button type="button" className={styles.recentBadge} onClick={() => onOpen(item.earned.id)}>
        <BadgeToken catalogId={item.catalogId} size="sm" />
        <span className={styles.recentCopy}>
          <strong className={styles.recentName}>{t(badgeNameKey(item.catalogId))}</strong>
          <span className={styles.recentSource}>{t(badgeSourceKey(item.catalogId))}</span>
          <time className={styles.recentDate} dateTime={localDate(item.earned.grantedAt)}>
            {formatBadgeDate(item.earned.grantedAt)}
          </time>
        </span>
      </button>
    </li>
  );
}

/** 分类面板里的一枚瓦片：已获得带图形，未获得用空槽。 */
function WallTile({ item, onOpen }: { item: BadgeWallItem; onOpen: (id: string) => void }) {
  const name = t(badgeNameKey(item.catalogId));
  const earned = item.earned;

  if (earned) {
    return (
      <li>
        <button type="button" className={styles.tile} onClick={() => onOpen(earned.id)}>
          <BadgeToken catalogId={item.catalogId} size="sm" />
          <strong className={styles.tileName}>{name}</strong>
          <time className={styles.tileMeta} dateTime={localDate(earned.grantedAt)}>
            {formatBadgeDate(earned.grantedAt)}
          </time>
        </button>
      </li>
    );
  }

  return (
    <li className={styles.locked}>
      <span className={styles.lockedDot} aria-hidden="true" />
      <strong className={styles.tileName}>{name}</strong>
      <span className={styles.tileMeta}>
        {item.remaining !== null
          ? `${t('badge.wall.remaining')} ${item.remaining}`
          : t('badge.wall.locked')}
      </span>
    </li>
  );
}

function CategoryPanel({ group, onOpen }: { group: BadgeWallGroup; onOpen: (id: string) => void }) {
  const headingId = `wall-${group.category}`;
  const total = group.category === 'easter' ? group.earnedCount : group.total;

  return (
    <section className={styles.panel} aria-labelledby={headingId}>
      <header className={styles.panelHead}>
        <h2 id={headingId} className={styles.panelTitle}>
          {t(categoryKey(group.category))}
        </h2>
        <span className={styles.caption}>
          {group.earnedCount} / {total}
        </span>
      </header>
      <ul className={styles.grid}>
        {group.items.map((item) => (
          <WallTile key={item.catalogId} item={item} onOpen={onOpen} />
        ))}
      </ul>
    </section>
  );
}

function BadgeDetail({ row, onClose }: { row: BadgeListViewRow; onClose: () => void }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const details = useMemo(() => snapshotRows(row.badge.snapshot), [row.badge.snapshot]);
  const eventDate = row.jump?.date ?? null;

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={t('badge.detail.title')}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.dialogHead}>
          <div className={styles.dialogFeature}>
            <BadgeToken catalogId={row.badge.catalogId} size="lg" />
            <div>
              <h2 className={styles.dialogTitle}>{t(badgeNameKey(row.badge.catalogId))}</h2>
              <p className={styles.dialogCategory}>
                {t(categoryKey(row.badge.category))} · {t('badge.grantedAt')}{' '}
                {localDate(row.badge.grantedAt)}
              </p>
            </div>
          </div>
          <button type="button" className={styles.dialogClose} onClick={onClose}>
            {t('badge.detail.close')}
          </button>
        </header>

        <section className={styles.dialogSection}>
          <h3 className={styles.dialogLabel}>{t('badge.detail.why')}</h3>
          <p className={styles.dialogValue}>{t(badgeSourceKey(row.badge.catalogId))}</p>
        </section>

        {row.state !== 'ok' ? (
          <p className={styles.dialogState} role="status">
            {t(row.state === 'revoked' ? 'badge.revoked' : 'badge.missing')}
          </p>
        ) : null}

        <section className={styles.dialogSection}>
          <h3 className={styles.dialogLabel}>{t('badge.detail.snapshot')}</h3>
          {details.length > 0 ? (
            <dl className={styles.dialogList}>
              {details.map((detail, index) => (
                <div key={`${detail.key}-${index}`} className={styles.dialogItem}>
                  <dt>{t(detail.key)}</dt>
                  <dd>{detail.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </section>

        <section className={styles.dialogSection}>
          <h3 className={styles.dialogLabel}>{t('badge.detail.eventDate')}</h3>
          <p className={styles.dialogValue}>{eventDate ?? t('badge.missing')}</p>
          {row.state === 'ok' && row.jump ? (
            <Link className={styles.dialogLink} to={badgeHref(row.jump)} onClick={onClose}>
              {t('badge.viewHistory')}
            </Link>
          ) : (
            <span className={styles.dialogDisabled}>{t('badge.viewHistory')}</span>
          )}
        </section>
      </section>
    </div>
  );
}

/**
 * S06 徽章墙（PRD V1-05 OP-01 / OP-06 / §4.2–§4.3）。
 *
 * 画稿结构：左上返回、页头右侧总数 chip；正文先「已获得 · 按获得时间排列」，
 * 再按结构／时间／里程碑各一张分类面板，每面板已获得瓦片在前、未获得在后。
 * 彩蛋分类在拿到第一枚前不出现，总数也只计入已拿到的彩蛋（V2-03 §4.2）。
 */
export function BadgeWallPage() {
  const view = useBadgeRows();
  const [openId, setOpenId] = useState<string | null>(null);

  const easterEarned =
    view.wall.groups.find((entry) => entry.category === 'easter')?.earnedCount ?? 0;
  const visibleTotal = visibleBadgeTotal(view.wall);
  const categories = BADGE_CATEGORY_ORDER.filter((entry) => entry !== 'easter' || easterEarned > 0);
  const groups = categories
    .map((category) => view.wall.groups.find((group) => group.category === category))
    .filter((group): group is BadgeWallGroup => group !== undefined);

  const recent = view.wall.groups
    .flatMap((group) => group.items)
    .filter(hasEarned)
    .sort(
      (left, right) =>
        right.earned.grantedAt - left.earned.grantedAt ||
        left.catalogId.localeCompare(right.catalogId),
    );

  const openRow = openId ? view.rows.find((row) => row.badge.id === openId) : undefined;

  const close = (): void => setOpenId(null);

  return (
    <PageShell
      narrow
      titleKey="badge.wall.title"
      bodyKey="badge.wall.body"
      back={
        <Link className={styles.back} to="/me">
          {t('badge.wall.back')}
        </Link>
      }
      action={
        view.status === 'ready' ? (
          <span className={styles.chip}>
            {t('badge.wall.headerPrefix')} {view.wall.earnedCount} / {visibleTotal}
          </span>
        ) : null
      }
    >
      <div className={styles.wall}>
        {view.status === 'error' ? (
          <div className={styles.error} role="alert">
            <span>{t('badge.wall.loadFailed')}</span>
            <button type="button" className={styles.retry} onClick={view.retry}>
              {t('error.retry')}
            </button>
          </div>
        ) : null}

        {view.status === 'loading' ? <LoadingShell /> : null}

        {view.status === 'ready' && view.wall.earnedCount === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyText}>{t('badge.wall.empty')}</p>
            <Link className={styles.emptyAction} to="/today">
              {t('badge.wall.goToday')}
            </Link>
          </div>
        ) : null}

        {view.status === 'ready' && recent.length > 0 ? (
          <section className={styles.panel} aria-labelledby="wall-recent">
            <header className={styles.panelHead}>
              <h2 id="wall-recent" className={styles.panelTitle}>
                {t('badge.wall.recent')}
              </h2>
              <span className={styles.caption}>{t('badge.wall.recentOrder')}</span>
            </header>
            <ul className={styles.recentGrid}>
              {recent.map((item) => (
                <RecentBadge key={item.catalogId} item={item} onOpen={setOpenId} />
              ))}
            </ul>
          </section>
        ) : null}

        {view.status === 'ready'
          ? groups.map((group) => (
              <CategoryPanel key={group.category} group={group} onOpen={setOpenId} />
            ))
          : null}
      </div>

      {openRow ? <BadgeDetail row={openRow} onClose={close} /> : null}
    </PageShell>
  );
}

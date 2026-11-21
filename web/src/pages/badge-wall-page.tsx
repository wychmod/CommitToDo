import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { localDate } from '@/core/clock';
import {
  BADGE_CATEGORY_ORDER,
  type BadgeCategory,
  type BadgeWallItem,
} from '@/core/rules/badge-catalog';
import {
  badgeConditionKey,
  badgeHref,
  badgeNameKey,
  badgeSourceKey,
} from '@/components/badges/badge-presentation';
import { useBadgeRows, type BadgeListViewRow } from '@/data/hooks';
import { t, type MessageKey } from '@/i18n';
import { LoadingShell } from '@/ui/loading-shell';
import { PageShell } from '@/ui/page-shell';
import styles from './badge-wall-page.module.css';

interface DetailRow {
  key: MessageKey;
  value: string;
}

function categoryKey(category: BadgeCategory): MessageKey {
  return `badge.category.${category}` as MessageKey;
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

function EarnedCard({
  item,
  row,
  onOpen,
}: {
  item: BadgeWallItem;
  row: BadgeListViewRow | undefined;
  onOpen: (id: string) => void;
}) {
  if (!item.earned) return null;
  return (
    <li>
      <button type="button" className={styles.cardButton} onClick={() => onOpen(item.earned!.id)}>
        <span className={styles.cardHead}>
          <span className={styles.cardName}>{t(badgeNameKey(item.catalogId))}</span>
          <span className={styles.cardDate}>{localDate(item.earned.grantedAt)}</span>
        </span>
        <span className={styles.cardSource}>{t(badgeSourceKey(item.catalogId))}</span>
        {row?.state === 'revoked' || row?.state === 'missing' ? (
          <span className={styles.cardState}>
            {t(row.state === 'revoked' ? 'badge.revoked' : 'badge.missing')}
          </span>
        ) : null}
      </button>
    </li>
  );
}

function UnearnedCard({ item }: { item: BadgeWallItem }) {
  return (
    <li className={styles.unearned}>
      <span className={styles.cardHead}>
        <span className={styles.cardName}>{t(badgeNameKey(item.catalogId))}</span>
        {item.remaining !== null ? (
          <span className={styles.remaining}>
            {t('badge.wall.remaining')} {item.remaining}
          </span>
        ) : (
          <span className={styles.dot} aria-hidden="true" />
        )}
      </span>
      <span className={styles.cardSource}>{t(badgeConditionKey(item.catalogId))}</span>
    </li>
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
          <div>
            <h2 className={styles.dialogTitle}>{t(badgeNameKey(row.badge.catalogId))}</h2>
            <p className={styles.dialogCategory}>
              {t(categoryKey(row.badge.category))} · {t('badge.grantedAt')}{' '}
              {localDate(row.badge.grantedAt)}
            </p>
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
 * 页头显示「已获得 N / 16」；分类内已获得按授予时间倒序、未获得按目录顺序；
 * 未获得在达成度 ≥50% 时显示「还差 N」，否则灰点与条件一句话。
 */
export function BadgeWallPage() {
  const view = useBadgeRows();
  const [category, setCategory] = useState<BadgeCategory>('structure');
  const [openId, setOpenId] = useState<string | null>(null);

  const group = view.wall.groups.find((entry) => entry.category === category);
  const openRow = openId ? view.rows.find((row) => row.badge.id === openId) : undefined;

  const close = (): void => setOpenId(null);

  return (
    <PageShell titleKey="badge.wall.title" bodyKey="page.me.badges">
      <div className={styles.wall}>
        <div className={styles.headerRow}>
          <p className={styles.count}>
            {t('badge.wall.headerPrefix')} {view.wall.earnedCount} / {view.wall.total}
          </p>
          <Link className={styles.back} to="/me">
            {t('nav.back')}
          </Link>
        </div>

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

        <div className={styles.tabs} role="tablist" aria-label={t('badge.wall.title')}>
          {BADGE_CATEGORY_ORDER.map((entry) => (
            <button
              key={entry}
              type="button"
              role="tab"
              aria-selected={entry === category}
              className={entry === category ? styles.tabActive : styles.tab}
              onClick={() => setCategory(entry)}
            >
              {t(categoryKey(entry))}
            </button>
          ))}
        </div>

        {view.status === 'ready' && group ? (
          <ul className={styles.grid}>
            {group.items.map((item) =>
              item.earned ? (
                <EarnedCard
                  key={item.catalogId}
                  item={item}
                  row={view.rows.find((row) => row.badge.id === item.earned?.id)}
                  onOpen={setOpenId}
                />
              ) : (
                <UnearnedCard key={item.catalogId} item={item} />
              ),
            )}
          </ul>
        ) : null}
      </div>

      {openRow ? <BadgeDetail row={openRow} onClose={close} /> : null}
    </PageShell>
  );
}

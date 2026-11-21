import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { currentTzOffset, systemClock, today } from '@/core/clock';
import { pendingBadgeQueue } from '@/core/rules/badge-queue';
import { useBadgeRows } from '@/data/hooks';
import { t } from '@/i18n';
import { badgeHref, badgeNameKey, badgeSourceKey } from '@/components/badges/badge-presentation';
import styles from './badge-toast.module.css';

/**
 * 今天页底部的徽章轻提示（PRD M11 OP-06）。
 *
 * 只显示发放当天的徽章，一次一条；关闭后从队列里移除并露出下一条。
 * 不自动消失、不悬浮遮挡底部导航，跨天不补。
 */
export function BadgeToast() {
  const view = useBadgeRows();
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(() => new Set());

  const todayDate = today(systemClock);
  const tz = currentTzOffset(systemClock.now());

  const queue = useMemo(() => {
    if (view.status !== 'ready') return [];
    return pendingBadgeQueue(
      view.rows.map((row) => row.badge),
      todayDate,
      tz,
      dismissed,
    );
  }, [view, todayDate, tz, dismissed]);

  const current = queue[0];
  const row = current ? view.rows.find((item) => item.badge.id === current.id) : undefined;
  if (!row) return null;

  const dismiss = () => {
    setDismissed((previous) => {
      const next = new Set(previous);
      next.add(row.badge.id);
      return next;
    });
  };

  return (
    <section className={styles.toast} aria-live="polite">
      <div className={styles.text}>
        <span className={styles.kicker}>{t('badge.toast.prefix')}</span>
        <strong className={styles.name}>{t(badgeNameKey(row.badge.catalogId))}</strong>
        <span className={styles.source}>{t(badgeSourceKey(row.badge.catalogId))}</span>
      </div>
      <div className={styles.actions}>
        {row.state === 'ok' && row.jump ? (
          <Link className={styles.view} to={badgeHref(row.jump)}>
            {t('badge.viewHistory')}
          </Link>
        ) : null}
        <button type="button" className={styles.close} onClick={dismiss}>
          {t('badge.dismiss')}
        </button>
      </div>
    </section>
  );
}

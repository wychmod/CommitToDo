import { useEffect, useState } from 'react';
import { currentTzOffset, systemClock } from '@/core/clock';
import { assessReviewReminder, REVIEW_REMINDER_STORAGE_KEY } from '@/core/rules/review-reminder';
import { useSettingsState } from '@/data/hooks';
import { t } from '@/i18n';
import { useReviewStore } from '@/stores/review.store';
import styles from './review-reminder.module.css';

/** 周日 20:00 后的应用内轻提示；出现即记录日期，不写事件或系统通知。 */
export function ReviewReminder() {
  const { loaded, settings } = useSettingsState();
  const setExpanded = useReviewStore((state) => state.setExpanded);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!loaded) return;
    if (!settings.reminderEnabled) {
      setVisible(false);
      return;
    }
    const now = systemClock.now();
    let lastShownDate: string | null = null;
    try {
      lastShownDate = window.localStorage.getItem(REVIEW_REMINDER_STORAGE_KEY);
    } catch {
      lastShownDate = null;
    }
    const decision = assessReviewReminder({
      now,
      tzOffsetMinutes: currentTzOffset(now),
      enabled: settings.reminderEnabled,
      lastShownDate,
    });
    if (!decision.show) return;
    try {
      window.localStorage.setItem(REVIEW_REMINDER_STORAGE_KEY, decision.date);
    } catch {
      // 记录不可写时仍允许本次提示；刷新后多出现一次属于 PRD 可接受范围。
    }
    setVisible(true);
  }, [loaded, settings.reminderEnabled]);

  if (!visible) return null;

  const view = (): void => {
    setExpanded(true);
    setVisible(false);
    requestAnimationFrame(() => {
      const toggle = document.getElementById('week-review-toggle');
      toggle?.scrollIntoView({ block: 'nearest' });
      toggle?.focus();
    });
  };

  return (
    <aside className={styles.reminder} aria-label={t('today.reviewReminder.message')}>
      <span className={styles.message} role="status">
        {t('today.reviewReminder.message')}
      </span>
      <div className={styles.actions}>
        <button type="button" className={styles.view} onClick={view}>
          {t('today.reviewReminder.view')}
        </button>
        <button type="button" className={styles.dismiss} onClick={() => setVisible(false)}>
          {t('today.reviewReminder.dismiss')}
        </button>
      </div>
    </aside>
  );
}

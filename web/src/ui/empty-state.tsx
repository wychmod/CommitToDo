import type { ReactNode } from 'react';
import { t, type MessageKey } from '@/i18n';
import styles from './empty-state.module.css';

interface EmptyStateProps {
  /** 一句当前说明，指向本页真实可做的事。 */
  messageKey: MessageKey;
  /** 一个主行动作；不出现两个同等权重的按钮。 */
  action?: ReactNode;
}

/** 统一的页面空态（A-03）：一句说明 + 一个主行动作。 */
export function EmptyState({ messageKey, action }: EmptyStateProps) {
  return (
    <div className={styles.empty}>
      <p className={styles.message}>{t(messageKey)}</p>
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}

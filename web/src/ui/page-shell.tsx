import type { ReactNode } from 'react';
import { t, type MessageKey } from '@/i18n';
import styles from './page-shell.module.css';

interface PageShellProps {
  titleKey: MessageKey;
  bodyKey?: MessageKey;
  action?: ReactNode;
  /** 二级页的返回控件，放在页头之上。 */
  back?: ReactNode;
  children?: ReactNode;
}

/** 所有占位页共用的外壳：页头 + 内容区，不承载业务。 */
export function PageShell({ titleKey, bodyKey, action, back, children }: PageShellProps) {
  return (
    <section className={styles.page}>
      {back}
      <header className={styles.head}>
        <div>
          <h1>{t(titleKey)}</h1>
          {bodyKey ? <p>{t(bodyKey)}</p> : null}
        </div>
        {action}
      </header>
      <div className={styles.body}>
        {children ?? <p className={styles.empty}>{t('state.empty')}</p>}
      </div>
    </section>
  );
}

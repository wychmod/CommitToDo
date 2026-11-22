import type { ReactNode } from 'react';
import { t, type MessageKey } from '@/i18n';
import styles from './page-shell.module.css';

interface PageShellProps {
  titleKey?: MessageKey;
  /** 需要动态标题（如分支名）时替代 `titleKey`。 */
  title?: ReactNode;
  bodyKey?: MessageKey;
  action?: ReactNode;
  /** 二级页的返回控件，放在页头之上。 */
  back?: ReactNode;
  /** 我的/设置/数据等页在画稿里收窄到 1000px。 */
  narrow?: boolean;
  children?: ReactNode;
}

/** 所有占位页共用的外壳：页头 + 内容区，不承载业务。 */
export function PageShell({
  titleKey,
  title,
  bodyKey,
  action,
  back,
  narrow,
  children,
}: PageShellProps) {
  return (
    <section className={narrow ? `${styles.page} ${styles.pageNarrow}` : styles.page}>
      {back}
      <header className={styles.head}>
        <div>
          {title ?? (titleKey ? <h1>{t(titleKey)}</h1> : null)}
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

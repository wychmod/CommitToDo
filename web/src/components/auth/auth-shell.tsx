import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { t } from '@/i18n';
import { ArrowIcon, CheckIcon } from '@/ui/icons';
import styles from './auth-shell.module.css';

interface AuthShellProps {
  children: ReactNode;
  /** 找回密码等步骤页沿用同一外壳，左侧演示面板可关闭。 */
  promo?: boolean;
}

/**
 * 认证页外壳（P09 / P10 / P11）。
 *
 * 左侧是营销面板，右侧是表单；760 以下退化为单列表单，营销面板不进入移动端。
 * 页头保留「打开本机工作区」，未登录时也能直接回到 `/today`。
 */
export function AuthShell({ children, promo = true }: AuthShellProps) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link className={styles.brand} to="/">
            <span className={styles.brandMark} aria-hidden="true">
              C
            </span>
            {t('app.name')}
          </Link>
          <Link className={styles.local} to="/today">
            {t('auth.localWorkspace')}
            <ArrowIcon />
          </Link>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.card} data-promo={promo}>
          {promo ? (
            <aside className={styles.promo}>
              <p className={styles.promoKicker}>{t('auth.promo.kicker')}</p>
              <p className={styles.promoTitle}>
                <span className={styles.promoTitleLine}>{t('auth.promo.titleLead')}</span>
                <span className={styles.promoHighlight}>{t('auth.promo.titleHighlight')}</span>
              </p>
              <p className={styles.promoBody}>{t('auth.promo.body')}</p>

              <div className={styles.demo}>
                <div className={styles.demoHead}>
                  <span className={styles.demoTitle}>{t('auth.promo.demoTitle')}</span>
                  <span className={styles.demoBadge}>{t('auth.promo.demoBadge')}</span>
                </div>
                <ul className={styles.demoList}>
                  <li className={styles.demoRow}>
                    <span className={styles.demoCheck} aria-hidden="true">
                      <CheckIcon size={16} />
                    </span>
                    {t('auth.promo.demoRow1')}
                  </li>
                  <li className={styles.demoRow}>
                    <span className={styles.demoDot} aria-hidden="true" />
                    {t('auth.promo.demoRow2')}
                  </li>
                  <li className={styles.demoRow}>
                    <span className={styles.demoDot} aria-hidden="true" />
                    {t('auth.promo.demoRow3')}
                  </li>
                </ul>
                <div className={styles.demoReceipt}>
                  <span className={styles.demoReceiptLabel}>{t('auth.promo.receiptLabel')}</span>
                  <span className={styles.demoReceiptText}>{t('auth.promo.receiptText')}</span>
                </div>
              </div>
            </aside>
          ) : null}

          <section className={styles.panel}>{children}</section>
        </div>
      </main>

      <footer className={styles.footer}>{t('auth.footer')}</footer>
    </div>
  );
}

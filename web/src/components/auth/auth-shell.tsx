import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { t } from '@/i18n';
import { ArrowIcon, BranchIcon, CheckIcon } from '@/ui/icons';
import styles from './auth-shell.module.css';

interface AuthShellProps {
  children: ReactNode;
}

const ART_LANES = ['auth.promo.demoRow1', 'auth.promo.demoRow2', 'auth.promo.demoRow3'] as const;

const ART_DATES = ['auth.promo.date1', 'auth.promo.date2', 'auth.promo.date3'] as const;

/**
 * 认证页外壳（P09 / P10 / P11）。
 *
 * 桌面为左表单、右时间树两个独立区域；760 以下只留单列表单，
 * 页头保留「打开本机工作区」，未登录也能直接回到 `/today`。
 */
export function AuthShell({ children }: AuthShellProps) {
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
            <span>{t('auth.localWorkspace')}</span>
            <ArrowIcon size={16} />
          </Link>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.stage}>
          <section className={styles.content}>{children}</section>

          <aside className={styles.art} aria-label={t('auth.promo.demoTitle')}>
            <div className={styles.artHeading}>
              <h2>
                <span>{t('auth.promo.titleLine1')}</span>
                <span>
                  {t('auth.promo.titleLead')}
                  <span className={styles.artHighlight}>{t('auth.promo.titleHighlight')}</span>
                  {t('auth.promo.titleTail')}
                </span>
              </h2>
            </div>

            <div className={styles.artCard}>
              <div className={styles.artCardHead}>
                <span>
                  <BranchIcon size={16} />
                  {t('auth.promo.demoTitle')}
                </span>
              </div>
              <div className={styles.artAxis} aria-hidden="true">
                {ART_DATES.map((key) => (
                  <span key={key}>{t(key)}</span>
                ))}
              </div>
              <ul className={styles.artLanes}>
                {ART_LANES.map((key) => (
                  <li key={key} className={styles.artLane}>
                    <span className={styles.artLaneName}>{t(key)}</span>
                    <span className={styles.artLaneTrack} aria-hidden="true">
                      <i />
                      <i />
                      <i />
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles.artSticky} aria-hidden="true">
              <CheckIcon size={24} />
            </div>

            <div className={styles.artReceipt} aria-hidden="true">
              <span>
                <CheckIcon size={16} />
                {t('auth.promo.receiptLabel')}
              </span>
              <strong>{t('auth.promo.receiptText')}</strong>
              <small>{t('auth.promo.receiptMeta')}</small>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

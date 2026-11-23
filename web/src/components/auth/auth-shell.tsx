import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { t } from '@/i18n';
import { ArrowIcon, CheckIcon } from '@/ui/icons';
import styles from './auth-shell.module.css';

interface AuthShellProps {
  children: ReactNode;
}

function TimelineHeaderIcon() {
  return (
    <svg
      className={styles.artCardIcon}
      viewBox="0 0 24 24"
      width="22"
      height="22"
      aria-hidden="true"
      fill="none"
    >
      <path
        d="M12 7.5 6.5 16.5M12 7.5l5.5 9"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <circle
        cx="12"
        cy="5.5"
        r="2.6"
        fill="var(--panel)"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle
        cx="5.5"
        cy="17.5"
        r="2.6"
        fill="var(--panel)"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle
        cx="18.5"
        cy="17.5"
        r="2.6"
        fill="var(--panel)"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function LaneChevron({ expanded }: { expanded: boolean }) {
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" fill="none">
      {expanded ? (
        <path
          d="M2.5 4.2 6 7.8l3.5-3.6"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M4.2 2.8 8.4 6l-4.2 3.2Z"
          stroke="currentColor"
          strokeWidth="1.35"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

function StickyCheckIcon() {
  return (
    <svg viewBox="0 0 36 36" width="38" height="38" aria-hidden="true" fill="none">
      <path
        d="m8.5 19.5 6.8 6.8L27.5 10.5"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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

            <div className={styles.artCanvas}>
              <div className={styles.artCard}>
                <div className={styles.artCardHead}>
                  <TimelineHeaderIcon />
                  <span>{t('auth.promo.demoTitle')}</span>
                </div>

                <div className={styles.artChart}>
                  <div className={styles.artLabels} aria-hidden="true">
                    <span className={`${styles.artLaneLabel} ${styles.artLaneWork}`}>
                      <LaneChevron expanded />
                      {t('auth.promo.demoRow1')}
                    </span>
                    <span className={`${styles.artLaneLabel} ${styles.artLaneHealth}`}>
                      <LaneChevron expanded={false} />
                      {t('auth.promo.demoRow2')}
                    </span>
                    <span className={`${styles.artLaneLabel} ${styles.artLaneLife}`}>
                      <LaneChevron expanded={false} />
                      {t('auth.promo.demoRow3')}
                    </span>
                  </div>

                  <div className={styles.artPlot}>
                    <div className={styles.artAxis} aria-hidden="true">
                      <span className={styles.artDate1}>{t('auth.promo.date1')}</span>
                      <span className={styles.artDate2}>{t('auth.promo.date2')}</span>
                      <span className={styles.artDate3}>{t('auth.promo.date3')}</span>
                    </div>

                    <svg
                      className={styles.artGraph}
                      viewBox="0 0 620 200"
                      aria-hidden="true"
                      fill="none"
                    >
                      <line x1="56" y1="6" x2="56" y2="196" className={styles.artGuide} />
                      <line x1="303" y1="6" x2="303" y2="196" className={styles.artGuide} />
                      <line x1="608" y1="6" x2="608" y2="196" className={styles.artGuide} />

                      <line x1="0" y1="33" x2="612" y2="33" className={styles.trackWork} />
                      <path
                        d="M56 33 C76 33 84 66 112 66 H248 C276 66 283 33 303 33"
                        className={styles.trackWorkSoft}
                      />
                      <path
                        d="M303 33 C322 33 314 92 344 92 H608"
                        className={styles.trackWorkSoft}
                      />
                      <line x1="0" y1="128" x2="612" y2="128" className={styles.trackHealth} />
                      <line x1="0" y1="172" x2="612" y2="172" className={styles.trackLife} />

                      <path d="M620 98 C652 122 650 176 620 222" className={styles.artConnector} />

                      <circle cx="56" cy="33" r="6" className={styles.nodeWorkSolid} />
                      <circle cx="303" cy="33" r="6" className={styles.nodeWorkSolid} />
                      <polygon
                        points="426,25 434,33 426,41 418,33"
                        className={styles.nodeWorkSolid}
                      />

                      <circle cx="134" cy="66" r="5.5" className={styles.nodeWorkSoftSolid} />
                      <circle cx="190" cy="66" r="5.5" className={styles.nodeWorkSoftSolid} />

                      <circle cx="382" cy="92" r="5.5" className={styles.nodeWorkSoftSolid} />
                      <circle cx="496" cy="92" r="5.5" className={styles.nodeWorkSoftHollow} />

                      <circle cx="608" cy="92" r="14" className={styles.selectedHalo} />
                      <circle cx="608" cy="92" r="10" className={styles.selectedRing} />
                      <circle cx="608" cy="92" r="5.5" className={styles.selectedCore} />

                      <circle cx="84" cy="128" r="5.5" className={styles.nodeHealthHollow} />
                      <circle cx="252" cy="128" r="5.5" className={styles.nodeHealthHollow} />
                      <circle cx="478" cy="128" r="5.5" className={styles.nodeHealthHollow} />

                      <circle cx="186" cy="172" r="5.5" className={styles.nodeLifeHollow} />
                      <circle cx="402" cy="172" r="5.5" className={styles.nodeLifeHollow} />
                    </svg>
                  </div>
                </div>
              </div>

              <div className={styles.artSticky} aria-hidden="true">
                <StickyCheckIcon />
                <span className={styles.artStickyRay1} />
                <span className={styles.artStickyRay2} />
                <span className={styles.artStickyRay3} />
              </div>

              <div className={styles.artReceipt} aria-hidden="true">
                <span className={styles.artReceiptCheck}>
                  <CheckIcon size={20} />
                </span>
                <div className={styles.artReceiptBody}>
                  <span className={styles.artReceiptStatus}>{t('auth.promo.receiptLabel')}</span>
                  <strong className={styles.artReceiptTitle}>{t('auth.promo.receiptText')}</strong>
                  <small className={styles.artReceiptMeta}>{t('auth.promo.receiptMeta')}</small>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

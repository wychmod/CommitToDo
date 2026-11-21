import { Link } from 'react-router-dom';
import { t } from '@/i18n';
import styles from './home-footer.module.css';

function ArrowIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none">
      <path
        d="M3 8h9m-3.5-3.5L12 8l-3.5 3.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** 第 7 段：全页唯一实心 CTA 与页脚。 */
export function HomeFooter() {
  return (
    <>
      <section className={styles.cta}>
        <div className={styles.ctaInner}>
          <h2 className={styles.ctaTitle}>{t('home.cta.title')}</h2>
          <Link className={styles.ctaAction} to="/today">
            {t('home.cta.action')}
            <ArrowIcon />
          </Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <Link className={styles.brand} to="/">
            <span className={styles.brandMark} aria-hidden="true">
              C
            </span>
            {t('app.name')}
          </Link>

          <nav className={styles.column} aria-label={t('home.footer.product')}>
            <h3 className={styles.columnTitle}>{t('home.footer.product')}</h3>
            <ul className={styles.links}>
              <li>
                <Link className={styles.link} to="/today">
                  {t('home.footer.today')}
                </Link>
              </li>
              <li>
                <Link className={styles.link} to="/branches">
                  {t('home.footer.branches')}
                </Link>
              </li>
              <li>
                <Link className={styles.link} to="/history">
                  {t('home.footer.history')}
                </Link>
              </li>
            </ul>
          </nav>

          <nav className={styles.column} aria-label={t('home.footer.guide')}>
            <h3 className={styles.columnTitle}>{t('home.footer.guide')}</h3>
            <ul className={styles.links}>
              <li>
                <Link className={styles.link} to="/today">
                  {t('home.footer.writeTask')}
                </Link>
              </li>
              <li>
                <Link className={styles.link} to="/branches">
                  {t('home.footer.newBranch')}
                </Link>
              </li>
            </ul>
          </nav>

          <nav className={styles.column} aria-label={t('home.footer.privacy')}>
            <h3 className={styles.columnTitle}>{t('home.footer.privacy')}</h3>
            <ul className={styles.links}>
              <li>
                <Link className={styles.link} to="/data">
                  {t('home.footer.local')}
                </Link>
              </li>
              <li>
                <Link className={styles.link} to="/data">
                  {t('home.footer.export')}
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </footer>
    </>
  );
}

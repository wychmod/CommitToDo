import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { t } from '@/i18n';
import type { HomeDemo } from './use-home-demo';
import styles from './home-hero.module.css';

interface HomeHeroProps {
  demo: HomeDemo;
  onOpenReceipt: () => void;
  onLocateWorkbench: () => void;
}

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

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" fill="none">
      <path
        d="m3.5 8.5 3 3 6-7"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" fill="none">
      <circle cx="7" cy="7" r="4" stroke="currentColor" strokeWidth="1.4" />
      <path d="m10 10 3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" fill="none">
      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function SidebarMarker({ kind }: { kind: 'today' | 'branches' | 'history' }) {
  if (kind === 'branches') {
    return (
      <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" fill="none">
        <path d="M3 2v8m0-5h5m0 0V2m0 3v5" stroke="currentColor" strokeWidth="1" />
        <circle cx="3" cy="2" r="1.2" fill="var(--panel)" stroke="currentColor" />
        <circle cx="8" cy="2" r="1.2" fill="var(--panel)" stroke="currentColor" />
        <circle cx="8" cy="10" r="1.2" fill="var(--panel)" stroke="currentColor" />
      </svg>
    );
  }

  if (kind === 'history') {
    return (
      <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" fill="none">
        <path d="M1 6h10" stroke="currentColor" strokeWidth="1" />
        <circle cx="2" cy="6" r="1.2" fill="var(--panel)" stroke="currentColor" />
        <circle cx="6" cy="6" r="1.2" fill="var(--panel)" stroke="currentColor" />
        <circle cx="10" cy="6" r="1.2" fill="var(--panel)" stroke="currentColor" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" fill="none">
      <rect x="2" y="2" width="8" height="8" rx="1.5" stroke="currentColor" />
      <path d="m4 6 1.2 1.2L8 4.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

export function HomeHero({ demo, onOpenReceipt, onLocateWorkbench }: HomeHeroProps) {
  const workbenchRef = useRef<HTMLDivElement>(null);
  const { start, setVisible } = demo;

  const replayWhenDone = () => {
    if (demo.status === 'done') demo.replay();
  };

  const locateWorkbench = () => {
    replayWhenDone();
    onLocateWorkbench();
  };

  useEffect(() => {
    const element = workbenchRef.current;
    if (!element || typeof IntersectionObserver === 'undefined') {
      start();
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setVisible(entry.isIntersecting);
        if (entry.intersectionRatio >= 0.45) start();
      },
      { threshold: [0, 0.45] },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [start, setVisible]);

  const heroStyle = { '--bezel-scale': demo.frame.bezel } as CSSProperties;
  const receiptStyle: CSSProperties = demo.checked
    ? ({
        opacity: 0.35 + demo.frame.receipt * 0.65,
        '--receipt-offset': `${(1 - demo.frame.receipt) * 6}px`,
      } as CSSProperties)
    : { opacity: 0, visibility: 'hidden' };

  return (
    <section className={styles.hero} style={heroStyle} id="home-top">
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link className={styles.brand} to="/">
            <span className={styles.brandMark} aria-hidden="true">
              C
            </span>
            {t('app.name')}
          </Link>
          <nav className={styles.nav} aria-label={t('home.header.label')}>
            <a href="#home-features">{t('home.header.product')}</a>
            <a href="#home-scenes">{t('home.header.scenes')}</a>
            <a href="#home-today">{t('home.header.guide')}</a>
          </nav>
          <div className={styles.headerActions}>
            <Link className={styles.headerLogin} to="/auth/login">
              {t('home.header.login')}
            </Link>
            <Link className={styles.headerAction} to="/today">
              {t('home.header.open')}
              <ArrowIcon />
            </Link>
          </div>
        </div>
      </header>

      <div className={styles.heroInner}>
        <h1 className={styles.title} onPointerEnter={replayWhenDone}>
          <span className={styles.titleLine}>{t('home.hero.titleLead')}</span>
          <span className={styles.titleLine}>
            <span className={styles.highlight}>{t('home.hero.titleHighlight')}</span>
          </span>
        </h1>
        <p className={styles.subtitle}>{t('home.hero.subtitle')}</p>
        <div className={styles.actions}>
          <button type="button" className={styles.look} onClick={locateWorkbench}>
            {t('home.hero.look')}
            <ArrowIcon />
          </button>
        </div>

        <div className={styles.stage}>
          <div className={styles.sticky} data-checked={demo.checked} aria-hidden="true">
            <svg className={styles.stickyArtwork} viewBox="0 0 128 128" fill="none">
              <path className={styles.stickyPaper} d="M4 18 111 2l15 108-108 16L4 18Z" />
            </svg>
            <svg className={styles.stickyCheck} viewBox="0 0 24 24" fill="none">
              <path className={styles.stickyTick} d="m6 13 4 4 8-10" />
            </svg>
            <span className={styles.stickyStroke} />
            <span className={styles.stickyStrokeAlt} />
          </div>

          <div
            className={styles.window}
            ref={workbenchRef}
            id="home-workbench"
            aria-label={t('home.hero.windowLabel')}
          >
            <div className={styles.titlebar}>
              <span className={styles.windowBrand}>{t('app.name')}</span>
              <span className={styles.windowCrumb} onPointerEnter={replayWhenDone}>
                {t('home.hero.windowTitle')} / {t('home.hero.windowCrumb')}
              </span>
              <span className={styles.windowControls} aria-hidden="true">
                <SearchIcon />
                <PlusIcon />
              </span>
            </div>
            <div className={styles.windowBody}>
              <div className={styles.sidebar}>
                <span className={styles.spaceName}>{t('home.hero.space')}</span>
                <span className={styles.sidebarItemActive}>
                  <SidebarMarker kind="today" />
                  {t('home.hero.navToday')}
                </span>
                <span className={styles.sidebarItem}>
                  <SidebarMarker kind="branches" />
                  {t('home.hero.navBranches')}
                </span>
                <span className={styles.sidebarItem}>
                  <SidebarMarker kind="history" />
                  {t('home.hero.navHistory')}
                </span>
              </div>
              <div className={styles.main}>
                <div className={styles.mainHead}>
                  <h2 className={styles.mainTitle}>{t('home.hero.todayHeading')}</h2>
                  <span className={styles.mainDate}>{t('home.hero.todayDate')}</span>
                </div>
                <ul className={styles.tasks}>
                  <li className={styles.task}>
                    <span className={styles.box} aria-hidden="true" />
                    {t('home.hero.taskReview')}
                  </li>
                  <li className={styles.task}>
                    <span className={styles.box} aria-hidden="true" />
                    {t('home.hero.taskRun')}
                  </li>
                  <li className={`${styles.task} ${demo.checked ? styles.taskActive : ''}`}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={demo.checked}
                      aria-label={t('home.hero.taskToggle')}
                      className={styles.check}
                      onClick={demo.toggleCheck}
                    >
                      {demo.checked ? <CheckIcon /> : null}
                    </button>
                    {t('home.hero.taskWireframe')}
                  </li>
                  <li className={`${styles.task} ${styles.taskDone}`}>
                    <span className={`${styles.box} ${styles.boxChecked}`} aria-hidden="true">
                      <CheckIcon />
                    </span>
                    {t('home.hero.taskChapter')}
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <button
            type="button"
            className={styles.receipt}
            style={receiptStyle}
            onClick={onOpenReceipt}
            tabIndex={demo.checked ? 0 : -1}
            aria-label={t('home.hero.receiptOpen')}
            aria-hidden={!demo.checked}
          >
            <span className={styles.receiptHead}>
              <span className={styles.receiptCheck} aria-hidden="true">
                <CheckIcon />
              </span>
              {t('home.hero.receiptTitle')}
            </span>
            <span className={styles.receiptTask}>{t('home.hero.receiptTask')}</span>
            <span className={styles.receiptMeta}>{t('home.hero.receiptBranch')}</span>
            <span className={styles.receiptMeta}>{t('home.hero.receiptTime')}</span>
          </button>

          <svg
            className={styles.connector}
            viewBox="0 0 120 48"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <g style={{ clipPath: `inset(0 ${(1 - demo.frame.line) * 100}% 0 0)` }}>
              <path
                d="M2 42C48 42 52 6 118 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeDasharray="2 5"
              />
            </g>
          </svg>
        </div>
      </div>
    </section>
  );
}

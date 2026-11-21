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

function ControlIcon({ kind }: { kind: 'pause' | 'play' | 'replay' }) {
  if (kind === 'play') {
    return (
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none">
        <path d="M5 3.5v9l7-4.5-7-4.5Z" fill="currentColor" />
      </svg>
    );
  }
  if (kind === 'replay') {
    return (
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none">
        <path
          d="M3.5 8a4.5 4.5 0 1 0 1.4-3.3M3.5 3v2.6h2.6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none">
      <path
        d="M5.5 3.5v9M10.5 3.5v9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
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

export function HomeHero({ demo, onOpenReceipt, onLocateWorkbench }: HomeHeroProps) {
  const workbenchRef = useRef<HTMLDivElement>(null);
  const { start, setVisible } = demo;

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

  const control =
    demo.status === 'paused'
      ? { label: t('home.hero.resume'), kind: 'play' as const, action: demo.resume }
      : demo.status === 'done'
        ? { label: t('home.hero.replay'), kind: 'replay' as const, action: demo.replay }
        : demo.status === 'waiting'
          ? { label: t('home.hero.pause'), kind: 'pause' as const, action: demo.start }
          : { label: t('home.hero.pause'), kind: 'pause' as const, action: demo.pause };

  const heroStyle = { '--bezel-scale': demo.frame.bezel } as CSSProperties;
  const receiptStyle: CSSProperties = demo.checked
    ? {
        opacity: 0.35 + demo.frame.receipt * 0.65,
        transform: `translateY(${(1 - demo.frame.receipt) * 6}px)`,
      }
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
          <Link className={styles.headerAction} to="/today">
            {t('home.header.open')}
            <ArrowIcon />
          </Link>
        </div>
      </header>

      <div className={styles.heroInner}>
        <h1 className={styles.title}>
          <span className={styles.titleLine}>{t('home.hero.titleLead')}</span>
          <span className={styles.titleLine}>
            <span className={styles.highlight}>{t('home.hero.titleHighlight')}</span>
          </span>
        </h1>
        <p className={styles.subtitle}>{t('home.hero.subtitle')}</p>
        <div className={styles.actions}>
          <button type="button" className={styles.look} onClick={onLocateWorkbench}>
            {t('home.hero.look')}
            <ArrowIcon />
          </button>
          <button
            type="button"
            className={styles.control}
            aria-label={t('home.hero.demoLabel')}
            onClick={control.action}
          >
            <ControlIcon kind={control.kind} />
            {control.label}
          </button>
        </div>

        <div className={styles.stage}>
          <div className={styles.sticky} data-checked={demo.checked} aria-hidden="true">
            <span className={styles.stickyCheck}>
              <CheckIcon />
            </span>
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
              <span className={styles.windowBrand}>
                <span className={styles.windowDot} aria-hidden="true" />
                {t('app.name')}
              </span>
              <span className={styles.windowCrumb}>
                {t('home.hero.windowTitle')} / {t('home.hero.windowCrumb')}
              </span>
              <span className={styles.windowControls} aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            </div>
            <div className={styles.windowBody}>
              <div className={styles.sidebar}>
                <span className={styles.spaceName}>{t('home.hero.space')}</span>
                <span className={styles.sidebarItemActive}>{t('home.hero.navToday')}</span>
                <span className={styles.sidebarItem}>{t('home.hero.navBranches')}</span>
                <span className={styles.sidebarItem}>{t('home.hero.navHistory')}</span>
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

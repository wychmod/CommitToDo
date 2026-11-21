import { useState } from 'react';
import { t } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { useInView } from './use-in-view';
import styles from './home-desk.module.css';

const tasks: Array<{ label: MessageKey; done: boolean }> = [
  { label: 'home.desk.taskReview', done: false },
  { label: 'home.desk.taskPlan', done: false },
  { label: 'home.desk.taskChapter', done: true },
];

const bars = [28, 62, 44, 70, 92];

const trails: Array<{ label: MessageKey; tone: string }> = [
  { label: 'home.desk.branchWork', tone: 'coral' },
  { label: 'home.desk.branchHealth', tone: 'sky' },
  { label: 'home.desk.branchLife', tone: 'honey' },
];

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true" fill="none">
      <path
        d="m3.5 8.5 3 3 6-7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** 第 4 段：一处放下，沿路找回。两张独立产品窗，柱状图首次入视逐根生长。 */
export function HomeDesk() {
  const [done, setDone] = useState(tasks.map((task) => task.done));
  const { ref, inView } = useInView<HTMLDivElement>(0.4);

  const toggle = (index: number) => {
    setDone((current) => current.map((value, position) => (position === index ? !value : value)));
  };

  return (
    <section className={styles.section} id="home-today" aria-label={t('home.desk.label')}>
      <div className={styles.inner}>
        <h2 className={styles.title}>{t('home.desk.title')}</h2>
        <div className={styles.grid}>
          <article className={styles.card}>
            <span className={styles.eyebrow}>{t('home.desk.todayEyebrow')}</span>
            <h3 className={styles.cardTitle}>{t('home.desk.todayTitle')}</h3>
            <p className={styles.cardBody}>{t('home.desk.todayBody')}</p>
            <div className={styles.panel}>
              <ul className={styles.checklist}>
                {tasks.map((task, index) => (
                  <li key={task.label}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={done[index]}
                      className={styles.checkRow}
                      onClick={() => toggle(index)}
                    >
                      <span
                        className={`${styles.checkBox} ${done[index] ? styles.checkBoxDone : ''}`}
                        aria-hidden="true"
                      >
                        {done[index] ? <CheckIcon /> : null}
                      </span>
                      <span className={done[index] ? styles.doneText : styles.taskText}>
                        {t(task.label)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className={styles.hint}>{t('home.desk.taskDoneHint')}</p>
            </div>
          </article>

          <article className={styles.card}>
            <span className={styles.eyebrow}>{t('home.desk.historyEyebrow')}</span>
            <h3 className={styles.cardTitle}>{t('home.desk.historyTitle')}</h3>
            <p className={styles.cardBody}>{t('home.desk.historyBody')}</p>
            <div className={styles.panel}>
              <div
                className={styles.chart}
                ref={ref}
                data-inview={inView}
                role="img"
                aria-label={t('home.desk.chartLabel')}
              >
                {bars.map((height, index) => (
                  <span
                    key={index}
                    className={styles.bar}
                    style={{ height: `${height}%` }}
                    aria-hidden="true"
                  />
                ))}
              </div>
            </div>
          </article>

          <article className={styles.card} id="home-branch">
            <span className={styles.eyebrow}>{t('home.desk.branchEyebrow')}</span>
            <h3 className={styles.cardTitle}>{t('home.desk.branchTitle')}</h3>
            <p className={styles.cardBody}>{t('home.desk.branchBody')}</p>
            <div className={styles.panel}>
              <svg
                className={styles.branchDiagram}
                viewBox="0 0 320 120"
                role="img"
                aria-label={t('home.desk.branchDiagram')}
              >
                <path
                  className={styles.workLine}
                  d="M12 30h296"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  className={styles.workLineMid}
                  d="M64 30c0 26 4 32 30 32h58c26 0 30 10 30 28"
                  fill="none"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  className={styles.workLineSoft}
                  d="M214 30c0 20 4 24 24 24h78"
                  fill="none"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  className={styles.healthLine}
                  d="M12 90h296"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <circle className={styles.workNode} cx="64" cy="30" r="4" />
                <circle className={styles.workNodeMid} cx="112" cy="62" r="4" />
                <circle className={styles.workNodeMid} cx="182" cy="90" r="4" />
                <circle className={styles.workNodeSoft} cx="238" cy="54" r="4" />
                <circle className={styles.healthNode} cx="86" cy="90" r="4" />
                <circle className={styles.healthNode} cx="196" cy="90" r="4" />
              </svg>
            </div>
          </article>

          <article className={styles.card}>
            <span className={styles.eyebrow}>{t('home.desk.meEyebrow')}</span>
            <div className={styles.panel}>
              <ul className={styles.trails}>
                {trails.map((trail) => (
                  <li key={trail.label} className={styles.trail}>
                    <span className={styles.trailDot} data-tone={trail.tone} aria-hidden="true" />
                    {t(trail.label)}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

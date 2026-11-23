import { useState } from 'react';
import { t } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { CheckIcon } from '@/ui/icons';
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

/** 第 4 段：一处放下，沿路找回。两张清单窗与一个分支树窗。 */
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
          <article className={`${styles.card} ${styles.todayCard}`}>
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
                        {done[index] ? <CheckIcon size={12} /> : null}
                      </span>
                      <span className={done[index] ? styles.doneText : styles.taskText}>
                        {t(task.label)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </article>

          <article className={`${styles.card} ${styles.historyCard}`}>
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

          <article className={`${styles.card} ${styles.branchCard}`} id="home-branch">
            <div className={styles.branchCopy}>
              <span className={styles.eyebrow}>{t('home.desk.branchEyebrow')}</span>
              <h3 className={styles.cardTitle}>{t('home.desk.branchTitle')}</h3>
              <p className={styles.cardBody}>{t('home.desk.branchBody')}</p>
            </div>
            <div
              className={styles.branchPanel}
              role="img"
              aria-label={t('home.desk.branchDiagram')}
            >
              <div className={styles.branchRoot}>
                <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" fill="none">
                  <path
                    d="m2 4 4 4 4-4"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>{t('home.desk.meEyebrow')}</span>
              </div>
              <ul className={styles.trails}>
                {trails.map((trail, index) => (
                  <li key={trail.label} className={styles.trail} data-tone={trail.tone}>
                    <span className={styles.branchGlyph} aria-hidden="true">
                      <svg viewBox="0 0 12 18" width="12" height="18" fill="none">
                        <path
                          d={index === trails.length - 1 ? 'M3 0v9h7' : 'M3 0v18M3 9h7'}
                          stroke="currentColor"
                          strokeWidth="1"
                        />
                      </svg>
                    </span>
                    <span className={styles.trailDot} aria-hidden="true" />
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

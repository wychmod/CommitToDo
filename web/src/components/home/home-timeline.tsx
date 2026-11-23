import { useEffect } from 'react';
import { t } from '@/i18n';
import { MergeIcon } from '@/ui/icons';
import { useInView } from './use-in-view';
import styles from './home-timeline.module.css';

interface HomeTimelineProps {
  checked: boolean;
  onOpenNode: () => void;
  onFirstView: () => void;
}

const rows = {
  work: 21.5,
  research: 37.5,
  design: 53.5,
  health: 72.5,
  life: 91,
};

const dates = {
  firstCommit: 8,
  merge: 51.2,
  milestone: 70.8,
  researchFirst: 21,
  researchSecond: 32,
  designFirst: 64,
  shared: 78.2,
  healthFirst: 13.3,
  healthSecond: 42.7,
  lifeFirst: 30.8,
  lifeSecond: 67.6,
  selected: 97.1,
};

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 12 12"
      width="10"
      height="10"
      aria-hidden="true"
      fill="none"
      className={styles.chevron}
      data-open={open}
    >
      <path
        d={open ? 'M2 4.5 6 8.5l4-4' : 'M4.5 2 8.5 6l-4 4'}
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TimelineIcon() {
  return (
    <svg viewBox="0 0 18 18" width="20" height="20" aria-hidden="true" fill="none">
      <path d="M4 9h4m0 0V4h5m-5 5v5h5" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="3.5" cy="9" r="1.5" fill="var(--panel)" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="14" cy="4" r="1.5" fill="var(--panel)" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="14" cy="14" r="1.5" fill="var(--panel)" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none">
      <rect
        x="2.5"
        y="3.5"
        width="11"
        height="10"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M5 2v3m6-3v3M3 6.5h10"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * 第 5 段：时间树。三条一级泳道、分叉与合回、选中的示例节点。
 * 线只在演示窗内出现，随区块结束收束。
 */
export function HomeTimeline({ checked, onOpenNode, onFirstView }: HomeTimelineProps) {
  const { ref, inView } = useInView<HTMLDivElement>(0.35);

  useEffect(() => {
    if (inView) onFirstView();
  }, [inView, onFirstView]);

  return (
    <section className={styles.section} id="home-history">
      <div className={styles.inner}>
        <h2 className={styles.title}>{t('home.timeline.title')}</h2>
        <p className={styles.body}>{t('home.timeline.body')}</p>

        <div className={styles.window}>
          <div className={styles.windowHead}>
            <span className={styles.windowTitle}>
              <TimelineIcon />
              {t('home.timeline.header')}
            </span>
            <span className={styles.range}>
              <CalendarIcon />
              {t('home.timeline.range')}
              <Chevron open={false} />
            </span>
          </div>

          <div className={styles.chart} ref={ref} data-inview={inView} data-selected={checked}>
            <div className={styles.labels} aria-hidden="true">
              <svg
                className={styles.labelConnectors}
                viewBox="0 0 232 300"
                preserveAspectRatio="none"
              >
                <path d="M52 78V160.5H72M52 112.5H72" />
              </svg>
              <span className={styles.laneLabel} style={{ top: `${rows.work}%` }}>
                <Chevron open />
                {t('home.timeline.work')}
              </span>
              <span
                className={`${styles.laneLabel} ${styles.child}`}
                style={{ top: `${rows.research}%` }}
              >
                {t('home.timeline.research')}
              </span>
              <span
                className={`${styles.laneLabel} ${styles.child}`}
                style={{ top: `${rows.design}%` }}
              >
                {t('home.timeline.design')}
              </span>
              <span className={styles.laneLabel} style={{ top: `${rows.health}%` }}>
                <Chevron open={false} />
                {t('home.timeline.health')}
              </span>
              <span className={styles.laneLabel} style={{ top: `${rows.life}%` }}>
                <Chevron open={false} />
                {t('home.timeline.life')}
              </span>
            </div>

            <div className={styles.scroll}>
              <div className={styles.plot}>
                <div className={styles.axis} aria-hidden="true">
                  <span>11.06</span>
                  <span>11.13</span>
                  <span>11.20</span>
                </div>
                <span className={styles.mergeBand} aria-hidden="true" />

                <span
                  className={`${styles.lane} ${styles.laneWork}`}
                  style={{ top: `${rows.work}%` }}
                  aria-hidden="true"
                />
                <span
                  className={`${styles.lane} ${styles.laneHealth}`}
                  style={{ top: `${rows.health}%` }}
                  aria-hidden="true"
                />
                <span
                  className={`${styles.lane} ${styles.laneLife}`}
                  style={{ top: `${rows.life}%` }}
                  aria-hidden="true"
                />

                <svg
                  className={styles.curves}
                  viewBox="0 0 1000 300"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path
                    className={`${styles.curve} ${styles.curveResearch}`}
                    pathLength={1}
                    d="M80 64.5C98 64.5 112 112.5 144 112.5H446C474 112.5 486 64.5 512 64.5"
                  />
                  <path
                    className={`${styles.curve} ${styles.curveDesign}`}
                    pathLength={1}
                    d="M512 64.5C530 64.5 534 160.5 566 160.5H971"
                  />
                </svg>

                <span
                  className={styles.node}
                  style={{ left: `${dates.firstCommit}%`, top: `${rows.work}%` }}
                  data-kind="solid"
                  data-tone="coral"
                  aria-hidden="true"
                />
                <span
                  className={styles.node}
                  style={{ left: `${dates.merge}%`, top: `${rows.work}%` }}
                  data-kind="solid"
                  data-tone="coral"
                  aria-hidden="true"
                />
                <span
                  className={styles.milestone}
                  style={{ left: `${dates.milestone}%`, top: `${rows.work}%` }}
                  aria-hidden="true"
                />

                <span
                  className={styles.node}
                  style={{ left: `${dates.researchFirst}%`, top: `${rows.research}%` }}
                  data-kind="solid"
                  data-tone="coralSoft"
                  aria-hidden="true"
                />
                <span
                  className={styles.node}
                  style={{ left: `${dates.researchSecond}%`, top: `${rows.research}%` }}
                  data-kind="solid"
                  data-tone="coralSoft"
                  aria-hidden="true"
                />

                <span
                  className={styles.node}
                  style={{ left: `${dates.designFirst}%`, top: `${rows.design}%` }}
                  data-kind="solid"
                  data-tone="coralSoft"
                  aria-hidden="true"
                />
                <span
                  className={styles.node}
                  style={{ left: `${dates.shared}%`, top: `${rows.design}%` }}
                  data-kind="hollow"
                  data-tone="coralSoft"
                  aria-hidden="true"
                />

                <span
                  className={styles.node}
                  style={{ left: `${dates.healthFirst}%`, top: `${rows.health}%` }}
                  data-kind="hollow"
                  data-tone="sky"
                  aria-hidden="true"
                />
                <span
                  className={styles.node}
                  style={{ left: `${dates.healthSecond}%`, top: `${rows.health}%` }}
                  data-kind="hollow"
                  data-tone="sky"
                  aria-hidden="true"
                />
                <span
                  className={styles.node}
                  style={{ left: `${dates.shared}%`, top: `${rows.health}%` }}
                  data-kind="hollow"
                  data-tone="sky"
                  aria-hidden="true"
                />

                <span
                  className={styles.node}
                  style={{ left: `${dates.lifeFirst}%`, top: `${rows.life}%` }}
                  data-kind="hollow"
                  data-tone="honey"
                  aria-hidden="true"
                />
                <span
                  className={styles.node}
                  style={{ left: `${dates.lifeSecond}%`, top: `${rows.life}%` }}
                  data-kind="hollow"
                  data-tone="honey"
                  aria-hidden="true"
                />

                <span
                  className={styles.mergeDot}
                  style={{ left: `${dates.merge}%`, top: `${rows.work}%` }}
                  aria-hidden="true"
                />

                <button
                  type="button"
                  className={styles.demoNode}
                  style={{ left: `${dates.selected}%`, top: `${rows.design}%` }}
                  onClick={onOpenNode}
                  aria-label={t('home.timeline.demoNodeLabel')}
                >
                  <span className={styles.nodeTag} data-visible={checked}>
                    {t('home.timeline.demoNode')}
                  </span>
                  <span className={styles.demoDot} data-selected={checked} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          <div className={styles.legend}>
            <span className={styles.legendItem}>
              <span className={styles.legendCommit} aria-hidden="true" />
              {t('home.timeline.legendCommit')}
            </span>
            <span className={styles.legendItem}>
              <span className={styles.legendMilestone} aria-hidden="true" />
              {t('home.timeline.legendMilestone')}
            </span>
            <span className={styles.legendItem}>
              <MergeIcon size={16} className={styles.legendMerge} />
              {t('home.timeline.legendMerge')}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

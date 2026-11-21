import { t } from '@/i18n';
import { useInView } from './use-in-view';
import styles from './home-timeline.module.css';

interface HomeTimelineProps {
  checked: boolean;
  onOpenNode: () => void;
}

const rows = {
  work: 23.333,
  research: 36.667,
  design: 50,
  health: 71.667,
  life: 85,
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
    <svg viewBox="0 0 18 18" width="16" height="16" aria-hidden="true" fill="none">
      <path
        d="M3 5h12M3 9h8M3 13h10"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <circle cx="13.5" cy="9" r="1.6" fill="currentColor" />
    </svg>
  );
}

/**
 * 第 5 段：时间树。三条一级泳道、分叉与合回、选中的示例节点。
 * 线只在演示窗内出现，随区块结束收束。
 */
export function HomeTimeline({ checked, onOpenNode }: HomeTimelineProps) {
  const { ref, inView } = useInView<HTMLDivElement>(0.35);

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
            <span className={styles.range}>{t('home.timeline.range')}</span>
          </div>

          <div className={styles.chart} ref={ref} data-inview={inView} data-selected={checked}>
            <div className={styles.labels} aria-hidden="true">
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
                    d="M140 70C158 110 172 110 196 110H414C446 110 462 70 496 70"
                  />
                  <path
                    className={`${styles.curve} ${styles.curveDesign}`}
                    pathLength={1}
                    d="M510 70C526 110 540 150 566 150H1000"
                  />
                </svg>

                <span
                  className={styles.node}
                  style={{ left: '9%', top: `${rows.work}%` }}
                  data-kind="solid"
                  data-tone="coral"
                  aria-hidden="true"
                />
                <span
                  className={styles.node}
                  style={{ left: '43%', top: `${rows.work}%` }}
                  data-kind="solid"
                  data-tone="coral"
                  aria-hidden="true"
                />
                <span
                  className={styles.milestone}
                  style={{ left: '76%', top: `${rows.work}%` }}
                  aria-hidden="true"
                />

                <span
                  className={styles.node}
                  style={{ left: '21%', top: `${rows.research}%` }}
                  data-kind="solid"
                  data-tone="coral"
                  aria-hidden="true"
                />
                <span
                  className={styles.node}
                  style={{ left: '30%', top: `${rows.research}%` }}
                  data-kind="solid"
                  data-tone="coral"
                  aria-hidden="true"
                />
                <span
                  className={styles.node}
                  style={{ left: '41%', top: `${rows.research}%` }}
                  data-kind="solid"
                  data-tone="coral"
                  aria-hidden="true"
                />

                <span
                  className={styles.node}
                  style={{ left: '62%', top: `${rows.design}%` }}
                  data-kind="solid"
                  data-tone="coral"
                  aria-hidden="true"
                />
                <span
                  className={styles.node}
                  style={{ left: '74%', top: `${rows.design}%` }}
                  data-kind="hollow"
                  data-tone="coral"
                  aria-hidden="true"
                />
                <span
                  className={styles.node}
                  style={{ left: '86%', top: `${rows.design}%` }}
                  data-kind="hollow"
                  data-tone="coral"
                  aria-hidden="true"
                />

                <span
                  className={styles.node}
                  style={{ left: '18%', top: `${rows.health}%` }}
                  data-kind="hollow"
                  data-tone="sky"
                  aria-hidden="true"
                />
                <span
                  className={styles.node}
                  style={{ left: '43%', top: `${rows.health}%` }}
                  data-kind="hollow"
                  data-tone="sky"
                  aria-hidden="true"
                />
                <span
                  className={styles.node}
                  style={{ left: '78%', top: `${rows.health}%` }}
                  data-kind="hollow"
                  data-tone="sky"
                  aria-hidden="true"
                />

                <span
                  className={styles.node}
                  style={{ left: '25%', top: `${rows.life}%` }}
                  data-kind="hollow"
                  data-tone="honey"
                  aria-hidden="true"
                />
                <span
                  className={styles.node}
                  style={{ left: '70%', top: `${rows.life}%` }}
                  data-kind="hollow"
                  data-tone="honey"
                  aria-hidden="true"
                />

                <span
                  className={styles.mergeDot}
                  style={{ left: '49.6%', top: `${rows.work}%` }}
                  aria-hidden="true"
                />

                <button
                  type="button"
                  className={styles.demoNode}
                  style={{ left: '96%', top: `${rows.design}%` }}
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
              <span className={styles.legendMerge} aria-hidden="true" />
              {t('home.timeline.legendMerge')}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

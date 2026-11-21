import { t } from '@/i18n';
import { useInView } from './use-in-view';
import styles from './home-features.module.css';

function TodayIcon() {
  return (
    <svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true" fill="none">
      <rect
        className={styles.iconStroke}
        pathLength={1}
        x="9"
        y="12"
        width="30"
        height="27"
        rx="4"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        className={styles.iconStroke}
        pathLength={1}
        d="M17 9v6m14-6v6M9 21h30"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        className={styles.iconStroke}
        pathLength={1}
        d="m17 30 4 4 8-9"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BranchIcon() {
  return (
    <svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true" fill="none">
      <circle
        className={styles.iconStroke}
        pathLength={1}
        cx="14"
        cy="11"
        r="4"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle
        className={styles.iconStroke}
        pathLength={1}
        cx="14"
        cy="38"
        r="4"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle
        className={styles.iconStroke}
        pathLength={1}
        cx="34"
        cy="13"
        r="4"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        className={styles.iconStroke}
        pathLength={1}
        d="M14 15v19m20-17c0 8-2 10-10 10H14"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true" fill="none">
      <path
        className={styles.iconStroke}
        pathLength={1}
        d="M9 24h30"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <circle
        className={styles.iconStroke}
        pathLength={1}
        cx="15"
        cy="24"
        r="4"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle
        className={styles.iconStroke}
        pathLength={1}
        cx="27"
        cy="24"
        r="4"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle
        className={styles.iconStroke}
        pathLength={1}
        cx="39"
        cy="24"
        r="4"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  );
}

const cards = [
  {
    key: 'today',
    title: 'home.features.today',
    body: 'home.features.todayBody',
    icon: <TodayIcon />,
  },
  {
    key: 'branch',
    title: 'home.features.branch',
    body: 'home.features.branchBody',
    icon: <BranchIcon />,
  },
  {
    key: 'history',
    title: 'home.features.history',
    body: 'home.features.historyBody',
    icon: <HistoryIcon />,
  },
] as const;

/** 第 2 段：三块内容。图标首次入视各播一次，悬停或聚焦只反馈目标卡。 */
export function HomeFeatures() {
  const { ref, inView } = useInView<HTMLUListElement>(0.35);

  return (
    <section className={styles.section} id="home-features" aria-label={t('home.features.label')}>
      <div className={styles.inner}>
        <h2 className={styles.title}>{t('home.features.title')}</h2>
        <ul className={styles.cards} ref={ref} data-inview={inView}>
          {cards.map((card) => (
            <li key={card.key} className={styles.card} tabIndex={0}>
              <span className={styles.icon}>{card.icon}</span>
              <h3 className={styles.cardTitle}>{t(card.title)}</h3>
              <p className={styles.cardBody}>{t(card.body)}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

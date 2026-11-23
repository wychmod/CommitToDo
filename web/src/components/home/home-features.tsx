import { t } from '@/i18n';
import { HomeBranchIcon, HomeHistoryIcon, HomeTodayIcon } from '@/ui/icons';
import { useInView } from './use-in-view';
import styles from './home-features.module.css';

const cards = [
  {
    key: 'today',
    title: 'home.features.today',
    body: 'home.features.todayBody',
    icon: <HomeTodayIcon />,
  },
  {
    key: 'branch',
    title: 'home.features.branch',
    body: 'home.features.branchBody',
    icon: <HomeBranchIcon />,
  },
  {
    key: 'history',
    title: 'home.features.history',
    body: 'home.features.historyBody',
    icon: <HomeHistoryIcon />,
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
            <li key={card.key} className={styles.card} data-key={card.key} tabIndex={0}>
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

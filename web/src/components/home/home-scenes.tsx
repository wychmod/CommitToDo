import { t } from '@/i18n';
import { useInView } from './use-in-view';
import styles from './home-scenes.module.css';

const scenes = [
  { key: 'work', title: 'home.scenes.workTitle', body: 'home.scenes.workBody', tone: 'coral' },
  { key: 'run', title: 'home.scenes.runTitle', body: 'home.scenes.runBody', tone: 'sky' },
  { key: 'read', title: 'home.scenes.readTitle', body: 'home.scenes.readBody', tone: 'honey' },
] as const;

/** 第 6 段：生活场景。首次入视轻扫一轮，悬停或聚焦只反馈目标卡。 */
export function HomeScenes() {
  const { ref, inView } = useInView<HTMLUListElement>(0.3);

  return (
    <section className={styles.section} id="home-scenes" aria-label={t('home.scenes.label')}>
      <div className={styles.inner}>
        <h2 className={styles.title}>{t('home.scenes.title')}</h2>
        <ul className={styles.cards} ref={ref} data-inview={inView}>
          {scenes.map((scene) => (
            <li key={scene.key} className={styles.card} data-tone={scene.tone} tabIndex={0}>
              <span className={styles.arc} aria-hidden="true" />
              <h3 className={styles.cardTitle}>{t(scene.title)}</h3>
              <p className={styles.cardBody}>{t(scene.body)}</p>
              <span className={styles.track} aria-hidden="true">
                <span className={styles.trackLine} />
                <span className={styles.trackDot} />
                <span className={styles.trackDot} />
                <span className={styles.trackDot} />
                <span className={`${styles.trackDot} ${styles.trackDotEnd}`} />
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { t } from '@/i18n';
import styles from './home-section-nav.module.css';

const items = [
  { id: 'home-today', label: 'home.sections.today', hint: 'home.sections.todayHint' },
  { id: 'home-branch', label: 'home.sections.branch', hint: 'home.sections.branchHint' },
  { id: 'home-history', label: 'home.sections.history', hint: 'home.sections.historyHint' },
] as const;

interface HomeSectionNavProps {
  reducedMotion: boolean;
}

/** 第 3 段：分段导航。点击定位，滚动时细线追踪当前区块。 */
export function HomeSectionNav({ reducedMotion }: HomeSectionNavProps) {
  const [active, setActive] = useState(0);
  const [line, setLine] = useState({ left: 0, width: 0 });
  const listRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);

  const measure = useCallback(() => {
    const list = listRef.current;
    const button = buttonsRef.current[active];
    const label = button?.querySelector<HTMLElement>(`.${styles.label}`);
    if (!list || !button || !label) return;
    const railInset = Number.parseFloat(
      getComputedStyle(list).getPropertyValue('--home-section-nav-rail-inset'),
    );
    setLine({
      left: label.offsetLeft - railInset,
      width: label.offsetWidth + railInset * 2,
    });
  }, [active]);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const sections = items
      .map((item) => document.getElementById(item.id))
      .filter((element): element is HTMLElement => element !== null);
    if (sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (!visible[0]) return;
        const index = items.findIndex((item) => item.id === visible[0].target.id);
        if (index >= 0) setActive(index);
      },
      { rootMargin: '-30% 0px -55% 0px', threshold: 0 },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const go = (index: number) => {
    setActive(index);
    document.getElementById(items[index].id)?.scrollIntoView({
      behavior: reducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  return (
    <nav className={styles.nav} aria-label={t('home.sections.label')}>
      <div className={styles.inner}>
        <div className={styles.list} ref={listRef}>
          {items.map((item, index) => (
            <button
              key={item.id}
              ref={(element) => {
                buttonsRef.current[index] = element;
              }}
              type="button"
              className={styles.item}
              aria-current={active === index ? 'true' : undefined}
              onClick={() => go(index)}
            >
              <span className={styles.label}>{t(item.label)}</span>
              <span className={styles.hint}>{t(item.hint)}</span>
            </button>
          ))}
          <span
            className={styles.line}
            style={{ width: line.width, transform: `translateX(${line.left}px)` }}
            aria-hidden="true"
          />
        </div>
      </div>
    </nav>
  );
}

import { useCallback, useState } from 'react';
import { HomeDesk } from '@/components/home/home-desk';
import { HomeFeatures } from '@/components/home/home-features';
import { HomeFooter } from '@/components/home/home-footer';
import { HomeHero } from '@/components/home/home-hero';
import { HomeNodeDialog } from '@/components/home/home-node-dialog';
import { HomeScenes } from '@/components/home/home-scenes';
import { HomeSectionNav } from '@/components/home/home-section-nav';
import { HomeTimeline } from '@/components/home/home-timeline';
import { useHomeDemo, useReducedMotion } from '@/components/home/use-home-demo';
import styles from './home-page.module.css';

/**
 * P00 营销首页（PRD M00）。
 *
 * 七段各自成块、各自带演示窗；页面只编排与定位，不读写业务库。
 * 首屏演示的勾选状态同时驱动第 5 段示例节点，回执点击先定位再接弹层。
 */
export function HomePage() {
  const reducedMotion = useReducedMotion();
  const demo = useHomeDemo(reducedMotion);
  const [nodeOpen, setNodeOpen] = useState(false);

  const scrollTo = useCallback(
    (id: string) => {
      document.getElementById(id)?.scrollIntoView({
        behavior: reducedMotion ? 'auto' : 'smooth',
        block: 'start',
      });
    },
    [reducedMotion],
  );

  const openReceipt = useCallback(() => {
    setNodeOpen(true);
    scrollTo('home-history');
  }, [scrollTo]);

  const locateTimeline = useCallback(() => {
    setNodeOpen(false);
    scrollTo('home-history');
  }, [scrollTo]);

  return (
    <main className={styles.page}>
      <HomeHero
        demo={demo}
        onOpenReceipt={openReceipt}
        onLocateWorkbench={() => scrollTo('home-workbench')}
      />
      <HomeFeatures />
      <HomeSectionNav reducedMotion={reducedMotion} />
      <HomeDesk />
      <HomeTimeline checked={demo.checked} onOpenNode={() => setNodeOpen(true)} />
      <HomeScenes />
      <HomeFooter />
      {nodeOpen ? (
        <HomeNodeDialog onClose={() => setNodeOpen(false)} onLocate={locateTimeline} />
      ) : null}
    </main>
  );
}

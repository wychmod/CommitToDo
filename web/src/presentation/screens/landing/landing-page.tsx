import { useEffect, useRef, useState } from 'react';

import './landing-theme.css';
import { BottomCta } from './components/bottom-cta';
import { HeroSection } from './components/hero/hero-section';
import { LandingFooter } from './components/landing-footer';
import { LandingHeader } from './components/landing-header';
import { ValueSection } from './components/value/value-section';
import { WorkbenchPreview } from './components/workbench/workbench-preview';

export function LandingPage(): JSX.Element {
  const rootRef = useRef<HTMLDivElement>(null);
  const workbenchRef = useRef<HTMLDivElement>(null);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAnimated(true);
    }, 1600);
    return () => window.clearTimeout(timer);
  }, []);

  const scrollToWorkbench = () => {
    workbenchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div
      ref={rootRef}
      className="v3-landing min-h-screen bg-[var(--v3-bg)]"
      data-theme="v3-dark"
      data-animated={animated}
    >
      <LandingHeader />

      <main>
        <HeroSection onScrollToFlow={scrollToWorkbench} />

        <div ref={workbenchRef} className="scroll-mt-8">
          <WorkbenchPreview />
        </div>

        <ValueSection />

        <BottomCta />
      </main>

      <LandingFooter />
    </div>
  );
}

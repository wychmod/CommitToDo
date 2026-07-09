import { FlowVisualization } from './flow-visualization/flow-visualization';
import { HeroActions } from './hero-actions';
import { HeroCopy } from './hero-copy';

interface HeroSectionProps {
  onScrollToFlow: () => void;
}

export function HeroSection({ onScrollToFlow }: HeroSectionProps): JSX.Element {
  return (
    <section
      className="relative mx-auto flex max-w-[1576px] flex-col items-center px-5 pt-2"
      aria-label="CommitToDo 产品介绍"
    >
      <HeroCopy />
      <HeroActions onScrollToFlow={onScrollToFlow} />
      <FlowVisualization />
    </section>
  );
}

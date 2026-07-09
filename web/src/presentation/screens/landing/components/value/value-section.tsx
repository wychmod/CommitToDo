import {
  Box,
  CheckCircle2,
  GitBranch,
  LayoutGrid,
} from 'lucide-react';

import { useLandingInView } from '../../hooks/use-landing-in-view';
import { ValueCard } from './value-card';
import { ValueDots } from './value-dots';
import { ValueHeading } from './value-heading';

const valueCards = [
  {
    icon: Box,
    title: '目标有仓库',
    description: '把长期目标、项目和生活主题分别收纳，保持清晰边界。',
    color: 'green' as const,
  },
  {
    icon: GitBranch,
    title: '任务有分支',
    description: '复杂计划拆成独立路线，切换时不丢失当前上下文。',
    color: 'cyan' as const,
  },
  {
    icon: CheckCircle2,
    title: '完成即提交',
    description: '每次推进都留下时间、分支和变更记录，随时可以回看。',
    color: 'green' as const,
  },
  {
    icon: LayoutGrid,
    title: '节奏看得见',
    description: '用 Graph 与热力图回顾长期进展，发现自己的行动节奏。',
    color: 'cyan' as const,
  },
];

export function ValueSection(): JSX.Element {
  const { ref: sectionRef, isInView } = useLandingInView(0.25);

  return (
    <section
      ref={sectionRef}
      id="features"
      className="relative mt-8 border-y border-[var(--v3-divider)] bg-[var(--v3-bg)] py-20"
      aria-label="为什么选择 CommitToDo"
    >
      <ValueDots />

      <div className="relative mx-auto max-w-[1328px] px-5 desktop:px-0">
        <ValueHeading isVisible={isInView} />

        <div className="v3-value-grid mt-10">
          {valueCards.map((card, index) => (
            <ValueCard
              key={card.title}
              {...card}
              delay={index * 70}
              isVisible={isInView}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

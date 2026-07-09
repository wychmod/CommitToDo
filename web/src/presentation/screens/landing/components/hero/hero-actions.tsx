import { ArrowRight, Workflow } from 'lucide-react';
import { Link } from 'react-router-dom';

interface HeroActionsProps {
  onScrollToFlow: () => void;
}

export function HeroActions({ onScrollToFlow }: HeroActionsProps): JSX.Element {
  return (
    <div className="v3-enter v3-enter-delay-5 relative z-10 mt-4 flex w-full flex-col items-center justify-center gap-[10px] tablet:w-auto tablet:flex-row">
      <Link
        to="/workspace"
        className="v3-btn v3-btn-primary w-full tablet:w-[158px]"
      >
        <span>进入工作台</span>
        <ArrowRight size={16} strokeWidth={1.5} aria-hidden="true" />
      </Link>

      <button
        type="button"
        className="v3-btn v3-btn-secondary w-full tablet:w-[150px]"
        onClick={onScrollToFlow}
      >
        <Workflow size={16} strokeWidth={1.5} aria-hidden="true" />
        <span>查看任务流</span>
      </button>
    </div>
  );
}

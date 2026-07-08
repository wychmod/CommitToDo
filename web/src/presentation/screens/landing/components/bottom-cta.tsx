import { ArrowRight, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useLandingInView } from '../hooks/use-landing-in-view';

export function BottomCta(): JSX.Element {
  const { ref, isInView } = useLandingInView(0.82);

  return (
    <section
      ref={ref}
      className="border-b border-[var(--v3-divider)] bg-[var(--v3-bg)]"
      aria-label="开始使用 CommitToDo"
    >
      <div
        className={`v3-reveal mx-auto flex max-w-[1328px] flex-col items-center justify-between gap-6 px-5 py-10 text-center tablet:flex-row tablet:gap-0 tablet:text-left ${
          isInView ? 'v3-reveal-visible' : ''
        }`}
      >
        <div className="flex flex-col">
          <h2 className="text-[22px] font-bold leading-[1.2] text-[var(--v3-text-strong)] desktop:text-[28px]">
            从第一条分支开始
          </h2>

          <p className="mt-2 text-[12px] text-[var(--v3-text-muted)]">
            无需注册即可使用，数据默认保存在你的设备。
          </p>
        </div>

        <div className="flex w-full flex-col items-center gap-[10px] tablet:w-auto tablet:flex-row">
          <Link
            to="/workspace"
            className="v3-btn v3-btn-primary w-full tablet:w-auto"
            style={{ height: '43px', padding: '0 20px' }}
          >
            <span>进入工作台</span>
            <ArrowRight size={16} strokeWidth={1.5} aria-hidden="true" />
          </Link>

          <button
            type="button"
            className="v3-btn v3-btn-secondary w-full tablet:w-auto"
            style={{ height: '43px', padding: '0 20px' }}
          >
            <BookOpen size={16} strokeWidth={1.5} aria-hidden="true" />
            <span>查看使用方法</span>
          </button>
        </div>
      </div>
    </section>
  );
}

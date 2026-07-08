interface ValueHeadingProps {
  isVisible: boolean;
}

export function ValueHeading({ isVisible }: ValueHeadingProps): JSX.Element {
  return (
    <div
      className={`v3-reveal flex flex-col items-center text-center ${
        isVisible ? 'v3-reveal-visible' : ''
      }`}
    >
      <h2 className="text-[24px] font-bold leading-[1.2] text-[var(--v3-text-strong)] desktop:text-[32px]">
        为什么选择 CommitToDo
      </h2>

      <p className="mt-3 text-[13px] text-[var(--v3-text-muted)]">
        不是另一张清单，而是一套可回溯的行动系统。
      </p>
    </div>
  );
}

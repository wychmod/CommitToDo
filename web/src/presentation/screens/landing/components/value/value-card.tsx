import type { LucideIcon } from 'lucide-react';

interface ValueCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  color: 'green' | 'cyan';
  delay: number;
  isVisible: boolean;
}

export function ValueCard({
  icon: Icon,
  title,
  description,
  color,
  delay,
  isVisible,
}: ValueCardProps): JSX.Element {
  const borderColor =
    color === 'green' ? 'border-[var(--v3-primary)]/40' : 'border-[var(--v3-launch)]/40';
  const iconColor =
    color === 'green' ? 'text-[var(--v3-primary)]' : 'text-[var(--v3-launch)]';

  return (
    <article
      className={`v3-card flex h-[158px] flex-col p-[22px] transition-all duration-500 ease-out ${
        isVisible
          ? 'translate-y-0 opacity-100'
          : 'translate-y-[18px] opacity-0'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div
        className={`mb-[18px] flex h-8 w-8 items-center justify-center rounded-md border ${borderColor} bg-[var(--v3-control)]`}
      >
        <Icon size={16} strokeWidth={1.5} className={iconColor} aria-hidden="true" />
      </div>

      <h3 className="mb-2 text-[18px] font-semibold leading-[1.35] text-[var(--v3-text-strong)]">
        {title}
      </h3>

      <p className="text-[12px] leading-[1.55] text-[var(--v3-text-secondary)]">
        {description}
      </p>
    </article>
  );
}

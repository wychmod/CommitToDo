import type { LucideIcon } from 'lucide-react';

interface LandingNavLinkProps {
  href: string;
  icon: LucideIcon;
  label: string;
}

export function LandingNavLink({
  href,
  icon: Icon,
  label,
}: LandingNavLinkProps): JSX.Element {
  return (
    <a
      href={href}
      className="v3-nav-link"
    >
      <Icon size={16} strokeWidth={1.5} aria-hidden="true" />
      <span>{label}</span>
    </a>
  );
}

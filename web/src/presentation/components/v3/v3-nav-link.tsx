import { Slot } from '@radix-ui/react-slot';
import * as React from 'react';

import { cn } from '@/core/utils/formatters';

/**
 * Navigation link primitive for the v3 design language.
 *
 * Mirrors the Landing page's `.v3-nav-link`: a 40px-tall quiet pill that warms
 * to `--v3-control` on hover. Use `asChild` to render a router `<Link>`.
 */
export interface V3NavLinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  asChild?: boolean;
}

export const V3NavLink = React.forwardRef<HTMLAnchorElement, V3NavLinkProps>(
  ({ className, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'a';
    return (
      <Comp
        ref={ref}
        className={cn(
          'inline-flex h-10 items-center gap-2 px-3 text-[14px] font-medium text-[var(--v3-text-secondary)] rounded-[var(--v3-radius-md)] transition-[background-color,color] duration-(--v3-fast) ease-out hover:bg-[var(--v3-control)] hover:text-[var(--v3-text-strong)] focus-visible:outline-none focus-visible:[box-shadow:var(--v3-focus-ring)]',
          className
        )}
        {...props}
      />
    );
  }
);
V3NavLink.displayName = 'V3NavLink';

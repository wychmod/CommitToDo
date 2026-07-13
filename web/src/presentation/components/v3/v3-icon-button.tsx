import { Slot } from '@radix-ui/react-slot';
import * as React from 'react';

import { cn } from '@/core/utils/formatters';

/**
 * Icon-only button primitive for the v3 design language.
 *
 * Mirrors the Landing page's `.v3-icon-btn`: a 40x40 quiet square that lifts to
 * `--v3-control` on hover. Pair with a `lucide-react` icon and `aria-label`.
 */
export interface V3IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const V3IconButton = React.forwardRef<
  HTMLButtonElement,
  V3IconButtonProps
>(({ className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      ref={ref}
      className={cn(
        'inline-flex h-10 w-10 items-center justify-center rounded-[var(--v3-radius-md)] text-[var(--v3-text-secondary)] transition-[background-color,color] duration-(--v3-fast) ease-out hover:bg-[var(--v3-control)] hover:text-[var(--v3-text-strong)] focus-visible:outline-none focus-visible:[box-shadow:var(--v3-focus-ring)] disabled:pointer-events-none disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
});
V3IconButton.displayName = 'V3IconButton';

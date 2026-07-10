import { Slot } from '@radix-ui/react-slot';
import * as React from 'react';

import { cn } from '@/core/utils/formatters';

/** Accent token applied to the card's top edge (mirrors the Value card pattern). */
export type V3CardAccent = 'primary' | 'launch' | 'design' | undefined;

const accentColor: Record<Exclude<V3CardAccent, undefined>, string> = {
  primary: 'var(--v3-primary)',
  launch: 'var(--v3-launch)',
  design: 'var(--v3-design)',
};

/**
 * Card primitive for the v3 design language.
 *
 * Mirrors the Landing page's `.v3-card`: a quiet surface that lifts 2px and
 * warms its border on hover. Pass `accent` to add the colored top edge used by
 * the Value cards. Use `asChild` to render a semantic `<article>`/`<li>`.
 */
export interface V3CardProps extends React.HTMLAttributes<HTMLDivElement> {
  accent?: V3CardAccent;
  asChild?: boolean;
}

export const V3Card = React.forwardRef<HTMLDivElement, V3CardProps>(
  ({ className, accent, asChild = false, style, ...props }, ref) => {
    const Comp = asChild ? Slot : 'div';
    return (
      <Comp
        ref={ref}
        className={cn(
          'rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-card)] transition-[background-color,border-color,transform] duration-[var(--v3-fast)] ease-out hover:-translate-y-0.5 hover:border-[#465048] hover:bg-[var(--v3-card-hover)]',
          className
        )}
        style={{
          borderTopColor: accent ? accentColor[accent] : undefined,
          borderTopWidth: accent ? '1.5px' : undefined,
          ...style,
        }}
        {...props}
      />
    );
  }
);
V3Card.displayName = 'V3Card';

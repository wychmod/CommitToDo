import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/core/utils/formatters';

/**
 * Button primitive for the v3 design language.
 *
 * Mirrors the Landing page's `.v3-btn` / `.v3-btn-primary` / `.v3-btn-secondary`
 * visual contract, expressed with Tailwind arbitrary values + `var(--v3-*)`
 * tokens so it is self-contained (no dependency on `landing-theme.css`).
 *
 * Use `asChild` to render a router `<Link>` or `<a>` with button styles, matching
 * the Landing hero's primary CTA pattern.
 */
const v3ButtonVariants = cva(
  'inline-flex items-center justify-center gap-[10px] rounded-[var(--v3-radius-md)] text-[14px] font-semibold font-sans transition-[color,background-color,border-color,box-shadow,transform,filter] duration-(--v3-fast) ease-out focus-visible:outline-none focus-visible:[box-shadow:var(--v3-focus-ring)] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'h-[37px] px-[18px] text-[var(--v3-text-on-primary)] bg-[linear-gradient(180deg,var(--v3-primary-dim),var(--v3-primary))] hover:-translate-y-px hover:[filter:brightness(1.06)] hover:[box-shadow:var(--v3-glow-primary)] active:translate-y-0 active:[background:var(--v3-primary-active)] active:[box-shadow:none]',
        secondary:
          'h-[37px] px-[18px] text-[var(--v3-text)] bg-[var(--v3-control)] border border-[var(--v3-border)] hover:border-[var(--v3-border-hover)] active:bg-[var(--v3-control-active)]',
        ghost:
          'h-[37px] px-[18px] text-[var(--v3-text-secondary)] hover:text-[var(--v3-text-strong)] hover:bg-[var(--v3-control)]',
      },
      size: {
        default: '',
        sm: 'h-8 px-3 text-[13px] gap-2',
        lg: 'h-11 px-6 text-[15px]',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
);

export interface V3ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof v3ButtonVariants> {
  asChild?: boolean;
}

export const V3Button = React.forwardRef<HTMLButtonElement, V3ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(v3ButtonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
V3Button.displayName = 'V3Button';

export { v3ButtonVariants };

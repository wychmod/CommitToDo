import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '../../../core/utils/formatters';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-xs rounded-md text-button font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus/50 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-focus px-sm py-xs',
        secondary:
          'bg-surface-1 text-ink border border-hairline hover:bg-surface-2 px-sm py-xs',
        tertiary: 'bg-canvas text-ink hover:bg-surface-1 px-sm py-xs',
        danger:
          'bg-error text-white hover:bg-error-light hover:text-error px-sm py-xs',
        inverse:
          'bg-inverse-canvas text-inverse-ink hover:bg-surface-2 px-sm py-xs',
      },
      size: {
        default: 'h-10',
        lg: 'h-12',
        sm: 'h-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
);

export interface AppButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const AppButton = React.forwardRef<HTMLButtonElement, AppButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
AppButton.displayName = 'AppButton';

export { AppButton, buttonVariants };

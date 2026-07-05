import * as ToastPrimitive from '@radix-ui/react-toast';
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react';
import { X } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../../core/utils/formatters';

const toastVariants = cva(
  'pointer-events-auto relative flex w-full max-w-sm items-start gap-xs rounded-md border border-hairline-strong bg-surface-3 p-md shadow-lg',
  {
    variants: {
      variant: {
        default: 'border-l-4 border-l-primary',
        success: 'border-l-4 border-l-success',
        warning: 'border-l-4 border-l-warning',
        error: 'border-l-4 border-l-error',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface AppToastProps
  extends ComponentPropsWithoutRef<typeof ToastPrimitive.Root>,
    VariantProps<typeof toastVariants> {
  title?: string;
  description?: string;
  onClose?: () => void;
}

const AppToast = forwardRef<
  ElementRef<typeof ToastPrimitive.Root>,
  AppToastProps
>(({ className, variant, title, description, onClose, children, ...props }, ref) => {
  return (
    <ToastPrimitive.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    >
      <div className="flex flex-1 flex-col gap-micro">
        {title ? (
          <ToastPrimitive.Title className="text-body font-medium text-ink">
            {title}
          </ToastPrimitive.Title>
        ) : null}
        {description ? (
          <ToastPrimitive.Description className="text-body-sm text-ink-muted">
            {description}
          </ToastPrimitive.Description>
        ) : null}
        {children}
      </div>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-2 hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </ToastPrimitive.Root>
  );
});
AppToast.displayName = ToastPrimitive.Root.displayName;

export { AppToast };

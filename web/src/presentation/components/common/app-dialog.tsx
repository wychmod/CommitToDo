import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '../../../core/utils/formatters';

const AppDialog = DialogPrimitive.Root;
const AppDialogTrigger = DialogPrimitive.Trigger;
const AppDialogPortal = DialogPrimitive.Portal;
const AppDialogClose = DialogPrimitive.Close;

const AppDialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-overlay data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
));
AppDialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const AppDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AppDialogPortal>
    <AppDialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-hairline-strong bg-surface-1 p-lg shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-surface-2 hover:text-ink focus:outline-none focus:ring-2 focus:ring-primary-focus/50">
        <X className="h-4 w-4" />
        <span className="sr-only">关闭</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </AppDialogPortal>
));
AppDialogContent.displayName = DialogPrimitive.Content.displayName;

const AppDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('mb-md flex flex-col gap-xs text-left', className)}
    {...props}
  />
);
AppDialogHeader.displayName = 'AppDialogHeader';

const AppDialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-headline font-semibold text-ink', className)}
    {...props}
  />
));
AppDialogTitle.displayName = DialogPrimitive.Title.displayName;

const AppDialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-body text-ink-muted', className)}
    {...props}
  />
));
AppDialogDescription.displayName = DialogPrimitive.Description.displayName;

const AppDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('mt-lg flex flex-row justify-end gap-xs', className)}
    {...props}
  />
);
AppDialogFooter.displayName = 'AppDialogFooter';

export {
  AppDialog,
  AppDialogTrigger,
  AppDialogContent,
  AppDialogHeader,
  AppDialogTitle,
  AppDialogDescription,
  AppDialogFooter,
  AppDialogClose,
};

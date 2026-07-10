import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as React from 'react';
import { X } from 'lucide-react';

import { cn } from '@/core/utils/formatters';

export interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function SettingsDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: SettingsDialogProps): JSX.Element {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-50 bg-[rgb(0_0_0/60%)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
          aria-hidden="true"
        />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-full max-w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-[var(--v3-radius-lg)] border border-[var(--v3-border)] bg-[var(--v3-card)] p-6 shadow-[var(--v3-shadow-panel)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95'
          )}
        >
          <div className="flex flex-col gap-1">
            <DialogPrimitive.Title className="text-[18px] font-semibold text-[var(--v3-text-strong)]">
              {title}
            </DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="text-[14px] leading-[1.5] text-[var(--v3-text-secondary)]">
                {description}
              </DialogPrimitive.Description>
            ) : null}
          </div>

          <div className="mt-5">{children}</div>

          {footer ? <div className="mt-6 flex items-center justify-end gap-3">{footer}</div> : null}

          <DialogPrimitive.Close
            asChild
            className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-[var(--v3-radius-md)] text-[var(--v3-text-muted)] transition-colors hover:bg-[var(--v3-control)] hover:text-[var(--v3-text-strong)] focus-visible:outline-none focus-visible:[box-shadow:var(--v3-focus-ring)]"
          >
            <button type="button" aria-label="关闭">
              <X size={16} strokeWidth={1.5} aria-hidden="true" />
            </button>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

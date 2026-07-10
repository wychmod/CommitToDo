import { AlertTriangle } from 'lucide-react';

import { V3Button, V3Card } from '@/presentation/components/v3';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = '确认',
  cancelLabel = '取消',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps): JSX.Element | null {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <V3Card className="w-full max-w-[380px] p-5">
        <div className="flex items-start gap-3">
          {danger ? (
            <AlertTriangle size={22} strokeWidth={1.5} aria-hidden="true" className="mt-0.5 text-[var(--v3-danger)]" />
          ) : null}
          <div className="flex flex-col gap-1">
            <h3 className="text-[16px] font-semibold text-[var(--v3-text-strong)]">{title}</h3>
            <p className="text-[14px] leading-[1.5] text-[var(--v3-text-secondary)]">{description}</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <V3Button variant="secondary" onClick={onCancel}>{cancelLabel}</V3Button>
          <V3Button
            onClick={onConfirm}
            className={danger ? 'bg-[var(--v3-danger)] text-white hover:bg-[var(--v3-danger)]/90' : undefined}
          >
            {confirmLabel}
          </V3Button>
        </div>
      </V3Card>
    </div>
  );
}

import { cn } from '../../../core/utils/formatters';

export interface FabProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
}

export function Fab({
  className,
  children,
  label,
  ...props
}: FabProps): JSX.Element {
  return (
    <button
      type="button"
      className={cn(
        'fixed bottom-20 right-4 z-30 inline-flex h-14 items-center gap-xs rounded-full bg-primary px-md text-button font-medium text-on-primary shadow-lg transition-colors hover:bg-primary-hover active:bg-primary-focus focus:outline-none focus:ring-2 focus:ring-primary-focus/50 md:bottom-6',
        className
      )}
      {...props}
    >
      {children}
      {label ? <span>{label}</span> : null}
    </button>
  );
}

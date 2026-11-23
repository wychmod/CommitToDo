import type { ComponentPropsWithRef } from 'react';
import styles from './button.module.css';

/**
 * 按钮优先级：
 * - primary：主操作（强调色实心）
 * - ghost：次要操作（描边）
 * - danger：不可逆主操作（危险色实心）
 * - danger-outline：危险但仍需再确认的前置操作（危险色描边）
 */
export type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'danger-outline';

interface ButtonProps extends ComponentPropsWithRef<'button'> {
  variant?: ButtonVariant;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: styles.primary!,
  ghost: styles.ghost!,
  danger: styles.danger!,
  'danger-outline': styles.dangerOutline!,
};

export function Button({ variant = 'ghost', className, type = 'button', ...rest }: ButtonProps) {
  const classes = [styles.button, VARIANT_CLASS[variant], className].filter(Boolean).join(' ');
  return <button type={type} className={classes} {...rest} />;
}

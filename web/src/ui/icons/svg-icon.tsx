import type { SVGProps } from 'react';

export type IconSize = 16 | 18 | 20 | 24;

export interface SvgIconProps extends Omit<SVGProps<SVGSVGElement>, 'width' | 'height'> {
  /** 只用令牌里定义的四个尺寸，默认 18。 */
  size?: IconSize;
}

/**
 * 自绘图标的统一外壳（TECH-ARCHITECTURE.md §2.7）。
 *
 * - 尺寸只有 16 / 18 / 20 / 24，默认 18；
 * - 描边固定 1.5，圆头圆角；
 * - 颜色一律 currentColor，由外层用令牌变量（如 `var(--text-muted)`）设定；
 * - 图标组件内不写颜色、不写宽高像素，也不引图标库。
 */
export function SvgIcon({ size = 18, children, ...rest }: SvgIconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {children}
    </svg>
  );
}

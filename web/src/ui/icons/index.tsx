import { SvgIcon, type SvgIconProps } from './svg-icon';

/** 图标骨架示例：每个图标一个组件，路径内联，不复用外部 sprite。 */
export function CheckIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="m5 12 4 4L19 6" />
    </SvgIcon>
  );
}

/** 注解入口：折叠后用一个小图标提示「这里还有一句解释」。 */
export function InfoIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </SvgIcon>
  );
}

/** 二级页返回。 */
export function ArrowLeftIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M19 12H5" />
      <path d="m11 6-6 6 6 6" />
    </SvgIcon>
  );
}

export { SvgIcon };
export type { IconSize, SvgIconProps } from './svg-icon';

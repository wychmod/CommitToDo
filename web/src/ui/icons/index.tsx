import { SvgIcon, type SvgIconProps } from './svg-icon';

/** 图标骨架示例：每个图标一个组件，路径内联，不复用外部 sprite。 */
export function CheckIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="m5 12 4 4L19 6" />
    </SvgIcon>
  );
}

export { SvgIcon };
export type { IconSize, SvgIconProps } from './svg-icon';

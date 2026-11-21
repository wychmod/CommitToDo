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

/** 树节点展开控件：展开时朝下，折叠时朝右。 */
export function ChevronDownIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="m6 9 6 6 6-6" />
    </SvgIcon>
  );
}

export function ChevronRightIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="m9 6 6 6-6 6" />
    </SvgIcon>
  );
}

/** 行尾「更多」操作。 */
export function MoreIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <circle cx="6" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="18" cy="12" r="1" />
    </SvgIcon>
  );
}

/** 分支置顶标记。 */
export function PinIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M9 4h6l-1 5 3 3H7l3-3-1-5Z" />
      <path d="M12 12v7" />
    </SvgIcon>
  );
}

export { SvgIcon };
export type { IconSize, SvgIconProps } from './svg-icon';

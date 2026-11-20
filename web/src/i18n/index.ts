import { zhCN } from './zh-CN';

export type Locale = 'zh-CN';
export type MessageKey = keyof typeof zhCN;

const catalogs: Record<Locale, Record<MessageKey, string>> = {
  'zh-CN': zhCN,
};

export const defaultLocale: Locale = 'zh-CN';

/**
 * 取文案（TECH-ARCHITECTURE.md §2.8）。
 *
 * 目前没有语言切换，也不引运行时库：单一目录、同步查表即可。
 * 组件只允许调用 t('域.元素.语义')，不允许内联中文。
 */
export function t(key: MessageKey): string {
  return catalogs[defaultLocale][key];
}

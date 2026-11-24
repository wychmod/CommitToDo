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
 *
 * 查不到时返回 key 本身并告警：界面会出现一个明显的 `域.元素.语义` 字样，
 * 比静默渲染 `undefined` 更容易在自测里被发现；类型层面仍由 `MessageKey` 兜住。
 */
export function t(key: MessageKey): string {
  const text = catalogs[defaultLocale][key];
  if (text === undefined) {
    console.warn('[i18n] missing message:', key);
    return key;
  }
  return text;
}

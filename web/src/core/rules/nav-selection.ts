/**
 * 路由到一级入口的选中映射（M01 §4.1）。
 *
 * 四个一级入口固定为「今天 / 分支 / 历程 / 我的」；分支详情继承「分支」，
 * 年轮继承「历程」，设置与数据备份继承「我的」。首页与认证页不归入任何入口。
 * 只做纯字符串判定：查询串与 hash 不改变归属，更深的路径按首个路径段归属。
 */

export type NavSection = 'today' | 'branches' | 'history' | 'me';

const SECTION_BY_ROOT: Readonly<Record<string, NavSection>> = {
  today: 'today',
  branches: 'branches',
  history: 'history',
  me: 'me',
  settings: 'me',
  data: 'me',
};

/** 返回地址所属的一级入口；`/`、认证页与未知路由返回 `null`。 */
export function navSectionFor(url: string): NavSection | null {
  const pathname = url.split('#')[0].split('?')[0];
  const first = pathname.split('/').find((segment) => segment.length > 0);
  if (!first) return null;
  return SECTION_BY_ROOT[first] ?? null;
}

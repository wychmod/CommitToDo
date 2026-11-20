/**
 * 全部中文文案的唯一来源（TECH-ARCHITECTURE.md §2.8）。
 *
 * key 约定：`域.元素.语义`，段内 camelCase。
 * 组件里只写 key，不写中文；新增语言时只加一个同结构的目录文件。
 */
export const zhCN = {
  'app.name': 'CommitToDo',
  'nav.today': '今天',
  'nav.branches': '分支',
  'nav.history': '历程',
  'nav.me': '我的',
  'today.header.withDue': '条有截止日期',
  'today.header.withoutDue': '另有',
  'today.empty.title': '今天还没有待办',
  'common.add': '添加待办',
  'common.cancel': '取消',
  'common.confirm': '确认',
} as const;

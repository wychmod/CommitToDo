/**
 * 全部中文文案的唯一来源（TECH-ARCHITECTURE.md §2.8）。
 *
 * key 约定：`域.元素.语义`，段内 camelCase。
 * 组件里只写 key，不写中文；新增语言时只加一个同结构的目录文件。
 */
export const zhCN = {
  'app.name': 'CommitToDo',
  'app.localTag': '本机空间',

  'nav.today': '今天',
  'nav.branches': '分支',
  'nav.history': '历程',
  'nav.me': '我的',
  'nav.settings': '设置',
  'nav.data': '数据与备份',

  'shell.quickAdd': '快速添加',
  'shell.search': '搜索',
  'shell.onboarding': '首次引导',
  'shell.close': '关闭',
  'shell.cancel': '取消',
  'shell.confirm': '确认',
  'shell.primaryNav': '主要导航',
  'shell.back': '返回',
  'shell.storageUnavailable': '本机数据暂时无法读取。已有内容不会被清空，请重试。',

  'annotation.dismiss': '知道了',
  'annotation.expand': '展开注解',
  'annotation.branch': '分支是一条持续的方向，可以继续往下开，也可以收尾。',
  'annotation.merge': '合并会把子分支的完成带回父分支，子分支仍可回看。',
  'annotation.milestoneCommit': '提交是完成一件待办留下的记录；里程碑是阶段节点，不产生提交。',
  'annotation.stall': '虚线表示这条分支距最后一次提交已经超过 30 天。',

  'overlay.quick-add.title': '快速添加待办',
  'overlay.quick-add.body': '写一句话，日期可以之后再定。',
  'overlay.task-detail.title': '待办详情',
  'overlay.task-detail.body': '待办详情的占位外壳。',
  'overlay.commit-detail.title': '提交详情',
  'overlay.commit-detail.body': '提交详情的占位外壳。',
  'overlay.search.title': '搜索',
  'overlay.search.body': '搜索分支、待办、提交与里程碑。',
  'overlay.confirm.title': '确认操作',
  'overlay.confirm.body': '这里会说明操作的影响。',
  'overlay.onboarding.title': '欢迎',
  'overlay.onboarding.body': '从今天开始，每条路径都有迹可循。',
  'overlay.undo-receipt.title': '刚刚完成',
  'overlay.undo-receipt.body': '撤销回执的占位外壳。',

  'page.home.title': 'CommitToDo',
  'page.home.body': '把待办、提交与分支放在同一条时间线上。',
  'page.home.open': '打开工作区',

  'page.today.title': '今天',
  'page.today.body': '逾期、今天与无截止日期。',
  'page.today.empty': '今天还没有要做的。',
  'page.today.action': '记一笔',

  'page.branches.title': '分支',
  'page.branches.body': '从一个根分支出发，看清每条路径的归属与进度。',
  'page.branches.empty': '还没有分支。',
  'page.branches.action': '新建分支',

  'page.branchDetail.title': '分支详情',
  'page.branchDetail.empty': '找不到这个分支。',

  'page.history.title': '历程',
  'page.history.body': '按实际日期分布的提交与里程碑。',
  'page.history.empty': '还没有提交。完成一件待办就会留下一条。',
  'page.history.action': '去今天',

  'page.year.title': '年轮',
  'page.year.body': '一年里的提交、分支与结构变化。',

  'page.me.title': '我的',
  'page.me.body': '徽章、数据与个人偏好。',
  'page.me.badges': '徽章',
  'page.me.badgeEmpty': '还没有获得徽章。',
  'page.me.action': '去今天完成一条',
  'page.me.shortcuts': '入口',

  'page.settings.title': '设置',
  'page.settings.body': '调整外观和阅读偏好。设置保存在本机。',
  'settings.appearance': '外观',
  'settings.theme': '主题',
  'settings.theme.light': '浅色',
  'settings.theme.dark': '深色',
  'settings.density': '树密度',
  'settings.density.comfortable': '舒适',
  'settings.density.compact': '紧凑',
  'settings.annotations': '注解',
  'settings.annotations.mode': '显示方式',
  'settings.annotations.once': '只显示一次',
  'settings.annotations.always': '始终显示',
  'settings.annotations.off': '关闭',
  'settings.annotations.hint': '每个概念只有一句话，开关同时作用于分支、合并、里程碑与停滞。',
  'settings.data': '数据与备份',
  'settings.data.hint': '导出的文件可在换浏览器或换设备时恢复。',
  'settings.saving': '正在保存…',
  'settings.saveFailed': '偏好没有保存成功，当前选择仍保留。',

  'page.data.title': '数据与备份',
  'page.data.body': '导出文件可用于换浏览器或换设备时恢复。',
  'page.data.empty': '还没有可导出的数据。',
  'page.data.action': '去今天',

  'page.login.title': '登录',
  'page.login.body': '登录后可在多台设备间同步。',
  'page.signup.title': '注册',
  'page.signup.body': '注册后可从本机数据开始。',
  'page.recover.title': '找回密码',
  'page.recover.body': '按邮件指引设置新密码。',
  'page.auth.local': '先打开本机工作区',

  'page.notFound.title': '页面不存在',
  'page.notFound.body': '链接可能已经失效。',
  'page.notFound.back': '回到今天',

  'state.loading': '正在读取本机数据…',
  'state.empty': '暂无内容',
  'error.title': '页面出错了',
  'error.retry': '重新加载',
} as const;

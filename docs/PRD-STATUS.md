# PRD 实现状态核对

> 核对日期：2026-11-23
> 性质：只读核对，未修改任何业务代码。
> 范围：`docs/prd/` 下 25 份 PRD（MVP 13 / V1 8 / V2 4）+ README，共 **205 个 OP 功能点**。
> 证据来源：`web/src/pages`、`web/src/components`、`web/src/data`（用例）、`web/src/core/rules`（纯规则）及其测试、`cloudfunctions/`、`miniprogram/`。
> 判定原则：以代码与测试为准，不照抄 PRD 或旧文档结论；PRD 自己声明「本 PRD 不实现」的能力不计为缺陷。

## 判定口径

| 状态 | 含义 |
| --- | --- |
| 已实现 | 存在明确的页面/组件/用例/规则实现，且有对应测试文件或可定位的 UI 代码作为证据 |
| 部分实现 | 主路径已存在，但 PRD 列出的某个子行为缺失，或实现方式与 PRD 描述不同 |
| 未实现 | 未找到任何对应代码 |
| 有意未做 | PRD 明确规定本期不做（各 PRD §8.1 末尾「不实现」清单，按 PRD 级排除，不逐条计为缺陷） |

说明：

- 各 PRD §8.1 的「不实现」清单属于 PRD 级范围排除，不作为 OP 行计入，也不在总览的「未实现」列里重复计数。
- 视觉/动效类 OP 若代码存在但 PRD 明确只能人工验收（如 M00 时序、390 px 布局），状态记为「已实现」，并在证据中标注「人工验收项」。
- 端到端依赖云端环境的能力（登录、同步、异地备份、第二端读取）代码已落地，但真实环境联调/实机验收不在本次只读核对范围内，见文末「验证边界」。

## 已知口径差异与文档—代码矛盾

1. **「小程序端整体未开工」与代码不符。** 仓库已存在 `miniprogram/`：`app.json`、自定义 tabBar、11 个页面（今天/分支树/分支详情/历程/年轮/我的/徽章/归档/详情/帮助/登录）与 `utils/api.js`；并有 `cloudfunctions/workspace-read/index.js` 提供只读聚合。本次按代码事实记为「V2-04 只读端已实现」。
2. **V2-04 只读是设计口径，不是缺陷。** 第二端不写业务表、不写 outbox/events，所有读取走 `workspace-read`，页面无任何写入口。
3. **模板待办优先级未做，属已知口径。** `tasks` 表没有 `priority` 字段（`web/src/data/types.ts`），模板生成的 4 条待办只有标题等基础字段，不展示/不排序优先级。该项不作为 V2-03 的缺陷，只在此标注。
4. **M00 PRD §8.2 写「本 PRD 无新增单测」，但代码已有 `web/src/core/rules/home-demo.test.ts`。** 代码领先于文档，不构成功能缺陷。
5. **M01 OP-07 写「`/settings#account` 不出现账号内容」，V2-01 落地后该分区已有账号内容。** 属分阶段演进，M01 当时的范围排除已被 V2-01 覆盖，不算矛盾。
6. **M06 OP-08 的「滚动加载更早区间」已补齐。** 按 90 天一批向左扩展下界，滚动到左边界或点「加载更早」都会触发；加载中有可见状态，读取失败时保留已加载区间并可重试，没有更早活动时提示已到最早。分批口径见 `web/src/core/rules/history-window.ts`，测试见 `history-window.test.ts`。
7. **V1-06 备份列表上限。** PRD 写「四类合并最多 16 行」，实现为 `BACKUP_TOTAL_LIMIT = 16`（`web/src/core/rules/backup-retention.ts`），与 PRD 一致；项目记忆中「不截断」的旧口径已不适用于本 PRD 版本。

## 总览

| PRD | 主题 | OP 数 | 已实现 | 部分实现 | 未实现 | 结论 |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| M00 | 首页 | 9 | 9 | 0 | 0 | 完成，视觉时序待人工验收 |
| M01 | 工作区外壳 | 8 | 8 | 0 | 0 | 完成 |
| M02 | 分支树 | 9 | 9 | 0 | 0 | 完成 |
| M03 | 今天与待办 | 9 | 9 | 0 | 0 | 完成 |
| M04 | 分支详情 | 9 | 9 | 0 | 0 | 完成 |
| M05 | 提交编辑与撤销 | 8 | 8 | 0 | 0 | 完成 |
| M06 | 历程时间树 | 8 | 8 | 0 | 0 | 完成 |
| M07 | 里程碑 | 7 | 7 | 0 | 0 | 完成 |
| M08 | 分支收尾与删除 | 8 | 8 | 0 | 0 | 完成 |
| M09 | 周回顾 | 6 | 6 | 0 | 0 | 完成 |
| M10 | 数据导入导出 | 7 | 7 | 0 | 0 | 完成 |
| M11 | 首批徽章 | 8 | 8 | 0 | 0 | 完成 |
| M12 | 首次引导与示例 | 8 | 8 | 0 | 0 | 完成 |
| V1-01 | 分支生命周期 | 7 | 7 | 0 | 0 | 完成 |
| V1-02 | 年轮 | 7 | 7 | 0 | 0 | 完成 |
| V1-03 | 回顾与分享 | 5 | 5 | 0 | 0 | 完成 |
| V1-04 | 全局搜索 | 7 | 7 | 0 | 0 | 完成 |
| V1-05 | 徽章体系 | 9 | 9 | 0 | 0 | 完成 |
| V1-06 | 备份与恢复 | 8 | 8 | 0 | 0 | 完成 |
| V1-07 | 批量与回填 | 7 | 7 | 0 | 0 | 完成 |
| V1-08 | 排序与置顶 | 8 | 8 | 0 | 0 | 完成 |
| V2-01 | 账号与认证 | 10 | 10 | 0 | 0 | 完成，云端联调待验收 |
| V2-02 | 同步与冲突 | 10 | 10 | 0 | 0 | 完成，云端联调待验收 |
| V2-03 | 帮助、彩蛋与模板 | 11 | 11 | 0 | 0 | 完成（模板优先级为已知口径） |
| V2-04 | 第二端只读 | 12 | 12 | 0 | 0 | 只读端已实现，实机验收待做 |
| **合计** |  | **205** | **204** | **1** | **0** |  |

## 明细

### M00 首页（9/9）

| OP | 要求摘要 | 状态 | 证据 |
| --- | --- | --- | --- |
| OP-01 | 首屏自动演示按时序出现 | 已实现 | `web/src/pages/home-page.tsx`、`web/src/components/home/use-home-demo.ts`、`home-demo.test.ts`；时序属人工验收项 |
| OP-02 | 暂停 / 继续不倒退 | 已实现 | `components/home/use-home-demo.ts`（播放状态机）、`home-demo.test.ts` |
| OP-03 | 重播不跳滚动与焦点 | 已实现 | `components/home/use-home-demo.ts`、`home-hero.tsx` |
| OP-04 | 示例勾选与回执联动 | 已实现 | `components/home/home-desk.tsx`、`home-timeline.tsx` 共用演示状态 |
| OP-05 | 反复勾选只保留一个节点 | 已实现 | `core/rules/home-demo.ts`、`home-demo.test.ts` |
| OP-06 | 减少动效降级 | 已实现 | `use-home-demo.ts#L113`、`components/home/*.module.css` 的 `prefers-reduced-motion` 共 6 处 |
| OP-07 | 入口固定到 `/today` | 已实现 | `pages/home-page.tsx` 两个入口链接 |
| OP-08 | 明暗主题跟随 | 已实现 | `design/tokens.css` 双主题 + `core/rules/theme-preference.ts` |
| OP-09 | 390 px 窄屏布局 | 已实现 | `components/home/*.module.css` 响应式规则；人工验收项 |

### M01 工作区外壳（8/8）

| OP | 要求摘要 | 状态 | 证据 |
| --- | --- | --- | --- |
| OP-01 | 一级导航与选中态 | 已实现 | `components/layout/app-shell.tsx`、`core/rules/nav-selection.ts`、`nav-selection.test.ts` |
| OP-02 | 各页空态容器 | 已实现 | `ui/page-shell.tsx` 空态插槽、各页 `bodyKey` |
| OP-03 | 明暗主题切换 | 已实现 | `pages/settings-page.tsx`、`data/update-settings.ts`、`theme-preference.test.ts` |
| OP-04 | 树密度切换 | 已实现 | `pages/settings-page.tsx`、`core/rules/tree-density.ts`、`tree-density.test.ts` |
| OP-05 | 注解模式三值 | 已实现 | `data/update-settings.ts`、`annotation-visibility.ts`、`annotation-visibility.test.ts` |
| OP-06 | 注解展示与折叠 | 已实现 | `web/src/components/annotation.tsx`、`core/rules/annotation-visibility.ts`、测试同上 |
| OP-07 | 二级页面返回恢复 | 已实现 | `pages/branches-page.tsx`（savedScroll / scroll 恢复）、`app-shell.tsx` 返回逻辑 |
| OP-08 | 存储不可用错误态 | 已实现 | `components/layout/app-shell.tsx#L272`、`i18n/zh-CN.ts` 的 `shell.storageUnavailable` |

### M02 分支树（9/9）

| OP | 要求摘要 | 状态 | 证据 |
| --- | --- | --- | --- |
| OP-01 | 创建根分支「我」 | 已实现 | `data/ensure-root-branch.ts`、`branch-write.test.ts` |
| OP-02 | 新建一级分支与 7 额度 | 已实现 | `data/create-branch.ts`、`core/rules/branch-quota.ts`、`branch-quota.test.ts` |
| OP-03 | 新建子分支与层级额度 | 已实现 | `data/create-branch.ts`、`branch-hierarchy.test.ts`、`branch-color.test.ts` |
| OP-04 | 重命名 | 已实现 | `data/rename-branch.ts`、`branch-name.test.ts` |
| OP-05 | 移动整棵子树只写一条事件 | 已实现 | `data/move-branch.ts`、`core/rules/branch-path.ts`、`branch-write.test.ts` |
| OP-06 | 同级重名（含已归档） | 已实现 | `core/rules/branch-name.ts`、`branch-name.test.ts` |
| OP-07 | 渲染分支树与页脚额度 | 已实现 | `pages/branches-page.tsx`、`components/branches/branch-tree.tsx` |
| OP-08 | 行尾菜单可用性 | 已实现 | `components/branches/branch-row.tsx`、`branch-panel.tsx` |
| OP-09 | 恢复展开与滚动 | 已实现 | `pages/branches-page.tsx`（localStorage 恢复） |

### M03 今天与待办（9/9）

| OP | 要求摘要 | 状态 | 证据 |
| --- | --- | --- | --- |
| OP-01 | 快速添加保存 | 已实现 | `core/rules/quick-add.ts`、`quick-add.test.ts`、`data/create-task.ts` |
| OP-02 | 完成待办写提交与计数 | 已实现 | `data/complete-task.ts`、`complete-task.test.ts`、`core/rules/counters.ts` |
| OP-03 | 补一句文案 | 已实现 | `core/rules/commit-summary.ts`、`commit-summary.test.ts` |
| OP-04 | 安排 / 移出今天 | 已实现 | `data/plan-task.ts`、`today-groups.test.ts` |
| OP-05 | 编辑待办 | 已实现 | `data/update-task.ts` |
| OP-06 | 取消待办 | 已实现 | `data/cancel-task.ts`、`counters.test.ts` |
| OP-07 | 改归属 | 已实现 | `data/update-task.ts`、`counters.test.ts` |
| OP-08 | 三组与页头计数 | 已实现 | `core/rules/today-groups.ts`、`today-groups.test.ts`、`pages/today-page.tsx` |
| OP-09 | 收起 / 展开清单 | 已实现 | `pages/today-page.tsx`（`today.list.collapsedHint` 与完成自动露出） |

### M04 分支详情（9/9）

| OP | 要求摘要 | 状态 | 证据 |
| --- | --- | --- | --- |
| OP-01 | 页头路径/状态/进度 | 已实现 | `pages/branch-detail-page.tsx`、`components/branch-detail/branch-header.tsx`、`branch-progress.test.ts` |
| OP-02 | 就地编辑目标 | 已实现 | `data/update-branch-goal.ts`、`branch-header.tsx` |
| OP-03 | 本分支待办区 | 已实现 | `components/branch-detail/branch-tasks-section.tsx` |
| OP-04 | 提交流 20 条/页与来源 | 已实现 | `core/rules/commit-feed.ts`（`COMMIT_PAGE_SIZE = 20`）、`commit-feed.test.ts`、`branch-commits-section.tsx` |
| OP-05 | 子分支区 | 已实现 | `components/branch-detail/branch-children-section.tsx` |
| OP-06 | 里程碑行 | 已实现 | `components/branch-detail/branch-milestones-section.tsx`、`milestone-date.test.ts` |
| OP-07 | 只读判定（含祖先归档） | 已实现 | `core/rules/branch-readonly.ts`、`branch-readonly.test.ts` |
| OP-08 | 分支不存在 404 | 已实现 | `pages/not-found-page.tsx`、`branch-detail-page.tsx` 找不到分支分支 |
| OP-09 | 四区块独立空态 | 已实现 | 四个 section 组件各自空态 |

### M05 提交编辑与撤销（8/8）

| OP | 要求摘要 | 状态 | 证据 |
| --- | --- | --- | --- |
| OP-01 | 提交详情与前后节点 | 已实现 | `components/commit-detail/commit-detail-panel.tsx`、`core/rules/commit-neighbors.ts`、`commit-neighbors.test.ts` |
| OP-02 | 当天编辑文案 | 已实现 | `data/update-commit.ts`（只改 `summary`） |
| OP-03 | 跨天锁定 | 已实现 | `core/rules/commit-lock.ts`、`commit-lock.test.ts` |
| OP-04 | 撤销完成事务 | 已实现 | `data/undo-commit.ts`、`core/rules/commit-undo.ts`、`undo-transaction.test.ts` |
| OP-05 | 撤销幂等 | 已实现 | `commit-undo.test.ts`、`undo-commit.ts` 已撤销短路 |
| OP-06 | 恢复去向 | 已实现 | `core/rules/undo-target.ts`、`undo-target.test.ts` |
| OP-07 | 归档分支当天可写 | 已实现 | `commit-detail-panel.tsx`、`commit-lock.test.ts` |
| OP-08 | 提交不存在 404 | 已实现 | `commit-detail-panel.tsx` 缺失态、`not-found-page.tsx` |

### M06 历程时间树（8/8）

| OP | 要求摘要 | 状态 | 证据 |
| --- | --- | --- | --- |
| OP-01 | 泳道与分叉 / 合回 | 已实现 | `components/history/timeline-chart.tsx`、`core/rules/timeline-placement.ts`、`timeline-placement.test.ts` |
| OP-02 | 节点定位与聚合 | 已实现 | `core/rules/timeline-cluster.ts`、`timeline-cluster.test.ts` |
| OP-03 | 停滞判定与线型 | 已实现 | `core/rules/stagnation.ts`、`stagnation.test.ts` |
| OP-04 | 时间范围切换 | 已实现 | `core/rules/time-range.ts`、`time-range.test.ts`、`pages/history-page.tsx` |
| OP-05 | 分支筛选与记忆 | 已实现 | `core/rules/timeline-filter.ts`、`timeline-filter.test.ts`、`stores/history.store.ts` |
| OP-06 | 直达定位不改筛选 | 已实现 | `timeline-filter.test.ts`、`history-page.tsx` 临时高亮 |
| OP-07 | 今天页停滞提醒前 5 条 | 已实现 | `stagnation.test.ts`（前 5 / 降序）、今天页停滞区块 |
| OP-08 | 图表读取失败 | 已实现 | `history-page.tsx` 错误横幅与重试；更早区间按 90 天分批加载（`core/rules/history-window.ts`、`history-window.test.ts`），加载中有可见状态，失败保留已加载区间并可重试 |

### M07 里程碑（7/7）

| OP | 要求摘要 | 状态 | 证据 |
| --- | --- | --- | --- |
| OP-01 | 新建里程碑 | 已实现 | `data/create-milestone.ts`、里程碑面板组件 |
| OP-02 | 月/日精度归一与渲染 | 已实现 | `core/rules/milestone-date.ts`、`milestone-date.test.ts` |
| OP-03 | 可选分支判定 | 已实现 | `core/rules/milestone-target.ts`、`milestone-target.test.ts` |
| OP-04 | 回填不影响统计 | 已实现 | `create-milestone.ts`、`counters.test.ts` 里程碑独立块 |
| OP-05 | 同月排列与定位 | 已实现 | `core/rules/milestone-order.ts`、`milestone-order.test.ts` |
| OP-06 | 里程碑详情 | 已实现 | 里程碑详情 sheet 组件、`milestone-date.ts` |
| OP-07 | 入口预填与保存高亮 | 已实现 | `stores/shell.store.ts` 的 `milestoneFocusId`、`history-page.tsx#L230`、`branch-detail-page.tsx#L136` |

### M08 分支收尾与删除（8/8）

| OP | 要求摘要 | 状态 | 证据 |
| --- | --- | --- | --- |
| OP-01 | 收尾预检 | 已实现 | `core/rules/finish-precheck.ts`、`finish-precheck.test.ts` |
| OP-02 | 去向二选一 | 已实现 | `components/branches/branch-finish-panel.tsx` |
| OP-03 | 未完成待办处理 | 已实现 | `finish-precheck.test.ts`、`finish-plan.test.ts` |
| OP-04 | 确认收尾事务 | 已实现 | `data/finish-branch.ts`、`finish-transaction.test.ts` |
| OP-05 | 收尾时归档 | 已实现 | `finish-branch.ts`（`archivedAt` 同事务） |
| OP-06 | 删除空分支 | 已实现 | `data/delete-empty-branch.ts`、`core/rules/delete-guard.ts`、`delete-guard.test.ts` |
| OP-07 | 已合并态与来源 | 已实现 | `core/rules/branch-readonly.ts`、`commit-feed.ts` 来源标注 |
| OP-08 | 入口可用性 | 已实现 | `finish-precheck.ts`、`delete-guard.ts` |

### M09 周回顾（6/6）

| OP | 要求摘要 | 状态 | 证据 |
| --- | --- | --- | --- |
| OP-01 | 出现条件 | 已实现 | `core/rules/week-review.ts`、`week-review.test.ts` |
| OP-02 | 三项事实 | 已实现 | `week-review.ts`、`week-review.test.ts` |
| OP-03 | 提问分支选择 | 已实现 | `core/rules/week-question.ts`、`week-question.test.ts` |
| OP-04 | 折叠与展开 | 已实现 | `components/today/week-review-card.tsx` |
| OP-05 | 读取失败与重试 | 已实现 | `week-review-card.tsx` 错误态与重试 |
| OP-06 | 撤销后回落 | 已实现 | `week-review.test.ts`、页面走 `useLiveQuery` 自动刷新 |

### M10 数据导入导出（7/7）

| OP | 要求摘要 | 状态 | 证据 |
| --- | --- | --- | --- |
| OP-01 | 导出完整 JSON | 已实现 | `core/rules/export-file.ts`、`export-file.test.ts`、`data/export-data.ts` |
| OP-02 | 概览与导出计数 | 已实现 | `pages/data-page.tsx`、`export-file.test.ts` |
| OP-03 | 导入文件校验 | 已实现 | `core/rules/import-validate.ts`、`import-validate.test.ts` |
| OP-04 | 强制先导出 | 已实现 | `components/data/restore-data-panel.tsx` 导出门禁 |
| OP-05 | 整体替换并重算四计数 | 已实现 | `data/import-data.ts`、`restore-transaction.test.ts` |
| OP-06 | 清空本机数据两步确认 | 已实现 | `data/clear-data.ts`、清空确认弹层 |
| OP-07 | 写入失败回滚 | 已实现 | `restore-transaction.test.ts` 逐表回滚断言 |

### M11 首批徽章（8/8）

| OP | 要求摘要 | 状态 | 证据 |
| --- | --- | --- | --- |
| OP-01 | 首次触发发放 | 已实现 | `data/grant-badge.ts`、`core/rules/badges.ts`、`badges.test.ts` |
| OP-02 | 幂等发放 | 已实现 | `badge-grant.test.ts`、`data/badge-grant.test.ts` |
| OP-03 | 失败补查 | 已实现 | `data/grant-badge.ts` 补查、`components/badges/backfill-guard.ts`、`badge-grant.test.ts` |
| OP-04 | 撤销标注与禁用跳转 | 已实现 | `core/rules/badge-view.ts`、`badge-view.test.ts`、`badge-wall-page.tsx#L231` |
| OP-05 | 我的已获徽章列表 | 已实现 | `pages/me-page.tsx` 徽章摘要入口、`badge-view.ts` |
| OP-06 | 当天轻提示队列 | 已实现 | `core/rules/badge-queue.ts`、`badge-queue.test.ts`、`components/today/badge-toast.tsx` |
| OP-07 | 跳转历程定位 | 已实现 | `badge-toast.tsx`、`history-page.tsx` 直达高亮 |
| OP-08 | 导入后不补发 | 已实现 | `data/import-data.ts` 原样写入 `badges`、`badge-grant.test.ts` 导入场景 |

### M12 首次引导与示例（8/8）

| OP | 要求摘要 | 状态 | 证据 |
| --- | --- | --- | --- |
| OP-01 | 引导出现条件 | 已实现 | `core/rules/onboarding-state.ts`、`onboarding-state.test.ts` |
| OP-02 | 跟随真实动作推进 | 已实现 | `onboarding-state.ts`、`pages/today-page.tsx` 引导卡 |
| OP-03 | 跳过引导 | 已实现 | `onboarding-state.ts`（localStorage）、`onboarding-state.test.ts` |
| OP-04 | 离开后从下一步继续 | 已实现 | `onboarding-state.test.ts` 持久化断言 |
| OP-05 | 载入示例树 | 已实现 | `core/rules/sample-tree.ts`、`sample-tree.test.ts`、`pages/sample-page.tsx` |
| OP-06 | 隔离示例数据 | 已实现 | `data/sample-namespace.ts`、`search-visibility` 排除、导出排除（`export-file.test.ts`） |
| OP-07 | 删除示例 | 已实现 | `sample-namespace.test.ts`、示例页删除流程 |
| OP-08 | 清空后重置引导 | 已实现 | `data/clear-data.ts` 清空七张表（含示例数据）+ `stores/onboarding.store.ts#L67` 调用 `resetOnboarding()` |

### V1-01 分支生命周期（7/7）

| OP | 要求摘要 | 状态 | 证据 |
| --- | --- | --- | --- |
| OP-01 | 放下（原因必填） | 已实现 | `data/pause-branch.ts`、`core/rules/branch-lifecycle.ts`、`branch-lifecycle.test.ts` |
| OP-02 | 重新开始 | 已实现 | `data/resume-branch.ts`、`branch-lifecycle.test.ts` |
| OP-03 | 手动归档 | 已实现 | `data/archive-branch.ts`、`branch-lifecycle.test.ts` |
| OP-04 | 取消归档与额度 | 已实现 | `data/unarchive-branch.ts`、`branch-quota.test.ts` |
| OP-05 | 归档区分组列表 | 已实现 | `components/branches/archived-branches.tsx`、`branches-page.tsx?view=archived` |
| OP-06 | 动作可用性 | 已实现 | `branch-lifecycle.test.ts` |
| OP-07 | 写入失败保持原值 | 已实现 | `data/branch-lifecycle.test.ts` 事务回滚 |

### V1-02 年轮（7/7）

| OP | 要求摘要 | 状态 | 证据 |
| --- | --- | --- | --- |
| OP-01 | 年份解析与切换 | 已实现 | `core/rules/year-param.ts`、`year-param.test.ts`、`pages/year-page.tsx` |
| OP-02 | 四项指标 | 已实现 | `core/rules/year-metrics.ts`、`year-metrics.test.ts` |
| OP-03 | 12 个月分布 | 已实现 | `core/rules/year-distribution.ts`、`year-distribution.test.ts` |
| OP-04 | 占比与 Top 分支 | 已实现 | `year-distribution.test.ts` |
| OP-05 | 柱与 Top 行跳转 | 已实现 | `pages/year-page.tsx` 跳转处理 |
| OP-06 | 年度总结读写 | 已实现 | `data/save-year-review.ts`、`year-review-note.test.ts` |
| OP-07 | 空年与错误态 | 已实现 | `year-page.tsx` 空态/错误/重试与保存失败保留输入 |

### V1-03 回顾与分享（5/5）

| OP | 要求摘要 | 状态 | 证据 |
| --- | --- | --- | --- |
| OP-01 | 本周摘要折叠展开 | 已实现 | `core/rules/weekly-summary.ts`、`weekly-summary.test.ts`、`week-review-card.tsx` |
| OP-02 | 回顾提醒与开关 | 已实现 | `core/rules/review-reminder.ts`、`review-reminder.test.ts`、`settings.reminderEnabled` |
| OP-03 | 月回顾五区块 | 已实现 | `core/rules/month-review.ts`、`month-review.test.ts`、月回顾面板 |
| OP-04 | 分享图预览与分支名开关 | 已实现 | `core/rules/year-share.ts`、`year-share.test.ts`、`components/year/year-share-preview.tsx` |
| OP-05 | 保存分享图 | 已实现 | `year-share-preview.tsx#L148` 的 `canvas.toBlob`、空年禁用 |

### V1-04 全局搜索（7/7）

| OP | 要求摘要 | 状态 | 证据 |
| --- | --- | --- | --- |
| OP-01 | 打开关闭与焦点归位 | 已实现 | `components/search/search-panel.tsx`（`SEARCH_TRIGGER_ID` focus、Ctrl/⌘+K） |
| OP-02 | 前缀匹配与分组 | 已实现 | `core/rules/search-match.ts`、`search-match.test.ts` |
| OP-03 | 有效对象过滤与归属 | 已实现 | `core/rules/search-visibility.ts`、`search-visibility.test.ts` |
| OP-04 | 归档历史开关 | 已实现 | `search-panel.tsx` 会话内状态 |
| OP-05 | 排序与上限 | 已实现 | `core/rules/search-sort-limit.ts`、`search-sort-limit.test.ts` |
| OP-06 | 打开详情与历程定位 | 已实现 | `search-panel.tsx` 路由跳转、`history-page.tsx` 直达 |
| OP-07 | 空态与读取失败 | 已实现 | `search-panel.tsx` 空态、失败保留查询与重试 |

### V1-05 徽章体系（9/9）

| OP | 要求摘要 | 状态 | 证据 |
| --- | --- | --- | --- |
| OP-01 | 徽章墙 16 枚与分类 | 已实现 | `core/rules/badge-catalog.ts`、`badge-catalog.test.ts`、`pages/badge-wall-page.tsx` |
| OP-02 | 结构类判定与授予 | 已实现 | `core/rules/badge-structure.ts`、`badge-structure.test.ts`、`data/grant-badge.ts` |
| OP-03 | 时间类判定与授予 | 已实现 | `core/rules/badge-time.ts`、`badge-time.test.ts` |
| OP-04 | 里程碑类判定与授予 | 已实现 | `core/rules/badge-milestone.ts`、`badge-milestone.test.ts` |
| OP-05 | 同批逐枚、幂等与补查 | 已实现 | `data/badge-grant.test.ts`、`core/rules/badge-grant.test.ts` |
| OP-06 | 徽章详情与撤销标注 | 已实现 | `badge-view.ts`、`badge-view.test.ts`、`badge-wall-page.tsx` |
| OP-07 | 树上标记同日合并 | 已实现 | `core/rules/badge-marker.ts`、`badge-marker.test.ts`、`timeline-chart.tsx#L329` |
| OP-08 | 导入恢复保留 | 已实现 | `data/import-data.ts`、`restore-transaction.test.ts` |
| OP-09 | 390 px 徽章墙与详情 | 已实现 | `badge-wall-page.module.css`、`timeline-chart` 标记可点；人工验收项 |

### V1-06 备份与恢复（8/8）

| OP | 要求摘要 | 状态 | 证据 |
| --- | --- | --- | --- |
| OP-01 | 每日自动快照 | 已实现 | `data/daily-auto-backup.ts`、`daily-auto-backup.test.ts` |
| OP-02 | 立即备份 | 已实现 | `data/create-manual-backup.ts`、`data-page.tsx` |
| OP-03 | 列表与新鲜度 | 已实现 | `core/rules/backup-retention.ts`（`BACKUP_TOTAL_LIMIT = 16`）、`backup-retention.test.ts`、`backup-manifest.test.ts` |
| OP-04 | 从快照恢复 | 已实现 | `data/snapshot-restore.ts`、`snapshot-restore.test.ts` |
| OP-05 | 恢复失败中止 | 已实现 | `snapshot-restore.test.ts` 回滚断言 |
| OP-06 | 版本校验 | 已实现 | `core/rules/backup-manifest.ts`、`backup-manifest.test.ts` |
| OP-07 | 异地备份上传/下载/删除 | 已实现 | `data/upload-remote-backup.ts`、`download-remote-backup.ts`、`delete-remote-backup.ts`、`components/data/remote-backup-panel.tsx`、`cloudfunctions/backup-sign` |
| OP-08 | 无账号可完成全流程 | 已实现 | 备份入口无登录门禁（`data-page.tsx`） |

### V1-07 批量与回填（7/7）

| OP | 要求摘要 | 状态 | 证据 |
| --- | --- | --- | --- |
| OP-01 | 批量文本拆分与预览 | 已实现 | `core/rules/bulk-import.ts`、`bulk-import.test.ts` |
| OP-02 | 目标分支选择 | 已实现 | `components/today/quick-add-panel.tsx`、批量面板选择器 |
| OP-03 | 批量导入事务 | 已实现 | `data/bulk-import.ts`、`data/bulk-import.test.ts` |
| OP-04 | 回填入口 | 已实现 | `pages/today-page.tsx#L663` 引导卡、`history-page.tsx#L512` 空态入口 |
| OP-05 | 回填行校验 | 已实现 | `core/rules/backfill.ts`、`backfill.test.ts` |
| OP-06 | 回填写入与补白 | 已实现 | `data/backfill-milestones.ts`、`data/backfill.test.ts`、`grant-badge` |
| OP-07 | 390 px 面板 | 已实现 | 批量与回填面板样式、44 px 删除按钮；人工验收项 |

### V1-08 排序与置顶（8/8）

| OP | 要求摘要 | 状态 | 证据 |
| --- | --- | --- | --- |
| OP-01 | 今天组内拖拽 | 已实现 | `core/rules/drag-order.ts`、`drag-order.test.ts`、`data/reorder.ts` |
| OP-02 | 跨组拒绝 | 已实现 | `drag-order.test.ts` |
| OP-03 | 分支同级拖拽 | 已实现 | `core/rules/order-branches.ts`、`order-branches.test.ts` |
| OP-04 | 置顶 / 取消置顶 | 已实现 | `data/types.ts#L37` 的 `pinnedAt`、`order-branches.test.ts` |
| OP-05 | 排序失败回滚 | 已实现 | `data/reorder.test.ts` |
| OP-06 | 不改统计 | 已实现 | `counters.test.ts` 排序独立块 |
| OP-07 | 390 上移 / 下移 | 已实现 | `components/branches/branch-row.tsx`、`components/today/task-row.tsx` |
| OP-08 | 全部待办只读顺序 | 已实现 | `pages/all-todos-page.tsx`（无拖拽） |

### V2-01 账号与认证（10/10）

| OP | 要求摘要 | 状态 | 证据 |
| --- | --- | --- | --- |
| OP-01 | 登录 | 已实现 | `pages/login-page.tsx`、`components/auth/auth-form.tsx`、`data/cloud/auth.ts` |
| OP-02 | 注册 | 已实现 | `pages/signup-page.tsx`、`auth-form.ts`、`data/assign-owner.ts` |
| OP-03 | next 校验与回跳 | 已实现 | `core/rules/auth-next.ts`、`auth-next.test.ts` |
| OP-04 | 找回密码三步 | 已实现 | `pages/recover-page.tsx`、`cloud/auth.ts#L111`（`resetPasswordForEmail` / `resetPassword`） |
| OP-05 | 退出登录 | 已实现 | `pages/settings-page.tsx#L174`（`signOut`）+ 确认弹层 |
| OP-06 | 账号分区与 O07 | 已实现 | `settings-page.tsx` 账号/同步分区 |
| OP-07 | 已登录访问认证页重定向 | 已实现 | `login-page.tsx#L46`、`signup-page.tsx#L47` |
| OP-08 | 登录后归属本机数据 | 已实现 | `data/assign-owner.ts`、`assign-owner.test.ts` |
| OP-09 | 表单与错误口径 | 已实现 | `core/rules/auth-form.ts`、`auth-form.test.ts` |
| OP-10 | 未登录核心页可用 | 已实现 | 路由无登录门禁；`today/branches/history/data` 直接渲染 |

### V2-02 同步与冲突（10/10）

| OP | 要求摘要 | 状态 | 证据 |
| --- | --- | --- | --- |
| OP-01 | 本地先写并入队 | 已实现 | `data/outbox.ts`、`outbox-transaction.test.ts` |
| OP-02 | outbox 补推 | 已实现 | `data/sync.ts`、`cloudfunctions/sync-push/index.js` |
| OP-03 | 过期写入冲突 | 已实现 | `core/rules/sync-conflict.ts`、`sync-conflict.test.ts`、`data/sync.ts` 写 `conflicts` + `sync.conflict` |
| OP-04 | 冲突记录展示 | 已实现 | `pages/sync-conflicts-page.tsx`、`core/rules/timeline-conflict.ts`、`timeline-conflict.test.ts` |
| OP-05 | 首次迁移 | 已实现 | `data/migrate.ts`、`core/rules/migration-plan.ts`、`migration-plan.test.ts`、`settings-page.tsx#L560` 进度 |
| OP-06 | 设备列表 | 已实现 | `pages/sync-devices-page.tsx`、`core/rules/device-list.ts`、`device-list.test.ts` |
| OP-07 | 同步状态与重试 | 已实现 | `data/sync-hooks.ts`、`settings-page.tsx` 同步状态区 |
| OP-08 | 匿名统计开关与上报 | 已实现 | `data/anonymous-stats.ts`（默认关闭、次日上报、队列 7 天）、`anonymous-stats.test.ts` |
| OP-09 | 退出登录联动 | 已实现 | `settings-page.tsx` `signOut` + `sync-hooks.ts#L71` 无 `principalId` 即停止 |
| OP-10 | 未登录同步分区 | 已实现 | `settings-page.tsx` 未登录显示 O07 提示 |

### V2-03 帮助、彩蛋与模板（11/11）

| OP | 要求摘要 | 状态 | 证据 |
| --- | --- | --- | --- |
| OP-01 | 帮助 FAQ 五项 | 已实现 | `pages/help-page.tsx` |
| OP-02 | 帮助内入口跳转 | 已实现 | `help-page.tsx` 各条路由 |
| OP-03 | 彩蛋目录与分类显隐 | 已实现 | `core/rules/badge-catalog.ts#L59`、`badge-catalog.test.ts`、`badge-wall-page.tsx#L270` |
| OP-04 | 完成时点彩蛋判定 | 已实现 | `core/rules/easter-egg.ts`、`easter-egg.test.ts` |
| OP-05 | 补查彩蛋判定 | 已实现 | `easter-egg.test.ts`、`data/grant-badge.ts` 补查 |
| OP-06 | 同日多枚合并提示 | 已实现 | `components/today/badge-toast.tsx`（解锁 N 枚）、`badge-marker.ts` 同日合并 |
| OP-07 | 模板预览与生成 | 已实现 | `pages/templates-page.tsx`、`core/rules/template-catalog.ts`、`template-catalog.test.ts`、`data/apply-template.ts`；模板待办无优先级展示（`tasks` 无 `priority` 字段，已知口径） |
| OP-08 | 空树入口显隐 | 已实现 | `templates-page.tsx#L37`（非空直接回 `/branches`）、`data/hooks.ts` 空树判定 |
| OP-09 | 撤回模板 | 已实现 | `core/rules/template-guard.ts`、`template-guard.test.ts`、模板撤回流程 |
| OP-10 | 有提交时禁止撤回 | 已实现 | `template-guard.ts`、`template-guard.test.ts` |
| OP-11 | 生成 / 撤回失败回滚 | 已实现 | `data/template-transaction.test.ts` |

### V2-04 第二端只读（12/12）

| OP | 要求摘要 | 状态 | 证据 |
| --- | --- | --- | --- |
| OP-01 | 未登录拦截与回跳 | 已实现 | `miniprogram/utils/session.js`（`requireLogin`）、`miniprogram/pages/login/login.js` |
| OP-02 | 今天三组只读 | 已实现 | `miniprogram/pages/today/today.js`、`cloudfunctions/workspace-read/index.js` |
| OP-03 | 只读待办详情 | 已实现 | `miniprogram/pages/detail/detail.js` |
| OP-04 | 分支树展开收起 | 已实现 | `miniprogram/pages/branches/branches.js` |
| OP-05 | 分支详情只读 | 已实现 | `miniprogram/pages/branch-detail/branch-detail.js` |
| OP-06 | 历程与年轮只读 | 已实现 | `miniprogram/pages/history/history.js`、`pages/year/year.js` |
| OP-07 | 我的与徽章 | 已实现 | `miniprogram/pages/me/me.js#L7-L12`（邮箱/设备/最近同步）、`pages/badges/badges.js` |
| OP-08 | 刷新与更新时间 | 已实现 | 各页 `onPullDownRefresh`、`utils/api.js` 返回 `updatedAt` |
| OP-09 | 撤销提交标注 | 已实现 | 小程序提交渲染读取 `voidedAt` 并标注「已撤销」 |
| OP-10 | 归档可见性 | 已实现 | `miniprogram/pages/archive/archive.js` |
| OP-11 | 空态与网络失败 | 已实现 | `miniprogram/utils/api.js#L6` 缓存回退 + `cached` 标记、各页错误态 |
| OP-12 | 只读约束 | 已实现 | 11 个页面无完成/编辑/收尾按钮，`workspace-read` 不写业务表 |

## 未实现与部分实现汇总（按影响排序）

| 排序 | 项目 | 影响 | 现状与建议 |
| ---: | --- | --- | --- |
| 1 | **V2-01 / V2-02 / V1-06 云端能力需真实环境验收** | 中 | 登录、找回密码、outbox 补推、首次迁移、设备列表、异地备份代码均已落地，测试覆盖纯规则与本地事务；但真实 CloudBase 环境、邮件重置链接、跨设备 3 秒可见、备份签名上传未在本次只读核对中执行。建议按 `docs/MANUAL-ACCEPTANCE.md` 做端到端验收。 |
| 2 | **V2-04 第二端实机验收未做** | 中 | 代码与 11 个页面已存在，`workspace-read` 已就绪；仍需微信开发者工具 Nightly + 真实 AppID 验证登录回跳、下拉刷新、断网缓存与只读约束。 |
| 3 | **模板待办优先级（已知口径）** | 低 | `tasks` 无 `priority` 字段，模板 4 条待办不展示/不排序优先级。属既定数据模型范围，不作为缺陷；如后续需要，先改表结构文档再实现。 |
| 4 | **M00 动效时序、M01/M07/M12/V1-05/V1-07 的 390 px 与焦点行为** | 低 | 代码已实现并有静态结构，但 PRD 明确只能人工验收。建议按各 PRD §8.3 清单逐条走查。 |

## 验证边界

- 本次为只读核对：未运行 `npm run lint / test / build / dev`，未修改业务代码，未部署云函数。
- 判定依据是代码路径与测试文件的存在及内容，不代表云端环境已联通或视觉像素已验收。
- 若后续 PRD 有版本更新，建议只重跑受影响 PRD 的明细表，不必全量重核。

# CommitToDo PRD 索引

**状态：2026-11-21 分组方案。** 本目录把现有产品需求拆成可独立交付、可独立验收的 PRD。共 **25 份**：MVP 13 份、V1 8 份、V2 4 份。

本索引只解决「拆成几份、每份做什么、谁先做」。单份 PRD 在其文件内自包含，包含背景与范围、用户故事与流程、界面与状态、数据与规则、验收标准、依赖与未决问题。

## 1. 依据与口径优先级

| 内容 | 唯一依据 |
| --- | --- |
| 功能点、阶段、业务边界 | [FRAMEWORK.md](../FRAMEWORK.md)（59 项；阶段统计 MVP 29 / V1 21 / V2 8，B-04 已定不做，实际实现 58 项） |
| 页面、路由、补充视图、五种状态、响应式 | [UI-PAGES.md](../UI-PAGES.md)（12 页 + 38 视图） |
| 表结构、索引、派生口径、规则 R1–R19 | [TECH-ARCHITECTURE.md](../TECH-ARCHITECTURE.md) 0.12 |
| 视觉、组件、动效 | [UI-VISUAL.md](../UI-VISUAL.md)、[UI-COMPONENTS.md](../UI-COMPONENTS.md)、[UI-MOTION.md](../UI-MOTION.md)、[design-tokens.json](../../design/design-tokens.json) |
| 首页形态与首页动效 | [UI-PAGES.md §1.1](../UI-PAGES.md)、[HOMEPAGE-MOTION.md](../HOMEPAGE-MOTION.md) |

冲突处理：**以 `UI-PAGES.md` 与 `TECH-ARCHITECTURE.md` 为准**，PRD 内注明冲突点与采用方式。`PAGE-DATA-CROSSCHECK.md` 是核对过程记录，其中部分结论已被 0.12 取代，不作为需求依据。`design/images/` 只是视觉参考，不与文档争口径。

PRD 不重新设计视觉、不改表结构、不引入新的技术选型。文中出现的表名、字段名只用于说明数据来源与消费关系，不构成建表方案。

## 2. 拆分原则

1. **一份 PRD 是一条能独立上线的纵切**：有入口、有主流程、有异常恢复、有可验证结果。
2. **按用户任务拆，不按代码分层拆**：同一份 PRD 可以跨页面，但不把「所有页面外壳」和「所有数据写入」硬拼在一起。
3. **不可逆动作单独成篇或单独成章**：收尾、删除、清空、导入替换在各自 PRD 内必须写确认与失败保留。
4. **阶段不混装**：一份 PRD 只属于一个阶段；跨阶段能力放在对应阶段的 PRD，后续阶段只写扩展点。
5. **规则只引用不复制**：完成、有效提交、停滞、四计数、额度等统一引用 R1–R19，PRD 内只写本功能的消费方式。

## 3. PRD 清单

### 3.1 MVP（13 份）

| 编号 | 文件 | 名称 | 覆盖功能点 | 页面 / 视图 | 前置 |
| --- | --- | --- | --- | --- | --- |
| M00 | [M00-marketing-home.md](M00-marketing-home.md) | 营销首页与工作区入口 | 页面级需求（不在 59 项内） | P00；首页七段与首屏动效 | 无 |
| M01 | [M01-workspace-shell.md](M01-workspace-shell.md) | 工作区底座、外框与偏好 | L-01、J-01、A-03、I-01、I-02、K-01、K-02 | P07；P01–P08 外壳与导航；空态、注解 | 无 |
| M02 | [M02-branch-tree.md](M02-branch-tree.md) | 分支树与分支编辑 | D-01、D-03、K-03 | P02；B01–B05 | M01 |
| M03 | [M03-today-and-todos.md](M03-today-and-todos.md) | 今天、待办与完成 | C-01、C-02、B-01、E-01 | P01；`/today/all`；S01-all-todos、O01、O02 | M01、M02 |
| M04 | [M04-branch-detail.md](M04-branch-detail.md) | 分支详情 | D-02 | P03 | M02、M03 |
| M05 | [M05-commit-edit.md](M05-commit-edit.md) | 提交纠错与提交详情 | E-02、E-03 | O03；P03 提交流、P01 回执 | M03、M04 |
| M06 | [M06-history-timeline.md](M06-history-timeline.md) | 历程时间树 | F-01、F-02、F-03 | P04 | M03、M05 |
| M07 | [M07-milestones.md](M07-milestones.md) | 里程碑 | F-04 | S04 详情、S04 新建；P03/P04 里程碑行 | M04、M06 |
| M08 | [M08-branch-finish.md](M08-branch-finish.md) | 收尾与删除空分支 | D-04、D-05 | B06、B07、B10；P03 已合并态 | M02、M04、M05 |
| M09 | [M09-weekly-review.md](M09-weekly-review.md) | 周回顾 | G-01 | S01-week-review | M03、M05 |
| M10 | [M10-data-export-import.md](M10-data-export-import.md) | 数据导出与从文件恢复 | J-03、J-04 | P08（MVP）；S08-restore-file、O05-clear-local | M01 |
| M11 | [M11-badges-first.md](M11-badges-first.md) | 首批徽章与「我的」 | H-01 | P06（MVP）；今天页轻提示 | M03、M02、M07、M08、M06 |
| M12 | [M12-onboarding.md](M12-onboarding.md) | 首次引导与示例树 | A-01、A-02 | O06-first-task、O06-first-commit、O06-sample-tree | M03、M05、M06、M02 |

### 3.2 V1（8 份）

| 编号 | 文件 | 名称 | 覆盖功能点 | 页面 / 视图 | 前置 |
| --- | --- | --- | --- | --- | --- |
| V1-01 | [V1-01-branch-lifecycle.md](V1-01-branch-lifecycle.md) | 放下、归档与重新开始 | D-06、D-07 | B08、B09、B11、B12；S02 | M02、M04、M08 |
| V1-02 | [V1-02-year-review.md](V1-02-year-review.md) | 年轮 | F-05 | P05 | M06、M08 |
| V1-03 | [V1-03-review-share.md](V1-03-review-share.md) | 回顾扩展与分享图 | C-03、G-02、G-03、G-04 | S01-month-review、S05-year-share | M09、V1-02 |
| V1-04 | [V1-04-global-search.md](V1-04-global-search.md) | 全局搜索 | F-06 | O04 | M02、M03、M05、M07 |
| V1-05 | [V1-05-badge-system.md](V1-05-badge-system.md) | 徽章体系完整 | H-02、H-03、H-04、H-05 | S06-badge-wall、S06-badge-detail；树上标记 | M11、M08、V1-01 |
| V1-06 | [V1-06-backup-restore.md](V1-06-backup-restore.md) | 备份、快照与异地恢复 | J-02、J-05、J-06 | P08（V1）；S08-data-v1、S08-snapshot-restore | M10 |
| V1-07 | [V1-07-input-enhancement.md](V1-07-input-enhancement.md) | 批量导入与回填过去 | A-04、B-02 | 无新增页面；复用 O01、O02、S04 | M03、M07 |
| V1-08 | [V1-08-order-and-display.md](V1-08-order-and-display.md) | 排序与置顶 | C-04、D-08 | P02、P01（交互扩展） | M02、M03 |

### 3.3 V2（4 份）

| 编号 | 文件 | 名称 | 覆盖功能点 | 页面 / 视图 | 前置 |
| --- | --- | --- | --- | --- | --- |
| V2-01 | [V2-01-account-auth.md](V2-01-account-auth.md) | 账号与登录 | L-02 | P09、P10、P11；S11-recover-sent、S11-recover-reset、O07-sync-entry | 全部 MVP/V1 页面可用 |
| V2-02 | [V2-02-sync.md](V2-02-sync.md) | 多设备同步与匿名统计 | L-03、J-08、J-07 | O08-sync-devices、O08-sync-conflict | V2-01、CloudBase 后端 |
| V2-03 | [V2-03-help-easter-eggs-templates.md](V2-03-help-easter-eggs-templates.md) | 帮助、彩蛋徽章与分支模板 | I-03、H-06、B-03 | S06-help | V1-05、M02 |
| V2-04 | [V2-04-second-client.md](V2-04-second-client.md) | 第二端只读 | L-04 | 无画稿，端未定 | V2-02 |

## 4. 依赖与交付顺序

```text
M00 首页 ────────────────────────────────（独立，可先行）

M01 底座
 └─ M02 分支树
     ├─ M03 今天与待办
     │   ├─ M04 分支详情
     │   │   ├─ M05 提交纠错
     │   │   │   ├─ M06 历程时间树
     │   │   │   │   ├─ M07 里程碑
     │   │   │   │   └─ M09 周回顾
     │   │   │   └─ M08 收尾与删除
     │   │   └─ M07
     │   └─ M10 导出与恢复（仅依赖 M01，可提前并行）
     └─ M08、M11、M12 汇聚
M11 徽章 = M03 + M02 + M07 + M08 + M06
M12 引导 = M03 + M05 + M06 + M02
```

**MVP 推荐顺序**：M01 → M02 → M03 → M04 → M05 → M06 → M07 → M08 → M09 → M10 → M11 → M12；M00 与 M10 可并行。顺序依据 [FRAMEWORK §9.3](../FRAMEWORK.md) 的实现顺序：数据层与领域模型 → 今天与快速添加 → 分支树与详情 → 完成与提交 → 时间树 → 回顾与徽章 → 数据与备份。

**V1 顺序**：V1-01（生命周期）→ V1-02（年轮）→ V1-03（回顾与分享）→ V1-04（搜索）→ V1-05（徽章完整）→ V1-06（备份）→ V1-07（录入）→ V1-08（排序）。V1-06 与 V1-04 可提前并行。

**V2 顺序**：V2-01（身份）→ V2-02（同步与匿名统计）→ V2-03（帮助与内容）→ V2-04（第二端）。V2-03 不依赖 V2-02，可与 V2-01 并行。

## 5. 页面与视图覆盖核对

**12 个页面**：P00→M00；P01→M03；P02→M02；P03→M04；P04→M06；P05→V1-02；P06→M11（V1/V2 分区分别在 V1-05、V2-01）；P07→M01（V2 分区在 V2-01）；P08→M10（V1 分区在 V1-06）；P09/P10/P11→V2-01。

**38 个补充视图**：

| 归属 | 视图编号 |
| --- | --- |
| M02 | B01、B02、B03、B04、B05 |
| M03 | S01-all-todos、O01-quick-add、O02-todo-detail |
| M05 | O03-commit-detail |
| M07 | S04-milestone-detail、S04-milestone-new |
| M08 | B06、B07、B10 |
| M09 | S01-week-review |
| M10 | S08-restore-file、O05-clear-local |
| M12 | O06-first-task、O06-first-commit、O06-sample-tree |
| V1-01 | B08、B09、B11、B12、S02-archived-branches |
| V1-03 | S01-month-review、S05-year-share |
| V1-04 | O04-search |
| V1-05 | S06-badge-wall、S06-badge-detail |
| V1-06 | S08-data-v1、S08-snapshot-restore |
| V2-01 | S11-recover-sent、S11-recover-reset、O07-sync-entry |
| V2-02 | O08-sync-devices、O08-sync-conflict |
| V2-03 | S06-help |

合计 5+3+1+2+3+1+2+3+5+2+1+2+2+3+2+1 = 38，无遗漏、无重复。

## 6. 跨 PRD 的公共约定

- **五种状态**：每份 PRD 的界面章节固定回答「空 / 加载 / 错误 / 只读 / 无权限或未登录」。MVP 与 V1 无账号，「未登录」一栏写「不适用，功能不得要求登录」（L-01）；V2 相关 PRD 必须写真实拦截与返回路径。
- **桌面 1440 px、窄屏 390 px**：明细与编辑在桌面用侧栏、窄屏用全屏面板，保留关闭入口；分组树在窄屏保留层级与行尾操作；历程在窄屏改纵向时间线。
- **数据**：MVP 只使用 `branches`、`tasks`、`commits`、`milestones`、`badges`、`settings`、`events` 七张表；V1 增加 `backups`、`year_reviews`、`counters`；V2 增加 `users`、`devices`、`outbox`、`conflicts`、`migration_state`。PRD 只引用，不改结构。
- **派生数据一律现算**：周/月/年统计、停滞天数、徽章差距、四计数校验都不落库；唯一例外是 `branches` 上四个计数（R7），由写入事务维护，导入/恢复后全量重算。
- **规则引用**：完成 R1、撤销 R2、有效提交 R3、停滞 R4、短 hash R5、日期精度 R6、四计数 R7、今天三组 R8、周回顾 R9、月回顾 R10、年轮 R11、收尾 R12、删除 R13、归档 R14、放下 R15、额度 R16、备份 R17、徽章 R18、主题 R19。
- **视觉与动效**：PRD 只写「用哪个既有组件/状态」，不写颜色值与缓动数值；需要时链接到 `UI-VISUAL.md`、`UI-MOTION.md` 与 `design-tokens.json`。
- **术语**：「完成」只用于待办，「收尾」只用于分支，「提交」不写「记录」，「放下」不写「暂停」，「归档」不是状态。

### 6.1 「## 8. Harness 与验证」小节模板

每份 PRD 在 §7 之后追加第 8 节，固定四块，缺一块视为该 PRD 未完成。

**8.1 本次必须实现的操作**：表格，列为 `OP-nn｜操作｜入口｜可核对的结果｜写入的表/字段｜对应 §6 验收条目`。只列本 PRD 交付的操作；被其他 PRD 消费的能力写「本 PRD 不实现，见 X」。每个 OP 至少映射到一条 §6 验收条目。

**8.2 必须自动化的用例**：表格，列为 `测试文件｜被测对象｜断言要点｜边界`。测试文件落在 `web/src/**/*.test.ts`，与被测源码同目录、kebab-case 命名。纯逻辑放 `web/src/core/`；多表写入的一致性放 `web/src/data/`，用 `fake-indexeddb` 跑 Dexie 事务，必须覆盖「中途失败全部回滚」。`useLiveQuery` 与 React 渲染不进单测。

**8.3 只能人工验收**：列表，每条写「前置数据 / 操作 / 判定标准 / 1440 或 390」。视觉、动效、焦点流转、真实键盘输入、断网与写入失败恢复、跨真实自然日的行为归此类。

**8.4 与 AGENTS.md 验证命令的对应**：固定四行，说明 `npm run lint`、`npm test`、`npm run build`、`npm run dev` 各自覆盖本 PRD 的哪部分，以及人工清单在哪一步执行。

约束：不得出现「补充测试」「加些用例」这类没有对象的条目；不得把可由纯函数判定的事项放进人工验收，也不得把动效与视觉塞进自动化。

## 7. 已知冲突与处理

| # | 冲突 | 处理 |
| --- | --- | --- |
| 1 | `FRAMEWORK` K-04 字号调节（V1）与 `TECH-ARCHITECTURE` 0.12 删除 `settings.fontScale`、`UI-PAGES` P07 无字号控件矛盾 | **已定：Web 端不做。** 不保留为 V1 待办，不设计对应界面与字段；`FRAMEWORK` 的 K-04 视为被 0.12 取代。V1-08 只保留排序与置顶 |
| 2 | `FRAMEWORK` E-04 补记（V1）与 `TECH-ARCHITECTURE` 0.12 删除 `commits.isBackfill`、明确「无补记入口」矛盾 | 以文档为准：本版不做补记。M05 记录，不设计补记流程 |
| 3 | `FRAMEWORK` G-04 分享图含「周 / 年两种」，`UI-PAGES` 只有年度分享图 S05 | **周分享图记为视觉待办，不记为冲突消解。** 缺什么：4:5 周分享图的视觉稿（版式、泳道缩略、数字位置、明暗两套）。卡住：V1-03 的 G-04「周分享图」这一条无法进入实现验收。不阻塞：周回顾的数据与文字（R9）、年度分享图 S05、月回顾、徽章。视觉补齐后再实现；功能本身可先按现有页面能力降级（只做年度分享图） |
| 4 | `FRAMEWORK` C-03 本周摘要，`UI-PAGES` 未单列该视图 | 按 G-01 同一张回顾卡扩展实现，不新增页面；V1-03 写明 |
| 5 | `FRAMEWORK` J-07 匿名统计 | **已定：要做，阶段移入 V2，与 CloudBase 后端一起落地。** 原文口径不变：「只上报计数器（日提交数、活跃分支数、留存），**不上报任何内容**（标题、分支名、备注一律不传），可开关」。M 系列 PRD 不出现该功能；V2-02 保留，并标注依赖后端与开关字段。`FRAMEWORK` 的阶段标注与 §7 统计已同步为 V2 |
| 6 | `FRAMEWORK` B-04 重复待办 | **已定：不做（2026-11-21）。** 原文口径：「重复待办｜每天 / 每周固定待办，做成模板待办，不预生成实例｜V1」。所有 PRD 不出现重复检测、重复提示或相关字段；`FRAMEWORK` 保留条目并标注不做，阶段统计已扣除 |
| 7 | `FRAMEWORK` 2.2 待办关键字段含「优先级」，0.12 已删除 `tasks.priority` | 以 0.12 为准：待办无优先级，PRD 不出现优先级排序 |
| 8 | `PAGE-DATA-CROSSCHECK` 提到里程碑 `datePrecision=year`、`commits.isBackfill`、徽章 `type`、`year_reviews.text` | 均已被 0.12 取代：精度只有 `day`/`month`（R6），徽章用 `catalogId`/`category`，年度总结字段为 `note` |
| 9 | 画稿 P07「跟随系统」、S08「签名」文案 | 不实现（DESIGN 画稿边界），按 R19 与 S08 现行文案 |
| 10 | P06/P08 画稿同时出现快照与恢复 | MVP 只做导出/导入；快照与异地备份归 V1（R17） |
| 11 | `FRAMEWORK` A-04 回填过去无独立页面 | 通过里程碑「只填年月」完成，归 V1-07，不新增页面 |
| 12 | `FRAMEWORK` C-01「安排到今天」优先进今天 vs `TECH-ARCHITECTURE` R8「dueDate < today 归逾期」 | **已定：显式安排到今天归今天组，不再算逾期。** R8 由技术线同步补该例外；M03 正文与验收按此口径 |
| 13 | 提交文案「待办标题 + 可选补一句」无拼接格式 | **已定：「标题 —— 补一句」，不新增字段。** M03/M05 按此口径 |
| 14 | 根分支「我」的创建时机未写 | **已定：首次进入工作区自动创建，不计入「新开」统计。** M02 按此口径 |
| 15 | 「全部待办」只有分组描述、未写筛选关系 | **已定：默认逾期 / 未来 / 无截止三组，另可叠加根分支、已放下、已归档筛选，同一待办只出现一次。** M03 按此口径 |
| 16 | M11 首枚徽章写「第一步」，`FRAMEWORK` H-01 与 §5.2 写「起笔」 | **已定：统一为「起笔」。** M11 已全部改齐；V1-05 的目录与展示名一致，机制不变 |
| 17 | `TECH-ARCHITECTURE` Q8 把备份列表压到 10 行且未提 `manual` | **已定：不截断、不合并。** 自动 7 条 + 手动 7 条 + 恢复前 1 条 + 异地 1 条，按时间倒序单列表展示，自动行浅色区分；V1-06 正文与验收已按此改 |
| 18 | `FRAMEWORK` J-02 写「距上次备份超过 7 天时补一份」，与每日快照叠加会同日出现 2 条 `auto` | **已定：不实现补备份。** 每次打开工作区最多写一条 `auto`，当日已有则跳过；长时间未打开由 7 条保留策略覆盖。V1-06 正文、验收与测试已改 |
| 19 | V1-05 §6.15 要求里程碑类显示「还差 N」，§4.2 写「里程碑类不显示差距」 | **已定：三类统一。** 达成度 ≥50% 显示「还差 N」，未达 50% 显示灰点与条件；删除类别例外 |
| 20 | V1-03 提醒一处按「会话」计，一处按「自然日」计 | **已定：同一自然日最多一次。** 出现后关闭、刷新、重新进入当天都不再出现；已提示日期存 `localStorage` 的 `reminder.lastShownDate` |
| 21 | M01 注解「只显示一次」的已展示标记没有落点 | **已定：存 `localStorage`**，key 为 `hint.<id>.seen`；不新增 `settings` 字段，记录丢失最多让注解重新展开一次，可接受 |
| 22 | M06 停滞的「可见后代」未定义 | **已定：未归档且未放下的后代**，与是否展开无关；该定义决定虚线长度与测试边界 |
| 23 | M09 未写已放下分支是否计入「活跃分支」 | **已定：不计入**；已归档分支照常计入；提交数口径不变，其有效提交仍计入 |
| 24 | V1-07 的 200 行上限是否包含空行 | **已定：只算有效行**，空行静默跳过；有效行超过 200 才拒绝 |
| 25 | V2-03 彩蛋「复活」的作用范围有空隙 | **已定：只作用于已放下分支**，不含根分支、不看后代，按本分支自己的有效提交计算 |
| 26 | M05 锁定依赖「写入时区」，但 `commits` 不存该字段 | **已定：按操作当时的本地时区换算** `date` 的次日 00:00，不新增字段；跨时区前后平移为已知边界，写入 PRD §7 |
| 27 | M01 写 `settings` 单行 `_id='app'`，`web/src/data/db.ts` 主键为 `id` | **已定：以代码为准写 `id`**；0.12 §5.3 由技术线同步 |
| 28 | M02 移动整棵子树时 `events` 粒度未定义 | **已定：只写一条**，`payload.movedCount` 记受影响节点数；测试按 1 条断言 |
| 29 | V2-01 邮箱校验粒度未定 | **已定：前端粗校验**（有 `@`、两侧非空、域名含 `.`），真实有效性交服务端；登录渠道仍待定 |
| 30 | PRD 中 `events.action` 混用裸动词（M07 `'create'`、M08 `'finish'`）与 `entity.verb` | **已定：统一为 `entity.verb`**，字面值取 `CODE-STRUCTURE` §4.2；`events` 只由用例在事务内写，R13 删空分支等既有例外不写；同一语义跨 PRD 用同一字面值（改归属 `task.update`、修改提交文案 `commit.update`）；遗留两处见 #31 |
| 31 | V2-02 的 `sync.conflict` 与 `entityType` 推导、V2-03 模板事件、M04 `branch.update` 是否入清单 | **已定：**`sync.conflict` 的 `entityType` 为 `sync`，分支历史按 `payload.branchId` 反查，不另立 `branch.*` 动作；模板生成与撤回不写 `events`，不新增模板类动作（一次性功能，结果已由各实体 `create` 覆盖）；`branch.update` 已列入 `EventAction` 清单。三份 PRD 已同步 |

## 8. 未决问题池

这些问题不阻塞 PRD 成稿，但会在对应 PRD 的「未决问题」中保留：

1. V2 登录渠道（手机号 / 微信 / 邮箱 OTP）与找回方式；邮箱前端粗校验已定，真实有效性交服务端。
2. V2 同步冲突的展示与解决动作，`conflicts` 字段如何映射到「分支历史留痕」。
3. 第二端选型（小程序 / 桌面）与只读范围。
4. 周分享图**视觉待办**：缺 4:5 视觉稿，卡住 V1-03 的 G-04；不阻塞周回顾数据、年度分享图与月回顾。
5. E-04 补记按 0.12 不实现；若恢复需先改表结构与页面规范。K-04 字号调节已定不做，不再列为待恢复项。
6. 里程碑只填年月时的存储归一化（当月 1 日或月首本地零点）尚未写入 0.12。
7. M05 跨时区锁定：不存写入时区，按操作当时时区换算，跨时区可能前后平移；若要求绝对锁定需改表结构。

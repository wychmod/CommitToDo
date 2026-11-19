# CommitToDo

**把每件小事变成一次提交，长成一棵看得见的分支树。**

> ⚠️ **已过时（2026-11-19）**：本文件中的「目录结构」「快速开始」「已实现的能力」「技术栈」「质量基线」以及文档表中 `web/docs/ARCHITECTURE.md` 一行，描述的是 2026-11-19 已清空的旧 Web 实现，待重写。产品定位、框架与路线图部分仍然有效。逐项清单见 [`docs/STALE.md`](./docs/STALE.md)。

CommitToDo 的目标形态是一款本地优先的个人任务与人生历程工具：待办完成即提交，提交挂在分支上；整棵树只有一个根，最多 3 层，分支可以并回父分支。所有提交连起来，就是可回看、可分叉、可合并的历程。

**目标用户**：程序员 / 技术型知识工作者（主用户，MVP 与 V1 的验收对象）；大众用户自 V2 起进入验收范围，见 [`docs/PRODUCT-STRATEGY.md`](./docs/PRODUCT-STRATEGY.md) §3。

**只有一套词**：分支 / 待办 / 提交 / 里程碑 / 徽章。**界面上不出现哈希、分支路径这类英文标识符**——图上的一条记录就是「第一次半马 · 2025 年 4 月 6 日」。停滞的分支会显式变成虚线；借自 Git 的机制用一句话注解解释，默认折叠。见 [`docs/PRODUCT-STRATEGY.md`](./docs/PRODUCT-STRATEGY.md) §5。

当前唯一已实现并能正常运行的是 **Web 端**（`web/`），仍使用「仓库 / 分支 / 任务 / 提交」的旧命名。**目标形态已重写**，见 [`docs/FRAMEWORK.md`](./docs/FRAMEWORK.md)：单根分支树 + 5 个对象（分支 / 待办 / 提交 / 里程碑 / 徽章）、四个一级入口、58 项功能。代码尚未按新框架改造。

> ⚠️ 已过时：`web/` 的旧实现已于 2026-11-19 整体清空，现行代码只有一个最小外壳（`/` 一条路由 + 占位页），不再使用上述旧命名，也未按新框架实现。

---

## 目录结构

```
Commit/
├── web/                    # Web 客户端（React + TypeScript）
│   ├── src/                #   应用源码，六层架构
│   ├── public/             #   PWA 图标与 manifest
│   └── docs/               #   Web 专属文档
├── docs/                   # 仓库级文档
```

> ⚠️ 已过时：`web/src` 的六层架构与 `web/docs/` 均已不存在；现行 `web/src` 只有 `main.tsx`、`app.tsx`、`pages/home-page.tsx`、`index.css`。`web/public/` 仅余未引用的静态资产。待重写。

---

## 快速开始

```bash
cd web
npm install
npm run dev          # http://localhost:5173
```

| 命令 | 作用 |
|---|---|
| `npm run dev` | 启动开发服务器（HMR） |
| `npm run build` | `tsc -b && vite build`，产物输出到 `dist/` |
| `npm run preview` | 本地预览生产构建 |
| `npm run lint` | ESLint 全量扫描 |
| `npm test` | Vitest 单次运行 |

> ⚠️ 已过时：`npm run lint` 与 `npm test` 已随旧门禁删除（ESLint / Vitest 依赖与配置均已移除）；现行脚本只有 `dev`、`build`、`preview`。

首次访问进入落地页，点「进入工作台」即可开始使用——**不需要注册或登录**。当前版本**不做账号与同步**，数据只写入浏览器 IndexedDB（本地模式是唯一形态）；换设备靠 V1 的导出 / 导入或异地备份。落地页残留的登录入口将在重做时移除。

> ⚠️ 已过时：落地页、「进入工作台」、IndexedDB 写入与登录入口残留均已随旧实现删除；现行站点只渲染一个占位页。

---

## 已实现的能力

> ⚠️ 已过时：本节全部内容对应 2026-11-19 已删除的旧实现，无一项在现行代码中存在。保留原文仅供追溯，待重写。

### 核心模型

- **仓库 → 分支 → 任务 → 提交** 四层关系，删除为软删除，可级联恢复
- 每次创建 / 更新 / 完成 / 删除 / 合并任务，都会写入一条提交记录，构成可回溯的时间线

### 任务管理

- 四状态生命周期：`todo → inProgress → done / cancelled`
- 三级优先级、截止日期、父任务字段、自定义排序
- 仓库任务页：分支切换、筛选（状态 / 优先级 / 关键词）、任务表格、右侧详情与表单面板

### 视图

- **今日工作台**：今日 / 逾期 / 待提交三类视图、进度环、本周热力图、任务分组
- **仓库概览**：分支汇总、进度分组、迷你热力图、最近提交
- **洞察**：活动时间线、提交关系图（ReactFlow，可缩放）、节奏热力图，支持仓库 / 分支 / 时间范围筛选
- **命令面板**：`Ctrl / Cmd + K`，模糊搜索动作、任务、分支、仓库
- **设置**：外观（明暗 + 主题色）、提醒、数据（导出 / 导入）、仓库管理、账户安全、PWA 安装。自动备份为占位开关，尚未实现

### 数据

- IndexedDB（Dexie，四版 schema），按账户 principal 隔离数据库
- 导出 JSON / CSV / Markdown，导入 JSON
- 本地优先，无网络也可读写
- 首次进入且本地为空时，会注入 3 个示例仓库（运动计划 / CommitToDo / 阅读清单）便于预览，暂无「示例」标识与批量清理入口

### 认证

- **本地模式是唯一形态**：无需登录，数据只存本机
- 原登录后端（3 个云函数 + PostgreSQL 迁移）已于 2026-11-16 删除，不做账号与同步
- 前端残留的登录页、`auth-store` 与路由守卫将在重做时移除

### 体验

- 深浅主题、五档响应式断点、PWA 可安装、全局键盘可达性

---

## 技术栈

> ⚠️ 已过时：现行依赖只保留 `react`、`react-dom`、`react-router-dom` 与 `vite` / `typescript` 工具链；下表所列 Tailwind、Radix、Zustand、tsyringe、Dexie、ReactFlow、Vitest、PWA 均已从 `package.json` 移除。新选型待定。

| 层 | 选型 |
|---|---|
| UI | React 18 · TypeScript 5（strict）· TailwindCSS 3.4 · Radix UI |
| 构建 | Vite 6 · vite-plugin-pwa |
| 状态 | Zustand 5 |
| 依赖注入 | tsyringe |
| 存储 | Dexie 4（IndexedDB） |
| 图形 | @xyflow/react 12 · 自绘 SVG 热力图 |
| 测试 | Vitest · Testing Library · jsdom · fake-indexeddb |
| 后端 | 无（旧登录后端已删除） |

---

## 质量基线

> ⚠️ 已过时：下表数字与命令均来自已删除的实现（测试已移除，`tsc -b` 现由 `npm run build` 内部执行）。旧的四条门禁不再适用，待新规范定稿后重写。

| 检查 | 状态 |
|---|---|
| `npx tsc -b` | 通过 |
| `npm test` | 291 个用例全部通过；其中 1 例依赖数据加载时序（仓库任务页分支 Tab），高负载下偶发失败 |
| `npm run build` | 通过；JS 1,796 kB（gzip 493 kB）、CSS 110 kB（gzip 20 kB），超过 500 kB 告警阈值，待分包 |

---

## 文档

### 现行

| 文档 | 内容 |
|---|---|
| [`docs/FRAMEWORK.md`](./docs/FRAMEWORK.md) | **产品框架**：三层结构、单根分支树 + 5 个对象、4 个入口、58 项功能、21 枚徽章、版本切分（v0.3，已定稿） |
| [`docs/PRODUCT-STRATEGY.md`](./docs/PRODUCT-STRATEGY.md) | 产品定位、命名决策、主用户、两条硬约束、原则与风险 |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | 现状架构、目标模型约束、数据迁移与已知缺口 |
| [`web/docs/ARCHITECTURE.md`](./web/docs/ARCHITECTURE.md) | Web 端实现细节（实现层，不定义产品） |
| 视觉规范 | **待重新设计**。旧版（`DESIGN.md`、V3 风格指南等 6 份）已整体归档，仓库内暂不设视觉事实来源 |

> ⚠️ 已过时：表中 `web/docs/ARCHITECTURE.md` 已于 2026-11-19 删除，链接失效；`docs/ARCHITECTURE.md` 的「现状架构」部分（§1–§11）同样已过时，仅 §12 目标模型与 §13 变更记录有效。

> 工程规范与 Agent 约束文件（`AGENTS.md`、`CLAUDE.md` 及 `web/` 下同名文件）已随改版一并移除，待新方案定稿后重写。

### 历史文档（已归档，不作为实现依据）

已失效的文档统一移入 [`docs/archive/`](./docs/archive/README.md)，不再占用活跃目录。索引与失效原因见该目录的 README。

| 时间 | 归档内容 | 状态 |
|---|---|---|
| 2026-11 | `docs/PRD.md`（2.3.0，39 条 FR）+ `docs/ROADMAP.md`（1.3.0，M/V1/V2 编号） | 已被 `docs/FRAMEWORK.md` 取代 |
| 2026-11 | `web/docs/PRD.md` + `web/docs/TASKS.md`（2026-07 实现需求与任务清单） | 属旧命名时期，产品定义部分已失效 |
| 2026-11 | 旧视觉体系 6 份：`docs/DESIGN.md`、`docs/DESIGN.reference.linear.md`、`web/docs/v3/*`（4 份） | 视觉体系整体重做，全部作废；**新版规范尚未产出** |
| 2026-07 | `UI_DESIGN_PROPOSAL.md` | 已被旧版 `DESIGN.md` 取代，后者亦已归档 |
| 2026-07 | `commit-homepage-concepts/auth-modal/`（4 份） | 演示登录已在 `adc1828` 移除 |
| 2026-07 | `commit-homepage-concepts/v3-system-redesign/`（7 份） | 视觉可参考，信息架构已废弃 |
| 2026-07 | `commit-homepage-concepts/功能整理与页面清单.md` | 已被 `docs/FRAMEWORK.md` 取代 |
| 2026-07 | `cloudbase-authentication-{plan,implementation-roadmap}.md` | 「必须登录」前提已被本地模式推翻 |
| 2026-07 | `screenshots/`（7 张）+ `commit-homepage-concepts/` 内 8 张参考截图 | 界面已重构，无文档引用 |

> ⚠️ 路径变更：上表列出的 `docs/DESIGN.md`、`docs/DESIGN.reference.linear.md`、`web/docs/v3/*`、`web/docs/PRD.md`、`web/docs/TASKS.md` 的原始路径均已不存在，现位于 `docs/archive/2026-11/` 下（视觉体系在 `visual-system/`，Web 文档在 `web/`）。

---

## 路线图

阶段口径以 [`docs/FRAMEWORK.md`](./docs/FRAMEWORK.md) §7 为准（v0.3，已定稿）：

| 阶段 | 一句话目标 | 规模 |
|---|---|---|
| **MVP** | 验证「待办 → 提交 → 树上有节点」这个闭环有人要 | 29 项；不含放下、归档、年轮、完整徽章、模板、同步 |
| **V1** | 让「人生」这件事成立 | 22 项；合并的完整形态、放下、归档、年轮、21 枚徽章、补记、批量导入、分享图、月回顾、异地备份、匿名统计 |
| **V2** | 让长期使用与换设备成为可能 | 7 项；账号、端到端加密同步、第二端、彩蛋徽章、帮助与常见问题、分支模板 |

**MVP 的验收只有一句话**：5 个真实用户用它记录两周，第 15 天有人主动打开时间树往回看。

**已确定**：以 TypeScript 技术栈承载多端，优先把 Web 端做完整；MVP 不依赖账号，本地模式是默认形态。

**待定**（V2 前定案，不作为当前承诺）：

- 第二个端的选型（小程序 / 桌面）
- App 端是否建设
- 云数据库形态（文档型与关系型的取舍）
- 跨端同步协议

这些决策会影响目录结构与共享包边界，因此在定案前不预置任何空壳工程。

---

## 许可

MIT，见 [`LICENSE`](./LICENSE)。

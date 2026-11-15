# Commit

**把人生当成一条主线，把每件小事变成一次提交。**

Commit 的目标形态是一款本地优先的个人任务与人生主线工具：任务完成即提交，提交挂在主线上，主线归属人生领域；所有提交连起来，就是可回看、可分叉、可合并的历程。

**目标用户**：程序员 / 技术型知识工作者（主用户，MVP 与 V1 的验收对象）；大众用户自 V2 起进入验收范围，见 [`docs/PRODUCT-STRATEGY.md`](./docs/PRODUCT-STRATEGY.md) §3。

**两种视角，都说人话**：项目模式管交付（项目 / 并行线 / 待办），人生模式管历程（领域 / 主线 / 小事）。**界面上不出现哈希、分支名这类英文标识符**——图上的一条记录就是「第一次半马 · 2025 年 4 月 6 日」。历程视图在人生模式下叫**人生树**，停滞的主线会显式变成虚线；借自 Git 的机制用一句话注解解释，默认折叠。见 [`docs/PRODUCT-STRATEGY.md`](./docs/PRODUCT-STRATEGY.md) §5。

当前唯一已实现并能正常运行的是 **Web 端**（`web/`），仍使用「仓库 / 分支 / 任务 / 提交」的旧命名。**目标形态已重写**，见 [`docs/FRAMEWORK.md`](./docs/FRAMEWORK.md)：七个对象（领域 / 项目 / 并行线 / 待办 / 记录 / 里程碑 / 徽章）、四个一级入口、65 项功能。代码尚未按新框架改造。

---

## 目录结构

```
Commit/
├── web/                    # Web 客户端（React + TypeScript）
│   ├── src/                #   应用源码，六层架构
│   ├── cloudfunctions/     #   认证后端云函数（Node 18）
│   ├── cloudbase/          #   PostgreSQL 迁移脚本
│   ├── public/             #   PWA 图标与 manifest
│   └── docs/               #   Web 专属文档
├── docs/                   # 仓库级文档
├── AGENTS.md               # 工程规范（分层、命名、测试、门禁）
└── CLAUDE.md               # 规范入口指引
```

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

首次访问进入落地页，点「进入工作台」即可开始使用——**不需要注册或登录**。默认是本地模式，数据写入浏览器 IndexedDB。登录是可选升级，仅用于账号与安全能力；未配置云环境变量时也不会阻塞使用。

---

## 已实现的能力

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

- **本地模式为默认**：无需登录即可使用全部功能，数据留在本机
- 可选登录：邮箱注册 / 登录、手机验证码、GitHub OAuth、验证码找回
- 登录后可将当前本地数据认领到账号，或另建独立工作区
- 会话刷新单飞锁、OAuth state 一次性消费、路由守卫
- 后端为云函数 + PostgreSQL（RLS + HMAC 哈希 + 限流与幂等）

### 体验

- 深浅主题、五档响应式断点、PWA 可安装、全局键盘可达性

---

## 技术栈

| 层 | 选型 |
|---|---|
| UI | React 18 · TypeScript 5（strict）· TailwindCSS 3.4 · Radix UI |
| 构建 | Vite 6 · vite-plugin-pwa |
| 状态 | Zustand 5 |
| 依赖注入 | tsyringe |
| 存储 | Dexie 4（IndexedDB） |
| 图形 | @xyflow/react 12 · 自绘 SVG 热力图 |
| 测试 | Vitest · Testing Library · jsdom · fake-indexeddb |
| 后端 | CloudBase 云函数（Node 18）· PostgreSQL |

---

## 质量基线

| 检查 | 状态 |
|---|---|
| `npx tsc -b` | 通过 |
| `npm test` | 289 个用例全部通过；其中 1 例依赖数据加载时序（仓库任务页分支 Tab），高负载下偶发失败 |
| `npm run build` | 通过；JS 1,796 kB（gzip 493 kB）、CSS 110 kB（gzip 20 kB），超过 500 kB 告警阈值，待分包 |

---

## 文档

### 现行

| 文档 | 内容 |
|---|---|
| [`AGENTS.md`](./AGENTS.md) | 工程规范：分层、命名、代码风格、测试、门禁 |
| [`docs/FRAMEWORK.md`](./docs/FRAMEWORK.md) | **产品框架**：三层结构、7 个对象、4 个入口、65 项功能、24 枚徽章、版本切分（v0.1，评审中） |
| [`docs/PRODUCT-STRATEGY.md`](./docs/PRODUCT-STRATEGY.md) | 产品定位、命名决策、主用户、两条硬约束、原则与风险 |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | 现状架构、目标模型约束、数据迁移与已知缺口 |
| [`docs/DESIGN.md`](./docs/DESIGN.md) | 设计令牌与组件规范（唯一设计规范） |
| [`web/docs/v3/STYLE_GUIDE.md`](./web/docs/v3/STYLE_GUIDE.md) | 新增页面的开发合同（技术内容有效，标题中旧名待统一） |
| [`web/docs/ARCHITECTURE.md`](./web/docs/ARCHITECTURE.md) | Web 端实现细节（实现层，不定义产品） |
| [`docs/DESIGN.reference.linear.md`](./docs/DESIGN.reference.linear.md) | Linear 设计文档，仅作设计溯源参考 |

### 历史文档（已归档，不作为实现依据）

已失效的文档统一移入 [`docs/archive/`](./docs/archive/README.md)，不再占用活跃目录。索引与失效原因见该目录的 README。

| 时间 | 归档内容 | 状态 |
|---|---|---|
| 2026-11 | `docs/PRD.md`（2.3.0，39 条 FR）+ `docs/ROADMAP.md`（1.3.0，M/V1/V2 编号） | 已被 `docs/FRAMEWORK.md` 取代 |
| 2026-11 | `web/docs/PRD.md` + `web/docs/TASKS.md`（2026-07 实现需求与任务清单） | 属旧命名时期，产品定义部分已失效 |
| 2026-07 | `UI_DESIGN_PROPOSAL.md` | 已被 `docs/DESIGN.md` 取代 |
| 2026-07 | `commit-homepage-concepts/auth-modal/`（4 份） | 演示登录已在 `adc1828` 移除 |
| 2026-07 | `commit-homepage-concepts/v3-system-redesign/`（7 份） | 视觉可参考，信息架构已废弃 |
| 2026-07 | `commit-homepage-concepts/功能整理与页面清单.md` | 已被 `docs/FRAMEWORK.md` 取代 |
| 2026-07 | `cloudbase-authentication-{plan,implementation-roadmap}.md` | 「必须登录」前提已被本地模式推翻 |
| 2026-07 | `screenshots/`（7 张）+ `commit-homepage-concepts/` 内 8 张参考截图 | 界面已重构，无文档引用 |

---

## 路线图

阶段口径以 [`docs/FRAMEWORK.md`](./docs/FRAMEWORK.md) §7 为准（v0.1，评审中）：

| 阶段 | 一句话目标 | 规模 |
|---|---|---|
| **MVP** | 验证「待办 → 记录 → 树上有节点」这个闭环有人要 | 29 项；不含并行线、年轮、完整徽章、照片、同步 |
| **V1** | 让「人生」这件事成立 | 28 项；并行线与合并、年轮、24 枚徽章、模板、补记、分享图 |
| **V2** | 让长期使用与换设备成为可能 | 8 项；账号、加密同步、第二端、AI 录入、彩蛋徽章 |

**MVP 的验收只有一句话**：5 个真实用户用它记录两周，第 15 天有人主动打开人生树往回看。

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

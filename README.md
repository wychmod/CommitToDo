# Commit

**把 Git 的版本控制理念用于个人任务管理。**

仓库是长期目标，分支是工作线，任务的一次状态变更就是一次提交。所有动作都留痕，进度可回看、可审计、可分叉。

当前唯一已实现并能正常运行的是 **Web 端**（`web/`）。其余端处于规划阶段，尚未开始实现。

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

首次访问会进入落地页，注册或登录后进入工作台。未配置云环境变量时，受保护路由会以「会话初始化失败」拒绝进入——这是预期的失败关闭行为，不是缺陷。

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
- **设置**：外观（明暗 + 主题色）、提醒、数据（导出 / 导入 / 自动备份）、仓库管理、账户安全、PWA 安装

### 数据

- IndexedDB（Dexie，四版 schema），按账户 principal 隔离数据库
- 导出 JSON / CSV / Markdown，导入 JSON
- 本地优先，无网络也可读写

### 认证

- 邮箱注册 / 登录、手机验证码、GitHub OAuth、验证码找回
- 会话刷新单飞锁、OAuth state 一次性消费、路由三层守卫
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
| `npm test` | 289 个用例，288 通过（1 例为分支 Tab 查询时序竞态，待修） |
| `npm run build` | 通过；主 chunk 659 kB（gzip 210 kB），超过 500 kB 告警阈值，待分包 |

---

## 文档

| 文档 | 内容 |
|---|---|
| [`AGENTS.md`](./AGENTS.md) | 工程规范：分层、命名、代码风格、测试、门禁 |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | 现状架构、模块职责、数据模型、待定事项、已知缺口 |
| [`docs/DESIGN.md`](./docs/DESIGN.md) | 设计令牌与组件规范 |
| [`docs/PRD.md`](./docs/PRD.md) | 产品需求与功能模块优先级 |
| [`web/docs/ARCHITECTURE.md`](./web/docs/ARCHITECTURE.md) | Web 端实现细节 |
| [`web/docs/v3/STYLE_GUIDE.md`](./web/docs/v3/STYLE_GUIDE.md) | V3 设计语言使用指南 |

---

## 路线图

**已确定**：以 TypeScript 技术栈承载多端，优先把 Web 端做完整。

**待定**（尚未决策，不作为承诺）：

- 桌面端形态与外壳方案
- 小程序端框架选型
- App 端是否建设
- 云数据库形态（文档型与关系型的取舍）
- 跨端同步协议

这些决策会影响目录结构与共享包边界，因此在定案前不预置任何空壳工程。

---

## 许可

MIT，见 [`LICENSE`](./LICENSE)。

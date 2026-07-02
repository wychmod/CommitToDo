# Commit — DESIGN.md

> **版本**: 2.0.0
> **更新日期**: 2026-06-28
> **设计语言**: Linear-inspired Developer Dark
> **基准参考**: [Linear DESIGN.md](./DESIGN.reference.linear.md)（仅作溯源参考，本项目实际规范以本文件为准）
> **地位**: 本项目**唯一**的设计样式规范文档（visual design single source of truth）。旧版 `UI_DESIGN.deprecated.md` 已废弃。

---

## 0. 文档定位与适用范围

本文件是 Commit 项目 UI 的**唯一视觉事实来源**。所有 `lib/core/theme/*` token、所有 `lib/presentation/**` 组件、所有屏幕布局，必须以本文件为准。代码与本文冲突时，**以本文件为准并修正代码**。

本文件遵循 [Stitch DESIGN.md 规范](https://stitch.withgoogle.com/docs/design-md/specification/)，并针对 Commit 的 Git-隐喻任务管理场景做了扩展。

**与 Linear 原文的差异声明**（为什么不是照搬）：
- Linear 原文是**营销官网**设计语言；Commit 是**实用 App**。本文件保留了 Linear 的「四阶 surface ladder / hairline 边框 / 负字距排版 / 极简 chrome / 不用投影」骨架，但：
  - **accent 由紫改蓝**（保留项目原有 `#3B82F6`，Git 冷峻气质更契合）。
  - **canvas 用 slate `#0F172A`** 而非 Linear 的近纯黑 `#010102`（更适合长时间阅读的 App 场景）。
  - **字体保留 `JetBrains Mono` + `IBM Plex Sans`**（Linear 官方推荐的 mono 替代就是 JetBrains Mono，零迁移成本）。
  - **Mono 用途扩展**到 branch name / commit id / label（Git 隐喻刚需）。
  - **保留全套语义色**（priority / status / heatmap / branchColors）——任务管理 App 的状态色是刚需，不能像 Linear 营销页那样砍掉。
  - **新增 Git 专属组件规范**（task-card / branch-indicator / heatmap / git-graph / commit-row）。

---

## 1. Overview

Commit 的画布是**深色 slate canvas** `{colors.canvas}` `#0F172A`——比 Linear 的近纯黑略浅、带蓝灰调，是全系统最深的面，也是 App 的默认背景。其上是一个**四阶 surface ladder**（`surface-1` → `surface-4`）承载卡片、面板、浮层，用发丝级 hairline 边框（`hairline` → `hairline-strong` → `hairline-tertiary`）区隔，**不依赖投影**。前景文字为浅灰 ink `#F1F5F9`。

唯一的彩色 accent 是 **Commit Blue** `{colors.primary}` `#3B82F6`，仅用于：品牌标识、focus ring、主 CTA、链接强调。它有一个更亮的 hover 态 `{colors.primary-hover}` `#60A5FA` 和一个聚焦态 `{colors.primary-focus}` `#2563EB`。**展示面**（空状态、Git Graph 标题、热力图标题、设置页头部）允许使用 `{colors.primary-gradient}`（`#3B82F6 → #8B5CF6`）做克制渐变以获得「眼前一亮」的高端感；**操作面**（列表、表单）保持纯色克制。

字体三族：**IBM Plex Sans**（标题 + 正文，单一连续声音）、**JetBrains Mono**（branch name / commit id / label / 等宽技术标签）。Display 字重 600、body 400，display 带激进的负字距（80px 时 -3.0px），eyebrow 用正字距（+0.4px）。

页面节奏由**信息密度**主导——Commit 是实用工具，没有 Linear 营销页的产品截图大图，取而代之的是密集的**任务列表、热力图、Git Graph、分支指示器**。chrome 刻意极简，让内容做主角。

**Key Characteristics:**
- **Slate dark-canvas system** — `{colors.canvas}` `#0F172A` 是系统锚定面（非纯黑，避免冰冷）。
- **Commit Blue accent** `#3B82F6`，克制使用；展示面允许蓝紫渐变。
- **四阶 surface ladder**（canvas → surface-1 → surface-2 → surface-3 → surface-4）不靠投影承层级。
- Display 负字距激进（-3.0px @ 80px）；body 持平 -0.05px；eyebrow 正字距 +0.4px。
- 卡片用 `{rounded.lg}` 12px 圆角 + 1px hairline 边框——CTA 用 `{rounded.md}` 8px，**绝不 pill 圆 CTA**。
- **信息密度优先**——列表/网格/图表是主角，chrome 是深色画框。
- **完整语义色体系**——priority / status / heatmap / branchColors 是任务管理的刚需，与 Linear 营销页「仅 success」不同。
- 不加大气渐变、不加聚光卡片、深色面几乎不用投影。

---

## 2. Colors

### 2.1 Brand & Accent
| Token | Hex | 用途 |
|---|---|---|
| `{colors.primary}` | `#3B82F6` | 主 accent——主 CTA、品牌标识、focus ring、链接强调 |
| `{colors.primary-hover}` | `#60A5FA` | 主 CTA 悬停态（更亮） |
| `{colors.primary-focus}` | `#2563EB` | focus ring tint、按钮按下态 |
| `{colors.primary-dark}` | `#1D4ED8` | pressed 深态 |
| `{colors.primary-gradient}` | `#3B82F6 → #8B5CF6` | **仅展示面**克制渐变（空状态、标题装饰、设置页头部） |

### 2.2 Surface Ladder（深色，四阶）
| Token | Hex | 用途 |
|---|---|---|
| `{colors.canvas}` | `#0F172A` | 默认页面背景（系统锚定面） |
| `{colors.surface-1}` | `#1E293B` | 默认卡片、面板、列表项底 |
| `{colors.surface-2}` | `#334155` | 高亮卡片、hover 卡片、status badge 底、选中态 |
| `{colors.surface-3}` | `#475569` | 子导航、下拉菜单、最深浮层 |
| `{colors.surface-4}` | `#64748B` | surface-3 更深一阶，极少使用 |

### 2.3 Hairline Borders
| Token | Hex | 用途 |
|---|---|---|
| `{colors.hairline}` | `#1E293B` | 卡片、分隔线默认 1px 边框 |
| `{colors.hairline-strong}` | `#334155` | 输入框边框、强化分隔 |
| `{colors.hairline-tertiary}` | `#475569` | 嵌套面三级边框 |

### 2.4 Text
| Token | Hex | 用途 |
|---|---|---|
| `{colors.ink}` | `#F1F5F9` | 所有标题、强调正文 |
| `{colors.ink-muted}` | `#94A3B8` | 次要正文、meta |
| `{colors.ink-subtle}` | `#64748B` | 三级文字、未选中态、footer |
| `{colors.ink-tertiary}` | `#475569` | 四级、disabled、脚注 |

### 2.5 Semantic（任务管理刚需，完整保留）
| Token | Hex | 用途 |
|---|---|---|
| `{colors.success}` | `#10B981` | 已完成状态、成功提示 |
| `{colors.warning}` | `#F59E0B` | 中优先级、警告 |
| `{colors.error}` | `#EF4444` | 高优先级、错误、删除 |
| `{colors.info}` | `#3B82F6` | 进行中状态、信息 |

> 代码中为 hover/轻态保留了浅色变体：`success-light` `#34D399`、`warning-light` `#FBBF24`、`error-light` `#F87171`，用于按钮悬停等需要更亮语义色的场景，未在基础 token 表重复列出。

### 2.6 Priority（优先级色）
| Token | Hex | 用途 |
|---|---|---|
| `{colors.priority-high}` | `#EF4444` | 高优先级 |
| `{colors.priority-medium}` | `#F59E0B` | 中优先级 |
| `{colors.priority-low}` | `#10B981` | 低优先级 |

### 2.7 Task Status（任务状态色）
| Token | Hex | 用途 |
|---|---|---|
| `{colors.status-todo}` | `#94A3B8` | 待办 |
| `{colors.status-in-progress}` | `#3B82F6` | 进行中 |
| `{colors.status-done}` | `#10B981` | 已完成 |
| `{colors.status-cancelled}` | `#6B7280` | 已取消 |

### 2.8 Heatmap（热力图色阶，GitHub 式绿色阶）
| Token | Hex | 用途 |
|---|---|---|
| `{colors.heatmap-empty}` | `#1E293B` | 无提交日 |
| `{colors.heatmap-1}` | `#064E3B` | level 1 |
| `{colors.heatmap-2}` | `#065F46` | level 2 |
| `{colors.heatmap-3}` | `#047857` | level 3 |
| `{colors.heatmap-4}` | `#10B981` | level 4（满） |

### 2.9 Branch Colors（Git Graph 分支色环，7 色循环）
`#3B82F6` · `#8B5CF6` · `#F59E0B` · `#10B981` · `#EC4899` · `#06B6D4` · `#F97316`

### 2.10 Inverse（浅色面，用于 dark canvas 上的反白 CTA）
| Token | Hex | 用途 |
|---|---|---|
| `{colors.inverse-canvas}` | `#FFFFFF` | 反白 CTA 底 |
| `{colors.inverse-ink}` | `#0F172A` | 反白 CTA 文字 |

### 2.11 Overlay
| Token | Hex | 用途 |
|---|---|---|
| `{colors.overlay}` | `#000000` @ 50% | 模态遮罩 |

> **注意**：以上为**深色模式**完整色板。浅色模式作为系统跟随的可选项保留，其 token 见 §9。

---

## 3. Typography

### 3.1 Font Families
- **IBM Plex Sans** — 标题 + 正文，单一连续声音（替代 Linear Display/Text）。fallback: `-apple-system, system-ui, Segoe UI, Roboto`。
- **JetBrains Mono** — branch name / commit id / label / 等宽技术标签（替代 Linear Mono，且 Linear 官方推荐 JetBrains Mono 作为 mono 替代）。fallback: `ui-monospace, SF Mono, Menlo`。

> 字体文件待 `assets/fonts/` 就位后启用（见 `pubspec.yaml` 注释）。缺失时回退平台默认字体，不阻断构建。

### 3.2 Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | Font | Use |
|---|---|---|---|---|---|---|
| `{typography.display-xl}` | 48px | 600 | 1.05 | -2.0px | IBM Plex Sans | 首页空状态大标题、Git Graph 主标题（移动端缩到 32px） |
| `{typography.display-lg}` | 40px | 600 | 1.10 | -1.5px | IBM Plex Sans | 页面主标题 |
| `{typography.display-md}` | 32px | 600 | 1.15 | -1.0px | IBM Plex Sans | 区块大标题 |
| `{typography.headline}` | 24px | 600 | 1.20 | -0.6px | IBM Plex Sans | 页面标题、卡片组标题 |
| `{typography.card-title}` | 17px | 500 | 1.25 | -0.4px | IBM Plex Sans | 任务卡标题、仓库卡标题 |
| `{typography.subhead}` | 20px | 400 | 1.40 | -0.2px | IBM Plex Sans | 引导正文 |
| `{typography.body-lg}` | 17px | 400 | 1.50 | -0.1px | IBM Plex Sans | 重要正文 |
| `{typography.body}` | 15px | 400 | 1.50 | -0.05px | IBM Plex Sans | 默认正文 |
| `{typography.body-sm}` | 13px | 400 | 1.50 | 0 | IBM Plex Sans | 卡片正文、footer |
| `{typography.caption}` | 11px | 400 | 1.40 | 0 | IBM Plex Sans | caption、meta、状态 |
| `{typography.button}` | 14px | 500 | 1.20 | 0 | IBM Plex Sans | 所有按钮标签 |
| `{typography.eyebrow}` | 12px | 500 | 1.30 | +0.4px | IBM Plex Sans | 区块 eyebrow（正字距，标记分类） |
| `{typography.mono}` | 13px | 500 | 1.50 | 0 | JetBrains Mono | branch name / commit id / label |
| `{typography.mono-sm}` | 11px | 500 | 1.40 | 0 | JetBrains Mono | 小号等宽标签、时间戳 |

### 3.3 Principles
- **激进的负字距**用于 display（display-xl 48px 时 -2.0px ≈ 4%）。移动端 display 缩放时字距相应收窄。
- **单一声音**：display 600 → body 400，同族不同字重，不用 700+。
- **eyebrow 正字距** +0.4px，与负字距 display 形成对比，标记 taxonomy。
- **Mono 用于 Git 语义场景**：branch name、commit hash、label、ID、时间戳——这是 Commit 区别于 Linear 营销页的扩展（Linear 仅在截图内用 mono）。

---

## 4. Layout

### 4.1 Spacing System
- **Base unit**: 4px。
- **Tokens**: `{spacing.xxs}` 4 · `{spacing.xs}` 8 · `{spacing.sm}` 12 · `{spacing.md}` 16 · `{spacing.lg}` 24 · `{spacing.xl}` 32 · `{spacing.xxl}` 48 · `{spacing.section}` 96。
- 卡片内边距：feature/task/repository 卡 `{spacing.lg}` 24px；详情/对话卡 `{spacing.xl}` 32px；CTA/空状态 `{spacing.xxl}` 48px。
- Pill 按钮内边距：vertical 8 · horizontal 14。
- 表单输入内边距：vertical 10 · horizontal 12（移动端 ≥44px 触摸高度）。

### 4.2 Grid & Container
- 桌面端最大内容宽度 1280px，居中。
- 列表/卡片网格：桌面 3-up、平板 2-up、移动 1-up。
- 移动端单列，桌面端可用双栏（主内容 + 侧栏）。

### 4.3 Whitespace Philosophy
**深色 canvas 即留白**。区块通过 lift 到 surface-1 面区隔，而非靠白色 gap。面板内内容块之间 `{spacing.lg}` 24px gap；区块之间 `{spacing.section}` 96px（移动端缩到 `{spacing.xxl}` 48px）。

### 4.4 分层策略（Commit 专属，解决「高端惊艳」与「高频实用」张力）
| 层 | 场景 | 处理 |
|---|---|---|
| **展示面** | 空状态、Git Graph、热力图标题、设置页头部、首屏 hero | 放大留白 + display 字号 + 蓝紫渐变 accent + hairline 面框 |
| **操作面** | 任务列表、表单、设置项、搜索结果 | 回归克制：body 字号、纯色、surface-1 卡、紧凑间距 |
| **数据面** | 热力图网格、Git Graph 节点 | 密度优先，hairline 网格，语义色编码 |

---

## 5. Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| 0 (flat) | 无投影、无边框 | 默认正文、标题、footer |
| 1 (surface-1 lift) | `{colors.surface-1}` 底 + 1px `{colors.hairline}` | 默认卡片、列表项、面板 |
| 2 (surface-2 lift) | `{colors.surface-2}` 底 + 1px `{colors.hairline-strong}` | 高亮卡、hover 卡、选中态、status badge |
| 3 (surface-3 lift) | `{colors.surface-3}` 底 | 子导航、下拉菜单、popover |
| 4 (focus ring) | 2px `{colors.primary-focus}` outline @ 50% opacity | 聚焦输入框、聚焦按钮 |

**Commit 的深度由 surface ladder + hairline 承载，深色面几乎不用投影。** 这是 Linear 骨架的核心。

### 5.1 Decorative Depth
- **顶部边缘微高光**：浮起面板顶边 1px 半透明白线（`#FFFFFF @ 6%`），给深色面「像素级渲染」质感。
- **不用大气渐变、不用聚光卡片**（展示面的蓝紫渐变是受控的局部装饰，非全局氛围）。

---

## 6. Shapes

### 6.1 Border Radius Scale
| Token | Value | Use |
|---|---|---|
| `{rounded.xs}` | 4px | 小 chip、status badge、热力图格子 |
| `{rounded.sm}` | 6px | inline tag、commit hash chip |
| `{rounded.md}` | 8px | **所有按钮、表单输入** |
| `{rounded.lg}` | 12px | 任务卡、仓库卡、feature 卡 |
| `{rounded.xl}` | 16px | 大面板、Git Graph 容器、模态 |
| `{rounded.xxl}` | 24px | 空状态、CTA banner |
| `{rounded.pill}` | 9999px | status pill、tab toggle |
| `{rounded.full}` | 9999px | 头像、圆形图标容器 |

### 6.2 摄影与插画几何
- Commit 无营销大图；几何由**数据可视化**（热力图格子、Git Graph 节点/连线）承担。
- 头像用 `{rounded.full}`，32–40px。
- 图标容器（优先级圆点、状态圆点）用 `{rounded.full}` 8px。

---

## 7. Components

### 7.1 Buttons
**`button-primary`** — Commit Blue CTA，全页默认主 CTA。
- 底 `{colors.primary}`、字 `{colors.on-primary}`（白）、`{typography.button}`、padding 8/14、`{rounded.md}`。
- hover → `{colors.primary-hover}`；pressed → `{colors.primary-focus}`；focused → 2px `{colors.primary-focus}` outline @ 50%。

**`button-secondary`** — 炭色按钮，次级 CTA（"取消"、"导出"）。
- 底 `{colors.surface-1}`、字 `{colors.ink}`、`{typography.button}`、padding 8/14、`{rounded.md}`、1px `{colors.hairline}`。

**`button-tertiary`** — 纯文字按钮。
- 底 `{colors.canvas}`、字 `{colors.ink}`、`{rounded.md}`、padding 8/14。

**`button-danger`** — 危险操作（删除）。
- 底 `{colors.error}`、字白、`{rounded.md}`、padding 8/14。

**`button-inverse`** — 反白 CTA（罕用）。
- 底 `{colors.inverse-canvas}`、字 `{colors.inverse-ink}`、`{rounded.md}`、padding 8/14。

### 7.2 Tabs / Segmented Control
**`segmented-default`** + **`segmented-selected`**
- default：`{colors.canvas}` 底、`{colors.ink-subtle}` 字、`{rounded.pill}`、padding 6/14。
- selected：`{colors.surface-2}` 底、`{colors.ink}` 字——选中即 surface lift。

### 7.3 Cards
**`task-card`**（Commit 核心组件）— 列表中的任务项。
- 底 `{colors.surface-1}`、字 `{colors.ink}`、`{typography.body}`、`{rounded.lg}`、padding 16。1px `{colors.hairline}`。
- 左侧 3px 优先级色条（`{colors.priority-*}`）。
- 标题 `{typography.card-title}`；meta（分支名/截止日）`{typography.mono-sm}` + `{colors.ink-subtle}`。
- 右侧 status pill（见 7.5）。
- hover → lift 到 `{colors.surface-2}` + 1px `{colors.hairline-strong}`。

**`repository-card`** — 仓库项。
- 底 `{colors.surface-1}`、`{rounded.lg}`、padding 16、1px `{colors.hairline}`。
- 仓库名 `{typography.card-title}`；分支数/任务数用 `{typography.mono-sm}` 计数。

**`feature-card`** / **`panel-card`** — 通用面板。
- 底 `{colors.surface-1}`、`{rounded.lg}`、padding 24、1px `{colors.hairline}`。

**`empty-state-card`**（展示面）— 空状态。
- 底 `{colors.canvas}`、`{rounded.xxl}`、padding 48。
- display-xl 标题 + 蓝紫渐变 accent 装饰 + `{colors.ink-muted}` 引导文 + 主 CTA。

**`cta-banner`** — 结尾 CTA。
- 底 `{colors.surface-1}`、`{typography.headline}`、`{rounded.lg}`、padding 48。

### 7.4 Inputs & Forms
**`text-input`** + **`text-input-focused`**
- 底 `{colors.surface-1}`、字 `{colors.ink}`、`{typography.body}`、`{rounded.md}`、padding 10/12。1px `{colors.hairline-strong}`。
- focused：2px `{colors.primary-focus}` outline @ 50% opacity。
- error：1px `{colors.error}` + 下方 `{colors.error}` `{typography.caption}` 提示。

**`text-input-label`** — `{typography.eyebrow}` + `{colors.ink-muted}`。

### 7.5 Status & Badges
**`status-badge`** — 任务状态 pill。
- 底对应 `{colors.status-*}` @ 12% opacity、字对应 `{colors.status-*}`、`{typography.mono-sm}`、`{rounded.pill}`、padding 2/8。

**`priority-dot`** — 优先级圆点。
- `{colors.priority-*}`、`{rounded.full}`、8px。

**`count-badge`** — 计数徽章。
- 底 `{colors.surface-2}`、字 `{colors.ink-muted}`、`{typography.mono-sm}`、`{rounded.pill}`、padding 2/8。

### 7.6 Branch Indicator（Git 专属）
**`branch-indicator`**
- 分支色环取色（`{colors.branchColors}` 循环）+ `{typography.mono}` 分支名。
- `{colors.ink-muted}` 前缀图标（git-branch）+ 分支色圆点 + 等宽分支名。
- `{rounded.sm}` chip 容器，padding 4/8，底 `{colors.surface-2}` @ 50%。

### 7.7 Heatmap（Git 专属，数据面）
**`heatmap-cell`**
- `{colors.heatmap-*}` 色阶、`{rounded.xs}` 4px、gap 3px。
- 空 cell `{colors.heatmap-empty}`；hover → 1px `{colors.hairline-strong}` 边框 + tooltip（`{colors.surface-3}` 底 + `{typography.caption}`）。
- 月份/星期标签 `{typography.mono-sm}` + `{colors.ink-subtle}`。
- 图例「Less → More」`{typography.caption}` + 5 格色阶。

### 7.8 Git Graph（Git 专属，数据面）
**`git-graph-canvas`**
- 底 `{colors.canvas}`、`{rounded.xl}` 容器、padding 24。
- 节点：分支色 + `{rounded.full}` 8px；commit 节点带 ring。
- 连线：分支色 2px 贝塞尔，merge 节点高亮 `{colors.primary}`。
- 缩放控件：`button-secondary` 圆形（`{rounded.full}` 36px），右下角浮动。

### 7.9 Commit Row（Git 专属）
**`commit-row`**
- 底 `{colors.canvas}`、`{typography.body}`、`{rounded.xs}`、padding 16/0。1px `{colors.hairline}` 下分隔。
- commit hash `{typography.mono-sm}` + `{colors.primary}`；message `{typography.body}`；时间 `{typography.mono-sm}` + `{colors.ink-subtle}`。

### 7.10 Navigation
**`top-nav`** / **`app-bar`**
- 底 `{colors.canvas}`、字 `{colors.ink}`、`{typography.body-sm}`、高度 56（移动端 56，桌面端可 64）。
- 无投影，底部 1px `{colors.hairline}` 分隔。

**`bottom-nav`**（移动端）
- 底 `{colors.canvas}`、选中项 `{colors.primary}` + `{typography.mono-sm}` label、未选中 `{colors.ink-subtle}`。
- 顶部 1px `{colors.hairline}`。触摸目标 ≥48px。

### 7.11 Footer / Settings List
**`footer`** — `{colors.canvas}` 底、`{colors.ink-subtle}` 字、`{typography.caption}`、padding 64/32。

**`settings-row`** — `{colors.surface-1}` 底、`{rounded.lg}`、padding 16、1px `{colors.hairline}`；右侧 chevron `{colors.ink-subtle}`。

### 7.12 Dialog / Modal
**`dialog`**
- 底 `{colors.surface-1}`、`{rounded.xl}`、padding 24、1px `{colors.hairline-strong}`。
- 遮罩 `{colors.overlay}` @ 50%。
- 标题 `{typography.headline}`；按钮组右对齐（secondary 左、primary 右）。

### 7.13 Toast
**`toast`**
- 底 `{colors.surface-3}`、字 `{colors.ink}`、`{typography.body-sm}`、`{rounded.md}`、padding 12/16。
- 左侧 3px 语义色条。底部浮出，自动消失。

### 7.14 Loading / Error
**`loading-indicator`** — `{colors.primary}` 环形进度，居中。

**`error-state`** — `{colors.error}` 图标 + `{typography.body}` 信息 + `button-secondary` 重试。

---

## 8. Do's and Don'ts

### Do
- 以 `{colors.canvas}` `#0F172A` 为系统锚定面（非纯黑）。
- `{colors.primary}` 蓝仅用于：品牌标识、主 CTA、focus ring、链接强调。
- 展示面用蓝紫渐变 `{colors.primary-gradient}` 取「眼前一亮」；操作面保持纯色克制。
- 用四阶 surface ladder 承层级，不跳级。
- display 600 配 body 400；display 激进负字距。
- CTA 用 `{rounded.md}` 8px——绝不 pill 圆 CTA。
- 卡片用 `{rounded.lg}` 12px + 1px hairline。
- 深色面靠 surface ladder + hairline，几乎不用投影。
- branch name / commit id / label 一律 JetBrains Mono。

### Don't
- 不用纯黑 `#000000` 做 canvas。
- 不用蓝作为区块背景或卡片填充（仅 accent 用途）。
- 不引入第二个彩色 accent（语义色仅用于状态编码，非装饰）。
- 不加大气渐变或聚光卡片（展示面渐变是受控局部装饰）。
- 不 pill 圆 CTA。
- 不用投影堆叠卡片（深色面投影无效）。
- 不用 Emoji 做 UI 图标（用 Heroicons SVG，见 `lib/core/theme/app_icons.dart`）。
- 不用 `GestureDetector` 做可见交互（用 `Semantics` + `InkWell`，见 `overview.md`）。

---

## 9. Responsive Behavior

### 9.1 Breakpoints
| Name | Width | Key Changes |
|---|---|---|
| Desktop-XL | ≥1440px | 双栏布局，最大 1280px 居中 |
| Desktop | ≥1280px | 卡片网格 3-up |
| Tablet | ≥1024px | 卡片网格 2-up |
| Mobile-Lg | ≥768px | 单栏，底部导航 |
| Mobile | <768px | 单列；display-xl 48px → 32px；间距 `section` 96 → `xxl` 48 |

### 9.2 Touch Targets
- CTA ≥40px 高度，触摸端 ≥44px。
- 底部导航项 ≥48px。
- 表单输入触摸端 ≥44px。

### 9.3 Collapsing Strategy
- 顶部导航：<768px 折叠为 hamburger。
- 卡片网格：3-up → 2-up @1024px → 1-up @768px。
- Git Graph：<768px 启用双指缩放，隐藏侧栏。
- display 字号：display-xl 48px → 32px @768px。

### 9.4 Light Mode（可选，系统跟随）
浅色模式作为可选项保留（settings 已支持 ThemeMode 切换）。token 映射：
- canvas `#F8FAFC`、surface-1 `#FFFFFF`、surface-2 `#F1F5F9`、surface-3 `#E2E8F0`、surface-4 `#CBD5E1`。
- ink `#0F172A`、ink-muted `#475569`、ink-subtle `#64748B`、ink-tertiary `#94A3B8`。
- hairline `#E2E8F0`、hairline-strong `#CBD5E1`、hairline-tertiary `#94A3B8`。
- accent / semantic / heatmap / branchColors 色值不变（仅 surface 系反转）。
- 浅色模式**允许**轻微投影（`shadowSm`），深色模式不用。
- 顶部边缘高光：深色为 `#FFFFFF @ 6%`；浅色背景已浅，改用 `#000000 @ 6%` 顶部微阴影达到同等「像素级边框」质感。

---

## 10. Agent Prompt Guide

快速参考——对 AI agent 生成 UI 时的提示模板：

```
按 docs/DESIGN.md 渲染 Commit 的 <组件名>。
- 深色模式：canvas #0F172A，卡片 surface-1 #1E293B + 1px hairline #1E293B。
- accent 蓝 #3B82F6 仅用于 CTA/focus/链接；展示面可用 #3B82F6→#8B5CF6 渐变。
- 字体：标题/正文 IBM Plex Sans，branch/commit/label 用 JetBrains Mono。
- 卡片 rounded.lg 12px；按钮 rounded.md 8px；CTA 绝不 pill。
- 深色面不用投影，靠 surface ladder + hairline。
- 列表项用 task-card 规范（左侧 3px 优先级色条 + 右侧 status pill）。
- 组件取色优先用 `AppThemeColors.of(context)`，保证浅色模式跟随主题，不直接写死 `AppColors.surface1`。
```

颜色速查：canvas `#0F172A` · primary `#3B82F6` · success `#10B981` · error `#EF4444` · ink `#F1F5F9`。

---

## 11. Iteration Guide
1. 一次只改一个组件，用本文件 §7 的 token 名引用。
2. 新增区块时，先决定它落在哪一阶 surface。
3. 默认正文 `{typography.body}` weight 400。
4. 改完跑 `flutter analyze` + `flutter test`。
5. 新增变体作为独立组件条目记入 §7。
6. 蓝色克制：品牌标识、主 CTA、focus、链接强调。
7. 展示面优先放 display 字号 + 渐变 accent；操作面回归 body + 纯色。

---

## 12. Implementation Mapping（token → 代码）

| DESIGN token | 代码位置 |
|---|---|
| `{colors.*}` | `lib/core/theme/colors.dart` → `AppColors.*` |
| `{typography.*}` | `lib/core/theme/typography.dart` → `AppTypography.*` |
| `{spacing.*}` / `{rounded.*}` | `lib/core/theme/dimensions.dart` → `AppDimensions.*` |
| 组件主题 | `lib/core/theme/app_theme.dart` → `ThemeData` |
| 图标 | `lib/core/theme/app_icons.dart` → `AppIcon` / `AppIconName` |
| 组件实现 | `lib/presentation/widgets/**` |

> 当前 token 层与本文件存在差异（字距缺失、surface ladder 命名未对齐、圆角档位不全等），见配套《开发改动计划》逐项修正。

---

## 13. Page Composition Patterns

Commit 的屏幕可归为五类构成模式。先选对模式，再套对应组件，可避免「把展示面样式错放到操作面」的常见问题。

### 13.1 Hero Empty State（展示面）
- **场景**：首屏无仓库、search 无结果、首次启动。
- **结构**：垂直居中，`displayXl` 标题 + 蓝紫渐变装饰（`primaryGradient`）+ `inkMuted` 引导文 + `button-primary`。
- **容器**：`empty-state-card`——canvas 底、`rounded.xxl`、padding 48。
- **节奏**：标题 ↔ 引导文 `md`(16)；引导文 ↔ CTA `lg`(24)。

### 13.2 Dense List（操作面）
- **场景**：task list、repository list、search results、commit history。
- **结构**：单列卡片列表，item 间距 `xs`(8)；卡片用 `task-card` / `repository-card` / `commit-row`。
- **分组**：组标题用 `headline` + `eyebrow` 分类标记，组间距 `section`(96)（移动端 `xxl`(48)）。
- **交互**：整卡 `InkWell` + hover lift；右滑/长按等手势不替代可见按钮。

### 13.3 Data Canvas（数据面）
- **场景**：heatmap、git graph。
- **结构**：`displayMd` 区块标题 + `eyebrow` 分类；主体占满可用宽度，四周 `lg`(24) 留白。
- **可视化**：热力图格子 `rounded.xs`(4) + `heatmapGap`(3)；Git Graph 容器 canvas 底 + `rounded.xl`(16) + padding 24。
- **控件**：缩放/图例/筛选用 `button-secondary` 圆形或 `segmented`。

### 13.4 Settings Stack（设置页）
- **场景**：settings、about、data management。
- **结构**：顶部展示面 header（`displayMd` + 渐变装饰），下方 `settings-row` 列表。
- **行**：左图标（`iconMd`）+ 标题 `body` + 右侧 value `inkMuted` + chevron `inkSubtle`。
- **分组**：同组行用 `surface1` 卡片包裹（`rounded.lg` + hairline），组间距 `lg`(24)。

### 13.5 Detail Split（详情页）
- **场景**：repository detail、task detail。
- **桌面**：左主列表（`LayoutBuilder` 分配 1/3 ~ 1/2）+ 右详情侧栏（`surface1` 底、hairline 左分隔）。
- **移动**：单栏，详情为独立 screen；AppBar 左侧返回按钮用 `button-tertiary`。
- **内容**：标题 `headline`；meta 用 `mono-sm` + `inkSubtle`；操作按钮组右对齐（secondary + primary）。

### 13.6 Do's & Don'ts for Pages
- **Do**：展示面用 display + 渐变；操作面回归 body + 纯色；数据面密度优先。
- **Don't**：把 hero 的大字距/渐变用到列表卡片；给列表卡片加投影；在数据面塞大段说明文字（用 tooltip/图例替代）。
- **Don't**：在桌面端把详情页做成全屏弹窗，应保留列表上下文。

# 画稿来源清单（2026-11-21）

**范围**: `design/images/` 下的 109 个文件。**用途**: 分清哪些是 `design/source/*.mjs` 渲染生成、哪些是生图模型产出后导入，避免把导入图当成可复现产物。本文只做盘点，不改图、不重跑渲染、不改源码。

2026 年 11 月 22 日已确认 [Web 认证最新 UI 参考](web-auth/DESIGN.md)。这 17 张 ImageGen 原图单独收录在 `docs/web-auth/`，包含八组明暗主方案和一张浅色居中备选。下表继续记录 `design/images/` 的原始来源和数量。P09–P11、S11 及站内账号状态的视觉评审以新交接稿为准。

## 判定方法与顺序

1. **SHA256 比对**：将 109 个文件与归档 `commit-archive/2026-11-19/.../homepage-images` 的 217 个文件逐一比对，命中即判为生图导入，并记录命中对象。
2. **source 渲染入口**：在 `design/source/*.mjs` 中查找该画稿对应的页面定义（`id` + `slug`），并按 `shared.mjs` 的 `fileStem = id-slug-theme` 规则比对文件名。能对上即判为渲染生成。
3. **画布尺寸**：`render.mjs` 固定视口宽 1440、`deviceScaleFactor: 1`，截图宽度必为 1440；导入图不受此约束。
4. **命名与批次**：文件名符合 `<id>-<slug>-<theme>.png` 的按第 2 步核对；不符合的归入其他。

## 统计

| 类别 | 数量 | 说明 |
|---|---|---|
| 渲染生成 | **106** | 全部为 1440 宽，文件名与 `fileStem(id, slug, theme)` 一致 |
| 生图导入 | **2** | `p00-home-light.png`、`p00-home-dark.png` |
| 其他 / 不确定 | **1** | `branch-variants-overview.jpg` |
| 合计 | 109 | 与目录文件数一致 |

## 生图导入（2）

两张均为 793×1983，宽度不符渲染画布，且与归档图 SHA256 完全相同。

| 文件 | 尺寸 | 判定依据 |
|---|---|---|
| `p00-home-light.png` | 793×1983 | SHA256 命中归档 `31-notion-time-tree-light-approved.png` |
| `p00-home-dark.png` | 793×1983 | SHA256 命中归档 `31-notion-time-tree-dark-v4.png` |

## 其他 / 不确定（1）

| 文件 | 尺寸 | 判定依据 |
|---|---|---|
| `branch-variants-overview.jpg` | 1860×1040 | 非 PNG、宽度不符 1440，source 中无对应页面或输出路径（仅存在同名 CSS 类 `bm-overview`，不是图稿入口）；哈希未命中归档。按尺寸与用途推断为三张分支变体画稿的拼图总览，生成方式未留入口，不能由 source 复现 |

## 渲染生成（106）

以下文件均由 `design/source/render.mjs` 经 headless Chromium 输出到 `design/images/`，宽度统一 1440。每个 `-light` / `-dark` 成对出现。

| 源入口 | 覆盖画稿 | 数量 |
|---|---|---|
| `today-detail.mjs` | `p01-today-light/dark`、`p03-branch-detail-light/dark` | 4 |
| `tree-history.mjs` | `p02-branches-light/dark`、`p04-history-light/dark` | 4 |
| `branches-grouped.mjs` | `p02-branches-grouped-light/dark` | 2 |
| `branches-inspect.mjs` | `p02-branches-inspect-light/dark` | 2 |
| `branches-map.mjs` | `p02-branches-map-light/dark` | 2 |
| `year.mjs` | `p05-year-light/dark` | 2 |
| `me-data.mjs` | `p06-me`、`p07-settings`、`p08-data`、`s06-badge-wall`、`s06-badge-detail`、`s08-restore-file`、`s08-data-v1`、`s08-snapshot-restore`（各 light/dark） | 16 |
| `auth-pages.mjs` | `p09-login`、`p10-signup`、`p11-recover`、`s11-recover-reset`、`s11-recover-sent`（各 light/dark，旧渲染形式） | 10 |
| `branch-layers.mjs` | `b01-branch-menu`、`b02-branch-new`、`b03-branch-new-child`、`b04-branch-rename`、`b05-branch-move`、`b06-branch-finish`、`b07-branch-finish-confirm`、`b08-branch-pause`、`b09-branch-archive`、`b10-branch-delete-empty`、`b11-branch-unarchive`、`b12-branch-restart`（各 light/dark） | 24 |
| `support-views.mjs` | `o01-quick-add`、`o02-todo-detail`、`o03-commit-detail`、`o04-search`、`o05-clear-local`、`o06-first-task`、`o06-first-commit`、`o06-sample-tree`、`o07-sync-entry`、`o08-sync-devices`、`o08-sync-conflict`、`s01-all-todos`、`s01-week-review`、`s01-month-review`、`s02-archived-branches`、`s04-milestone-detail`、`s04-milestone-new`、`s05-year-share`、`s06-help`（各 light/dark） | 38 |
| `visual-language.mjs` | `visual-language-light/dark` | 2 |
| **合计** | | **106** |

表中标「各 light/dark」的名目，均对应 `<名>-light.png` 与 `<名>-dark.png` 两个文件；单列名目均为明暗成对出现。

**判定依据补充**：上表每个文件名都等于 `shared.mjs` 的 `fileStem(page, theme)`（小写 id + `-` + slug + `-` + 主题）；对应页面定义可在所列模块的 `page` / `pages` 导出中按 `id` 与 `slug` 找到。`render.mjs` 第 94 行固定 `width = 1440`，与全部 106 张的宽度一致。

## 复现方式

- 默认组：`node design/source/render.mjs`（P01、P03、P04、P05 与视觉语言板）
- 全部页面组：`node design/source/render.mjs --all-pages`（登录、我的与数据、分支层级、补充视图）
- 分支变体组：`node design/source/render.mjs --branch-variants`（分组 / 检视 / 地图三种）

生成物直接写入 `design/images/`，并重写 `design/tokens.css`（默认组）。**画稿只能由源生成，不得手改 PNG。**

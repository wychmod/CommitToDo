# 旧 Web 实现档案（2026-11-19）

## 为什么归档

2026-11-19 决定放弃旧 Web 实现：`web/src` 已整体清空，只保留一个可启动的最小外壳（一条路由 + 占位页），旧工程规范（分层、门禁、Agent 约束）同时废弃。

描述旧实现、且整体失效的文档与静态资产不再留在活跃目录，统一移入本目录。**本目录内容仅供追溯，不得作为实现依据。** 目标领域模型以 [`../../../FRAMEWORK.md`](../../../FRAMEWORK.md) 为唯一出处。

## 对应提交

| commit | 事件 |
|---|---|
| `2389878` | 清空旧 Web 实现（presentation / application / domain / core / data / platform、测试、旧主题 CSS）并重建最小外壳 |
| `8ea14b6` | 曾以「⚠️ 已过时」标注方式保留旧内容（本次归档前的状态，已被本提交取代） |
| `678ee9a` | 移除登录后端（3 个云函数、PostgreSQL 迁移、CloudBase 配置） |
| `272e5c9` | 产品框架收敛为单根分支树 + 5 个对象（`ARCHITECTURE.md` §12 的目标模型即出自此，现行口径见 `docs/FRAMEWORK.md`） |
| 本次提交 | 把下列文件从活跃目录移入本目录，重写根 `README.md` |

## 内容

| 文件 | 原位置 | 说明 |
|---|---|---|
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | `docs/ARCHITECTURE.md` | 2.8.1。§1–§11 描述已删除的旧实现（六层架构、Dexie schema、9 个 store、8 条路由、四道门禁等）；§12 目标模型以 `docs/FRAMEWORK.md` 为准；§13 为历史变更记录 |
| [`STALE.md`](./STALE.md) | `docs/STALE.md` | 2026-11-19 的过期项盘点，逐项核对后全部归档至此，表中的路径均为归档前位置 |
| [`public/manifest.json`](./public/manifest.json) | `web/public/manifest.json` | PWA manifest。manifest 链接与 `vite-plugin-pwa` 已移除，`theme_color` / `background_color` 属旧视觉体系 |
| [`public/robots.txt`](./public/robots.txt) | `web/public/robots.txt` | 无引用 |
| [`public/icons/`](./public/icons/) | `web/public/icons/` | 3 个图标，仅被上面的 manifest 引用 |

仍保留在 `web/public/` 的只有 `favicon.svg`，它被 `web/index.html` 引用。

# 过期内容清单（2026-11-19）

**状态**: 盘点记录，随重写逐步清空
**触发事件**: 2026-11-19 清空 `web/` 旧实现并重建最小外壳（commit `2389878`）；旧工程规范（分层、门禁、Agent 约束）同时废弃
**原则**: 只标注、不改写、不删除。原文保留以便追溯，标注统一用 `⚠️ 已过时` 引用块（文档）或 `TODO(2026-11-19)` 注释（代码 / 配置 / 静态资产）

---

## 1. 根文件

| 位置 | 过时原因 | 处理方式 |
|---|---|---|
| `README.md` 开头「当前唯一已实现并能正常运行的是 Web 端（`web/`）……」 | `web/src` 已清空，现仅有占位外壳；旧命名「仓库 / 分支 / 任务 / 提交」已无实现 | 已标注 + 待重写 |
| `README.md` §目录结构 | 图中「`src/` 应用源码，六层架构」「`web/docs/`」均已不存在 | 已标注 + 待重写 |
| `README.md` §快速开始 | `npm run lint`、`npm test` 脚本已随旧门禁删除；「首次访问进入落地页 / 进入工作台」已无对应页面 | 已标注 |
| `README.md` §已实现的能力（核心模型 / 任务管理 / 视图 / 数据 / 认证 / 体验） | 全部内容对应已删除的实现，无一项在现行代码中存在 | 已标注 + 待重写 |
| `README.md` §技术栈 | 现行运行时依赖只有 `react`、`react-dom`、`react-router-dom`；Tailwind / Radix / Zustand / tsyringe / Dexie / ReactFlow / Vitest / PWA 均已从依赖清单移除 | 已标注 + 待重写 |
| `README.md` §质量基线 | 「291 个用例」「JS 1,796 kB」「CSS 110 kB」均来自已删除实现；对应命令已不存在 | 已标注 + 待重写 |
| `README.md` §文档 表中 `web/docs/ARCHITECTURE.md` 一行 | 该文件已于 2026-11-19 删除，链接失效 | 已标注 + 待重写 |
| `README.md` §历史文档 表中 `docs/DESIGN.md`、`docs/DESIGN.reference.linear.md`、`web/docs/v3/*`、`web/docs/PRD.md`、`web/docs/TASKS.md` | 原始路径均已不存在（现位于 `docs/archive/2026-11/` 下） | 已标注 |
| `skills-lock.json` | 锁定的 `cloudbase` skill 服务于已删除的登录后端，当前无任何代码使用 | 待删除（确认 skill 不再使用后） |

## 2. 根 `docs/`

| 位置 | 过时原因 | 处理方式 |
|---|---|---|
| `docs/ARCHITECTURE.md` 文档头（版本 / 作用域说明） | 仍声称描述「当前真实存在的架构」 | 已标注 |
| `docs/ARCHITECTURE.md` §1 现状速览 | 代码规模 24,000 行、51 个测试文件、291 个用例、Dexie 四版 schema、登录切库等全部对应已删除代码 | 已标注 + 待重写 |
| `docs/ARCHITECTURE.md` §2 分层与依赖 | `src/core|domain|application|data|platform|presentation` 六层目录与 `core/di/injection-container.ts` 装配点已删除；旧依赖规则不再约束 | 已标注 + 待重写 |
| `docs/ARCHITECTURE.md` §3 领域模型 | 旧实体 `Repository` / `Branch` / `Task` / `Commit` 与三个枚举已删除；目标模型见同文 §12 | 已标注 |
| `docs/ARCHITECTURE.md` §4 持久化 | Dexie 库名、六张表与复合索引已随实现删除 | 已标注 |
| `docs/ARCHITECTURE.md` §5 状态管理 | 9 个 Zustand store 已删除 | 已标注 |
| `docs/ARCHITECTURE.md` §6 路由 | 现在只有 `/` 一条占位路由；文档列出的 8 条路由与兼容重定向均不存在 | 已标注 |
| `docs/ARCHITECTURE.md` §7「前端残留的认证代码……将在重做时一并移除」 | 已于 2026-11-19 随 `web/src` 一并删除 | 已标注 |
| `docs/ARCHITECTURE.md` §10 已知缺口 | 第 1–3、5–7 项描述的是已删除实现（测试时序、包体积、示例数据、提醒服务）；第 4 项所指测试文件已删除 | 已标注 + 待重写 |
| `docs/ARCHITECTURE.md` §11 验证方式 | 四条门禁（`npm run lint` / `tsc -b` / `npm test` / `npm run build`）中 lint 与 test 已移除，现只有 `dev` / `build` / `preview` | 已标注 + 待重写 |
| `docs/ARCHITECTURE.md` §12 目标领域模型、§13 变更记录 | 仍有效（目标模型未变，变更记录为历史） | 无需处理 |
| `docs/FRAMEWORK.md`、`docs/PRODUCT-STRATEGY.md` | 只定义产品层，不描述实现细节 | 无需处理 |
| `docs/archive/README.md` 2026-07 批次表中「真实登录已实现」「`web/src` 中 0 处引用」 | 登录后端与前端认证代码已删除；`web/src` 已清空 | 已标注 |
| `docs/archive/README.md` 2026-07 批次「现行替代」列指向 `web/docs/cloudbase-authentication-implementation-audit.md` | 该文件随 `web/docs/` 一并删除 | 已标注，待补替代文档 |
| `docs/archive/**` 内其余文档 | 归档目录本身就是「只读、不得作为实现依据」，其中的旧路径属历史记录 | 无需处理 |

## 3. `web/` 配置与静态资产

| 位置 | 过时原因 | 处理方式 |
|---|---|---|
| `web/public/manifest.json` | 无人引用：`index.html` 的 manifest 链接与 `vite-plugin-pwa` 均已移除；`theme_color` / `background_color` / 图标属旧视觉体系 | 已标注（`_stale` 字段），待删除或待重写 |
| `web/public/robots.txt` | 无人引用 | 已标注（注释） |
| `web/public/icons/icon-192x192.svg`、`icon-512x512.svg`、`maskable-icon.svg` | 仅被 `manifest.json` 引用，而 manifest 已无引用 | 已标注（XML 注释），待删除或待重写 |
| `web/public/favicon.svg` | 仍被 `index.html` 引用 | 无需处理 |
| `.gitignore` 中 `/web/output/screenshots/`、`/web/cloudfunctions/**`、`/web/cloudbaserc*.json` 等条目 | 指向已删除的目录 / 文件，规则不再命中任何内容 | 已标注（注释），待清理 |
| `web/package.json`、`web/vite.config.ts`、`web/tsconfig.json`、`web/tsconfig.node.json`、`web/index.html`、`web/src/**` | 已按最小外壳重建，无过时项 | 无需处理 |

## 4. 指向已删除文件 / 目录的引用

| 位置 | 引用对象 | 处理方式 |
|---|---|---|
| `README.md` 文档表 | `./web/docs/ARCHITECTURE.md`（已删除） | 已标注，链接待重写 |
| `README.md` 历史文档表 | `docs/DESIGN.md`、`docs/DESIGN.reference.linear.md`、`web/docs/v3/*`、`web/docs/PRD.md`、`web/docs/TASKS.md`（均已移动） | 已标注 |
| `docs/archive/README.md` 2026-11 批次 | `./2026-11/web/PRD.md`、`./2026-11/web/TASKS.md`（存在，路径有效） | 无需处理 |
| `web/src` 内部导入 | 无指向已删除模块的导入（外壳只引用 `react`、`react-router-dom`、本地页面与 CSS） | 无需处理 |

---

## 5. 后续

1. 视觉方向定稿后，重写 `README.md` 的目录结构 / 快速开始 / 已实现能力 / 技术栈 / 质量基线。
2. 新的工程规范定稿后，重写 `docs/ARCHITECTURE.md` §1–§11，并决定 `skills-lock.json` 与 `web/public/` 未引用资产的去留。
3. 清空后再次运行本清单，若某项已处理则在「处理方式」中改为「已完成」并注明 commit。

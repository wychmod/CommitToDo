# 技术架构方案（2026-11-20）

**状态**: 0.23 待评审。本文约定选型与工程边界。视觉设计与页面规格见 [设计交接](./DESIGN.md)，样式工程化见 §2.5，状态/图标/文案/测试见 §2.6–§2.9，代码结构契约（用例、clock/ids、错误、events、升级、断点、命名）见 §2.10、§5.9 与 [代码结构契约](./CODE-STRUCTURE.md)。
**本版依据**: 数据模型以 `design/images/` 的页面画稿为准（逐页核对结论见 §5.3–§5.3.3 与 [页面数据核对](./PAGE-DATA-CROSSCHECK.md)），不以文字规格反推。
**约束来源**: [`FRAMEWORK.md`](./FRAMEWORK.md) §4.10（数据与备份）、§4.12（账号与多端）、§7（版本切分）、§8（决策）；[`PRODUCT-STRATEGY.md`](./PRODUCT-STRATEGY.md) §6（硬约束）。
**本版前提**: Web 使用 Vite + React，部署采用腾讯云 CloudBase 静态托管，首发部署按用户节奏执行。**MVP 数据权威在本机（Dexie 4）**，保留按需初始化的 CloudBase SDK。**V1** 通过云函数与对象存储提供异地备份。**V2** 引入云开发身份、云数据库、一次性迁移与匿名统计，微信小程序接入同一后端。
**读法**: 已定项直接给结论与代价，不再列候选让人挑；需要填值的事项集中到 §9（信息清单），延后项与开工结论在 §10。

---

## 0. 结论摘要

| 层 | 结论 | 状态 |
|---|---|---|
| 框架与构建 | **Vite 8 + React 19 + TypeScript 7**（版本依据见 §2.2） | 已定 |
| 渲染与分发 | 静态 SPA + 首页构建期预渲染 | 已定 |
| 部署 | **腾讯云 CloudBase 静态托管**（流程已定，**首发暂缓**）；先用默认域名，自定义域名与备案到上线前才成为前置 | 已定 |
| 后端 | **MVP 无后端**。**V1** 由 Web 异地备份首次交付仓库根目录的共享云函数与对象存储。**V2** 增加云开发身份、云数据库和匿名统计 | 已定 |
| 数据存储 | **MVP 与 V1 本机权威**：IndexedDB + Dexie 4 直接读写；**V2 迁到云数据库后，云端是收敛点、本地仍是即时权威** | 已定 |
| 离线写入 | **本地先写 + outbox 补推**（V2 生效；MVP 起就写满 `opId` / `syncState`） | 已定（§4.6） |
| 认证 | MVP 无账号；**V1 仍无账号（匿名设备 ID）**；V2 引入云开发身份 | 已定（渠道待定） |
| 加密 | **不做端到端加密**，明文 + 权限规则（V2 适用；V1 的备份包也是明文） | 已定（§10.2） |
| 样式 | **CSS Modules + 原生 CSS 变量**；不引 Tailwind / CSS-in-JS / 组件库 | 已定（§2.5） |
| 微信小程序 | 和 Web 同仓库、前端独立构建与发布，V2 首版只读同一 CloudBase 后端。目录与边界见 §7.3 | 已定 |

**0.2 → 0.10 的关键变化**

1. 框架定稿为 Vite + React，版本按 registry 实查落地（0.3）。
2. 部署与后端改为 CloudBase（0.4）；但 **MVP 只用到静态托管**，且首发部署暂缓（0.22）。
3. 端到端加密定为不做，走明文 + 权限规则（0.5）。
4. **MVP 权威存储在本机**（0.6）：撤销「云端权威、LWW 冲突」等表述，MVP 读写直接落 Dexie。0.8 起改为「本地先写 + outbox 补推」，本地始终是即时权威、云端是收敛点。
5. 新增「迁移预置」约束（§5.5）与 MVP 上线路径（§3.3、§9），云数据库与云开发身份标注为 V2 启用。云函数的现行阶段划分见 §4.3。
6. **离线写入定为「本地先写 + outbox 补推」**（0.8，§4.6）：恢复 `opId` / `syncState` / `outbox` / `conflicts` / `baseRev` 五项预留，但 MVP 与 V1 只写不用。
7. **数据模型补全**（0.9）：`branches` 补物化路径、层级、归档与四个计数，`commits` 补原始归属、补记与撤销墓碑，新增 `badges` / `settings`，并落成树规则与五条关键查询索引（§5.3–§5.3.2）。
8. **样式工程化拍板**（0.10）：CSS Modules + 原生 CSS 变量，不引 Tailwind / CSS-in-JS / 组件库（§2.5）。
9. **以画稿为准的字段补全**（0.12）：`branches` 补目标、颜色、收尾/放下/置顶；`tasks` 补完成时间与完成提交、状态增加 `cancelled`；`milestones` 补备注；新增 `backups`（V1）、`year_reviews`（V1）；删无消费的 `tasks.priority`、`users.prefs`、`settings.fontScale`；规则类口径集中成 §5.3.3 一张表。
10. **四项工程细节拍板**（0.13）：Zustand 按屏切分且只装 UI 状态、数据一律 `useLiveQuery`；图标自绘内联 SVG；文案单文件 key 化只 `zh-CN`；Vitest 只测纯逻辑与规则（§2.6–§2.9）。同步落地 `web/src/stores`、`ui/icons`、`i18n`、`core/rules` 骨架与 `npm test`。

> 0.4 / 0.5 曾按「从 MVP 起云库权威 + 同步」编写，该前提已被推翻；本文已整体撤回相关表述，以 §0、§4、§5 为准。

---

## 1. 当前仓库的真实状态（基线）

| 项 | 事实 |
|---|---|
| 运行时依赖 | `react@19.3.1`、`react-dom@19.3.1`、`react-router-dom@7.18.6`、`zustand@5.1.0` |
| 开发依赖 | `vite@8.3.8`、`@vitejs/plugin-react@6.3.0`、`typescript@7.0.2`、`vitest@5.1.1`、`@types/react@19.3.0`、`@types/react-dom@19.3.0`、`@types/node@^24` |
| 引擎要求 | `package.json` 已写 `node >=22.12.0`（Vite 8 的 engines 为 `^20.19.0 \|\| >=22.12.0`）；本机 Node 24.18 |
| 构建 | `vite build`（`tsc -b` 先做类型检查），`base` 默认，别名 `@ -> src`；**已实测通过**：24 modules，JS 258.01 kB / gzip 82.11 kB |
| TypeScript | `strict`、`noUnusedLocals/Parameters`、`moduleResolution: bundler`、`jsx: react-jsx`；TS 7 已移除 `baseUrl`，`paths` 用相对路径 |
| 代码 | `src/main.tsx`、`src/app.tsx`（仅 `/` 一条路由）、`src/pages/home-page.tsx`、`src/index.css`；骨架目录 `src/stores/`、`src/ui/icons/`、`src/i18n/`、`src/core/rules/`（0.13 建，暂为空或极简实现） |
| 静态资产 | `web/public/favicon.svg`（唯一被引用项） |
| CloudBase | **保留 `@cloudbase/js-sdk@^3.11.1` 依赖，但 MVP 运行时无云端行为**：SDK 只在 `src/data/cloud/` 内按需初始化，应用入口不引用、不进首屏包、运行时不发请求；无云函数、无云数据库；`VITE_CLOUDBASE_ENV_ID` 只在调用云端能力时需要，构建与本地运行不需要 |
| 工具链 | ESLint 仍不引入；Vitest 于 0.13 重新引入，只做纯逻辑测试（§2.9）。分层目录、Tailwind token、旧 Dexie schema、PWA 插件均随 2026-11-19 清空删除，归档于 `docs/archive/2026-11/legacy-impl/` |
| 产品前提 | MVP 纯本地、无账号、不联网可用。V1 增加异地备份，使用匿名设备 ID。V2 做账号、多端与匿名统计。活跃分支 ≤200，里程碑照片已砍 |
| 首页形态 | 明暗长页按确认图的章节顺序实现。首屏演示约 1.4 秒，后续章节一次性入视触发，支持 `prefers-reduced-motion`。[首页动效](./HOMEPAGE-MOTION.md) |

这张表决定了后面所有结论：**MVP 没有服务端状态、没有多用户、没有大文件**，云函数与云数据库在 MVP 阶段一律不启用。

---

## 2. 框架与构建

### 2.1 定稿：Vite + React

不再评估 Next.js / Remix / Astro / SvelteKit。保留两条理由：

1. **产品形态是「一个静态首页 + 一个纯客户端工作台」。** 页面只需要构建期预渲染，不需要请求期 SSR；CloudBase 在 MVP 只做静态托管，更不构成换框架的理由。
2. **首页示例和局部入场由浏览器执行。** 静态 HTML 可先绘制文案、入口和工作台初态。运行时按需接管勾选、暂停和节点联动，静态部署即可承载。

只有出现「大量需要服务端渲染的内容页」或「多团队共享 RSC 数据流」时才值得重新评估，两者都不在当前路线图。

### 2.2 版本决策

| 包 | 选定 | 说明 |
|---|---|---|
| `react` / `react-dom` | **19.3.1**（主版本 19） | registry `latest`；与 CloudBase Web SDK 无版本耦合（SDK 只在 `src/data/cloud/` 按需使用） |
| `vite` | **8.3.8**（主版本 8） | registry `latest`；engines `^20.19.0 \|\| >=22.12.0` |
| `@vitejs/plugin-react` | **6.3.0** | peer 为 `vite ^8.0.0`，只能与 Vite 8 搭配 |
| `typescript` | **7.0.2** | registry `latest`；7.x 移除 `baseUrl`，`paths` 必须是相对路径 |
| `react-router-dom` | **7.18.6** | peer `react >=18`，与 React 19 兼容 |
| `@types/react` / `@types/react-dom` | **19.3.0** | 与 React 19 对齐 |
| `@types/node` | **^24** | 与本机 Node 24 对齐（不追 26，避免类型定义领先运行时） |

**选定依据**

- 2026-11-20 直接查 npm registry 的 `latest` 标签与 peer 约束（`npm view`），不凭记忆写版本号。
- Vite 与 plugin-react 必须同主版本：插件 peer 锁 `vite ^8.0.0`，跨主版本组合会直接装不上。
- 装完立即验证：`npm install` 成功，`npm run build` 通过（24 modules，JS 258.01 kB / gzip 82.11 kB），dev server `/` 与入口模块均返回 200。
- 类型链路上踩过一个坑并已修复：TS 7 报 `TS5102`（`baseUrl` 已移除）与 `TS5090`（非相对 `paths`），改为 `"@/*": ["./src/*"]` 后通过。
- 若 CloudBase SDK 与 Vite 8 的 ESM 解析出现问题，处理方式是**整条线退到上一主版本**（Vite 7 + 对应插件），而不是把某个包单独降小版本硬凑。

**升级窗口**

- 每 6 个月复核一次各包 `latest` 与安全公告；安全补丁随时升级，次版本按月跟进，主版本按季度评估。
- 主版本升级在独立分支进行，必须通过 `npm run build` 与首页滚动回归（含 `prefers-reduced-motion` 路径）。
- 半年内预期：React 19 / Vite 8 / TS 7 均为当前主线，无需换主版本；若 React 20 或 Vite 9 发布，列为观察项，不追首发。

### 2.3 首页演示与章节入场

按 [首页动效规范](./HOMEPAGE-MOTION.md) 接入。静态首屏即可读并使用主要入口，工作台直接排在主标题下方，进入视口后运行单次约 1.4 秒的示例。播放结束后，悬停主标题或工作区路径可重播；聚焦并激活路径按钮也会重播。首页「登录」进入独立认证页，「打开工作区」进入本机工作区。离开视口时冻结时钟，返回后续播。勾选、回执和时间树节点共享同一条示例记录，独立于本机业务数据。

- 用入视事件触发卡片、柱状图和时间树的一次性段落动画。动画由普通时钟推进，测试时要能看见首尾变化。旧原型的视口时间线问题与样本记录见 [首页动效规范](./HOMEPAGE-MOTION.md)。
- 局部位移和淡入可用 CSS，点线和分支轨迹可用 SVG 的描线状态。沿用首屏轻量实现，避免为这段编排增加滚动或动效库。
- 系统减少动效、脚本未接管或入视增强失效时，直接提供可读的静态状态。键盘、勾选和定位依靠实际组件状态。

### 2.4 其他构建决策

- 包管理：沿用 `npm` + 已提交的 `package-lock.json`。切 `pnpm` 只换来安装速度，代价是 CI 与文档全改，现在不值得。
- 路由：`react-router-dom@7` 已装，应用路由用 `createBrowserRouter` 数据路由；首页作为独立入口时不需要路由。
- 类型检查：`tsc -b` 与构建同一条脚本，不让类型错误进入构建产物。
- 代码分割：首页与应用拆成两个入口（`index.html` / `app.html`），确保访客不为工作台的依赖付首屏成本。
- **样式工程化见 §2.5**（已定：CSS Modules + 原生 CSS 变量）。令牌唯一来源是 `design/design-tokens.json`，`design/tokens.css` 只生成不手改；主题用 `data-theme` 挂在 `documentElement` 上，默认白天。

### 2.5 样式工程化（已定：CSS Modules + 原生 CSS 变量）

**结论（2026-11-21 拍板）**：应用样式采用 **CSS Modules + 原生 CSS 自定义属性**。不引 Tailwind、不引 CSS-in-JS（styled-components / emotion / vanilla-extract 等），不引组件库（Ant Design / MUI / Chakra 等一律不引）。

**为什么不是另外三条路**

| 被否决 | 原因 |
|---|---|
| 组件库（Ant / MUI / Chakra） | 设计是像素级定制：固定栅格、1px 线、写死的动效时长与间距。组件库自带设计语言与主题机制，引入即对抗——要覆盖 token、改内部 DOM、逐项打补丁，最后得到的是一层需要长期维护的反向皮肤 |
| Tailwind | 需要自己那份 config，会和 `design-tokens.json` 形成第二个真源；本项目大量用到任意值写法，等于把 CSS 写进类名，语义令牌反而更难追踪 |
| CSS-in-JS | 运行时开销与「首屏 HTML 即可绘制」的预渲染目标冲突；本项目没有动态样式需求 |

CSS Modules 由 Vite 原生支持、零配置；令牌本身就是变量，不需要映射层；组件样式与组件同目录同名，改一个组件只看一个文件。

**令牌：唯一真源**

- 唯一真源是 [`design/design-tokens.json`](../design/design-tokens.json)。
- 生成物 [`design/tokens.css`](../design/tokens.css) **只生成、不手改**；任何改动回到 JSON，再跑 `node design/generate-tokens.mjs`。只改 CSS 不改 JSON 的改动一律退回。
- 将来若换消费方式，也由这份 JSON 生成对应产物，令牌源不变。

**主题**

- 初始即浅色：未设置时页面就是浅色，不需要脚本判断，也不读取 `prefers-color-scheme`。
- 深色只能由用户手动切换：切换时写 `document.documentElement.dataset.theme = 'dark'`，并把选择持久化到 `settings.theme`（`light` / `dark`）；切回浅色写 `light` 或移除该属性。
- 下次首屏由 head 内联脚本把已存的选择写回 `data-theme`，避免明暗闪烁；该脚本只读本地设置，不探测系统偏好。
- 组件不复制颜色，也不在组件内判断明暗。

**约束**

- 页面与组件禁止硬编码色值、线宽、圆角、动效时长，一律取变量；组件中不出现十六进制色值。
- 不新建第 4 个圆角、第 4 档线宽、第 5 个时长；缺令牌就先改 `design/design-tokens.json`。
- 基础件只做薄封装：按钮、输入、行、浮层、菜单、提示、空态、加载。**不做通用组件库**，不引入任何第三方 UI 包。
- 组件样式一律 `*.module.css`，类名单横线小写（`.row`、`.rowSelected`）；禁止全局类名。
- 全局样式只保留 `reset.css`、`base.css`、`motion.css` 三份，业务样式不得写入；减少动效的兜底统一放在 `motion.css`，不靠 JS 判断。
- 目录与文件组织随页面架构落地时再定，但「令牌 → 变量 → 组件模块样式」这条链路不再变。

**反向条件**

只有同时出现「页面数量增长到几十个」「多人并行改 UI」「大量通用后台界面」三种情况时，才重新评估 Tailwind；其余情况不折腾。届时也不换令牌源，只换消费方式。

### 2.6 状态管理（已定：Zustand 按屏切分 + `useLiveQuery`）

**两层分工**：界面状态进 store，领域数据只从 Dexie 读。

- **数据状态**一律走 Dexie 的 `useLiveQuery`（§5.4）。分支、待办、提交、里程碑、徽章、计数、进度、停滞列表、筛选结果**都不允许复制进 store**。
- **UI 状态**进 Zustand：选中项、展开/折叠、浮层开关、命令面板、撤销回执、未提交的表单草稿。刷新后不需要恢复的东西才放这里。

**目录与命名**

- 目录 `web/src/stores/`，按屏切分：一屏一个 `<screen>.store.ts`（如 `today.store.ts`、`branch-detail.store.ts`）；跨屏外壳单独一个 `shell.store.ts`（命令面板、撤销回执、全局浮层）。
- 导出名 `use<Screen>Store`（`useTodayStore`、`useShellStore`）；文件名 kebab-case，与路由段同名。
- state 用名词（`selectedTaskId`、`composerOpen`），action 用动词开头（`selectTask`、`openOverlay`、`clearUndo`）；不写 `setXxx`，除非它真的只是赋值。
- 组件里只用选择器订阅：`useTodayStore((s) => s.selectedTaskId)`，不整对象订阅。

**什么时候该建 store**（三条同时成立才建）

1. 状态不属于任何实体，刷新后丢了也无所谓；
2. 只有同屏的多个组件共享，跨屏没有意义；
3. 写它不产生业务事件、不写库。

任一条不成立：是业务数据 → 进 Dexie；只在一个组件里用 → `useState`；来自 URL（页签、筛选、日期）→ 用路由参数，不进 store。

**约束**：不启用 `persist` 中间件；需要持久化的只有 `settings`（主题、树密度、注解），写 Dexie 而不是 localStorage；store 里不持有 Dexie 实例、不写异步副作用（副作用留在仓储或页面层）。

### 2.7 图标（已定：自绘内联 SVG，不引图标库）

- 目录 `web/src/ui/icons/`，一个图标一个组件，统一从 `index.tsx` 导出；组件文件必须 `.tsx`（`index.ts` 放 JSX 会编译失败）。
- 共用外壳 `SvgIcon`：`viewBox="0 0 24 24"`、`fill="none"`、`stroke="currentColor"`、`strokeWidth={1.5}`、圆头圆角、`aria-hidden`。
- **尺寸**只允许 `16 / 18 / 20 / 24`，默认 18。唯一例外是徽章令牌（画稿里的 29 / 39），由徽章组件内部传给 `size`，其他组件不得使用。
- **颜色**一律 `currentColor`，组件内不写任何色值；外层用令牌变量设定（`color: var(--text-muted)`）。
- **描边**统一 1.5；需要第二档时先改 `design/design-tokens.json`，不在图标里写死。
- 路径内联，不用 sprite、不 `import '*.svg'`、不引 `lucide-react` / `react-icons` 等任何图标包。

### 2.8 文案与 i18n 骨架（已定：单文件 key 化，只 `zh-CN`）

- 目录 `web/src/i18n/`：`zh-CN.ts` 是**唯一文案表**，`index.ts` 提供 `t()` 与 `MessageKey` 类型。
- key 约定 `域.元素.语义`，段内 camelCase（`today.header.withDue`、`common.add`）；域与路由段或模块同名，不复用 `common.title` 这类泛词。
- 组件内不写死中文：按钮、占位符、空态、`aria-label`、提示语一律 `t('...')`。测试断言与控制台日志除外。
- 类型安全：`MessageKey = keyof typeof zhCN`，`t()` 只接受已存在的 key，写错编译期报错。
- 新增语言时只加一个同结构的目录文件并扩展 `Locale`，组件不改；在此之前不改组件签名。
- **暂时不做**：不引 i18next / react-intl / FormatJS 等运行时库；不做复数规则、性别与语序处理；不做日期/数字本地化（统一由工具函数走 `Intl.DateTimeFormat('zh-CN')`）；不做语言切换 UI、不做按语言分包、不做 key 自动提取脚本。

### 2.9 测试基线（已定：Vitest，纯函数 + 规则 + Dexie 事务）

- 工具：**Vitest 5**，配置合并在 `web/vite.config.ts` 的 `test` 字段，不另建 `vitest.config.ts`。
- 两个测试项目，按文件路径自动分流：
  - `unit`：`src/**/*.test.ts`（排除 `src/data/`），纯函数、四计数重算、§5.3.3 的 R1–R19 规则；不加载 IndexedDB，开销最小。
  - `db`：`src/data/**/*.test.ts`，需要 IndexedDB 的事务用例；`setupFiles` 只在这里引入 `src/test/idb-setup.ts`（`fake-indexeddb/auto`），纯函数用例不受影响。
- 位置与命名：与实现同目录的 `*.test.ts`（如 `src/core/rules/counters.test.ts`、`src/data/transactions.test.ts`）；不用 `.spec.ts`，不建 `__tests__/` 目录。
- 运行：`npm test`（即 `vitest run`，两个项目一次跑完）；本地 watch 用 `npx vitest`。
- 范围（MVP）：四计数重算、R1–R19 规则、日期与分组函数、导入导出校验，以及 **Dexie 事务一致性**——「完成待办时提交与四计数同事务写入」、事务失败整体回滚、唯一索引与复合索引命中。
- 事务用例约定：每个用例开头 `db.delete()` + `db.open()` 隔离库；行对象用就地工厂构造（不建共享 fixture）；断言落在库内实际值，不 mock 仓储。
- 不测：组件渲染与快照、样式、路由跳转、视觉效果；需要 DOM 的交互测试留到后续单独评估，MVP 不引 jsdom / browser 模式。
- 约定：规则实现放 `src/core/` 且不 import React；函数签名用最小接口，测试数据用就地工厂函数构造，不建共享 fixture 文件。
- 覆盖边界：MVP 不设覆盖率门槛；但**每新增一条 R 规则必须同时加用例**，涉及多表写入的规则还必须补同事务/回滚用例，否则评审不通过。

### 2.10 响应式断点（已定：390 / 760 / 1440）

| 名称 | 值 | 用途 |
|---|---|---|
| `mobile` | **390px** | 设计基准窄屏；明细与编辑改全屏面板，保留关闭入口 |
| `compact` | **760px** | 应用外壳断点：侧栏转顶部横向导航，树保留层级与行尾操作 |
| `wide` | **1440px** | 桌面设计基准；详情用侧栏而非覆盖层 |

- CSS 自定义属性不能用在 `@media` 条件里，因此媒体查询内允许直接写这三个数值，且只允许这三个；这是「禁止硬编码尺寸」的唯一例外，其他尺寸仍必须走令牌。
- 统一移动优先：用 `@media (max-width: 760px)` 做降级，不混写 `min-width`，避免断点交叉。
- 三个值**暂不进 `design/design-tokens.json`**（2026-11-21 定）：保持 390 / 760 / 1440 直接写在媒体查询里，`design/` 下任何文件都不改、不新造 `--bp-*` 变量；是否入令牌由设计线后续决定。
- PRD 只承诺 390 / 1440 两个验收视口；760 是实现层断点，不新增人工验收项。

---

## 3. 渲染与分发

### 3.1 渲染模式

| 模式 | 首页 SEO | 首屏 | 离线 | 部署复杂度 |
|---|---|---|---|---|
| 纯 SPA | 差（分享卡片与首屏白屏风险高） | 依赖 JS 下载与执行 | 好 | 最低 |
| **SPA + 首页构建期预渲染（采用）** | 好（静态 HTML + meta/OG） | 好（HTML 首屏即可绘制） | 好 | 低（仍是静态产物） |
| 服务端渲染 | 最好 | 好 | 需要额外设计 | 高（常驻进程） |

理由：

- 只有 `/` 需要被收录与被分享；应用内路由（今日、分支、提交详情）是私有数据视图，应当 `noindex`，给它们做 SSR 没有意义。
- 首屏标题、正文、入口与工作台初态由静态 HTML 完成首次绘制，示例动效在客户端接管。
- 产物是静态文件，与 CloudBase 静态托管天然契合；服务端渲染反而会为一个纯静态站引入常驻运行时。

### 3.2 首屏性能的具体做法

- 首页输出预渲染 HTML；构建时抽取首屏关键 CSS 内联，其余样式异步加载（CSS Modules 产物可直接参与该流程）。
- 字体自托管并做子集，避免 Google Fonts 在境内的不确定性。
- 产品窗区域预留稳定尺寸。用于插画或静态预览的图片可用 AVIF/WebP；可操作示例以组件渲染。
- 章节入视和示例状态逻辑按需加载，首屏用原生能力实现动效。
- 预算是硬指标：首页 JS（不含产品窗图片）≤ 120 kB gzip，LCP ≤ 2.0s（4G 中端机）。

### 3.3 部署：CloudBase 静态托管（上线路径；**首发暂缓**）

流程已定，但**首发部署暂缓，按用户节奏执行**；上线时按这四步走：**Vite 构建 → 上传静态产物 → 默认域名可访问 → 无云函数、无环境变量**。

1. 构建：`cd web && npm ci && npm run build`，产物在 `web/dist`（HTML + 带 hash 的静态资源）。
2. 上传：`tcb hosting deploy dist -e <envId>`，或控制台/CI 的同等方式；envId 只是部署参数，不写进前端代码。
3. 路由：`/` 指向预渲染 HTML；`/app/*` 回退到 `app.html`（SPA fallback），避免刷新 404。
4. 缓存：`index.html` 短缓存，`assets/*` 长缓存（文件名带 hash）。

补充说明：

- **MVP 保留 `@cloudbase/js-sdk@^3.11.1` 依赖，但运行时无云端行为**：`cloudbase.init` 只在 `src/data/cloud/` 内、由 `getCloudBaseApp()` 按需创建；应用入口不引用该模块，因此不进首屏包，构建不需要 envId，运行时也不发任何请求。云函数、对象存储、云数据库、云开发身份仍从 V1 / V2 起启用。
- **首发部署暂缓**：上传时机、是否建预览环境由用户节奏决定；这不阻塞代码开发、本地验证与门禁，`npm run build` 与 `npm run dev` 照常。
- **自定义域名与备案是上线前的前置条件**：首发可先用 CloudBase 默认域名；对外推广或切自有域名时，备案与证书才成为硬前置（§9.3），不在开发阶段提前处理。
- 若需要预览环境，可再建一个 CloudBase 环境专门托管预览产物；非必需。
- CloudBase 静态托管默认不提供「逐响应自定义头」的完整配置能力。本项目不依赖 OPFS / SharedArrayBuffer，因此不需要 `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy`，这条不构成阻塞（见 §5.8）。
- 不再把 Vercel / Netlify / COS 静态网站 / 自建 VPS 作为主方案；它们只在「CloudBase 不可用」的极端情况下作为应急备份路径，不写进发布流程。

---

## 4. 后端

### 4.1 MVP：没有后端

MVP 不部署任何服务端代码：没有云函数、没有云数据库、没有对象存储、没有账号。所有业务数据在本机 IndexedDB 中，读写不经过网络。这也是「不登录、不联网可用」的产品承诺得以成立的原因。

### 4.2 分阶段启用的 CloudBase 能力

| 部件 | 启用阶段 | 承担 | 明确不承担 |
|---|---|---|---|
| 静态托管 | **MVP** | 托管 `web/dist`：预渲染首页、应用壳与静态资源 | 不做服务端渲染 |
| 对象存储 | **V1** | 备份包上传 / 下载（明文 JSON）、导出文件留档 | 不存可直接读取的业务库文件；无账号，按匿名设备 ID 归档 |
| 云函数 | **V1** 起 | V1 为 Web 异地备份提供预签名。V2 加入身份、迁移、同步、查询和匿名计数 | V1 不承载业务写入或 `ownerId` 鉴权 |
| 云开发身份 | **V2** | 账号与 `ownerId`，首次登录触发一次性迁移 | 不承担业务权限语义 |
| 云数据库 | **V2** | 承接迁移后的业务数据（集合见 §5.3） | 不做全文搜索 |

### 4.3 云函数清单

**V1 的 Web 异地备份是首个云函数交付点。** 随该功能在仓库根目录创建 `cloudfunctions/` 和 CloudBase 部署配置。Web 客户端调用云函数的适配留在 `web/src/data/cloud/`。首次交付见 [V1-06 异地备份](./prd/V1-06-backup-restore.md#7-依赖与阶段未决问题)，目录和部署边界见 §7.3。

**命名约束（2026-11-22 实测）**：云函数名只使用小写字母、数字与连字符（`^[a-z][a-z0-9-]*$`），**不得含点号**。SCF 会以 `FunctionName取值与规范不符` 直接拒绝部署，`cloudbaserc.json` 的 `functions[].name`、`cloudfunctions/` 目录名与调用方传入的函数名必须完全一致。已交付函数为 `backup-sign`、`workspace-read`。

| 函数 | 启用阶段 | 职责 | 幂等键 |
|---|---|---|---|
| `backup-sign` | V1 | 备份包的预签名上传 / 下载 | `requestId` |

**V2 在共享目录中增量交付账号、同步与匿名统计所需云函数。**

| 函数 | 启用阶段 | 职责 | 幂等键 |
|---|---|---|---|
| `auth-bootstrap` | V2 | 校验端身份并解析 CommitToDo 账号，首次登录建立 `users` 记录，返回 `ownerId` 与 `schemaVersion` | `principalId` |
| `sync-push` | V2 | 接收 outbox 增量（按 `opId` 幂等、按 `baseRev` 判定过期写入），返回设备列表与服务端时间 | `opId` |
| `sync-devices` | V2 | 返回当前账号的设备清单与最近同步时间 | — |
| `migrate-push` | V2 | 接收本机数据分批推送（见 §5.5），按 `_id` upsert | `_id`（ULID） |
| `branch-write` | V2 | 分支创建、改名、移动、归档；维护 `parentId` 与顺序 | `_id` / `rev` |
| `task-write` | V2 | 待办增删改与状态流转 | `_id` / `rev` |
| `commit-write` | V2 | 提交写入、与 task/branch 关联 | `_id` / `rev` |
| `query-aggregate` | V2 | 周报与统计聚合 | — |
| `workspace-read` | V2 | 按账号提供小程序的今天、分支、历程、年轮与徽章只读数据 | — |
| `export-pack` | V2 | 生成导出 JSON 并返回下载地址 | `requestId` |
| `counter-inc` | V2 | 按 J-07 白名单记录匿名计数 | 事件名 + 日期 |

V2 的业务写函数验证调用身份并解析 `ownerId`，校验参数、归属与 `rev`，再完成写入、更新 `updatedAt` 和规则要求的审计记录。读函数按同一 `ownerId` 过滤。领域规则以 §5.3.3 为准，共享时按 §7.3 抽取。

### 4.4 读写边界

**V1 的客户端调用 `backup-sign` 获取异地备份的上传或下载地址。** 备份包按本地匿名设备 ID 归档。

**PG 环境注意**：环境为 PostgreSQL 版时，云存储由 `storage.objects` 上的 RLS 把关，云函数默认是匿名角色。`backup-sign` 需以 service_role API Key 初始化（`cloudbase.init({ accessKey })`），并用 `app.storage.from(BUCKET_ID)` 访问对象存储；`BACKUP_BUCKET` 与 `BACKUP_API_KEY` 通过函数环境变量注入，密钥不入库。上传返回桶内对象名（不是 `cloud://` fileID），下载用 `createSignedUrls` 生成限时地址——单个 `createSignedUrl` 会走传统签名分支并返回 404。SDK v4 依赖 bson 7，函数运行时需 `Nodejs20.19`。

**V2 起（有账号）**：

- **写：客户端不直写数据库**，一律调云函数，保证校验、时间戳与审计只有一个落点。
- **读取按账号归属隔离。** 微信小程序首版通过经过鉴权的云函数读同账号数据。Web 按需使用同一查询能力，只有安全规则能从可信登录上下文解析出同一 `ownerId` 时才开放客户端直读。聚合走云函数。
- **服务端解析账号归属。** 按 §6.3 将已验证的调用身份映射到 `ownerId`。请求参数里的 `ownerId` 不作为鉴权依据。`counters` 只允许函数写，`events` 的读取同样受账号归属限制。
- MVP 与 V1 阶段这些都不存在：没有 ownerId 校验、没有安全规则、没有云数据库。

### 4.5 保留的提醒

- **Web 的 CloudBase SDK** 仅从 `web/src/data/cloud/**` 按需初始化。领域层、组件与路由通过仓储或用例调用云端能力（§5.7）。服务端 SDK 依赖由 `cloudfunctions/` 自行管理。
- **可迁移性**：CloudBase 的集合结构不是长期格式。导出 JSON + `schemaVersion`（§9.8）才是用户与自己的数据边界；集合与字段的含义要有一份文档，不能只存在于代码里。
- **边界收在仓储层后面**：领域层看到的是 `BranchRepository` 这类端口，不是 `db.collection('branches')`。
- **一次性迁移**完成后，CloudBase 成为数据收敛点。支持写入的 Web 客户端本地先写，再经 outbox 按幂等键补推。小程序首版消费已同步的数据（§4.6）。

### 4.6 离线写入（V2 按方案 A：本地先写，联网后补推）

**决定（2026-11-20）：V2 的离线写入走「本地先写 + outbox 补推」，不做「断网禁止写入」。** 这是 V1 之前就要预留的结构，不能等到 V2 再补。

链路：

```
写入：组件 → 用例 → 仓储 → 本地 Dexie 事务（写业务表 + 写 outbox） → 立即可见
                                      ↓（后台）
                           outbox 读取未推送项 → 云函数按幂等键提交
                                      ↓
                          成功则标记 synced，冲突则记入 conflicts 并暴露给用户
读取：本地 Dexie（liveQuery），云端变更回灌后由本地重算视图
```

**现在必须预留的四件事**（MVP 阶段就写进表结构，但 MVP 不启用推送逻辑）：

| 预留项 | 作用 | MVP 状态 |
|---|---|---|
| `opId`（ULID） | 每条写入操作的幂等键，服务端按它去重，保证「补推两次不产生两条」 | 字段存在，固定生成，不推送 |
| `syncState`（`local` / `pending` / `synced` / `conflict`） | 一行数据在同步链路上的位置 | 恒为 `local` |
| `outbox` 表 | 未推送操作的队列，含 `opId`、`entity`、`entityId`、`payload`、`attempts`、`lastError` | 建表但不写入 |
| `baseRev` / `rev` | 冲突判定的依据：推送时带上提交前看到的 `rev`，服务端不一致即判冲突 | `rev` 固定 1，`baseRev` 留空 |

**冲突策略（V2 定细节，方向先锁）**：

- 同一行被两台设备分别修改 → 服务端拒绝后写入，返回当前行；客户端把本地版本记入 `conflicts`，**不静默丢弃**。
- 冲突在分支详情的历史里留一条记录，用户能看到「这条在另一台设备上被改过」。
- 不做自动合并字段级差异（成本远高于收益），以最后一次成功写入为准。

**这条决定与 V1 的关系**：V1 的异地备份是整包单向上传，不涉及 outbox，也不改 `syncState`。所以 V1 不需要实现推送，只是字段和表已经在那儿。

### 4.7 阶段演进

| 阶段 | 云端用了什么 | 权威数据在哪 | 写入路径 |
|---|---|---|---|
| MVP | 仅静态托管（默认域名；首发暂缓） | 本机 IndexedDB | 直接写 Dexie，无队列 |
| V1 | 静态托管 + 根目录中的 `backup-sign` + 对象存储（备份包） | **仍在本机**，云端存备份副本 | Web 仍直接写 Dexie，备份是整包上传 |
| V2 | 增加云开发身份、云数据库、匿名统计和微信小程序 | **云端收敛**，Web 本地仍是即时权威 | Web 本地先写，经 outbox 补推到云端。小程序首版只读已同步数据 |

---

## 5. 数据存储

### 5.1 数据分布

| 数据 | 位置 | 理由 |
|---|---|---|
| 分支、待办、提交、里程碑、徽章、事件 | **本地 IndexedDB（Dexie 4），MVP 与 V1 唯一权威**；V2 起仍承担即时读写 | 无账号、离线可用、单用户；≤200 分支，数据量在几 MB 级 |
| 设置（主题、树密度、标注、提醒开关、上次自动备份时间） | 本地 `settings` 表（单行） | 属用户数据，导出必须完整；将来可随账号同步 |
| 备份快照（自动 / 手动 / 恢复前副本 / 异地） | 本地 `backups` 表（**V1 建**）；异地另传对象存储 | 页面上要列「时间 + 分支数 + 提交数」，元数据必须落库，正文是明文 JSON 快照。MVP 只有导出/导入 |
| 年度总结（每一年一句话） | 本地 `year_reviews` 表（**V1 建**，随年轮） | 用户手写内容，年轮统计一律现算、不入库 |
| 会话级 UI 状态（最近视图、列宽、滚动位置） | `localStorage` | 体积小、读写同步、丢了不致命；**不放领域数据** |
| 导出文件（明文 JSON，含 `schemaVersion`） | 用户设备 | 唯一可携带的完整副本，也是恢复手段 |
| 备份包（V1） | 用户设备，可选上传对象存储 | 明文 JSON；备份不依赖账号；MVP 不做 |
| 云数据库 | V2 才启用 | 承接一次性迁移，迁移后作为**收敛点** |

### 5.2 本地引擎：Dexie 4（已定）

**决定（2026-11-20）：本地用 Dexie 4，不引入 SQLite WASM。** MVP 中它是唯一权威存储。

理由：数据形态单薄（单用户、≤200 活跃分支、几千条提交、全量不到 20 MB，查询基本是全表或按分支/日期取段），SQLite WASM 的 SQL 表达力用不上，而包体、OPFS 初始化与配额处理是立刻要付的成本。只有将来要做跨年度多维聚合分析、或原生 App 要共用库文件时才该后悔；那时按 §5.7 的隔离约束替换实现，而不是重写业务。

| 已否决 | 为什么不再考虑 |
|---|---|
| SQLite WASM（wa-sqlite / 官方 WASM + OPFS） | 包体数百 kB 起，OPFS 需 Worker 与较新浏览器，部分实现还要 SharedArrayBuffer；本项目的查询用不上 SQL |
| localStorage / JSON 文件 | 5 MB 上限、无索引、无事务、同步阻塞，做领域数据存储不合格 |

### 5.3 本地表结构（与 V2 集合一一对应）

**表名、字段名现在就按将来的集合来写**，V2 迁移时不做字段映射，只做搬运。

| 表 / 集合 | 用途 | 主键 | 关键字段 | 索引 |
|---|---|---|---|---|
| `users` | 身份档案（V2 建） | `_id` = `principalId` | `email`、`nickname`、`createdAt`、`updatedAt` | `email` |
| `branches` | 分支树 | `id` ULID | `ownerId`、`parentId`、`path`、`depth`、`title`、**`goal`**、**`color`**、`status`、`order`、**`pinnedAt`**、`archivedAt`、**`finishedAt`**、**`finishedIntoId`**、**`droppedAt`**、**`dropReason`**、`taskTotal`、`taskDone`、`commitCount`、`ownLastCommitAt`、`rev`、`createdAt`、`updatedAt`、`deletedAt` | `[ownerId+parentId]`、`[ownerId+status]`、`[ownerId+archivedAt]`、`path`、`[ownerId+updatedAt]` |
| `tasks` | 待办 | `id` ULID | `ownerId`、`branchId`、`title`、`note`、`dueDate`、`plannedDate`、`status`、`order`、**`completedAt`**、**`completedCommitId`**、**`cancelledAt`**、`rev`、时间戳、`deletedAt` | `[ownerId+branchId+status]`、`[ownerId+status+dueDate]`、`[ownerId+status+plannedDate]`、`[ownerId+completedAt]` |
| `commits` | 提交 | `id` ULID | `ownerId`、`branchId`、`sourceBranchId`、`taskId`、`date`、**`at`**、`summary`、`voidedAt`、`rev`、时间戳、`deletedAt` | `[ownerId+date]`、`[ownerId+branchId+date]`、`[ownerId+branchId+at]` |
| `milestones` | 里程碑 | `id` ULID | `ownerId`、`branchId`、`title`、**`note`**、`achievedAt`、`datePrecision`、`rev`、时间戳、`deletedAt` | `[ownerId+achievedAt]`、`[ownerId+branchId]` |
| `badges` | 徽章授予快照 | `id` ULID | `ownerId`、**`catalogId`**、**`category`**、**`periodKey`**、`grantedAt`、`snapshot`、`sourceEntityId`、`rev` | `[ownerId+grantedAt]`、`[ownerId+category]`、`[ownerId+catalogId+periodKey]`（唯一） |
| `settings` | 单行偏好 | `id` = `'app'` | `ownerId`、`theme`、`treeDensity`、`annotations`、`reminderEnabled`、**`lastAutoBackupAt`**、`rev`、`updatedAt` | — |
| `backups` | 本地备份与快照 | `id` ULID | `ownerId`、`kind`、`createdAt`、`branchCount`、`taskCount`、`commitCount`、`schemaVersion`、`bytes`、`restoredAt`、`remoteKey`、`payload` | `[ownerId+createdAt]`、`[ownerId+kind+createdAt]` |
| `year_reviews` | 年度总结 | `id` ULID 或 `ownerId+year` | `ownerId`、`year`、`note`、`rev`、`createdAt`、`updatedAt` | `[ownerId+year]`（唯一） |
| `events` | 历史事件与审计 | `id` ULID | `ownerId`、`entityType`、`entityId`、`action`、`payload`、`at`、`tzOffset` | `[ownerId+at]`、`[entityId+at]` |
| `outbox` | 未推送操作队列（V2 用） | `opId` ULID | `entity`、`entityId`、`action`、`payload`、`baseRev`、`attempts`、`lastError`、`createdAt` | `createdAt` |
| `conflicts` | 冲突记录（V2 用） | `id` ULID | `entity`、`entityId`、`branchId`、`field`、`localPayload`、`serverPayload`、`deviceId`、`localRev`、`serverRev`、`at`、`resolved`、`resolvedAt` | `at`、`[entityId+at]` |
| `devices` | 已连接设备（V2 用） | `_id` = 设备 ID | `ownerId`、`label`、`platform`、`lastSyncAt`、`createdAt`、`removedAt` | `[ownerId+lastSyncAt]` |
| `migration_state` | 迁移断点（V2 用） | `_id` = 集合名 | `lastId`、`pushed`、`done`、`updatedAt` | — |
| `counters` | 匿名计数（V2 用） | `_id` = 事件名 + 日期 | `value` | — |

> `users` / `outbox` / `conflicts` / `devices` / `migration_state` / `counters` 不在 MVP 创建，列出只为对齐命名。`backups` 与 `year_reviews` 随功能阶段启用：**MVP 实际创建 7 张业务表**（`branches`、`tasks`、`commits`、`milestones`、`badges`、`settings`、`events`）；`backups` 在 V1 建（每日快照与备份库归 V1，见 `FRAMEWORK.md` J-02），`year_reviews` 随 P05 年轮在 V1 建。

**字段规则（MVP 就要遵守）**

- 主键用 **ULID**（26 位、字典序即时间序、可离线生成）。不用自增，也不用随机 UUID——迁移时按 `id`（云端 `_id`）升序分页要靠它。
- **主键字段名以代码为准**：本地 7 张表的物理主键统一叫 `id`（见 `web/src/data/db.ts`）；`settings` 是单行表，固定 `id = 'app'` 取值。`_id` 只作为 V2 云端集合的主键名与迁移后的同义字段，本地不改名、不双写。
- `ownerId` 字段**预留**：MVP 与 V1 写空字符串或本地设备 ID。V2 登录后回填服务端解析出的 CommitToDo `principalId`（§6.3）。
- `rev` 预留：MVP 固定为 `1`，每次本地写入不变；V2 启用推送后每次成功写入由服务端递增。
- `syncState` 预留：MVP 与 V1 恒为 `local`；V2 起在 `local` / `pending` / `synced` / `conflict` 之间流转（见 §4.6）。
- `opId` 预留：每次写入生成一个 ULID，作为推送幂等键；MVP 生成但不使用。
- `createdAt` / `updatedAt` / `deletedAt` 存 **UTC 毫秒**；业务日期（`date`、`dueDate`、`plannedDate`）存 `YYYY-MM-DD` 字符串，不额外落时区字段（口径见下一条）。
- 删除一律**软删除**（写 `deletedAt`），不做物理删除——导出、恢复与迁移都需要墓碑。唯一例外是「删除空分支」：本分支与后代都没有待办、提交、里程碑、事件时（画稿的条件文案），允许物理删除，且不写 `events`，否则条件自相矛盾（§5.3.3 R13）。
- 命名：表 / 集合 `snake_case` 复数，字段 `camelCase`；**定稿后不再改名**，改名即进 `schemaVersion`。
- **派生字段原则上不落库**（周完成数、连续天数、年轮聚合、回顾统计一律现算）。唯一例外是 `branches` 上的 `taskTotal` / `taskDone` / `commitCount` / `ownLastCommitAt`：分组树一屏 20 行都要显示进度与最近活动，现算会发 20 次聚合查询。这四个字段按同事务维护，且必须能由 `tasks` / `commits` 重算校验——恢复与导入后跑一次全量重算，作为一致性自检。
- **枚举值**（写死，不放配置）：`branches.status` = `active` / `merged` / `dropped`；`branches.color` = `coral` / `sky` / `honey` / `mint` / `iris` / `rose` / `teal`（画稿 7 个预设，子分支默认继承父色）；`tasks.status` = `open` / `done` / `cancelled`；`milestones.datePrecision` = `day` / `month`；`settings.theme` = `light` / `dark`；`settings.treeDensity` = `compact` / `comfortable`；`settings.annotations` = `off` / `once` / `always`；`backups.kind` = `auto` / `manual` / `pre-restore` / `remote`。
- **提交时间到分钟**：画稿在提交行、回执与详情里都显示 `16:42`，因此 `commits` 除业务日期 `date`（`YYYY-MM-DD`，用于按天分桶与时间树定位）外，另存 `at`（UTC 毫秒）作为真实时刻；列表按 `at` 倒序，时间树按 `date` 归列。
- **时区口径（M05）**：「哪一天」按**操作当时的本地时区**计算——`date` 写当时的业务日，`at` 写同一时刻的 UTC 毫秒。由 `at` 可反推任意时区的时刻，故**不新增时区字段**，`commits` 现有 `date` + `at` 已足够；跨时区旅行造成的同日/跨日差异以操作当时为准，不做事后重算。仅 `events` 审计行保留写入时的 `tzOffset`，业务表不带。
- **月精度里程碑归一（R6）**：`milestones.datePrecision = 'month'` 时，`achievedAt` 存「**当月 1 日 00:00 本地时间**再转 UTC 毫秒」，即 `Date.UTC(y, m, 1) - tzOffsetMinutes * 60000`；写入与判定都走 `core/clock.ts` 的偏移函数，不手算。`day` 精度保留用户选定的当日 00:00 本地时间转 UTC，不做额外归一。
- **里程碑备注只在详情消费**：时间树下方的里程碑行只用「日期 + 标题」，详情弹层才有备注；字段仍要落库，否则详情无内容可显示。
- **本版按画稿删除的字段**：`tasks.priority`（无优先级展示与操作）、`users.prefs`（偏好唯一真源是 `settings`）、`settings.fontScale`（外观只有主题与树密度，无字号控件）、`commits.isBackfill`（无补记入口，提交只能由完成待办产生）。`id` 即内部标识，画稿不展示短 hash，不新增 `hash` 字段。

### 5.3.1 物化路径与层级规则

`path` 存物化路径，`depth` 存整数层级，两者都由写入时维护，互为断言。

| 字段 | 形式 | 规则 |
|---|---|---|
| `path` | `/` + 各级 `_id` 拼接，以 `/` 结尾，例 `/01HX…/01HY…/` | 根分支 `path = '/'`；父分支改名不改 `path`；移动分支时按前缀替换整棵子树 |
| `depth` | 根 `0`，L1 `1`，L2 `2`，L3 `3` | 必须等于 `path` 的段数；3 层上限在此校验 |
| `status` | `active` / `merged` / `dropped` | **不含 `archived`**；归档由 `archivedAt !== null` 表达，与状态正交，取消归档能恢复原状态 |
| `finishedAt` | UTC 毫秒或 `null` | 收尾时刻；收尾不可撤销，`status` 同时置 `merged`。收尾时提交并入父分支（`branchId` 改父、`sourceBranchId` 保留原分支） |
| `finishedIntoId` | 父分支 `_id` 或 `null` | 汇合点指向的分支；画稿记在父分支上「合并于 11 月 13 日」 |
| `droppedAt` / `dropReason` | UTC 毫秒 / 字符串，均可空 | 最近一次放下的时刻与原因（放下原因必填）。重新开始时**保留**，用于「保留此前的放下日期和原因」；历次放下在 `events`（`action = branch.pause`） |
| `pinnedAt` | UTC 毫秒或 `null` | 置顶时刻；同父内非空排最前，其余按 `order` |
| `goal` | 字符串，可空 | 分支详情页头的那一句目标；新建弹层「目标（选填）」 |
| `color` | 7 枚举 | 新建时的色相预设；子分支默认继承父色，详情右栏显示「珊瑚橙 · 继承自工作」 |
| `archivedAt` | UTC 毫秒或 `null` | 归档是可见性开关：子树退出默认树与停滞计算，`status` 不变 |
| `ownLastCommitAt` | UTC 毫秒或 `null` | 只记本分支自己的最近有效提交，不含后代 |

- **额度校验不全表扫描**：L1 数量 = `[ownerId+parentId]` 精确匹配后过滤 `archivedAt === null`；单父下 L2 / L3 同法。四档上限（1 / 7 / 9 / 20）与全树 200 都走这条路径。
- **子树查询用 `path` 前缀**：移动时的循环引用校验、归档整棵子树、删除前的历史检查，都走 `startsWith(parentPath)`。
- **四个计数只统计本分支、不含后代**（对应「分支详情只算自己的待办比例」），与业务写入在**同一个 Dexie 事务**内更新。分组树每行显示 `3/7`，异步补算会闪烁或出现错值。
- 四个计数可随时由 `tasks` / `commits` 重算；恢复、导入、迁移后跑一次全量重算作为一致性自检。

### 5.3.2 索引与关键查询

Dexie 的复合索引用 `[a+b]` 声明。下面十一条各对应一个真实页面或弹层，超出这十一条的查询应在评审时说明理由。

| # | 场景 | 查询 | 索引 | 量级 |
|---|---|---|---|---|
| Q1 | 分组树渲染（默认层） | `ownerId` + `parentId` 精确匹配，按 `order` 升序，过滤 `archivedAt === null` | `[ownerId+parentId]` | 单父 ≤20 行 |
| Q2 | 今天三组 | `ownerId` + `status='open'`；先按 `plannedDate = today` 取「显式安排到今天」的待办进今天组，再对剩余按 `dueDate` 分桶（逾期 / 今天 / 未来）与无截止 | `[ownerId+status+plannedDate]` 先查显式安排，`[ownerId+status+dueDate]` 再取日期窗口 | 当天窗口 |
| Q3 | 分支详情提交流 | `ownerId` + `branchId`，按 `date` 倒序分页，过滤 `voidedAt === null` | `[ownerId+branchId+date]` | 每页 20 |
| Q4 | 时间树泳道 | `ownerId` + 日期区间，按 `branchId` 归组 | `[ownerId+date]` | 90 天窗口 |
| Q5 | 提交详情的上下条 | 同一 `branchId` 下按 `date` 双向游标 | `[ownerId+branchId+date]` | 各取 1 条 |
| Q6 | 已归档视图 | `ownerId` + `archivedAt != null`，按 `finishedAt` 倒序，再按一级分组成 `工作 / 1 条已归档` | `[ownerId+archivedAt]` | 归档区 ≤ 数十 |
| Q7 | 徽章墙与详情 | `ownerId` + `category`，按 `grantedAt` 排序；未获得项与「还差 N」由常量目录现算 | `[ownerId+category]` | 目录固定 16 项 |
| Q8 | 数据与备份列表 | 四类各取上限：`auto` 最近 7 条、`manual` 最近 7 条、`pre-restore` 最近 1 条、`remote` 最近 1 条；再按 `createdAt` 倒序合并成**一个列表**，不截断、不按类合并 | `[ownerId+kind+createdAt]` 逐类取上限，`[ownerId+createdAt]` 作合并校验 | 合计 ≤ 16 行 |
| Q9 | 年度总结 | `ownerId` + `year` 精确取一行；其余年轮统计现算 | `[ownerId+year]` | 1 行 |
| Q10 | 分支额度与置顶 | 同 Q1 取同父全部行后，内存里按 `pinnedAt` 非空优先排序 | 复用 `[ownerId+parentId]` | 单父 ≤20 行 |
| Q11 | 父分支历程中的已收尾子树里程碑 | `ownerId` 取全部分支（≤200 行）→ 内存沿 `finishedIntoId` 展开已收尾子树 → 用分支 `_id` 集合 `anyOf` 取里程碑 → 按 `achievedAt` 倒序合并；来源标注取该 `branchId` 的 `title` | 复用 `[ownerId+status]` 与 `[ownerId+branchId]`；跨分支排序在内存完成 | 子树 ≤ 数十分支、里程碑 ≤ 数十 |

- **软删过滤统一在仓储层**：所有查询方法默认追加 `deletedAt == null`，调用方不传。**归档过滤不默认追加**——分组树与归档视图都要读归档行，由调用方显式传。
- **停滞判定不在渲染时递归**：用 `path` 前缀取出子树 `_id`（≤200，一次查询），再对这批 `_id` 取 `ownLastCommitAt` 最大值；MVP 不落 `subtreeLastCommitAt` 冗余，结果缓存在内存读模型，不写库。
- **`commits.sourceBranchId` 与 `branchId` 分开**：合并后提交挂父分支（`branchId`），原始归属保留在 `sourceBranchId`；「合并前只看自己、合并后才含子分支」通过切换 `branchId` 实现，不在查询里写时间条件。

- **搜索（V1）不做全文索引**：对 `branches.title` / `tasks.title` / `commits.summary` / `milestones.title` 各自 `startsWith` 前缀匹配后合并；上限 200 分支、数千待办够用。不做模糊匹配，避免中文分词与错误召回。

**M08 可行性结论：已收尾子树的里程碑，现有结构够用**

需求：收尾**不迁移** `milestones.branchId`；父分支历程要把已收尾子树的里程碑一并列出，并标出源分支。结论：**用现有表和索引可以实现，不需要加字段，也不建议加。**

- **为什么不需要 `sourceBranchId`**：`milestones.branchId` 本身就是来源分支，再加一个 `sourceBranchId` 只是重复同一事实，还会制造两个真源。
- **缺的不是字段，是关系方向**：父→已收尾子分支的关系已经在 `branches.finishedIntoId` 上，按它展开即可；来源标注就是 `branchId` 对应的 `branches.title`。
- **当前唯一短板是没有 `finishedIntoId` 索引**：但全量读 `branches` 只有 ≤200 行（R16 的额度上限），一次 `[ownerId+status]` 查询后在内存建邻接表完全够用；里程碑再用 `[ownerId+branchId]` 的 `anyOf` 一次取回，两个索引都是现成的。

| 方案 | 做法 | 代价 | 采用 |
|---|---|---|---|
| A 不改结构（推荐） | 全量读分支 → 内存沿 `finishedIntoId` 展开 → `[ownerId+branchId]` 的 `anyOf` 取里程碑 → 内存按 `achievedAt` 合并 | 每次多读一次 ≤200 行的小表；多一个可单测的展开函数（符合 §2.9）；分支上限上调后需重估 | **是** |
| B 加 `[ownerId+finishedIntoId]` | 直接查已收尾的子分支，减少全表读 | Dexie schema 版本 +1 与迁移；多级链仍要在内存继续展开，收益在当前规模接近零 | 否，分支上千再议 |
| C 冗余字段（`milestones.mergedIntoId` 或 `sourceBranchId`） | 收尾时给每条里程碑写上父分支/来源 | 与「不迁移」冲突，收尾要批量改里程碑、需回填历史、两个真源可能不一致；且 `sourceBranchId` 与 `branchId` 重复 | 否 |
| D 收尾另建关系表 | 规范化记录汇合关系 | 多一张表、多一次事务与联表，超出实际需要 | 否 |

**落地约束**：收尾时**禁止**批量改写 `milestones.branchId`；展开只认 `status=merged` 且 `finishedIntoId` 非空的链，`dropped` 分支的里程碑不并入父视图（放下不是完成）；来源分支已归档时仍显示其标题，但行样式按归档区分。

- **备份列表不按类分组**：四类快照（`auto` / `manual` / `pre-restore` / `remote`）在页面上是同一条时间线，按 `createdAt` 倒序单列表展示；任何一类都不隐藏、不折叠、不截断，行内用标签区分来源。留存上限只约束库里保留多少行（`auto` 7、`manual` 7、`pre-restore` 1、`remote` 1），不约束列表展示。

### 5.3.3 规则表（口径集中，散落正文不再重复）

画稿里凡是「怎么算」的部分都收敛到这张表；实现时以此为准，页面文档只描述展示。

| # | 规则 | 口径 | 画稿消费点 |
|---|---|---|---|
| R1 | 完成待办 | 标为完成 = 同一事务内：`tasks.status=done`、写 `completedAt` 与 `completedCommitId`，生成一条 `commits`（`taskId` 指回待办，`date` 取完成日、`at` 取当前时刻），分支 `taskDone` / `commitCount` / `ownLastCommitAt` 同步更新 | P01 回执「已提交 16:42」、P03 提交流、O02「标为完成」 |
| R2 | 撤销完成 | 只置 `commits.voidedAt`，不物理删；待办回到 `open` 并清空 `completedAt` / `completedCommitId`；计数同事务回退 | O03「撤销完成」 |
| R3 | 有效提交 | `voidedAt == null`。所有统计（页头计数、周/月/年回顾、`commitCount`、停滞判定）都只用有效提交 | P01、P04、P05、S01、P05 分享图 |
| R4 | 停滞判定 | 仅 `status=active` 且非归档分支；`ownLastCommitAt` 距今 > 30 天即为停滞，天数 = 今天 − `ownLastCommitAt`；无提交历史的分支不计。今天页最多列 5 条 | P01「阅读 37 天」、P04 虚线、S01 周回顾、S06 帮助 |
| R5 | 短 hash | 不展示。提交详情只显示「2026 年 11 月 20 日 16:42」，内部 `_id` 不外露，不新增 `hash` 字段 | O03 提交详情 |
| R6 | `datePrecision` 展示 | `day` → `11 月 16 日`；`month` → `2026 年 11 月`，时间树里对齐到该月列。存储归一：`month` 的 `achievedAt` = 当月 1 日 00:00 本地时间转 UTC 毫秒（§5.3） | P03、P04 里程碑行、S04 新建（过去的里程碑可只填年月） |
| R7 | 四计数重算 | `taskTotal` = 本分支未删且 `status != cancelled` 的待办数；`taskDone` = `status == done`；`commitCount` = 有效提交数；`ownLastCommitAt` = 有效提交 `at` 最大值。恢复、导入、迁移后全量重算 | 分组树 `4/9`、分支详情进度条 |
| R8 | 今天三组 | 有截止：`dueDate <= today` 或 `plannedDate = today`。**分组优先级：`plannedDate = today` 的一律进今天组**——即使 `dueDate < today` 也不计入逾期，这是「显式安排到今天」的唯一表达；逾期组 = `dueDate < today` **且** `plannedDate !== today`（只靠时间判定）。无截止组取 `dueDate == null`（IndexedDB 不索引 `null`，用 `[ownerId+status]` 全取后过滤）。父分支 `dropped` 或归档的待办不进今天 | P01 页头「5 条有截止日期 · 另有 2 条无截止日期」与三组条数 |
| R9 | 周回顾 | 自然周（周一至周日）；「有效提交」同 R3；「活跃的一级分支」= 本周有有效提交的一级分支；「停滞分支」同 R4 并显示天数；周末打开显示「已统计至 11 月 21 日」 | S01 周回顾 8 / 2 / 1 |
| R10 | 月回顾 | 精力分布按一级分支的有效提交占比；结构变化读 `createdAt`（新开）、`finishedAt`（收尾）、`droppedAt` 与停滞天数（放下/停滞） | S01 月回顾 |
| R11 | 年轮 | 有效提交数、活跃一级分支数、当年 `createdAt` 的分支数（新开）、当年 `finishedAt` 的收尾并合并数；月度图把子分支提交归并到其一级祖先；分支分布按一级分支占比；12 月未开始画占位 | P05 四项统计与月度图 |
| R12 | 收尾去向 | 选择「不用了，从树上收起」→ `status=merged`、`finishedAt`、`archivedAt=finishedAt`；选择「留着，作为一段完成的路」→ `status=merged`、`finishedAt`，`archivedAt` 保持 `null`。提交并入父分支；**里程碑不迁移**，`branchId` 保持原子分支，父分支历程按 `finishedIntoId` 链汇总并标注来源（Q11）。未完成待办按弹层选择「移到父分支」（改 `branchId`）或「取消掉」（`status=cancelled` + `cancelledAt`）。收尾不可撤销 | B06、B07、P03 已合并状态 |
| R13 | 删除空分支 | 仅当本分支与后代都没有待办、提交、里程碑、事件时允许物理删除，且删除不写 `events`；这是软删规则的唯一例外 | B10 |
| R14 | 归档 / 取消归档 | 归档只写/清 `archivedAt`，`status` 不变；归档子树退出默认树、额度与停滞计算，但历程与统计保留；取消归档恢复原位置与原状态并重新占用名额 | B09、B11、S02 |
| R15 | 放下 / 重新开始 | 放下需填原因，写 `droppedAt` / `dropReason`，`status=dropped`，未完成待办移出今天；重新开始 `status=active`，待办按原 `dueDate` 与 `plannedDate` 回到分组（`plannedDate = today` 的仍先归今天组，见 R8），**保留**上次 `droppedAt` / `dropReason` | B08、B12 |
| R16 | 额度 | 根分支 1 个；L1 ≤7、L2 ≤9、L3 ≤20 直接子分支；全树 ≤200。只算未归档、未删的分支；移动时显示各候选剩余名额，自身与后代不可选 | B02「已使用 3 / 7 个名额」、B03「1 / 20」、B05、P02 页脚 |
| R17 | 备份（V1） | 每日首次打开自动写一条 `kind=auto` 快照；恢复前先写 `kind=pre-restore`；异地备份在对象存储留一份，元数据进 `kind=remote`。**留存：`auto` 7 条、`manual` 7 条、`pre-restore` 1 条、`remote` 1 条**，四类合计按 `createdAt` 倒序单列表展示，不截断、不合并。快照记录分支数、待办数、提交数与 `schemaVersion`，`payload` 为明文 JSON。**MVP 不建 `backups`，只有导出/导入** | P06 数据卡、P08、S08 两态、S08 data-v1 |
| R18 | 徽章 | 目录固定 16 项（结构 8 / 时间 4 / 里程碑 4），是常量不是表；授予时写 `catalogId` / `category` / `periodKey`（如 `2026-Q3`、`2026`）与 `snapshot`（获得时的分支去向、完成进度），之后不再变；「还差 N」现算 | S06 徽章墙 7/16、S06 详情 |
| R19 | 主题 | 只有 `light` / `dark` 两档，初始 `light`，只由用户手动切换并写入 `settings.theme`；**不读取 `prefers-color-scheme`**。画稿 P07 的「跟随系统」是遗留项，按已定结论实现并在画稿侧待改 | P07、§2.5 |

**R8 的「显式安排」落在哪**

- **字段**：`tasks.plannedDate`（`YYYY-MM-DD`，§5.3）。它表示「我打算哪天做」，与 `dueDate`（外部截止/承诺日期）分开；现有字段足够表达，本版**不新增字段**。
- **操作**：待办详情的「计划日期」选今天，或今天页对逾期项点「安排到今天」，两者都只写 `plannedDate = today`；这是一次普通更新，不产生提交、不改 `status`。
- **判定顺序**：先看 `plannedDate`——等于今天即进今天组，哪怕 `dueDate` 早已过去；`plannedDate` 为 `null` 或不是今天时才按 `dueDate` 判逾期。把 `plannedDate` 清空即回到纯时间判定（过期就回逾期组）。
- **冲突时以显式安排为准**：`dueDate` 与 `plannedDate` 同一天不特殊处理（仍算今天组）；只有 `dueDate < today && plannedDate = today` 这一种情况被例外改写，其余分桶不变。
- **历史留痕**：多次「安排到今天」不落额外字段；需要审计时写 `events`（`action = task.plan`，`payload` 带前后值），与 R8 之外的字段无关。

### 5.3.4 云端落地状态（2026-11-22 实测）

**业务数据实际存放在环境的文档型数据库，不在 PG。** 环境 `committodo-d6gmapg0j6397889f` 是 PostgreSQL 版，但 PG 与文档库是两个独立后端：`db.collection()` / `<collection>.where()` 读写文档库，PG 的 `information_schema` 里不会出现对应表（同日用探针集合实测：写入后 PG 无新表）。现行四个云函数（`workspace-read`、`sync-push`、`migrate-push`、`counter-inc`）全部使用文档 API，`backup-sign` 只碰对象存储，因此集合按 §5.3 建在文档库；PG 的 `public` 只保留腾讯云拨测表，业务表为零。

#### 集合与索引（已建，18 个）

清单的机器副本在 `work/schema-applied.md`（与备份导出同在非入库目录）。实际索引如下，**与 §5.3 表格的差异**见本节末。

| 集合 | 索引 |
|---|---|
| `users` | `email`、`wxOpenId`、`wxOpenIds` |
| `branches` | `[ownerId+parentId]`、`[ownerId+status]`、`[ownerId+archivedAt]`、`path`、`[ownerId+updatedAt]`、`[ownerId+createdAt]` |
| `tasks` | `[ownerId+branchId+status]`、`[ownerId+status+dueDate]`、`[ownerId+status+plannedDate]`、`[ownerId+completedAt]`、`[ownerId+createdAt]` |
| `commits` | `[ownerId+date]`、`[ownerId+branchId+date]`、`[ownerId+branchId+at]` |
| `milestones` | `[ownerId+achievedAt]`、`[ownerId+branchId]` |
| `badges` | `[ownerId+grantedAt]`、`[ownerId+category]`、`[ownerId+catalogId+periodKey]`（唯一） |
| `settings` | `ownerId`（单行 `_id='app'`，实际按 `_id` 取） |
| `backups` | `[ownerId+createdAt]`、`[ownerId+kind+createdAt]` |
| `year_reviews` | `[ownerId+year]`（唯一） |
| `events` | `[ownerId+at]`、`[entityId+at]` |
| `outbox` | `createdAt`、`ownerId`；`_id` = `opId`，同时充当服务端幂等日志 |
| `conflicts` | `at`、`[entityId+at]` |
| `devices` | `[ownerId+lastSyncAt]` |
| `migration_state` | 无（`_id` = 集合名） |
| `counters` | `[event+date]`（`_id` = 事件名 + 日期） |
| `ops_events` | `localDate`、`[event+localDate]`、`[userId+localDate]`、`[visitorId+localDate]`、`at` |
| `user_first_seen` | `firstSeenDate`、`lastSeenDate`、`signupAt` |
| `admin_audit_log` | `at`、`[collection+docId+at]`、`[actorEmail+at]` |

- 后三个集合（`ops_events`、`user_first_seen`、`admin_audit_log`）为管理站新增，字段、白名单与保留期以 [管理站移交单](../admin/docs/CLOUD-SCHEMA-REQUEST.md) 为准；与 §5.3 无字段冲突。`ops_events` 不建 TTL 索引（`at` 是数字毫秒，Mongo TTL 只能作用于 Date），400 天保留由定时任务清理。
- 写入方：`users` 由账号线写、`workspace-read` 读；`branches` / `tasks` / `commits` / `milestones` / `badges` / `settings` / `year_reviews` / `events` / `conflicts` 由 `sync-push` 写；`outbox` 由 `sync-push` 兼作幂等日志；`devices` 由 `sync-devices` 写；`migration_state` 由 `migrate-push` 写；`counters` 由 `counter-inc` 写；`backups` 的远端元数据由 `backup-sign` 写；`ops_events` / `user_first_seen` 由待建的 `ops-event` 写；`admin_audit_log` 由已部署的 `admin-api` 与业务写入同事务写。
- **与 §5.3 表格的差异（均为代码实际查询需要，不改字段）**：① `users` 增 `wxOpenId` / `wxOpenIds` 索引，供 `workspace-read` 解析微信绑定；② `branches` / `tasks` 增 `[ownerId+createdAt]`，供列表按 `createdAt` 排序；③ `settings` 用 `ownerId` 单字段索引代替「—」；④ `outbox` 增 `ownerId` 索引；⑤ 管理站文档 §4 的跨账号可选索引未加（按其约定退回逐页扫描）。

#### 运行与生命周期事实

| 项 | 实测结果 |
|---|---|
| 备份 | `tcb db nosql backup time` 返回 7 个每日恢复点（2026-11-16 ~ 2026-11-22）与连续可回档区间 `2026-11-14 05:44:29 ~ 2026-11-22 12:36:33`，可 `backup restore` 回滚 |
| 到期 | 环境个人版，`ExpireTime = 2026-12-06 23:59:59`，`IsAutoRenew = true`；文档库与 PG、云函数、存储同属该环境，未续费即被隔离并最终删除 |
| 配额 | `EnvDeductionMode = credits`、`EnableOverrun = true`；文档库读写与存储计入个人版资源点，未单独计费 |
| 安全规则 | 客户端不直读直写（§4.4），全部经云函数以管理员身份访问；集合级安全规则需在控制台确认「仅管理端可写、客户端不可读」，CLI 无设置入口 |
| 遗留清理 | 已删除 2026-07 自建的 `auth-gateway`、`auth-risk-evaluator`、`security-notification-worker`（含 `every-1min` 触发器）与 `public` 下 9 张认证表；托管 `auth` schema、`storage`、`cloudbase_migrations` 与拨测表未动。删除前的结构与数据、函数源码在 `work/dumps/`（不入库） |

#### 迁回 PG 关系表的代价

若将来要求业务数据落 PG，受影响面：**云函数** `workspace-read`、`sync-push`、`sync-devices`、`migrate-push`、`counter-inc`、`backup-sign` 的元数据写入，以及 `ops-event`（待建）、`admin-api`，全部要从 `db.collection()` 换成 `app.rdb()` / SQL；**Web 侧** `web/src/data/cloud/**` 的云调用适配与 outbox 重放；**数据侧** 18 个集合转 18 张表、补主键 / 唯一约束 / RLS、存量搬运；**测试侧** 需补云端契约用例。这也是本次不在 PG 建同名表的理由：两套结构会形成两个真源。

### 5.4 MVP 读写链路

```
读：组件 → 查询 hook（useLiveQuery）→ 仓储实现 → Dexie
写：组件 → 用例 → 仓储实现 → Dexie 事务 → 返回领域对象
```

- **MVP 没有同步器、没有待同步队列、没有冲突合并**：读写都直接落 Dexie，写完即完成。`syncState` / `opId` 字段已存在但不参与逻辑。
- **事务由用例开**：`src/data/` 根目录的用例（`complete-task.ts` 等）是唯一出现 `db.transaction('rw', [...])` 的地方，表清单显式列全；仓储方法只做单表读写，不在内部开事务、不跨表，详见 [代码结构契约 §1](./CODE-STRUCTURE.md#1-用例层与事务边界)。
- `liveQuery` 只允许出现在 `src/data` 或查询层，组件不直接 import Dexie。
- 业务测试用内存实现时，用例依赖的仓储端口保持在 `data/` 内部的接口上，测试不启动真实 IndexedDB；需要验证事务一致性时走 `db` 测试项目（§2.9）。

### 5.5 迁移预置：V2 接云库时怎么一次性推上去、断点怎么续

这一节是 MVP 阶段就要遵守的约束，目的是让 V2 的迁移是「搬运 + 校验」，而不是「重新建模」。

**现在必须做到的七件事**

1. **表与集合同名、字段同名同义**：`branches` 本地表就对应将来 `branches` 集合，不做 `parent_id → parentId` 之类的映射。
2. **ID 本地生成**：全部用 ULID，迁移时直接作为云端 `_id`，不需要重编号，也不需要维护新旧 ID 对照表。
3. **时间统一 UTC + 业务日期按操作当时本地时区**：`createdAt`/`updatedAt`/`deletedAt` 都是 UTC 毫秒；业务日期（`date` / `dueDate` / `plannedDate`）是 `YYYY-MM-DD` 字面量，按操作当时的本地时区换算（0.18 起的 M05 口径），业务表不存 `tzOffset`；`events` 审计行保留写入时的 `tzOffset`（已补入 `EventRecord`，由 `WriteDeps.tzOffset` 注入）。
4. **软删字段预留**：`deletedAt` 从第一天就写，迁移时把删除状态一起带上去，不会「删掉的东西复活」。
5. **导出带 `schemaVersion` 与字段级版本**：导出文件顶层是 `{ schemaVersion, fieldVersions, exportedAt, app, data }`；`fieldVersions` 记录每个实体关键字段的语义版本，字段含义变化时只针对该字段迁移。
6. **`ownerId` 占位**：本地写入时留空或写设备 ID，V2 登录后统一回填，避免迁移时再补字段。
7. **写入必带 `opId` 与 `syncState`**：每次写入生成一个 `opId`（ULID），`syncState` 初始为 `local`。MVP 不读这两个字段，但必须从第一天就写满，否则 V2 启用补推时要回填历史数据（见 §4.6）。

**V2 的一次性迁移流程**

1. 用户首次登录，`auth-bootstrap` 返回 `ownerId` 与目标 `schemaVersion`。
2. 本地若 `schemaVersion` 落后，先跑本地迁移（导出前自动留一份原文件）。
3. 按集合逐个推送：以 `_id`（ULID）升序、每批 200 条，调 `migrate-push`。函数按 `_id` upsert，**重复推送不会产生重复数据**。
4. **断点续传**：每批成功后把 `{ collection, lastId, pushed }` 写入本地 `migration_state`；中断或换网络后，从该集合的 `lastId` 之后继续，不重头再来。
5. 全部集合推送完后做校验：比对各集合条数、抽样比对关键字段、核对导出文件校验和；不一致的集合重新推一遍。
6. 校验通过后才把读路径切到云端；**本地数据不删除**，至少保留一个完整版本，作为迁移失败时的回滚点。

**迁移期不会有的东西**：没有双向同步、没有增量上行、没有冲突合并。迁移时云端为空，本地是唯一来源，因此不存在冲突；若账号下已有旧数据（重复登录或换设备），先导出留档，再按「以本机为准覆盖」处理，具体策略在 V2 落地时确定。

迁移完成后进入常态：每次写入都是「本地先写 + outbox 补推」（§4.6），不再有整表推送。

### 5.6 可靠性：本机权威意味着丢本机就丢数据

- IndexedDB 在 Safari 上对「未安装且长期未访问」的站点可能被清理；上线即调用 `navigator.storage.persist()`，被拒绝时提示「添加到主屏幕」。
- 自动备份落成**独立备份库**（同源另一个 IndexedDB database，或 OPFS 文件），避免主库损坏时备份一起坏。
- 备份新鲜度提示：超过 7 天未备份在界面露出，不阻断操作。
- 导出（JSON + `schemaVersion`）是唯一可携带的完整副本；导入保持「整体替换 + 替换前自动导出」，不做合并。
- 无账号 = 不跨设备：换设备只能靠导出/导入，界面上要明确说明，不要让人误以为数据在云上。

### 5.7 仓储层约束（换实现时不重写业务）

目标：换存储引擎、换运行端、V2 接云库，都只改 `src/data`。

**强制规则**

1. 纯领域层是 `src/core/`（实体规则、校验、排序分组、四计数、clock/ids、错误码），**不得 import `dexie`、`@cloudbase/*`、`react`、`react-dom`、`react-router-dom`，也不得 import `src/data/**`**；由 ESLint `no-restricted-imports` 固化（`web/eslint.config.js`）。
2. 仓储接口定义在 `src/data/repositories.ts`：纯 TS 接口，参数与返回值是领域对象或 DTO，**不得出现 `Table` / `Collection` / `Transaction` / `db` 等实现类型**。
3. Web 的 `Dexie` 实例、`Table`、事务、`liveQuery` 只允许出现在 `src/data/**`。Web 的 `@cloudbase/*` 只允许出现在 `src/data/cloud/**`，V1 先用于异地备份，V2 再启用同步和匿名统计调用。
4. 一个聚合一个仓储（分支、待办、提交、里程碑、徽章、设置、事件）；方法按用例命名（`listChildren(branchId)`、`findCommitOn(date)`），不提供 `query()` 之类的万能入口。
5. React 只通过用例或查询 hook 访问数据；`useLiveQuery` 只能出现在 `src/data`，组件不直接 import Dexie，V1 起也不直接调 `callFunction`。
6. 每个仓储接口可配一个内存实现用于纯逻辑测试；涉及事务一致性的用例必须用 `fake-indexeddb` 跑真实 Dexie 事务（§2.9），不 mock 仓储。
7. Dexie 的 `version().stores()`、将来云数据库的集合结构、导出文件的 `schemaVersion` **在同一处登记**（`web/src/data/db.ts` 与 `docs/TECH-ARCHITECTURE.md` §5.3），三者必须能互相解释；升级与迁移规则见 [代码结构契约 §5](./CODE-STRUCTURE.md#5-dexie-schema-升级与迁移)。

**PR 检查清单**

- [ ] `src/core` 中 `git grep -n "from 'dexie'"` 与 `git grep -n "@cloudbase"` 均为空
- [ ] 组件中没有 `db.` / `Table` / `useLiveQuery` 直接引用
- [ ] 新增或修改字段时，同时更新 Dexie 版本、集合结构与导出 `schemaVersion`
- [ ] 仓储方法返回领域对象，不返回数据库行
- [ ] 新增表或字段时，名称与将来集合一致，不引入本地专有命名
- [ ] `db.transaction` 只出现在 `src/data` 的用例文件里，且表清单显式列全

### 5.8 与其余问题的耦合

| 项 | 关系 | 说明 |
|---|---|---|
| 静态托管与响应头 | **无耦合，且省掉一类限制** | Dexie 不需要 OPFS / SharedArrayBuffer，因此不需要 COOP/COEP 响应头；CloudBase 静态托管不必支持逐响应自定义头。若改用 SQLite WASM + OPFS，这一条会立刻变成托管选型的硬约束 |
| V1 备份 | **与引擎无关** | 备份包 = 导出 JSON（明文，含 `schemaVersion`），序列化领域对象，**禁止** dump IndexedDB |
| 加密 | **无耦合** | 已定不做 E2EE（§10.2），本地、备份包与云端都存明文，安全边界由权限规则与云函数承担 |
| V2 迁移 / 导出格式 | **强相关，方向是解耦** | 只依赖领域对象、字段命名与 `schemaVersion`；迁移按 `_id` 分页，与 Dexie 内部结构无关 |
| 移动端复用 | **唯一实质耦合** | Dexie 只存在于浏览器；影响收在 `src/data/local`，RN 侧换 SQLite/AsyncStorage 时不动业务 |
| 匿名统计 | **无耦合** | V2 按 J-07 白名单由云函数计数 |
| 首页 SEO / 分享卡片 | **无耦合** | 由 §3 的预渲染决定，本地库不参与首屏 HTML |
| 多语言 | **无耦合** | 纯文案层 |

一句话：Dexie 唯一需要工程手段兜住的是**移动端复用**；V2 迁移的成败取决于字段命名与 ID 策略，而不取决于用了哪个本地引擎。

### 5.9 代码结构契约（0.19，细则见 [代码结构契约](./CODE-STRUCTURE.md)）

七件事的结论集中在此，开发照此实现；小节编号对应 `CODE-STRUCTURE.md` 的章节。

| 事项 | 结论 | 落地位置 |
|---|---|---|
| 用例与事务 | 一个用户动作一个用例文件，`动词-名词.ts`，放 `src/data/` 根；**用例是唯一开 `db.transaction` 的地方**，表清单显式列全；仓储单表、带 `rev`、内部 `assertInTransaction()` 守卫；四计数由用例在事务内调 `recountBranch()` | `src/data/*.ts`、`src/data/transaction.ts`、`src/data/repositories.ts` |
| clock / ids | 领域代码不直接取时间与随机数；`Clock.now()`、`IdSource.ulid(now)` 由用例第二参数注入，默认 `defaultWriteDeps`；`toLocalDate(epochMs, tzOffsetMinutes)` 与 `today(clock, offset)` 是「当天」的唯一来源，偏移东正西负（UTC+8 → 480） | `src/core/clock.ts`、`src/core/ids.ts`、`src/data/deps.ts` |
| 错误模型 | 可预期失败返回 `Result`（`ok` / `fail` + `ErrorCode`）；不变量违反抛 `Error`；Dexie 异常在用例边界映射为 `storage.*`；UI 按 `field` 落内联、否则落回执/弹层，`retriable` 决定重试 | `src/core/errors.ts` |
| events | 只由用例写、同事务；action 清单见 `CODE-STRUCTURE §4.2`（`entity.verb`，27 个）；payload 用 `EventPayloads` 映射类型化；每个动作一条，批量带 `count`；R13 删空分支、V1-08 排序/置顶、V2-03 模板、删示例树均不写；收尾+归档只写 `branch.finish`（`payload.archived`）；`sync.conflict` 的 `entityType = 'sync'` | `src/data/events.ts`、`src/data/event-payloads.ts` |
| Dexie 升级 | 只有增删表 / 索引 / 主键才 bump `DB_VERSION`；只前进、不删数据、升级期禁写；`versionchange` 提示刷新；导出 `schemaVersion` 是文件格式版本，与 `DB_VERSION` 解耦，MVP 只接受相等版本 | `src/data/db.ts` |
| 断点 | mobile 390 / compact 760 / wide 1440；媒体查询内允许且仅允许这三个数值；暂不进设计令牌，`design/` 不改 | CSS Modules |
| 命名 | 组件 `kebab-case.tsx` + PascalCase；`*-page.tsx`；同名 `.module.css`；类名 camelCase、不用 `&__`、不 `:global`；动态值只走行内 CSS 变量；颜色/字号/时长只走令牌 | `src/components`、`src/pages`、`src/ui` |

---

## 6. 认证与权限

### 6.1 结论

- **MVP：没有账号。** 不登录、不联网可用是验收项，登录入口不得出现在任何阻断路径。
- **V1 的异地备份按本地生成的匿名设备 ID 归档。** 账号和数据迁移在 V2 引入。
- **V2：引入云开发身份与真实登录渠道**（手机号 / 微信等），首次登录触发 §5.5 的一次性迁移，同期做多端同步。账号只解决「我是谁」，不解决「数据怎么合」。

### 6.2 登录渠道（V2 再定）

| 渠道 | 得到 | 放弃 | 何时后悔 |
|---|---|---|---|
| 匿名 | 零摩擦、合规面最小 | 换设备/清缓存即失身份，无法跨端 | 用户开始换设备或需要多端 |
| 手机号 | 找回与跨端可靠 | 短信成本、个人信息范围扩大 | 短信到达率低或成本敏感 |
| 微信 | 境内体验好、天然跨端 | 绑定微信生态，境外用户不便 | 主用户不在微信生态 |
| 邮箱 OTP | 实现简单、跨境可用 | 依赖邮件可达性，垃圾箱问题 | 主用户邮箱使用率低 |

不建议只做匿名就宣称「支持多端」：匿名身份存在本地，清站点数据即丢失，必须有绑定或导出托底。

### 6.3 权限模型（V2 起）

- `principalId` 是稳定的 CommitToDo 账号标识，对应 `users._id` 和业务记录的 `ownerId`。Web 与小程序可使用各自的登录入口，服务端将两端已验证的身份映射到同一 `principalId`。小程序的 `(AppID, OpenID)` 用于识别微信侧身份，具体绑定和找回流程在 V2 落地时确认。
- 云函数依据已验证身份解析出的 `ownerId` 隔离读取和写入。客户端直读条件见 §4.4。两端同账号读取结果一致，异账号访问彼此数据应被拒绝。
- 账号级能力（配额、设备注册、吊销）与多端同步同期实施。
- 不做端到端加密（§10.2），因此不存在密钥分发、密钥恢复与密文索引；权限只需管住「谁能读写哪些行」。

---

## 7. 可延展性

### 7.1 会锁死未来的四个决策

| 决策 | 现在怎么做才不锁死 | 做错的后果 |
|---|---|---|
| 领域模型与存储的耦合 | 领域对象、用例、校验写成纯 TS；持久化只出现在 `src/data`（§5.7） | 换引擎或接云库时要重写业务 |
| 表 / 字段命名与 ID | 本地表名、字段名与将来集合一致；主键 ULID | V2 迁移要写映射与新旧 ID 对照表 |
| 时间与时区 | 时间戳存 UTC 毫秒，业务日期存 `YYYY-MM-DD` + `tzOffset` | 迁移后跨日错位，统计对不上 |
| 导出格式与版本 | 明文 JSON + `schemaVersion` + `fieldVersions`，字段语义有文档 | 数据无法迁出，或迁移后语义丢失 |

### 7.2 不需要现在投资的

- 不做跨端组件库（React DOM 组件在 RN 里本来就不能用）。
- 不做同步协议预研：V1 只有单向备份，V2 才做迁移与同步，单独立项。
- 不引入 GraphQL / tRPC：端点只有几个，REST 风格的云函数更直白。
- MVP 不部署云函数，也不为「以后可能需要」先搭一套服务端骨架。

### 7.3 Web 与微信小程序的仓库和后端边界

两个客户端保留在同一个 Git 仓库，各自拥有界面、导航、平台适配、构建和发布配置。V2 微信小程序使用现有 CloudBase 环境，与 Web 共用业务库、账号归属和服务端接口。小程序先按 [只读 PRD](./prd/V2-04-second-client.md) 接入，页面沿用 [小程序定稿](./miniprogram/DESIGN.md)。

| 路径 | 职责与创建时机 |
|---|---|
| `web/` | Web 前端。现有 Dexie 工作区保持本地先写，V2 由 outbox 同步。云端调用适配放在 `web/src/data/cloud/` |
| `cloudfunctions/` | 从 Web 首次交付异地备份起，在仓库根目录集中保存云函数源码。Web 先使用，小程序随后接入已有服务 |
| `cloudbaserc.json` | 随首个云函数建立共享部署配置。`functionRoot` 指向 `./cloudfunctions`，部署时显式指定目标环境。[CloudBase 配置说明](https://docs.cloudbase.net/cli-v1/config) |
| `miniprogram/` | 小程序开工时创建独立工程。应用包通过自己的平台适配调用共享后端 |
| `packages/domain/` | Web、小程序或云函数出现实际复用需求时，再从 `web/src/core/` 抽取所需纯规则，连同平台无关类型放入共享包 |

- 后端从根目录统一构建和部署，客户端按各自的发布流程构建。共享目录的创建跟随 Web 首个真实云函数需求，小程序工程的启动时间独立安排。
- 优先共享版本化的请求与响应契约、稳定 ID 和领域规则。React 组件、浏览器 API、Dexie 和小程序运行时各留在所属平台。今天分组、有效提交、四计数、停滞和合回的口径在两端保持一致。
- 跨端首条验收以一条真实同步记录为准。Web 完成一条待办并同步，小程序用同一账号刷新后看到对应提交与进度。用另一账号验证隔离。小程序真实 AppID 对目标环境的访问验证在接入时完成。

---

## 8. 推荐组合

| 项 | 选择 | 备注 |
|---|---|---|
| 语言 / 框架 | TypeScript 7 + React 19 | 已定稿，版本见 §2.2 |
| 构建 | Vite 8（`index.html` 首页 / `app.html` 应用） | 首页构建期预渲染 |
| 路由 | React Router 7 数据路由 | 应用内路由 `noindex` |
| 动效 | 一次性入视触发、原生状态与 SVG 局部描线 | [首页动效规范](./HOMEPAGE-MOTION.md) |
| 样式 | CSS Modules + 原生 CSS 变量 | 令牌源 `design/design-tokens.json`；见 §2.5 |
| 部署 | 腾讯云 CloudBase 静态托管（默认域名；首发暂缓，按用户节奏） | 自定义域名与备案到上线前才成为前置，见 §9.3 |
| MVP 后端 | **无** | 不需要云函数与环境变量 |
| V1 后端 | 根目录的 `backup-sign` 与对象存储 | 供 Web 异地备份使用，见 §4.3 |
| V2 后端 | 增加云开发身份、云数据库与匿名统计 | 账号、同步和只读查询供双端使用，迁移见 §5.5 |
| 认证 | MVP 与 V1 无；V2 云开发身份与真实登录渠道 | 见 §6 |
| 权威存储 | **MVP 与 V1：本机 Dexie 4**；V2 迁移后：云端为收敛点、本地仍为即时权威 | 见 §5 |
| 导出 / 备份 | 明文 JSON + `schemaVersion` + `fieldVersions` | 不涉及密钥 |
| 加密 | 不做端到端加密 | 明文 + 权限规则（§10.2） |
| 匿名统计 | V2 启用云函数计数 | 口径见 J-07 和 V2-02 |

**实施顺序**为 Web 本地 MVP → V1 异地备份与根目录共享云函数 → V2 账号、迁移、同步与匿名统计 → 微信小程序只读接入。Web 首发部署按用户节奏执行。

---

## 9. 开工前必须确定的信息清单

这一节不是选型问题，是「填一个值就能开工」的配置事实。每项给出推荐默认值，照填即可。

### 9.1 CloudBase 环境 ID 与地域

- **为什么现在定**：部署启动时需要 envId 决定上传地址与默认域名；但**首发部署暂缓**，开发阶段可不提供，不阻塞构建、本地验证与门禁。
- **环境选择**以现有 CommitToDo CloudBase 环境为基准。部署时显式指定已核对的 `envId` 与地域。Web 和小程序接入同一个业务环境，配置放在各自的环境参数中。小程序接入时验证真实 AppID 可访问此环境。
- **不定的后果**：只影响发布时机；后期换环境要重新上传并更换访问地址。

### 9.2 计费与配额

- **为什么现在定**：MVP 只产生静态托管流量，成本极低，但超配额仍会停服。
- **推荐默认值**：按量付费 + 月度预算告警；先跑一周观察流量再设上限。
- **不定的后果**：流量突增时可能限流或产生意外账单。

### 9.3 自定义域名与备案

- **为什么现在定**：它不影响开发，但决定「什么时候可以对外正式推广」。
- **推荐默认值**：**上线前**才绑定自有域名 + 免费证书 + 完成 ICP 备案，并决定 `www` 与裸域的重定向；在那之前用 CloudBase 默认域名即可，或干脆先不部署。
- **不定的后果**：不阻塞开发与本地验证；但正式对外发布前备案是硬前置（周期以周计），旧分享链接也会随域名切换失效。

### 9.4 身份与登录方式

- **为什么现在定**：决定 V2 迁移的触发点与 `ownerId` 的来源。
- **推荐默认值**：MVP 与 V1 无账号（V1 用本地匿名设备 ID 归档备份）；V2 用云开发身份，优先匿名→可绑定手机号或微信；不做自建账号密码。
- **不定的后果**：不阻塞 MVP 与 V1；但 V2 迁移流程与找回路径无法定稿。

### 9.5 数据归属与权限边界

- **为什么现在定**：决定 V2 的集合隔离方式与隐私口径。
- MVP 与 V1 数据归属本机，备份按匿名设备 ID 归档。V2 依据账号 `ownerId` 隔离，两端身份归属与可直读条件按 §4.4 和 §6.3 验收。
- **不定的后果**：不阻塞 MVP 与 V1；V2 的集合与云函数接口无法定稿。

### 9.6 表 / 集合命名与 ID 生成策略

- **为什么现在定**：本地表结构一旦写入数据，改名就要写迁移；ID 策略直接决定迁移能否按序分页。
- **推荐默认值**：表 / 集合 `snake_case` 复数、字段 `camelCase`；主键 ULID；业务文档预留 `ownerId`、`rev`、`createdAt`、`updatedAt`、`deletedAt`。
- **不定的后果**：V2 迁移要写字段映射与新旧 ID 对照，成本翻倍且易漏。

### 9.7 时间与时区存储规则

- **为什么现在定**：「哪一天完成的」是业务语义；时区处理错会导致跨日错位，迁移后难以重算。
- **推荐默认值**：时间戳存 UTC 毫秒；业务日期存 `YYYY-MM-DD` 并同时记录 `tzOffset`（分钟）；展示按设备时区。
- **不定的后果**：迁移后统计对不上；改规则需全量回填。

### 9.8 导出与迁移格式版本化

- **为什么现在定**：这是数据可迁移性的唯一出口，也是用户自保手段；做晚了历史数据就锁在浏览器里。
- **推荐默认值**：顶层 `{ schemaVersion, fieldVersions, exportedAt, app, data }`；字段语义变化时只提升对应字段版本；每次破坏性结构变更提供 `migrate(from, to)`。
- **不定的后果**：无法自动迁移；换端或接云库时只能人工处理。

### 9.9 隐私合规与个人信息范围

- **为什么现在定**：MVP 与 V1 都不收集个人信息，但 V2 一上账号就会改变口径。
- MVP 与 V1 的业务库留在本机，异地备份遵循 §4.2。V2 根据选定的登录方式收集必要的身份资料，按 §6.3 关联 Web 与小程序账号，并提供数据导出、删除入口与隐私说明。
- **不定的后果**：V2 上线合规风险；后期补删除能力要改数据模型与云函数。

---

## 10. 开放问题

### 10.1 已定

| 项 | 结论 | 日期 |
|---|---|---|
| 框架 | Vite + React，不换其他框架 | 2026-11-20 |
| 版本 | React 19.3.1 / Vite 8.3.8 / plugin-react 6.3.0 / TS 7.0.2 / react-router-dom 7.18.6 | 2026-11-20 |
| 部署 | 腾讯云 CloudBase 静态托管，MVP 用默认域名；**首发部署暂缓，按用户节奏**（2026-11-21 补） | 2026-11-20 |
| 后端与多端 | V1 从 Web 异地备份开始交付根目录共享云函数。V2 增加身份、云库、匿名统计及微信小程序只读接入 | 2026-11-21 |
| 权威存储 | MVP 与 V1 都是本机（Dexie 4）；V2 迁移后云端为收敛点、本地仍为即时权威 | 2026-11-20 |
| 离线写入 | **本地先写 + outbox 补推**；冲突不静默丢弃，记入 `conflicts` 并在分支历史留痕（§4.6） | 2026-11-20 |
| 本地库 | Dexie 4，不引入 SQLite WASM | 2026-11-20 |
| 加密 | **不做端到端加密**（本地、备份包、云端都是明文），安全边界靠权限规则 | 2026-11-20 |
| 视觉规格 / 样式 | CSS Modules + 原生 CSS 变量；令牌源 `design/design-tokens.json`（§2.5） | 2026-11-21 |
| 数据模型 | **以页面画稿为准**：字段与表按 `design/images/` 逐页核对补全，规则集中为 §5.3.3 | 2026-11-21 |
| 状态管理 | Zustand 按屏切分，store 只装 UI 状态；领域数据一律 Dexie `useLiveQuery`（§2.6） | 2026-11-21 |
| 图标 | 自绘内联 SVG，不引图标库；尺寸 16/18/20/24、描边 1.5、颜色取 `currentColor`（§2.7） | 2026-11-21 |
| 文案 | 单文件 key 化，只 `zh-CN`；不引 i18n 运行时库（§2.8） | 2026-11-21 |
| 测试 | Vitest 5，只测纯逻辑与 §5.3.3 规则，不写组件快照（§2.9） | 2026-11-21 |
| 代码结构 | 用例层与事务边界、clock/ids 注入、错误 `Result`、events 写入、Dexie 升级、断点、组件命名七项定稿（§5.9、§2.10，细则见 `CODE-STRUCTURE.md`）；四项待拍板已定：`events.entityType`、`events.tzOffset` 补入类型、月精度按当月 1 日 00:00 本地转 UTC、断点暂不进设计令牌 | 2026-11-21 |

### 10.2 已定：不做端到端加密（含异地备份）

**决定（2026-11-20）：端到端加密与备份包加密都不做。** 数据本身不敏感（个人任务与提交记录，无隐私内容、无第三方数据），加密的写入成本高于收益：

- **服务端搜索与聚合退化**：密文下云函数无法做周报、统计与跨分支查询，而这些恰好是产品的主要价值。
- **多设备密钥传递**：每台设备都要拿到密钥，等于自己发明一套密钥分发与轮换。
- **密钥丢失即数据报废**：口令或密钥一旦丢失，云端密文无法恢复，而本产品没有可靠的找回通道。
- **恢复流程要单独设计**：换设备、重装、匿名转正都要重新走一遍密钥握手，成本与出错面都不小。

账号数据按照服务端解析的 `ownerId` 隔离，读写要求见 §4.4。**导出与异地备份都是明文 JSON + `schemaVersion`**。

### 10.3 延后

| # | 问题 | 状态 | 如果不定，会卡住什么 | 最晚何时定 |
|---|---|---|---|---|
| 1 | 首页是否必须被搜索引擎收录、分享卡片是否重要 | 延后 | 不卡开发；只影响首页 meta/OG 与预渲染细节 | 首次对外推广前 |
| 2 | V2 登录渠道（手机号 / 微信 / 邮箱） | 延后 | 不卡 MVP 与 V1；卡 V2 迁移触发点与找回流程 | V2 排期前 |
| 3 | V2 迁移批次大小与「是否保留本地优先读」 | 延后 | 不卡 MVP 与 V1；只影响迁移耗时与切换手感 | V2 开发前 |
| 4 | 备份包频率与保留份数 | 延后 | 不卡 MVP；影响存储占用与恢复流程 | V1 排期前 |
| 5 | 移动端是 RN/Expo、PWA，还是先不做 | 延后 | 不卡开工——§5.7 已把隔离定为常规约束 | V2 立项前 |
| 6 | 多端冲突策略的具体判定与展示 | 延后 | 不卡 MVP/V1；**方向已锁**（§4.6）：本地先写 + outbox 补推，冲突不静默丢弃、记入 `conflicts` 并在分支历史留痕 | V2 立项前 |
| 7 | 匿名统计的事件口径 | V2 落地 | 影响 V2 计数字段与隐私文案，按 J-07 与 V2-02 验收 | V2 上线前 |
| 8 | 是否需要多语言 | **骨架已定**：只 `zh-CN`，文案 key 化（§2.8）；新增语言与切换仍延后 | 不卡开发；加语言时只加目录文件，不改组件 | 出现真实第二语言需求时 |

### 10.4 阻塞状态与开工结论

- **当前没有阻塞项。** MVP 的技术路径完整：首页 + 应用壳 + 本机 Dexie + 导出/恢复；部署流程已定但**首发暂缓**（0.22），不构成开发阻塞。
- **保留 `@cloudbase/js-sdk` 不改变 MVP 的运行时边界**：只在 `src/data/cloud/` 内按需初始化，应用入口不引用、不进首屏包、运行时不发请求；云函数与云库仍从 V1 / V2 起启用。
- **自定义域名与备案在上线前才成为前置条件**：可先用 CloudBase 默认域名，或先不部署；切自有域名时再处理备案与证书。
- **V2 之前需要拍板的**是登录渠道与迁移细节（§10.3 第 2、3 项），它们不影响 MVP 与 V1 的开发与发布。
- **结论**：Web MVP 先完成本地闭环。V1 开发异地备份时先把云函数放到仓库根目录。V2 小程序沿用该后端接入身份、云库与同步后的只读数据。

---

## 11. 变更记录

| 版本 | 日期 | 变更 |
|---|---|---|
| 0.1 | 2026-11-20 | 首版。基于清空重建后的最小骨架与 FRAMEWORK 的 MVP/V1/V2 切分，给出框架、渲染、后端、存储、认证与延展性选型及推荐组合 |
| 0.2 | 2026-11-20 | 本地库定为 Dexie 4、否决 SQLite WASM（§5.2）；新增耦合分析与仓储层约束；开放问题改为「已定 / 延后」并标注是否卡开工 |
| 0.3 | 2026-11-20 | 框架定稿为 Vite + React，删除候选对比与 Next.js 取舍；版本按 registry 实查落地并补选定依据与升级窗口（§2.2）；样式方案改为留空，凡依赖样式方案的表述改为条件式 |
| 0.4 | 2026-11-20 | 部署定为 CloudBase 静态托管、后端改为 CloudBase；曾按「云库权威 + 同步」重写 MVP，该前提已于 0.6 撤回 |
| 0.5 | 2026-11-20 | 端到端加密定为不做（§10.2），删除密钥与密文相关预留；权限与安全边界改为明文做法；导出与备份为明文 JSON |
| 0.6 | 2026-11-20 | MVP 权威存储回到本机：删除同步器、outbox、opId/baseRev、LWW 等表述，读写直接落 Dexie（§5.4）；云数据库、云函数与读写边界标注为 V1/V2 启用；新增表/集合同名同字段、ULID、UTC+tzOffset、软删、`schemaVersion` + `fieldVersions` 的迁移预置与断点续传流程（§5.5）；补 MVP 上线路径（§3.3）与「备案不阻塞默认域名上线」的结论（§9.3、§10.4） |
| 0.7 | 2026-11-20 | **阶段口径与 FRAMEWORK 对齐并收窄**：V1 改为**只加云函数（`backup.sign`、`counter.inc`）+ 对象存储**，仍无账号、无云数据库，权威数据仍在本机；云开发身份、云数据库、一次性迁移与多端同步整体移到 V2。§4.2 云能力表按阶段拆分，§4.3 云函数清单拆成 V1 两个 / V2 七个，§4.4 读写边界分 V1 / V2 两段，§4.6 阶段演进、§5.1 数据分布、§5.3 / §5.5 迁移、§6 认证、§9.4–9.6、§9.9、§10.1、§10.3、§10.4 同步改写。**加密口径明确**：不做端到端加密，**异地备份也是明文 JSON**，不存在客户端加密与密钥传输 |
| 0.8 | 2026-11-20 | **离线写入定案（方案 A：本地先写 + outbox 补推）**：新增 §4.6，明确写入链路、`opId` / `syncState` / `outbox` / `conflicts` / `baseRev` 五项预留、冲突不静默丢弃的展示原则；§5.3 表结构补 `outbox`、`conflicts` 两张表与字段规则；§5.5 预置条目从六条增到七条，新增强制写满 `opId` 与 `syncState`；§4.7 阶段演进表增加「写入路径」一列；§10.3 第 6 条改为「方向已锁，细则 V2 定」 |
| 0.9 | 2026-11-21 | **并入设计线移交的数据模型**：`branches` 补 `path` / `depth` / `archivedAt` 与四个计数，`commits` 补 `sourceBranchId` / `isBackfill` / `voidedAt`，`tasks` 补 `plannedDate`，`milestones` 补 `datePrecision`；新增 `badges` / `settings`，MVP 业务表改为 7 张（§5.3）。新增 §5.3.1 物化路径与层级规则（归档与 `status` 正交、四计数同事务维护）、§5.3.2 五条关键查询与复合索引（软删默认过滤、归档显式传、搜索用前缀匹配）。§2.4 先落两条与样式无关的约束：令牌唯一来源 `design-tokens.json`、主题用 `data-theme` 挂载；样式工程组织仍待定 |
| 0.10 | 2026-11-21 | **样式工程化拍板**：新增 §2.5，定为 CSS Modules + 原生 CSS 变量，否决 Tailwind / CSS-in-JS / 组件库并写明理由；令牌唯一真源 `design/design-tokens.json`，`design/tokens.css` 只生成不手改；默认白天、深色用 `data-theme` 切换；禁止硬编码色值/线宽/圆角/时长，基础件只做薄封装；保留 TW 重新评估的反向条件。§0 与 §10.1 的样式状态改为已定 |
| 0.11 | 2026-11-21 | **主题口径收紧**：初始即浅色；深色只能由用户手动切换并持久化到 `settings.theme`，**不读取 `prefers-color-scheme`**，也不随系统变化；首屏只在 head 内联脚本里恢复已存选择（§2.5） |
| 0.12 | 2026-11-21 | **以画稿为准的字段补全**：逐页核对 `design/images/` 后补 `branches.goal` / `color` / `finishedAt` / `finishedIntoId` / `droppedAt` / `dropReason` / `pinnedAt`，`tasks.completedAt` / `completedCommitId` / `cancelledAt` 与 `cancelled` 状态，`commits.at`，`milestones.note`，`badges.catalogId` / `category` / `periodKey`，`settings.lastAutoBackupAt`；新增 `backups`（V1）、`year_reviews`（V1），V2 补 `devices` 与 `conflicts` 的设备/字段级记录；删 `tasks.priority`、`users.prefs`、`settings.fontScale`、`commits.isBackfill`；索引补 Q6–Q10；新增 §5.3.3 规则表（完成口径、停滞、短 hash、`datePrecision`、四计数重算、周/月/年口径、收尾去向、删空分支例外、重开保留放下历史、主题两档）。MVP 业务表仍为 7 张，新表随 V1 启用 |
| 0.13 | 2026-11-21 | **四项工程细节拍板并最小落地**：新增 §2.6 状态管理（Zustand 按屏切分、只装 UI 状态、数据走 `useLiveQuery`、建 store 的三条判断标准）、§2.7 图标（自绘内联 SVG，尺寸 16/18/20/24、描边 1.5、`currentColor`、禁图标库）、§2.8 文案（单文件 key 化、只 `zh-CN`、key 命名与「暂时不做」）、§2.9 测试（Vitest 5、`*.test.ts` 同目录、只测纯逻辑与 R1–R19、`npm test`）；落地 `web/src/stores`（`shell` / `today`）、`web/src/ui/icons`（`SvgIcon` + 示例）、`web/src/i18n`（`zh-CN` + `t()`）、`web/src/core/rules/counters.ts` 与首个纯函数测试；`web/package.json` 加 `zustand@5.1.0`、`vitest@5.1.1` 与 `test` 脚本，`vite.config.ts` 合并 `test` 配置。`npm test` 3/3 通过，`npm run build` 通过 |
| 0.14 | 2026-11-21 | **R8 增补「显式安排到今天」例外**：`dueDate < today` 但 `plannedDate = today` 的待办归今天组，不再计入逾期；逾期只认「时间判定且未经显式安排」（`dueDate < today && plannedDate !== today`）。判定依据为既有 `tasks.plannedDate`，**不新增字段**；同步改写 Q2 的取数顺序与索引说明、R15 的重开分组口径，并在 §5.3.3 表后补「显式安排」的字段/操作/清空说明 |
| 0.15 | 2026-11-21 | **M08 可行性确认**：收尾不迁移 `milestones.branchId`，父分支历程用既有 `branches.finishedIntoId` 链在内存展开已收尾子树，再用 `[ownerId+branchId]` 的 `anyOf` 取里程碑并按 `achievedAt` 合并，来源标注取 `branchId` 对应 `title`。结论：现有表与索引可实现，**不加字段、不加索引**（`sourceBranchId` 与 `branchId` 重复；`finishedIntoId` 无索引但全表 ≤200 行可接受）。新增 Q11 与四方案代价对比，R12 补「里程碑不迁移」与落地约束（禁批量改写、`dropped` 不并入、归档来源仍显示） |
| 0.16 | 2026-11-21 | **备份留存口径补齐**：Q8 与 R17 明确四类快照的留存上限——`auto` 7 条、**`manual` 7 条**、`pre-restore` 1 条、`remote` 1 条；页面把四类合成**一条按 `createdAt` 倒序的时间线**，不截断、不按类合并、行内用标签区分来源。查询改为 `[ownerId+kind+createdAt]` 逐类取上限再合并，`[ownerId+createdAt]` 仅作校验，**不新增索引**；§5.3.2 补「备份列表不按类分组」说明 |
| 0.17 | 2026-11-21 | **测试范围扩到 Dexie 事务**：引入 `fake-indexeddb@6.2.8`（devDependency），Vitest 拆成 `unit`（`src/**`，排除 `src/data/`）与 `db`（`src/data/**`，仅此处 `setupFiles` 加载 `fake-indexeddb/auto`）两个项目，纯函数用例不付 IndexedDB 开销。§2.9 范围改为「纯函数 + R 规则 + Dexie 事务一致性」，新增事务用例约定（每例 `db.delete()` 隔离、就地工厂、断言库内实际值）与覆盖要求（多表写入规则必须补同事务/回滚用例）。落地 `src/data/transactions.test.ts`：完成待办时提交与四计数同事务写入、失败整体回滚 |
| 0.18 | 2026-11-21 | **按代码修正主键与时区口径**：`settings` 主键由 `_id = 'app'` 改为 `id = 'app'`，并明确本地 7 张表物理主键统一为 `id`（`web/src/data/db.ts`），`_id` 只是 V2 云端主键名；删除「业务日期同时记录 `tzOffset`」的旧表述，补 **M05 时区口径**——日期按操作当时本地时区计算，`commits.date` + `at` 足够，**不新增字段**，仅 `events` 保留审计用 `tzOffset` |
| 0.19 | 2026-11-21 | **补齐代码结构契约**：新增 §2.10 响应式断点（390 / 760 / 1440，媒体查询内允许写这三个数值，是否进设计令牌待设计线拍板）与 §5.9 七项契约（用例与事务、clock/ids、错误模型、events、Dexie 升级、断点、命名），细则独立为 [`CODE-STRUCTURE.md`](./CODE-STRUCTURE.md)。**修正两处与代码不一致的旧表述**：§5.4「事务在仓储内部闭合」改为「用例是唯一开 `db.transaction` 的地方」；§5.7 的 `src/domain` / `src/application` / `src/data/local` 路径改为实际的 `src/core` / `src/data`（`repositories.ts`、`cloud/`）。§5.5 第 3 条同步 M05 口径。§10.1 补「代码结构」一行。待拍板项（`events.entity` vs `entityType`、`events.tzOffset`、月精度归一化、断点令牌）记在 `CODE-STRUCTURE.md` §8，不改表、不改 PRD |
| 0.20 | 2026-11-21 | **四项待拍板落定**：①`events` 字段统一 `entityType`，代码 `EventRecord` / `writeEvent` 随文档改（未建索引，不 bump schema）；②`events.tzOffset` 补进 `EventRecord`，由 `WriteDeps.tzOffset(at)` 写入；③月精度里程碑 `achievedAt` 按「当月 1 日 00:00 本地时间转 UTC」归一，写入 §5.3 与 R6；④断点暂不进 `design/design-tokens.json`，`design/` 下文件不动，保持 390 / 760 / 1440 写在媒体查询内。`CODE-STRUCTURE.md` §2.2 / §4 / §6 / §8 同步；`docs/prd/` 未改（`events.action` 字面值由 PRD 线统一） |
| 0.21 | 2026-11-21 | **events action 清单收敛为 27 个**（PRD 侧已统一 `entity.verb`）：补 `branch.update`；移除 `branch.pin` / `branch.unpin`（V1-08 排序置顶不写）、`branch.delete`（R13 硬删不写）、`milestone.delete`（M07 里程碑永存）；收尾+归档只写一条 `branch.finish`（`payload.archived`）；模板生成/撤回不写、不新增模板动作；`sync.conflict` 的 `entityType = 'sync'`（独立前缀），分支历史用 `payload.branchId` 过滤。代码 `event-payloads.ts`、`EventRecord.entityType`、`ENTITIES` 同步；`docs/prd/` 未改，V2-02 表与 V2-03 §7 的分歧记录在 `CODE-STRUCTURE §8 #9` |
| 0.22 | 2026-11-21 | **CloudBase 口径与现状对齐**：MVP 保留 `@cloudbase/js-sdk@^3.11.1` 依赖，但仅在 `src/data/cloud/` 内按需初始化、应用入口不引用、不进首屏包、运行时无请求；云函数 / 对象存储 / 云数据库 / 云开发身份仍从 V1 / V2 起启用。删除「MVP 0 处代码依赖」「不需要任何 `.env`」等旧表述（§1 表、§3.3）。**首发部署暂缓，按用户节奏执行**（§3.3、§9.1、§10.1、§10.4）；自定义域名与备案标注为**上线前**才成为前置（§3.3、§9.3）。§4.5 SDK 路径由 `src/data/cloudbase/**` 修正为 `src/data/cloud/**` |
| 0.23 | 2026-11-21 | Web 与微信小程序同仓库、分别构建和发布。Web 在 V1 异地备份时先交付根目录的 `cloudfunctions/` 与共享部署配置。V2 小程序以同账号只读接入同一 CloudBase 后端，按需共享纯领域规则。匿名统计阶段与 J-07 对齐为 V2。见 §4.3、§6.3 与 §7.3。 |
| 0.24 | 2026-11-22 | **云函数命名约束**：函数名只用小写字母、数字与连字符，不得含点号（SCF 会拒绝部署）；`cloudbaserc.json`、目录名与调用方必须一致。已交付函数改为 `backup-sign`、`workspace-read`，V2 规划函数表同步改为连字符命名（§4.3）。 §4.4、§4.7、§5.5、§9.4 的函数名引用同步更新 |
| 0.25 | 2026-11-22 | `backup-sign` 在 PG 环境落地：改用 service_role API Key + `app.storage.from(bucketId)` 访问对象存储，`BACKUP_BUCKET` / `BACKUP_API_KEY` 走函数环境变量，下载改用 `createSignedUrls`；函数运行时要求 `Nodejs20.19`。见 §4.4 |

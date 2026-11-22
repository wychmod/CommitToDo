# AGENTS.md

本仓库的协作约束。改代码前先读这里，以及 `docs/TECH-ARCHITECTURE.md` 的对应小节；用例、事务、clock/ids、错误、events、升级与命名的细则见 `docs/CODE-STRUCTURE.md`。

## 目录职责

```
web/src/
  core/        纯函数与规则（R1–R19），不依赖 React、Dexie、DOM
  data/        Dexie 库、领域类型、仓储与 useLiveQuery 读钩子
  stores/      Zustand，按屏切分，只装 UI 状态
  i18n/        唯一文案表（zh-CN），t() 与 key 类型
  ui/          无业务的基础件：图标、页壳、加载态、错误边界、主题
  components/  组合件：应用外壳、全局浮层等
  pages/       路由页，只做编排与取数
  styles/      全局 reset、字体栈、令牌引入；组件样式用 CSS Modules
```

根目录的 `docs/` 存放架构、页面与 PRD，`design/` 存放令牌与画稿（只读），`web/` 是 Web 客户端。

Web 首次交付云函数时，在仓库根目录建立 `cloudfunctions/` 与共享部署配置。`web/src/data/cloud/` 负责 Web 侧调用。微信小程序开工时建立独立的 `miniprogram/`，两端共用 CloudBase 后端。共享纯领域规则按需抽取，目录与职责见 [`docs/TECH-ARCHITECTURE.md` §7.3](docs/TECH-ARCHITECTURE.md#73-web-与微信小程序的仓库和后端边界)。

## 依赖方向（ESLint 强制，违规即失败）

```
pages → components → ui → core
  ↓        ↓         ↓
data ←-----+---------+      stores → core
i18n ← 任意层（i18n 自身不反向依赖）
```

- `core` 不得引用 `data / stores / ui / components / pages`，也不得引用 React、Dexie。
- `data` 不得引用 `pages / components / stores / ui`；读路径统一 `useLiveQuery`。
- `ui` 不得引用 `data / stores / components / pages`；`components` 不得引用 `pages`。
- `stores` 不得引用 `data / ui / components / pages`。
- 跨层引用一律用 `@/` 别名；页面不允许直接 `import '@/data/db'`。

## 代码结构契约（细则见 `docs/CODE-STRUCTURE.md`）

- **用例**：一个用户动作一个文件，`src/data/动词-名词.ts`；用例是唯一开 `db.transaction` 的地方，表清单显式列全；仓储方法单表、带 `rev`，写方法内用 `assertInTransaction()` 守卫，不嵌套事务。
- **clock / ids**：领域代码不写 `Date.now()` / `new Date()` / `crypto.randomUUID()`；用例第二参数 `WriteDeps`（`clock` + `ids`）注入，测试传固定时钟与固定 ID。「当天」只由 `core/clock.ts` 的 `today()` / `toLocalDate()` 产出，偏移东正西负（UTC+8 → 480）。
- **错误**：可预期失败返回 `Result`（`ok` / `fail` + `ErrorCode`），不抛给页面；不变量违反抛 `Error`；Dexie 异常在用例边界映射为 `storage.*`；`field` 非空走表单内联，否则走回执/弹层。
- **events**：只由用例写、与业务写入同事务；action 用 `entity.verb`，payload 走 `data/event-payloads.ts` 的映射类型；每个动作一条，批量合并并带 `count`；删除空分支（R13）等既有例外不写。
- **Dexie 升级**：只有增删表 / 索引 / 主键才 bump `DB_VERSION`，只前进、不删数据；导出文件 `schemaVersion` 与 `DB_VERSION` 各自独立递增。
- **断点与命名**：mobile 390 / compact 760 / wide 1440，媒体查询内只允许这三个数值；组件 `kebab-case.tsx` + PascalCase，样式同名 `.module.css`，类名 camelCase，不用 `&__`、不 `:global`。

## 禁止事项

- 硬编码色值、颜色函数（`#RGB`、`rgb()`、`hsl()`）：只用 `design/tokens.css` 的变量。
- 硬编码字号、线宽、圆角、间距、动画时长：只用来 `design/design-tokens.json` 生成的令牌。
- 跨层引用（见上）；在 `stores` 里放领域数据或 Dexie 实例。
- 组件里写死中文：界面文案必须 `t('域.元素.语义')`，文案只进 `src/i18n/zh-CN.ts`。
- 引入图标库或 sprite：图标自绘并内联，见 `src/ui/icons/svg-icon.tsx`。
- 擅自给你的表加索引或字段：任何表结构改动先改 `docs/TECH-ARCHITECTURE.md` §5.3。

## 验证命令（提交前必须全绿）

```bash
cd web
npm run lint     # ESLint，零错误零警告
npm test         # Vitest：纯函数/规则 + Dexie 事务
npm run build    # tsc -b + vite build
npm run dev      # 首页 http://localhost:5173/ 返回 200
```

测试分两个项目，按路径自动分流：

- `unit`（`src/**/*.test.ts`，排除 `src/data/`）：纯函数、四计数重算、R1–R19 规则，不加载 IndexedDB。
- `db`（`src/data/**/*.test.ts`）：需要 IndexedDB 的事务用例，仅此项目通过 `src/test/idb-setup.ts` 加载 `fake-indexeddb/auto`。
- 事务用例每个开头 `db.delete()` + `db.open()` 隔离；就地工厂构造行，不建共享 fixture；断言库内实际值，不 mock 仓储。
- 涉及多表写入的规则（如完成待办写提交 + 四计数）必须补同事务与回滚用例。

`npm run lint` 用 Babel parser 做语法级检查（typescript-eslint 暂不支持 TS 7）；
类型与未使用变量由 `tsc -b` 的 strict / noUnusedLocals 负责。

## 提交规范

- Conventional Commits：`feat:`、`fix:`、`docs:`、`chore:`、`refactor:`、`test:`。
- 一次提交只做一件事；骨架与门禁分开提交。
- 提交前由 `lint-staged` 只检查暂存文件（ESLint `--fix` + Prettier）。
- 不 push、不强推、不改写他人提交，除非用户明确要求。

## 视觉改动

`design/` 是视觉真源：画稿由 `design/source/*.mjs` 生成，令牌由 `design/design-tokens.json` 生成 `tokens.css`。
改视觉时先改源文件并重新生成，再改组件；不要手改 `design/tokens.css`，也不要在组件里写死样式值。

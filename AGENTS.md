# AGENTS.md

本仓库的协作约束。改代码前先读这里，以及 `docs/TECH-ARCHITECTURE.md` 的对应小节。

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

根目录另有：`docs/`（架构、页面、PRD）、`design/`（令牌与画稿，只读）、`web/`（应用）。

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
npm test         # Vitest，只测纯逻辑与规则
npm run build    # tsc -b + vite build
npm run dev      # 首页 http://localhost:5173/ 返回 200
```

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

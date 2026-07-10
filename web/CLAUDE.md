# CommitToDo Web · Claude 协作规范

> 本文件是 Claude Code 在 `web/` 子项目内工作的**硬性约束**。完整规范见 `AGENTS.md`，V3 视觉规范见 `docs/v3/STYLE_GUIDE.md`。
> 仓库根目录的 `CLAUDE.md` 描述的是 **Flutter 应用**，与 `web/` 无关，在 `web/` 内以本文件为准。

## 工作目录
当前项目：`D:\idea\Commit\web`（React + TS + Vite + Tailwind）。这是一个独立于根 Flutter 项目的 Web 前端。

## 不可逾越的红线
1. **不得修改落地页**：`src/presentation/screens/landing/**` 及 `landing-theme.css` 是只读的 V3 参考实现。
2. **不得改动其他既有页面**（`home-screen`、`repository-screen`、`graph`、`heatmap`、`search`、`settings` 等）及其样式，除非任务显式要求。
3. **不得在全局入口**（`main.tsx`/`app.tsx`）无条件引入新页面样式。新样式由使用它的页面自行 `import`。
4. 改动必须保持 `npm run lint`、`npx tsc -b`、`npm test` 全绿，且既有页面渲染不变。

## V3 风格系统（新增页面的强制规范）
所有新页面采用 V3 设计语言。见 `docs/v3/STYLE_GUIDE.md`，要点：
- `import '@/core/theme/v3-tokens.css';`
- 用基础组件：`import { V3Button, V3Card, V3Section, V3IconButton, V3NavLink } from '@/presentation/components/v3';`
- 颜色/圆角/动效一律 `var(--v3-*)`，**禁止裸 hex/px**。
- 滚动揭示用 `useInView`（`@/core/hooks/use-in-view`）或 `<V3Section reveal>`。
- 图标统一 `size={16} strokeWidth={1.5} aria-hidden="true"`。
- **不混用** `--v3-*` 与 `--color-*`；**不直接写**落地页私有 `.v3-btn`/`.v3-card` class（用 V3 组件）。
- 改 Token 同步更新 `v3-tokens.css` + `landing-theme.css` + `STYLE_GUIDE.md`。

## 架构纪律
Clean Architecture，目录即分层，只能向下依赖：`presentation → application → domain ← data`，辅以 `core` 与 `platform`。
- 接口在 `domain`，实现在 `data`/`platform`，DI 注册在 `src/core/di/injection-container.ts`。
- `presentation` 不直接依赖 `data` 实现；通过 UseCase/接口。
- 文件 `kebab-case`，类 `PascalCase`，V3 组件加 `V3` 前缀。

## 代码风格
- TS 严格模式，禁 `any`（用 `unknown` 收窄）；路径用 `@/*`；组件显式 `JSX.Element`。
- 组件用 `forwardRef` + `cva` + `cn`（`@/core/utils/formatters`）+ `Slot`（`asChild`）。范本：`src/presentation/components/common/app-button.tsx`、`src/presentation/components/v3/v3-button.tsx`。
- 2 空格、单引号、分号、逗号后空格。

## 测试
- 不允许无测试的业务代码。UseCase/Store/纯函数必测，组件至少一个行为测试。
- 同目录 `*.test.ts(x)`，Vitest（globals 已开）+ @testing-library/react。范本：`v3-button.test.tsx`。

## 提交前必须全绿
```bash
npm run lint && npx tsc -b && npm test
```
不得为通过检查而禁用 lint 规则或测试。提交信息：`<type>(<scope>): <subject>`，如 `feat(v3): 新增 V3Card 组件`。

## 动手前
先读 `AGENTS.md` §1（边界）与 `docs/v3/STYLE_GUIDE.md`。不确定时，选最小、可回退、纯新增的方案，并先说明再执行。

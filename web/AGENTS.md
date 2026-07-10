# CommitToDo Web · 工程化协作规范（AGENTS.md）

> 适用对象：**所有 AI Agent 与人类开发者**在 `web/` 子项目内工作时的统一规范。
> 技术栈：React 18 + TypeScript + Vite + TailwindCSS + Zustand + Dexie + React Router + tsyringe(DI)。
> 配套文档：`docs/v3/STYLE_GUIDE.md`（V3 风格指南）、`docs/ARCHITECTURE.md`（架构总览）。
> 最后更新：2026-07-10

> 注意：仓库根目录的 `CLAUDE.md` / `AGENTS.md` 描述的是 **Flutter 应用**（Dart），与 `web/` 子项目无关。在 `web/` 内工作时以**本文件**为准。

---

## 1. 工作边界与红线（最高优先级）

在动手前，先确认你的改动落在本项目允许的范围内。

### 1.1 不可修改的只读区域
- **落地页**：`src/presentation/screens/landing/**` 及 `src/presentation/screens/landing/landing-theme.css`。它是 V3 设计语言的**参考实现**，只读。需要复用其风格时，引用 Token 与基础组件，**不要改它**。
- **应用壳层页面**：`home-screen`、`repository-screen`、`commits-screen`、`graph`、`heatmap`、`search`、`settings` 等使用应用主题（`--color-*`）的现有页面，**本次不改造、不动**。除非任务显式要求改某一页，否则不要碰。
- **全局入口**：`src/main.tsx`、`src/app.tsx` 的路由结构非必要不改动；尤其不要在全局入口无条件 `import` 新页面的样式。

### 1.2 新增内容必须自包含
- 新页面、新组件、新 Token 文件必须是**纯新增**，不得通过修改既有文件来「顺手」接入。
- v3 样式按需 `import '@/core/theme/v3-tokens.css'`，由使用它的页面自己引入，**不得**塞进全局入口。

### 1.3 不要破坏既有行为
- 任何改动后，必须保证 `npm run lint`、`npx tsc -b`、`npm test` 全绿，且落地页与其他既有页面渲染不变。

---

## 2. V3 风格系统（新页面的强制规范）

**所有新增页面必须采用 V3 设计语言。** 完整规则见 `docs/v3/STYLE_GUIDE.md`，要点：

1. 引入 Token：`import '@/core/theme/v3-tokens.css';`
2. 用基础组件：`import { V3Button, V3Card, V3Section, V3IconButton, V3NavLink } from '@/presentation/components/v3';`
3. 颜色/圆角/动效一律走 `var(--v3-*)`，**禁止裸 hex/px** 字面量散落 JSX。
4. 滚动揭示用 `useInView`（`@/core/hooks/use-in-view`）或 `<V3Section reveal>`。
5. 图标统一 `size={16} strokeWidth={1.5} aria-hidden="true"`。
6. **不得混用** `--v3-*`（V3）与 `--color-*`（应用主题）于同一页面。
7. **不得**直接写落地页私有的 `.v3-btn` / `.v3-card` 等 class-用 V3 基础组件。

调整 Token 数值时，同步更新 `v3-tokens.css` 与 `landing-theme.css` 两处，并更新 `STYLE_GUIDE.md` §3。

---

## 3. 架构与分层

项目遵循 Clean Architecture，目录即分层，**只能向下依赖**：

```
presentation  ─┐
application   ─┼─►  domain  ◄─  data
               │                  ▲
core          ─┘                  │
                    platform ─────┘
```

| 层 | 路径 | 职责 | 可依赖 |
|----|------|------|--------|
| `core` | `src/core/` | 工具、主题、Hook、DI 容器 | 仅自身 |
| `domain` | `src/domain/` | 实体（Entity）、仓库接口（`i-*-repository`）、领域服务 | `core` |
| `data` | `src/data/` | Dexie 实现、Model、DAO、`app-database` | `domain`、`core` |
| `application` | `src/application/` | UseCase（`*-usecase.ts`，单一职责） | `domain`、`core` |
| `presentation` | `src/presentation/` | Screen、Component、Store（Zustand） | `application`、`domain`、`core` |
| `platform` | `src/platform/` | 浏览器特定服务（文件保存、通知） | `core`、`domain` |

### 禁止的依赖
- `presentation` 直接 `import` `data` 的实现（应通过 `domain` 接口 + DI）。
- `domain` 依赖 `data` 或 `presentation`。
- `data` 依赖 `presentation`。

### 依赖注入
- 使用 `tsyringe`。接口定义在 `domain`，实现在 `data`/`platform`，在 `src/core/di/injection-container.ts` 注册。
- Presentation 通过注入的 UseCase/Repository 接口访问数据，**不直接 new** 实现。

---

## 4. 文件与命名规范

| 类型 | 路径 | 命名 |
|------|------|------|
| Screen | `src/presentation/screens/{name}/{name}-screen.tsx` | `{Name}Screen` |
| 组件 | `src/presentation/components/{group}/{name}.tsx` | `{Name}` 或 `{Name}Card` |
| Store | `src/presentation/stores/{name}-store.ts` | `use{Name}Store` |
| UseCase | `src/application/usecases/{group}/{verb}-{noun}-usecase.ts` | `{Verb}{Noun}UseCase` |
| 仓库接口 | `src/domain/repositories/i-{name}-repository.ts` | `I{Name}Repository` |
| 仓库实现 | `src/data/repositories/{tech}-{name}-repository.ts` | `{Tech}{Name}Repository` |
| 实体 | `src/domain/entities/{name}.ts` | `{Name}` |
| Model | `src/data/models/{name}-model.ts` | `{Name}Model` |
| Hook | `src/core/hooks/use-{name}.ts` | `use{Name}` |
| 主题 Token | `src/core/theme/{name}-tokens.{css,ts}` | `--{name}-*` / `{name}Color` |

- 文件名 `kebab-case`，类型/类 `PascalCase`，变量/函数 `camelCase`，常量 `camelCase`（非全大写）。
- V3 基础组件统一 `V3` 前缀，与应用壳层 `App*` 组件区分。

---

## 5. 代码风格

- **TypeScript 严格模式**：`strict`、`noUnusedLocals`、`noUnusedParameters` 开启。不要用 `any`，必要时用 `unknown` + 收窄。
- **路径别名**：用 `@/*`（指向 `src/*`），不要写深层相对路径。
- **返回类型**：组件显式标 `JSX.Element`（与现有代码一致）。
- **Tailwind**：优先用 `tailwind.config.ts` 中定义的语义类与断点（`mobile/tablet/laptop/desktop/desktop-xl`）。V3 颜色用任意值 `text-[var(--v3-*)]`。
- **组合优于继承**：组件用 props 组合，用 `cva` 表达变体，用 `cn()`（`@/core/utils/formatters`）合并 class，用 `Slot`（`asChild`）支持多态渲染。参考 `src/presentation/components/common/app-button.tsx`。
- **2 空格缩进**，单引号，行尾分号，运算符/逗号后加空格。

---

## 6. 测试要求

- **不允许提交没有测试的业务逻辑代码**（与根项目规范一致）。
- UseCase、Store、纯函数必须有单元测试；组件至少一个行为测试。
- 测试与被测文件**同目录**，命名 `*.test.ts(x)`。范本：`v3-button.test.tsx`、`application/usecases/repository/repository-usecases.test.ts`。
- 用 Vitest（globals 已开，无需 import `describe/it/expect`）+ @testing-library/react + jsdom。测试设置见 `src/test/setup.ts`。
- 测试用 AAA 模式（Arrange/Act/Assert），一个 `it` 只测一个行为。

---

## 7. 质量门禁（提交前必须全绿）

```bash
npm run lint        # ESLint，0 error（warning 需评估）
npx tsc -b          # TypeScript 类型检查
npm test            # Vitest 全量
npm run build       # 生产构建（tsc -b && vite build）
```

- 新增/改动文件后，**先本地跑完上述命令**再交付。
- 不得为通过检查而注释掉/禁用 lint 规则或测试。

---

## 8. 提交规范

```
<type>(<scope>): <subject>

<body>
```
- `type`：`feat` / `fix` / `docs` / `style` / `refactor` / `perf` / `test` / `chore`。
- `scope`：受影响的模块，如 `landing`、`v3`、`task`、`repo`、`graph`。
- 示例：`feat(v3): 新增 V3Card 基础组件与顶边色 accent`。

---

## 9. 常见任务速查

| 任务 | 怎么做 |
|------|--------|
| 新增一个页面 | 用 V3 风格系统（§2），在 `app.tsx` 加路由，页面 `import` `v3-tokens.css` |
| 新增基础组件 | 放 `src/presentation/components/v3/`，`V3` 前缀，`forwardRef`+`cva`+`cn`，附测试，在 `index.ts` 导出 |
| 新增 UseCase | `src/application/usecases/`，单一职责，注入仓库接口，附测试 |
| 调整 V3 Token | 同步改 `v3-tokens.css` 与 `landing-theme.css`，更新 `STYLE_GUIDE.md` |
| 修 bug | 优先加复现测试再修；不要顺手重构无关代码 |

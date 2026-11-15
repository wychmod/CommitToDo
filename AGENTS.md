# Commit 工程规范

**版本**: 2.4.0
**更新日期**: 2026-11-15
**适用范围**: 本仓库全部代码与文档

---

## 0. 文档层级

本文件是仓库级规范，适用于全部目录。子项目可在自己的规范中补充细则，但不得与本文件冲突。

| 文档 | 作用域 | 内容 |
|---|---|---|
| `AGENTS.md`（本文件） | 全仓库 | 分层、命名、代码风格、测试、门禁、提交 |
| `web/AGENTS.md` | `web/` | V3 风格系统、只读区域、Web 专属约定 |
| `docs/FRAMEWORK.md` | 全仓库 | **产品框架**：三层结构、7 个对象、信息架构、65 项功能域、徽章体系、版本切分（v0.1 评审中） |
| `docs/PRODUCT-STRATEGY.md` | 全仓库 | 产品定位、命名、主用户、两条硬约束、原则与风险 |
| `docs/ARCHITECTURE.md` | 全仓库 | 现状架构、目标模型约束、数据模型、已知缺口 |
| `docs/DESIGN.md` | 全仓库 | 设计令牌与组件规范（平台无关） |
| `docs/archive/` | 全仓库 | 已失效的历史文档（只读，见其 `README.md` 索引） |

> **读取顺序**：改产品行为前先读 `docs/FRAMEWORK.md`（对象与功能）+ `docs/PRODUCT-STRATEGY.md`（为什么这样做）；改代码前读 `docs/ARCHITECTURE.md`；动界面前读 `docs/DESIGN.md`。
> **单一出处**：对象、页面、功能编号、版本切分只在 `docs/FRAMEWORK.md` 定义，其他文档引用而不复述。
> **历史文档**：已失效的旧方案（2026-07 的旧视觉与登录方案、2026-11 的旧 PRD / ROADMAP）全部移入 `docs/archive/`，**不得据此实现任何功能**。索引与失效原因见 `docs/archive/README.md`。

---

## 1. 核心原则

1. **可读性 > 简洁性**：代码首先是给人看的。
2. **一致性 > 个人偏好**：跟随既有写法，不引入个人风格。
3. **显式 > 隐式**：明确的类型与显式返回优于推断与魔法。
4. **最小改动**：只改需求相关文件，不顺手重构无关代码。
5. **契约先行**：跨端共享的数据模型、设计令牌、同步协议，先定文档再写实现。

---

## 2. 仓库现状

```
Commit/
├── web/                  # 唯一已实现的客户端（React SPA）
│   ├── src/              #   前端源码（六层架构）
│   ├── cloudfunctions/   #   认证后端云函数
│   ├── cloudbase/        #   PostgreSQL 迁移
│   └── docs/             #   Web 专属文档
├── docs/                 #   仓库级文档
└── CLAUDE.md             #   规范入口指引
```

**已确定方向**：以 TypeScript 技术栈承载多端，Web 优先。
**尚未确定**：其余端（桌面 / 小程序 / App）的 UI 框架与实现顺序、云数据库形态、同步协议细节。

涉及上述未定事项时，按「接口先行」处理：先在 `domain` 定义接口与契约，实现留待决策后补充，**不得在未确认时自造方案**。

---

## 3. 架构与分层

严格 Clean Architecture，目录即分层，依赖只能向下：

```
            presentation  ─┐
            application   ─┼──►  domain  ◄──  data
            core          ─┘                  ▲
                                  platform ──┘
```

| 层 | 路径（以 `web/src/` 为例） | 职责 | 可依赖 |
|---|---|---|---|
| `core` | `src/core/` | 工具、主题令牌、Hook、DI 容器、扩展 | 仅自身 |
| `domain` | `src/domain/` | 实体、Repository 接口、领域服务 | `core` |
| `application` | `src/application/` | UseCase，单一职责 | `domain`、`core` |
| `data` | `src/data/` | 持久化实现、Model、数据库 schema | `domain`、`core` |
| `platform` | `src/platform/` | 宿主平台能力（文件保存、通知） | `domain`、`core` |
| `presentation` | `src/presentation/` | Screen、组件、状态 Store | `application`、`domain`、`core` |

### 禁止的依赖

```ts
// 错误：presentation 直接依赖 data 实现
import { DexieTaskRepository } from '@/data/repositories/dexie-task-repository';

// 错误：domain 依赖 data 或 presentation
import { AppDatabase } from '@/data/db/app-database';

// 错误：data 依赖 presentation
import { useTaskStore } from '@/presentation/stores/task-store';
```

> 唯一例外：测试文件可以 `import` 真实实现，用于搭建集成式断言。

### 依赖注入

- 接口定义在 `domain`，实现在 `data` / `platform`，统一在 `src/core/di/injection-container.ts` 注册。
- 表现层通过容器解析 UseCase 或 Repository，**不直接 new 实现**。

### UseCase 约定

```ts
// 正确：一个类只做一件事，构造注入接口
export class CreateTaskUseCase {
  constructor(private readonly tasks: ITaskRepository) {}

  execute(input: CreateTaskInput): Promise<Task> {
    // 校验 + 组装实体 + 落库
  }
}
```

一个 UseCase 内含 create / update / delete 多个方法即为设计错误，应拆分。

---

## 4. 命名规范

| 类型 | 路径 | 命名 |
|---|---|---|
| Screen | `presentation/screens/{name}/{name}-screen.tsx` | `{Name}Screen` |
| 组件 | `presentation/components/{group}/{name}.tsx` | `{Name}` / `{Name}Card` |
| Store | `presentation/stores/{name}-store.ts` | `use{Name}Store` |
| UseCase | `application/usecases/{group}/{verb}-{noun}-usecase.ts` | `{Verb}{Noun}UseCase` |
| 仓库接口 | `domain/repositories/i-{name}-repository.ts` | `I{Name}Repository` |
| 仓库实现 | `data/repositories/{tech}-{name}-repository.ts` | `{Tech}{Name}Repository` |
| 实体 | `domain/entities/{name}.ts` | `{Name}` |
| Model | `data/models/{name}-model.ts` | `{Name}Model` |
| Hook | `core/hooks/use-{name}.ts` | `use{Name}` |
| 主题令牌 | `core/theme/{name}-tokens.{css,ts}` | `--{name}-*` |

- 文件名 `kebab-case`；类型与组件 `PascalCase`；变量与函数 `camelCase`；常量 `camelCase`（不使用全大写）。
- 枚举成员 `camelCase`，并提供 `fromValue` 解析方法。
- 基础组件统一前缀（如 `V3`），与应用壳层组件（`App*`）区分。

---

## 5. 代码风格

### TypeScript

- `strict` 全开，包含 `noUnusedLocals`、`noUnusedParameters`。
- 不使用 `any`；确实无法确定时用 `unknown` 并显式收窄。
- 组件显式标注返回类型 `JSX.Element`。
- 路径别名 `@/*` 指向 `src/*`，禁止深层相对路径（`../../..`）。
- 导出优先具名导出；仅路由入口使用默认导出。

```
2 空格缩进 · 单引号 · 行尾分号 · 运算符与逗号后加空格 · 单行不超过 100 字符
```

### React

- 函数组件 + Hook，禁止 class 组件。
- 组合优于继承：用 props 组合、`cva` 表达变体、`cn()` 合并 className、`asChild` 支持多态渲染。
- 不写内联 `style`，颜色 / 间距 / 圆角一律走设计令牌。
- 交互控件用原生 `button` / `a` 并补齐 `aria-*`，不用 `div + onClick` 模拟。

### 状态管理

- Zustand，每屏一个 Store，命名 `use{Name}Store`。
- Store 内只放该屏状态与动作；跨屏共享状态放独立 Store，不做全局大对象。
- 组件按需订阅（选择器），避免整店订阅导致无关重渲染。

---

## 6. 测试

- **不允许提交没有测试的业务逻辑代码**。
- UseCase、Store、纯函数必须有单元测试；组件至少有行为测试（渲染 + 一次交互）。
- 测试与被测文件同目录，命名 `*.test.ts(x)`。
- 技术栈：Vitest + Testing Library + jsdom；断言遵循 AAA（Arrange / Act / Assert），一个 `it` 只测一个行为。
- 带断点判断的组件，测试必须覆盖移动与桌面两个尺寸分支。

覆盖率目标：核心业务逻辑 > 80%，UI 组件 > 50%。

---

## 7. 质量门禁

提交前必须在对应目录跑完全部命令且全绿：

```bash
cd web
npm run lint        # ESLint，0 error
npx tsc -b          # 类型检查
npm test            # Vitest 全量
npm run build       # 生产构建
```

- 不得为通过检查而注释掉 lint 规则、跳过测试或放宽 `tsc` 配置。
- 修复循环超过 3 轮仍失败时，停止并记录「待人工确认项」，不要靠删除断言过关。

---

## 8. 提交规范

```
<type>(<scope>): <subject>

<body>
```

- `type`：`feat` / `fix` / `docs` / `style` / `refactor` / `perf` / `test` / `chore`。
- `scope`：受影响模块，如 `task`、`repository`、`graph`、`auth`、`docs`。
- 破坏性变更在 `type` 后加 `!`，并在 body 说明迁移方式。
- 一次提交只做一件事；重构与功能改动不混在同一次提交。

---

## 9. 多端扩展的预留约束

以下规则在任何新端接入时都成立，先立规矩再写代码：

1. **平台能力收口**：宿主能力（窗口、托盘、通知、文件、剪贴板）在 `domain` 定义接口，各端在 `platform` 提供实现，UI 只依赖接口。
2. **禁止平台判断散落**：`if (isDesktop)` 之类的判断只允许出现在装配层（DI 注册或布局根组件），不得散布到业务组件。
3. **契约先于实现**：跨端共享的实体字段、枚举值、导出格式、同步事件结构，先写入 `docs/ARCHITECTURE.md`，再由各端实现。
4. **同一语义只有一种定义**：同名派生属性（如「任务是否完成」）在全部端必须同义，不允许各端自行解释。
5. **新增端先跑通只读链路**：先实现「列出仓库 → 展开分支 → 查看任务」，再接写操作，避免一次性接入全部能力。

---

## 10. 文档维护

- 架构变更同步更新 `docs/ARCHITECTURE.md`；设计令牌与组件变更同步更新 `docs/DESIGN.md`。
- 对象、页面、功能编号、徽章、版本切分只在 `docs/FRAMEWORK.md` 增删改；定位与用户变化更新 `docs/PRODUCT-STRATEGY.md`。
- 规范变更在本文件「修订记录」留痕，不静默修改。

### 修订记录

| 版本 | 日期 | 变更 |
|---|---|---|
| 2.4.0 | 2026-11-15 | `docs/PRD.md` 与 `docs/ROADMAP.md` 移入归档，§0 增补 `docs/FRAMEWORK.md` 为产品唯一出处并加「单一出处」规则；§10 维护责任同步调整 |
|---|---|---|
| 2.3.0 | 2026-11-13 | 历史文档整体迁入 `docs/archive/` 并在 §0 登记；`web/docs/` 只保留现行文档 |
| 2.2.0 | 2026-11-13 | §0 增加读取顺序与「历史文档」红线：`web/docs/` 下 2026-07 的旧方案不得作为实现依据 |
| 2.1.0 | 2026-11-13 | 补充产品定位与路线图文档入口；明确产品文档维护责任 |
| 2.0.0 | 2026-11-11 | 重写为 TypeScript 工程规范；补充多端预留约束 |
| 1.0.0 | 2026-05-28 | 初版 |

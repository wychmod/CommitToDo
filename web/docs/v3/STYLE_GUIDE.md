# CommitToDo Web · V3 工程化风格指南

> 文档类型：**新页面开发合同** / Engineering Style Guide
> 适用范围：`web/` 项目中所有「新增页面」的前端开发
> 参考实现：`src/presentation/screens/landing/`（落地页，v3 设计语言的唯一权威实例）
> 维护者：前端 / AI Agent
> 最后更新：2026-07-10

---

## 0. 这份文档是什么

落地页（Landing Page）已经形成了一套完整、自洽的视觉语言——**v3 设计语言**：纯黑画布、绿色主色、克制的描边、轻量浮起动效、滚动揭示节奏。本指南把这套语言从「落地页里的实现」**工程化**为一套可被任何新页面直接复用的标准：

- 一份**共享 Token 源**（`src/core/theme/v3-tokens.css` + `v3-tokens.ts`）
- 一组**基础组件**（`src/presentation/components/v3/`）
- 一套**布局、动效、可访问性、命名**的硬性约束

> ⚠️ **优先级合同**：与 `docs/v3/v3版首页.md` 一致——
> 1. 落地页的实际渲染结果（截图）是视觉基准；
> 2. 本指南的 Token 与组件 API 次之；
> 3. `v3-tokens.css` 的具体数值再次之；
> 4. **不得**把应用壳层（`app-theme.ts` 的 `--color-*` 体系）当作 v3 页面的视觉依据。

---

## 1. 适用范围与核心约束

### 1.1 谁必须遵守
- **所有新增页面**（路由级 Screen、新增独立模块）。
- 对现有**应用壳层页面**（工作台、仓库、图谱、热力图、设置等使用 `--color-*` 的页面）**不做强制改造**——它们继续使用应用主题，本指南不要求、也不允许在本次工作中改动它们。

### 1.2 三条不可逾越的红线
1. **不得修改落地页**：`src/presentation/screens/landing/**` 及其 `landing-theme.css` 是只读的参考实现。新页面通过「复用 Token 与组件」来对齐风格，而不是去改落地页。
2. **不得污染其他页面**：新页面的样式必须自包含，不得把 v3 的 class/token 注入到应用壳层或落地页的 DOM 中。Token 文件按需 `import`，不要在全局入口（`main.tsx` / `app.tsx`）中无条件引入。
3. **不得硬编码 hex**：任何颜色、圆角、动效时长都必须走 `var(--v3-*)` Token 或 v3 组件，禁止出现 `#80e48c`、`12px` 这类字面量散落在 JSX 里（Token 文件本身除外）。

### 1.3 v3 体系与应用主题的区别
| 维度 | v3 设计语言（本指南） | 应用主题（`app-theme.ts`） |
|------|----------------------|---------------------------|
| Token 命名 | `--v3-*` | `--color-*` |
| 适用 | 新增页面、落地页 | 应用壳层（工作台等） |
| 画布 | 纯黑 `#000000` | 深青 `#061313` |
| 主色 | 亮绿 `#80e48c` | 青 `#16C7C7` |
| 入口 | `import '@/core/theme/v3-tokens.css'` | `ThemeProvider` 自动注入 |

两套体系**并存且互不干扰**。一个页面要么是 v3，要么是应用主题，不要混用。

---

## 2. 快速开始：新建一个 v3 页面

最小骨架（以一个「关于」页为例）：

```tsx
// src/presentation/screens/about-screen.tsx
import '@/core/theme/v3-tokens.css'; // ① 引入 Token（每个 v3 页面引入一次）

import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import {
  V3Button,
  V3Card,
  V3Section,
} from '@/presentation/components/v3'; // ② 使用基础组件

export function AboutScreen(): JSX.Element {
  return (
    <div className="min-h-screen bg-[var(--v3-bg)] font-sans text-[var(--v3-text)]">
      <V3Section reveal aria-label="关于 CommitToDo">
        <h1 className="text-[40px] font-bold leading-[1.05] text-[var(--v3-text-strong)] desktop:text-[56px]">
          关于
        </h1>
        <p className="mt-3 max-w-[560px] text-[17px] leading-[1.55] text-[var(--v3-text-secondary)]">
          用仓库组织目标，用分支推进任务，每次完成都有记录。
        </p>

        <div className="mt-10 grid gap-3.5 desktop:grid-cols-3">
          <V3Card accent="primary" className="p-[22px]">
            <h3 className="text-[18px] font-semibold text-[var(--v3-text-strong)]">目标有仓库</h3>
            <p className="mt-2 text-[12px] text-[var(--v3-text-secondary)]">保持清晰边界。</p>
          </V3Card>
          {/* 更多卡片 */}
        </div>

        <div className="mt-10">
          <V3Button asChild>
            <Link to="/workspace">
              <span>进入工作台</span>
              <ArrowRight size={16} strokeWidth={1.5} aria-hidden="true" />
            </Link>
          </V3Button>
        </div>
      </V3Section>
    </div>
  );
}
```

三步：**① 引入 Token → ② 用基础组件 → ③ 文案/布局用 `var(--v3-*)` + Tailwind 任意值**。

---

## 3. 设计 Token 目录

> 数值与 `v3-tokens.css` / `landing-theme.css` 完全一致。Token 文件是唯一数值源。

### 3.1 颜色
| Token | 值 | 用途 |
|-------|----|------|
| `--v3-bg` | `#000000` | 页面画布 |
| `--v3-bg-near` | `#010101` | 近黑背景 |
| `--v3-panel` | `#121313` | 面板/工作台预览底 |
| `--v3-card` | `#0c0f0d` | 卡片底 |
| `--v3-card-hover` | `#101510` | 卡片 hover 底 |
| `--v3-control` | `#141716` | 控件/按钮 hover 底 |
| `--v3-selected` | `#202522` | 选中态 |
| `--v3-primary` | `#80e48c` | 品牌主色（绿） |
| `--v3-primary-dim` | `#74c67e` | 主色渐变起点 |
| `--v3-primary-hover` | `#8bed98` | 主色 hover |
| `--v3-primary-active` | `#6fc979` | 主色 active |
| `--v3-primary-soft` | `#17261a` | 主色柔和底 |
| `--v3-launch` | `#59cbd0` | 次品牌色（青） |
| `--v3-design` | `#6e95ff` | 第三色（蓝） |
| `--v3-text-strong` | `#f5f5f2` | 标题/强调文本 |
| `--v3-text` | `#d9ddda` | 正文 |
| `--v3-text-secondary` | `#aeb4af` | 次要文本 |
| `--v3-text-muted` | `#838984` | 弱化文本 |
| `--v3-text-faint` | `#686e69` | 极弱文本 |
| `--v3-text-on-primary` | `#061008` | 主色上的文本 |
| `--v3-border` | `#30332f` | 标准描边 |
| `--v3-border-soft` | `#1c211e` | 弱描边 |
| `--v3-divider` | `#181c19` | 分隔线 |
| `--v3-success` / `--v3-warning` / `--v3-danger` / `--v3-info` | `#80e48c` / `#e3a33c` / `#e6635b` / `#68a1ff` | 语义色 |

**文本层级用法**：标题用 `--v3-text-strong`；正文用 `--v3-text`；辅助说明用 `--v3-text-secondary`；时间戳/元信息用 `--v3-text-muted`。不要越级。

### 3.2 字体与字号
- 字族：`--v3-font-sans`（Segoe UI → 微软雅黑 → 苹方 → Noto）、`--v3-font-mono`（JetBrains Mono → Cascadia → …）。
- 推荐字号档（与落地页一致）：
  - Hero 标题：`text-[40px] desktop:text-[56px]`，`leading-[1.05]`，`font-bold`
  - 副标题：`text-[30px] desktop:text-[40px]`，`leading-[1.2]`，`font-bold`
  - 描述：`text-[17px]`，`leading-[1.55]`
  - 卡片标题：`text-[18px]`，`leading-[1.35]`，`font-semibold`
  - 卡片描述：`text-[12px]`，`leading-[1.55]`
  - 按钮：`text-[14px]`，`font-semibold`
- 强调词用 `text-[var(--v3-primary)]` 着色（见落地页「提交」二字）。

### 3.3 间距 / 圆角 / 动效
| 类别 | Token | 值 |
|------|-------|----|
| 圆角 | `--v3-radius-sm/md/lg/xl/full` | `4 / 6 / 8 / 12 / 999px` |
| 动效时长 | `--v3-fast/standard/emphasis/hero-enter` | `120 / 200 / 360 / 700ms` |
| 缓动 | `--v3-ease / --v3-ease-enter / --v3-ease-exit` | `cubic-bezier(0.2,0,0,1)` / `(0,0,0.2,1)` / `(0.4,0,1,1)` |
| 内容宽 | `--v3-content` | `1328px` |
| 阴影 | `--v3-shadow-panel` | `0 24px 80px rgb(0 0 0 / 38%)` |
| 主色辉光 | `--v3-glow-primary` | `0 0 24px rgb(128 228 140 / 24%)` |
| 焦点环 | `--v3-focus-ring` | `0 0 0 2px #000, 0 0 0 4px rgb(145 237 156 / 75%)` |

内容区最大宽度统一 `1328px`（`V3Section` 已内置），Hero 可放宽到 `1576px`。

---

## 4. 基础组件目录

> 位置：`src/presentation/components/v3/`。全部为**新增、自包含**文件，不依赖 `landing-theme.css`，仅消费 `var(--v3-*)`。导入：`import { ... } from '@/presentation/components/v3'`。

### 4.1 `V3Button`
按钮，支持 `asChild`（用于路由 `<Link>`）。
```tsx
<V3Button variant="primary">进入工作台</V3Button>
<V3Button variant="secondary">查看任务流</V3Button>
<V3Button variant="ghost">取消</V3Button>
<V3Button size="sm">小按钮</V3Button>

<V3Button asChild>
  <Link to="/workspace">跳转</Link>
</V3Button>
```
- `variant`: `primary`（渐变绿，hover 上浮+辉光）/ `secondary`（半透黑底+描边）/ `ghost`（无底，hover 浮灰）。默认 `primary`。
- `size`: `default`(37px) / `sm`(32px) / `lg`(44px)。
- primary 的渐变、hover 辉光、active 实底与落地页 `.v3-btn-primary` 1:1 对齐。

### 4.2 `V3IconButton`
图标按钮（40×40，hover 浮灰）。
```tsx
<V3IconButton aria-label="设置">
  <Settings size={16} strokeWidth={1.5} aria-hidden="true" />
</V3IconButton>
```
- **必须**传 `aria-label`（图标按钮无可见文本）。

### 4.3 `V3Card`
卡片容器，hover 上浮 2px + 描边变暖。可选 `accent` 顶边色。
```tsx
<V3Card accent="primary" className="flex h-[158px] flex-col p-[22px]">…</V3Card>
<V3Card asChild><article className="p-[22px]">…</article></V3Card>
```
- `accent`: `primary` / `launch` / `design` / 不传。顶部描边 1.5px。
- 用 `asChild` 渲染语义化 `<article>` / `<li>`。

### 4.4 `V3Section`
页面分区外壳：全宽 `<section>` + 垂直节奏 `py-20` + 居中 `1328px` 内容列 + 可选滚动揭示。
```tsx
<V3Section reveal aria-label="功能特性">
  <h2>…</h2>
</V3Section>
```
- `contained`(默认 true)：是否渲染居中内容列。
- `padded`(默认 true)：是否 `py-20`。
- `reveal`(默认 false)：进入视口时淡入上浮（520ms / 18px，对齐 `.v3-reveal`）。
- `revealThreshold`(默认 0.25)：揭示触发可见度。

### 4.5 `V3NavLink`
导航链接（40px 高，hover 浮灰）。用 `asChild` 渲染路由 `<Link>`。
```tsx
<V3NavLink asChild><Link to="/about">关于</Link></V3NavLink>
<V3NavLink href="/docs">文档</V3NavLink>
```

### 4.6 何时「不」用组件
当落地页里某结构（如 Hero 流程可视化、工作台五列预览）是高度定制的，不必强行抽象成组件——直接用 `var(--v3-*)` + Tailwind 任意值实现即可。组件只覆盖**通用、重复**的元素（按钮、卡片、分区、导航）。

---

## 5. 布局与节奏

- **内容列**：`max-width: 1328px`，水平内边距 `px-5 desktop:px-0`（移动留白，桌面贴边）。
- **分区节奏**：`<V3Section padded>` 默认 `py-20`（上下 80px）。分区之间用 `border-y border-[var(--v3-divider)]` 分隔（见落地页 Value 区）。
- **响应式断点**（`tailwind.config.ts`）：`mobile 0` / `tablet 768` / `laptop 1024` / `desktop 1280` / `desktop-xl 1440`。默认写移动优先，再用 `tablet:` / `desktop:` 增强。
- **网格**：价值卡片用 `flex-wrap` + `calc((100% - 42px) / 4)` 四列、`min-width: 280px`（见 `landing-theme.css` 的 `.v3-value-grid`）。新页面如法炮制或用 `grid gap-3.5 desktop:grid-cols-4`。

---

## 6. 动效与滚动揭示

两套动效，**用途不同，不要混用**：

1. **入场动效（enter）**——页面首屏元素依次淡入上浮，带递增 `animation-delay`。仅用于页面顶部的 Hero/首屏。落地页用 `.v3-enter` + `.v3-enter-delay-N` + `data-animated` 控制（首屏 1.6s 后定格）。新页面首屏可复用此模式：先 `opacity-0`，挂载后切到 `opacity-100` 并给子元素阶梯 `transition-delay`。
2. **滚动揭示（reveal）**——滚动进入视口时淡入上浮，**一次性**。用于首屏之外的分区。新页面用 `useInView`：
   ```tsx
   import { useInView } from '@/core/hooks/use-in-view';
   const { ref, isInView } = useInView(0.25);
   <section ref={ref} className={cn('transition', isInView && 'opacity-100')}>…</section>
   ```
   或直接用 `<V3Section reveal>`。

**减弱动效**：所有动效必须尊重 `prefers-reduced-motion`。`useInView` 在无 `IntersectionObserver` 的环境会直接显示。若新页面写了 `@keyframes`，必须配套：
```css
@media (prefers-reduced-motion: reduce) {
  /* 把 animation/transition 时长压到 1ms，禁用无限循环 */
}
```

---

## 7. 可访问性

- **焦点环**：所有可交互元素用 `--v3-focus-ring`（v3 组件已内置 `focus-visible`）。不要写 `outline: none` 而不留替代。
- **图标**：`lucide-react` 一律 `aria-hidden="true"`；纯图标按钮必须有 `aria-label`。
- **语义化**：分区用 `<section aria-label="…">`，卡片用 `<article>`，导航用 `<nav>`。
- **对比度**：正文用 `--v3-text`/`--v3-text-secondary`（对纯黑底对比足够）；`--v3-text-faint` 仅用于装饰性元信息。
- **减弱动效**：见 §6。

---

## 8. 图标规范

- 库：`lucide-react`（已在依赖中）。
- 统一参数：`size={16} strokeWidth={1.5} aria-hidden="true"`（与落地页一致）。大图标场景可 `size={20}`，但 `strokeWidth` 保持 `1.5`。
- 颜色用 `text-[var(--v3-primary)]` / `text-[var(--v3-text-secondary)]` 等，不要传 `color` prop。

---

## 9. 文件与命名规范

| 类型 | 路径 | 命名 |
|------|------|------|
| v3 Token（CSS） | `src/core/theme/v3-tokens.css` | `--v3-*` |
| v3 Token（TS） | `src/core/theme/v3-tokens.ts` | `v3Color` / `v3Radius` / `v3Motion` / `v3Shadow` |
| 揭示 Hook | `src/core/hooks/use-in-view.ts` | `useInView` |
| 基础组件 | `src/presentation/components/v3/v3-*.tsx` | `V3Button` / `V3Card` / … |
| 新页面 Screen | `src/presentation/screens/{name}/{name}-screen.tsx` | `{Name}Screen` |
| 组件测试 | 与组件同目录 `*.test.tsx` | — |

- v3 组件**统一加 `V3` 前缀**，与应用壳层的 `App*` 组件（`AppButton` 等）区分。
- 新页面遵循 `kebab-case` 文件名 + `PascalCase` 组件名，与现有 `home-screen.tsx` / `HomeScreen` 一致。
- 每个新组件**必须附带测试**（见 `v3-button.test.tsx` 为范本），与项目「不允许无测试的业务代码」一致。

---

## 10. 推荐 / 禁止

✅ **推荐**
- 用 `V3Section`/`V3Card`/`V3Button` 组合而非重写样式。
- 颜色一律 `var(--v3-*)`；布局用 Tailwind 任意值（`text-[17px]`、`p-[22px]`）。
- 首屏之外的分区分区加 `reveal`。
- 图标 `size={16} strokeWidth={1.5} aria-hidden`。

❌ **禁止**
- 修改 `landing/**` 或 `landing-theme.css`。
- 把 v3 样式泄漏进应用壳层页面。
- 在 JSX 里写 `#80e48c`、`rgb(...)`、裸 `12px` 等字面量。
- 混用 `--v3-*` 与 `--color-*` 于同一页面。
- 引入新的按钮/卡片组件库（用 v3 基础组件）。
- 写无限循环动效而不处理 `prefers-reduced-motion`。

---

## 11. 与 `landing-theme.css` 的同步契约

`v3-tokens.css` 是落地页 `landing-theme.css` 中 `--v3-*` 数值的**镜像副本**，目的是让新页面自包含、不依赖落地页 CSS 被加载。两者当前数值完全一致。

- **改 Token 时，两处都要改**：若调整某个 `--v3-*`，必须同步更新 `v3-tokens.css` 与 `landing-theme.css`，并更新本指南 §3 的表格。
- **组件 class 不复用**：落地页的 `.v3-btn` / `.v3-card` 等 class 属于落地页私有，新页面**不要**直接写这些 class——用 v3 基础组件（它们用 Tailwind 任意值 + Token 自包含地复刻了同一视觉）。
- **未来统一**：可在一次专门的重构里让落地页改 import `v3-tokens.css`，从而消除两份副本——但那需要单独评估对落地页的影响，**不在本次工程化范围内**。

---

## 12. 参考实现

新页面拿不准时，对照落地页对应模块：

| 需求 | 参考文件 |
|------|---------|
| Hero 首屏 + 文案层级 | `landing/components/hero/hero-copy.tsx` |
| 主/次按钮 CTA | `landing/components/hero/hero-actions.tsx` |
| 分区 + 滚动揭示 | `landing/components/value/value-section.tsx` |
| 卡片（顶边色 + 入场上浮） | `landing/components/value/value-card.tsx` |
| 工作台预览（多列定制） | `landing/components/workbench/workbench-preview.tsx` |
| 导航链接 | `landing/components/landing-nav-link.tsx` |
| 滚动揭示 Hook（原版） | `landing/hooks/use-landing-in-view.ts`（新页面改用 `useInView`） |
| Token 原版 | `landing/landing-theme.css` |

落地页是「这些规则长什么样」的活样本；本指南是「为什么这样、新页面该怎么抄」的工程合同。

## 设计基准 - CommitToDo 首页与深浅色工作台

> 来源截图：9 张（暗色 4 张、浅色 5 张） | 提取时间：2026-07-08 | 提取者：DS-Extractor  
> 适用范围：营销首页、今日工作台、仓库概览、任务、洞察、设置等桌面端页面  
> 精度说明：颜色由截图像素聚类与人工取样交叉估算；字体、动效和响应式行为需结合源 CSS 或录屏复核。
> 浅色提取边界：仅分析白色主内容、顶栏、右侧详情栏和白色卡片；左侧黑色侧边栏排除在浅色模式总结之外。

### 0. 多截图交叉结论

#### 一致性元素

| 元素 | 跨页面共同表现 | 落地约束 |
| --- | --- | --- |
| 页面基底 | 近黑，略带冷绿，非纯灰 | 工作台用 `#070B0A`；营销首页可降至 `#000000` |
| 容器 | 比页面亮 1-2 级，主要靠边框分层 | 不使用大面积浮夸阴影或玻璃模糊 |
| 品牌色 | 高明度黄绿/薄荷绿 | 主 CTA、选中态、成功状态、关键数字 |
| 边框 | 1px 低对比冷灰绿 | 默认 `#29302D`，活跃时转为绿色 |
| 排版 | 中文无衬线 + 英文无衬线；哈希等使用等宽 | 大标题粗重，数据与命令轻量等宽 |
| 图标 | 线性、圆角端点、约 1.5px 笔画 | 默认 16/20px，导航常用 20px |
| 导航 | 固定高度顶栏 + 左侧栏；选中项有底色和绿色标识 | 顶栏约 64-70px；侧栏约 240-255px |
| 数据可视化 | 深色网格、绿为主、青/蓝为分支辅助色 | 颜色与线型/节点形状共同编码 |
| 圆角 | 克制，控件 6-8px、容器 8px | 不使用大胶囊卡片或超大圆角面板 |

#### 页面特异性元素

| 页面/截图 | 特异元素 | 与全局系统的关系 |
| --- | --- | --- |
| 营销首页 | 粒子分支主视觉、TODO 到 COMMIT 路径、整页产品工作台预览、四列卖点 | 使用更鲜的薄荷绿 `#80E48C`，背景可为纯黑 |
| 仓库概览 | 三个分支任务组、提交时间线、12 月热力图 | 最完整的工作台首页模板；适合作为默认应用首页 |
| 洞察 | 大型 LIFE GRAPH、时间轴、缩放控件、提交详情侧栏 | 引入青 `#4CCAD4`、蓝 `#718CFF` 和灰白分支线 |
| 设置 | 主题分段控件、强调色圆点、开关、数据导入导出、本地优先说明栏 | 展示表单、危险操作和 PWA CTA 的标准状态 |

### 1. 设计印象

- **风格定位**：暗色极简、开发者工具、轻量赛博感、扁平界面。
- **气质关键词**：克制、可信、可追溯、本地优先、结构化。
- **品牌主调**：专业与科技为主，荧光绿提供活力，但不做霓虹泛光滥用。
- **信息密度**：营销首页中等；应用工作台中高。
- **核心隐喻**：仓库承载目标、分支承载任务、提交代表完成、图谱呈现演进。
- **视觉优先级**：大标题/当前任务 > 绿色状态与 CTA > 正文 > 元数据与边框。

### 2. 设计 Token（可直接复制）

主题内容索引：

- **深色模式**：见 2.1 深色模式 CSS 变量、2.2 深色模式 Tailwind。
- **浅色模式**：见 2.5 浅色模式增补，其中包含 CSS、Tailwind 与组件覆盖。
- **两种主题共享**：见 2.3 排版语义、2.4 栅格与节奏，以及第 3-8 节组件和交互规范。
- **混合主题边界**：浅色页面的左侧黑色侧边栏仍使用深色 token，不属于浅色内容区。

#### 2.1 深色模式 CSS 变量

以下 `:root` / `[data-theme='dark']` 是营销首页和暗色工作台的完整
深色基础，不会被 2.5 的浅色内容替代。

```css
:root,
[data-theme='dark'] {
  color-scheme: dark;

  /* Brand: screenshot-derived reference values */
  --color-primary: #92d970;
  --color-primary-hover: #a0e47c;
  --color-primary-active: #7fc45f;
  --color-primary-soft: #172216;
  --color-primary-border: #38552e;
  --color-homepage-accent: #80e48c;
  --color-secondary-cyan: #4ccad4;
  --color-accent-blue: #718cff;

  /* Semantic */
  --color-success: #92d970;
  --color-warning: #f2ad45;
  --color-danger: #f0645a;
  --color-info: #5c9cff;

  /* Dark neutral surfaces */
  --color-bg-canvas: #070b0a;
  --color-bg-homepage: #000000;
  --color-bg-sidebar: #0b100f;
  --color-bg-surface: #0d1210;
  --color-bg-surface-raised: #121816;
  --color-bg-subtle: #171d1b;
  --color-bg-hover: #1b211f;
  --color-bg-selected: #1d2421;
  --color-bg-overlay: rgb(0 0 0 / 72%);

  /* Text */
  --color-text-strong: #f5f7f5;
  --color-text: #d7dbd8;
  --color-text-secondary: #b4bab5;
  --color-text-muted: #7d857f;
  --color-text-disabled: #555d58;
  --color-text-on-primary: #071006;

  /* Stroke and focus */
  --color-border: #29302d;
  --color-border-subtle: #1b211f;
  --color-border-strong: #3b4440;
  --color-focus: #9be67a;
  --focus-ring: 0 0 0 2px #070b0a, 0 0 0 4px rgb(155 230 122 / 72%);

  /* Branch and chart palette */
  --color-branch-main: #92d970;
  --color-branch-launch: #4ccad4;
  --color-branch-design: #718cff;
  --color-branch-neutral: #a6aeaa;
  --color-chart-grid: #1a231f;
  --color-heat-0: #242a27;
  --color-heat-1: #354535;
  --color-heat-2: #4f7048;
  --color-heat-3: #70a75c;
  --color-heat-4: #9bd97c;

  /* Typography */
  --font-sans: Inter, "PingFang SC", "Microsoft YaHei", "Noto Sans SC",
    system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-mono: "JetBrains Mono", "SFMono-Regular", Consolas,
    "Liberation Mono", monospace;
  --text-xs: 0.75rem;
  --text-sm: 0.8125rem;
  --text-base: 0.875rem;
  --text-lg: 1rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 2rem;
  --text-4xl: 2.5rem;
  --text-hero: 3.5rem;
  --leading-tight: 1.16;
  --leading-heading: 1.25;
  --leading-body: 1.55;
  --tracking-normal: 0;
  --tracking-label: 0.02em;

  /* Spacing: 4px base grid */
  --space-0: 0;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
  --space-24: 96px;

  /* Shape */
  --radius-none: 0;
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  --radius-full: 999px;

  /* Shadow: deliberately restrained on dark surfaces */
  --shadow-sm: 0 1px 2px rgb(0 0 0 / 24%);
  --shadow-md: 0 8px 24px rgb(0 0 0 / 28%);
  --shadow-lg: 0 16px 48px rgb(0 0 0 / 36%);
  --shadow-primary: 0 0 20px rgb(146 217 112 / 16%);

  /* Motion: inferred, verify against recording/source CSS */
  --duration-fast: 120ms;
  --duration-standard: 200ms;
  --duration-emphasis: 320ms;
  --easing-standard: cubic-bezier(0.2, 0, 0, 1);
  --easing-enter: cubic-bezier(0, 0, 0.2, 1);
  --easing-exit: cubic-bezier(0.4, 0, 1, 1);

  /* Layout */
  --topbar-height: 68px;
  --sidebar-width: 252px;
  --right-rail-width: 320px;
  --content-max: 1280px;
  --control-height-sm: 32px;
  --control-height-md: 40px;
  --control-height-lg: 48px;
  --z-base: 0;
  --z-sticky: 20;
  --z-dropdown: 40;
  --z-overlay: 60;
  --z-modal: 80;
  --z-toast: 100;
}
```

#### 2.2 深色模式 Tailwind config 片段

```js
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#92d970',
          hover: '#a0e47c',
          active: '#7fc45f',
          soft: '#172216',
          homepage: '#80e48c',
        },
        canvas: '#070b0a',
        surface: {
          DEFAULT: '#0d1210',
          raised: '#121816',
          subtle: '#171d1b',
          hover: '#1b211f',
          selected: '#1d2421',
        },
        ink: {
          strong: '#f5f7f5',
          DEFAULT: '#d7dbd8',
          secondary: '#b4bab5',
          muted: '#7d857f',
          disabled: '#555d58',
        },
        stroke: {
          DEFAULT: '#29302d',
          subtle: '#1b211f',
          strong: '#3b4440',
        },
        branch: {
          main: '#92d970',
          launch: '#4ccad4',
          design: '#718cff',
          neutral: '#a6aeaa',
        },
        warning: '#f2ad45',
        danger: '#f0645a',
        info: '#5c9cff',
      },
      fontFamily: {
        sans: [
          'Inter', 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC',
          'system-ui', 'sans-serif',
        ],
        mono: ['JetBrains Mono', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
      borderRadius: { sm: '4px', md: '6px', lg: '8px', xl: '12px' },
      boxShadow: {
        sm: '0 1px 2px rgb(0 0 0 / 24%)',
        md: '0 8px 24px rgb(0 0 0 / 28%)',
        lg: '0 16px 48px rgb(0 0 0 / 36%)',
        brand: '0 0 20px rgb(146 217 112 / 16%)',
      },
      transitionDuration: { fast: '120ms', standard: '200ms', emphasis: '320ms' },
      transitionTimingFunction: {
        standard: 'cubic-bezier(0.2, 0, 0, 1)',
      },
      width: { sidebar: '252px', rail: '320px' },
      height: { topbar: '68px' },
    },
  },
};
```

#### 2.3 排版语义

| 角色 | 字号/行高 | 字重 | 使用场景 |
| --- | --- | --- | --- |
| Hero | 48-56px / 1.12-1.18 | 700 | 营销首页品牌名、主张 |
| Page title | 36-40px / 1.2 | 700 | 洞察、设置、仓库名称 |
| Section title | 20-24px / 1.25 | 600-700 | 首页区块、面板标题 |
| Card title | 15-18px / 1.35 | 600 | 卖点、提交详情、列表组名 |
| Body | 14-16px / 1.5-1.6 | 400 | 描述、任务名、表单内容 |
| Meta | 12-13px / 1.4-1.5 | 400-500 | 时间、哈希、状态、辅助文字 |
| Label | 11-12px / 1.35 | 600 | 英文眉题、图表标签；可用 0.02em 字距 |
| Mono | 12-14px / 1.45 | 400-500 | 哈希、快捷键、分支技术标识 |

正文建议最大行宽 64-72 个中文字符；营销说明约 560-680px。截图未能证明具体 Web Font，字体链为工程推荐，不应宣称为原始字体。

#### 2.4 栅格与节奏

- 桌面工作台为三段式：`252px 左侧栏 + 自适应主区 + 约 320px 右侧栏`。
- 内容区常用 24-32px 水平内边距；密集列表使用 12-16px。
- 营销首页内容最大宽约 1320px，左右安全边距约 48-64px。
- 首页卖点为 4 列，gutter 12-16px；工作台详情常为 12 列逻辑栅格。
- 区块节奏：紧密项 8px、同组 16px、面板 24px、页面章节 48-80px。
- 分隔线承担主要分区职责，阴影只用于下拉、模态、悬浮提示。

#### 2.5 浅色模式增补（仅白色内容区）

##### 多截图一致性元素

| 元素 | 五张浅色页面共同表现 | 浅色落地约束 |
| --- | --- | --- |
| 主画布 | 白色或极浅冷灰，几乎无色偏 | 页面用 `#FCFCFC`，主要内容可用 `#FFFFFF` |
| 卡片/面板 | 白底、1px 冷灰边框、无常驻阴影 | 通过边框和留白分层，不做悬浮白卡海洋 |
| 顶栏 | 白底、底部 1px 分隔线 | 与内容同色，仅用边框建立固定层级 |
| 主操作 | 深森林绿底、白字 | 与暗色模式的荧光绿不同，不可直接复用其色值 |
| 文本 | 近黑标题、深灰正文、中灰元数据 | 正文不使用纯黑，禁用态仍需可辨识 |
| 选中态 | 极浅绿底 + 绿色边框/标识 | 选中任务行、Tab、筛选器保持轻量 |
| 数据图表 | 白底、浅灰虚线网格、绿/青/蓝/紫分支 | 线条饱和，背景和网格保持低对比 |
| 详情栏 | 白底，左侧 1px 分隔线 | 作为页面结构栏，不使用浮层阴影 |
| 危险操作 | 红色文字与红色细边框 | 仅设置页清理/删除与逾期信息使用 |

##### 页面特异性元素（白色区域）

| 页面 | 特异元素 | 浅色模式处理 |
| --- | --- | --- |
| 今日工作台 | 仓库分组任务、周节奏热力图、快速添加、任务详情 | 当前任务使用浅绿选中行；右栏分为多个无阴影区块 |
| 仓库概览 | 分支拓扑、统计带、分支进度卡、提交时间线、贡献热力图 | 三列信息面板同级；分支色贯穿边线、节点和标签 |
| 仓库任务 | 状态筛选、任务表、右侧任务详情与提交操作 | 表头弱化；行高稳定；选中行浅绿，不使用深色填充 |
| 洞察 | 大型提交图谱、时间网格、详情栏、热力图和节奏统计 | 图谱占主视觉，卡片边框退后；当前提交使用双环和虚线关联 |
| 设置 | 主题预览、主题色、密度、通知、备份、危险区 | 设置分组使用连续面板；危险区只在操作行使用红色 |

##### 浅色语义 Token

浅色模式覆盖同名语义变量，组件代码继续消费
`--color-bg-*`、`--color-text-*` 和 `--color-border-*`，不要建立一套
`button-light` 等平行组件。

```css
[data-theme='light'] {
  color-scheme: light;

  /* Brand: darker than the dark-theme accent for white-background contrast */
  --color-primary: #087333;
  --color-primary-hover: #075f2b;
  --color-primary-active: #064f25;
  --color-primary-soft: #edf8f0;
  --color-primary-border: #9bcfaf;
  --color-homepage-accent: #087333;
  --color-secondary-cyan: #0797a6;
  --color-accent-blue: #2575e6;

  /* Semantic */
  --color-success: #087333;
  --color-warning: #b76400;
  --color-danger: #d92d2d;
  --color-info: #1769d2;

  /* White content area only; dark sidebar is intentionally not overridden */
  --color-bg-canvas: #fcfcfc;
  --color-bg-homepage: #ffffff;
  --color-bg-surface: #ffffff;
  --color-bg-surface-raised: #ffffff;
  --color-bg-subtle: #f5f7f6;
  --color-bg-hover: #f2f5f3;
  --color-bg-selected: #eef8f1;
  --color-bg-overlay: rgb(17 23 21 / 36%);

  /* Text */
  --color-text-strong: #111715;
  --color-text: #3f4844;
  --color-text-secondary: #555f5a;
  --color-text-muted: #66706b;
  --color-text-disabled: #9aa29e;
  --color-text-on-primary: #ffffff;

  /* Stroke and focus */
  --color-border: #dde2df;
  --color-border-subtle: #eaeeec;
  --color-border-strong: #c6ceca;
  --color-focus: #087333;
  --focus-ring: 0 0 0 2px #ffffff, 0 0 0 4px rgb(8 115 51 / 52%);

  /* Branch and chart palette */
  --color-branch-main: #087333;
  --color-branch-launch: #0797a6;
  --color-branch-design: #2575e6;
  --color-branch-mobile: #7659d9;
  --color-branch-neutral: #737b77;
  --color-chart-grid: #dfe5e2;
  --color-heat-0: #edf0ee;
  --color-heat-1: #d8eddc;
  --color-heat-2: #a9d8b2;
  --color-heat-3: #64b679;
  --color-heat-4: #16833d;

  /* White surfaces need only restrained elevation */
  --shadow-sm: 0 1px 2px rgb(17 23 21 / 6%);
  --shadow-md: 0 8px 24px rgb(17 23 21 / 10%);
  --shadow-lg: 0 20px 48px rgb(17 23 21 / 14%);
  --shadow-primary: 0 0 0 rgb(0 0 0 / 0%);
}
```

截图中的主按钮存在轻微的深浅变化，可能是渐变、抗锯齿或多个设计稿的色差。
规范建议收敛为 `#087333` 单色；若确认需要渐变，仅允许非常轻的纵向变化：

```css
.button-primary[data-theme='light'] {
  background: linear-gradient(180deg, #0a7737 0%, #08672f 100%);
  color: #ffffff;
}
```

##### 浅色 Tailwind 扩展

现有 Tailwind 片段可增加以下浅色原子值。业务组件仍应优先使用 CSS
语义变量，避免在 JSX 中散落硬编码颜色。

```js
colors: {
  light: {
    canvas: '#fcfcfc',
    surface: '#ffffff',
    subtle: '#f5f7f6',
    hover: '#f2f5f3',
    selected: '#eef8f1',
    border: '#dde2df',
    strong: '#111715',
    text: '#3f4844',
    muted: '#66706b',
    primary: '#087333',
  },
}
```

##### 浅色组件覆盖规则

- **顶栏**：白底，底部 `#DDE2DF` 1px；输入、仓库选择器和新建按钮高
  36-40px。顶栏不加阴影。
- **主按钮**：深绿底、白字、6px 圆角；hover 变深而非变亮；active
  再压暗并下移 1px；disabled 使用浅灰底和禁用文字。
- **次按钮/筛选器**：白底、1px 边框、深灰字；hover 使用
  `--color-bg-hover`；选中筛选可用深绿底白字或浅绿底绿字，两种模式
  不在同一控件组混用。
- **输入与 Select**：白底、1px 冷灰边框；placeholder 使用 muted；focus
  转绿边并出现双层焦点环；错误为红边 + 错误文字。
- **任务行/表格行**：白底，44-56px 稳定行高；默认以细分隔线区分；hover
  使用极浅灰绿；selected 使用浅绿底 + 绿色边框。不要给每行单独投影。
- **卡片/面板**：白底、8px 圆角、1px 边框；默认无阴影。今日侧栏、仓库
  概览三列和设置分组都属于同级面板。
- **右侧详情栏**：白底、左侧 1px 分隔线；内部区块用水平分隔线和
  24px 上下节奏，不把每个字段做成卡片。
- **Tab**：黑/灰文字，选中为深绿文字 + 2px 绿底线；hover 仅改变文字色。
- **Checkbox**：未选中白底灰边；选中深绿底白勾。选中任务可额外使用浅绿
  行底，但不要增加绿色光晕。
- **Switch**：开启为深绿轨道 + 白色滑块，关闭为浅灰轨道 + 白色滑块。
- **Chip**：白色内容区使用浅色填充、深色文字和彩色细边框；不使用暗色模式
  的深色 chip 背景。
- **热力图**：零值 `#EDF0EE`，四级绿由 `#D8EDDC` 递进至 `#16833D`；
  每格仍需日期与数量的可访问文本。
- **图谱**：网格线 `#DFE5E2`，main/launch/design/mobile 分别为
  绿/青/蓝/紫；当前节点使用浅绿外晕 + 深绿双环，关联线可用绿色虚线。
- **危险区**：清理数据、删除仓库使用红字与红色细边框；hover 可用极浅红底，
  禁止默认实心红色大面积占据设置页。

##### 浅色对比度与红线

- 参考对比度：强文字/画布约 17.7:1，正文约 9.2:1，muted 约 5.0:1，
  均达到 WCAG AA 正文要求。
- 深绿/白底约 5.8:1，白字/深绿约 6.0:1，可用于正文链接和主按钮。
- 危险红/白底约 4.7:1，可用于正文大小的危险文字。
- 边框/画布约 1.3:1，只用于结构分隔，不能作为焦点或状态的唯一提示。
- 不使用纯黑大面积正文；仅标题可接近黑色。
- 不给白色卡片增加灰色大投影来“制造层级”，优先依靠边框、留白和分区。
- 不把暗色模式荧光绿 `#92D970` 直接用于白底正文或细线，其对比度与视觉重量
  均不足；浅色模式必须使用深森林绿。
- 不分析或覆盖左侧黑色侧边栏；它继续遵循暗色侧栏 token，属于混合主题壳层。

##### 浅色提取置信度

| 字段 | 置信度 | 说明 |
| --- | --- | --- |
| 白色画布与卡片层级 | 96% | 五张图主区域像素集中于 `#FCFCFC/#FFFFFF` |
| 浅色主操作绿 | 88% | 多图约落在 `#026A2E` 至 `#1A6636`，规范值为收敛建议 |
| 文本与边框层级 | 90% | 顶栏、列表、详情栏和设置面板可交叉验证 |
| 浅色图表分支色 | 92% | 绿、青、蓝、紫在概览与洞察页重复出现 |
| 浅色 hover/focus | 55% | 静态图只展示少量选中态，其余为系统化推断 |
| 浅色阴影 | 72% | 可确认常驻面板无明显阴影，浮层状态未覆盖 |
| 浅色移动端行为 | 20% | 截图仅覆盖 1536x1024 桌面端 |

### 3. 组件 DNA

#### 3.1 状态通则

| 状态 | 颜色/形态规则 |
| --- | --- |
| Base | 1px `--color-border`，深色面，文本 `--color-text` |
| Hover | 表面提升到 `--color-bg-hover`；品牌控件亮度约增加 6%-10% |
| Active | 表面略压暗；按钮可下移 1px；品牌色使用 `--color-primary-active` |
| Focus | 2px 品牌色外环，外加 2px 画布隔离环；不得只改颜色 |
| Selected | `--color-bg-selected` + 左侧 3px 绿标或绿边框 + 强文本 |
| Disabled | 约 45% 不透明度、禁用文本色、无 hover、`not-allowed` 光标 |
| Loading | 保持原尺寸；文字可替换为同尺寸 spinner，禁止布局跳动 |

#### 3.2 按钮

| 类型 | Base | Hover / Active | Disabled / Loading |
| --- | --- | --- | --- |
| 主按钮 | 高 40-48px，绿底、近黑字、6px 圆角、图文间距 8px | hover 变亮；active 变暗并下移 1px | 45% 透明；spinner 16px |
| 次按钮 | 透明或表面底，1px 强边框，亮色文字 | 表面转 `bg-hover`；active 转 `bg-subtle` | 同上，保留边框轮廓 |
| 文字按钮 | 无边框，品牌绿文字，左右 4-8px | 增加弱绿底或下划线 | 禁用转 muted |
| 图标按钮 | 40x40px，图标 18-20px，透明底 | 圆形或 6px 深底出现 | loading 使用 16px spinner |
| 危险按钮 | 透明底、危险色图标/文字；确认态可红底 | hover 加 `rgb(240 100 90 / 10%)` | 禁用降为 45% |

主 CTA 不做高亮描边与阴影双重强调。截图中按钮主要为 6px 圆角，不采用全胶囊。

#### 3.3 输入与选择器

- **Input/Search**：高约 40px，6px 圆角，`surface` 背景，1px 边框；搜索图标 16-18px 位于左侧 12px，快捷键提示靠右。
- **Focus**：边框转 `primary-border` 并出现焦点环；不得用占位符替代标签。
- **Error**：危险色边框 + 下方 12px 错误文字 + 错误图标。
- **Disabled/Loading**：禁用为 45% 透明；异步搜索在右侧显示 16px spinner，不清除已有输入。
- **Select**：与 Input 同高，右侧 16px chevron；展开菜单使用 raised surface 与 `shadow-md`。
- **Checkbox**：18-20px 方形、4px 圆角；选中为绿底近黑勾；未选中透明底强边框。
- **Radio**：截图未明确出现，建议沿用 18-20px 圆形控件；属于推断值。
- **Switch**：约 38x20px；开启为弱绿轨道 + 16px 绿色滑块，关闭为灰轨道 + 浅色滑块。
- **Slider**：截图未出现，标记 N/A。

#### 3.4 卡片与容器

- **Base**：`surface` 或透明底，1px 边框，8px 圆角，内边距 16-24px，无常驻阴影。
- **Hover**：仅可点击卡片提升到 `surface-raised`，边框转 strong；静态面板无 hover。
- **Active/Selected**：左侧 3px 绿标、绿边或 `surface-selected`，三者最多并用两种。
- **Disabled**：内容整体 45%-55% 透明，不响应指针。
- **Loading**：原位骨架条，使用 `surface-subtle` 与 1.2s-1.6s 低对比 shimmer；动效需复核。

禁止卡片套卡片。右侧提交详情和热力图是同级面板；任务行属于列表行，不再做浮卡。

#### 3.5 导航

- **顶部 Nav**：高度约 68px，底部 1px 分隔线；Logo 左对齐，工作区/仓库选择器、搜索、创建、保存状态、主题和账户依次排列。
- **侧边栏**：宽约 252px；导航项高 44-48px，图标 20px，图文间距 12px；选中项深色底 + 左侧 3px 绿色标识。
- **Tab**：32-40px 高；选中使用绿色文字和 2-3px 底线，非选中无实心背景。
- **Segmented control**：同一容器内 2-3 项；选中项绿底或弱绿底，适合主题模式与范围筛选。
- **Breadcrumb/Stepper**：截图未出现，N/A。
- 所有导航状态需同时有位置/形状标识，不能只靠绿色。

#### 3.6 标签、徽章与头像

| 语义 | 前景 | 背景/边框 |
| --- | --- | --- |
| 已完成/成功 | `#92d970` | `#172216` / `#38552e` |
| 进行中/信息 | `#5c9cff` | `#111b28` / `#29466e` |
| 中优先级/警告 | `#f2ad45` | `#21190d` / `#68491f` |
| 高优先级/危险 | `#f0645a` | `#241211` / `#71342f` |
| 待办/中性 | `#b4bab5` | `#171d1b` / `#3b4440` |
| 分支 main | `#92d970` | 透明或弱绿底 |
| 分支 launch | `#4ccad4` | 透明或弱青底 |
| 分支 design | `#718cff` | 透明或弱蓝底 |

Chip 高约 22-24px，4px 圆角，字体 11-12px。头像为 32-40px 圆形深灰底、白色首字母；图片加载失败沿用首字母 fallback。截图未出现真实人物图片。

#### 3.7 数据可视化

- **热力图**：10-12px 方格，2-4px 间距，2px 圆角；零值深灰，4 级绿色递增。
- **提交时间线**：1-2px 竖线 + 10-12px 空心节点；当前/成功节点使用绿色。
- **Life Graph**：主干 2-4px 绿色，分支分别用青、蓝和灰白；节点 12-16px，当前提交用双环强调。
- **网格线**：1px 虚线/点线、低对比 `chart-grid`，不抢夺数据。
- **Tooltip**：raised surface、1px strong border、8px 圆角、12px 元数据与 14px 标题；使用 `shadow-md`。
- 色彩不是唯一编码：分支必须附带文字、连线位置或节点结构。

#### 3.8 模态、Toast、Drawer

静态截图未展示这些组件。建议值仅用于补全系统，需二次确认：遮罩 `rgb(0 0 0 / 72%)`；模态用 raised surface、8-12px 圆角、`shadow-lg`；关闭按钮位于右上角且命中区 44px；Toast 位于右上或右下；窄屏侧栏转 Drawer。不得把这些推断当作现有实现证据。

### 4. 动效手册

静态截图无法证明真实动效。下表是与视觉语言匹配的建议基准，须用录屏或源 CSS 校验。

| 触发 | 动效 | 时长 | 缓动 |
| --- | --- | --- | --- |
| 按钮 hover | 背景/边框颜色过渡 | 120ms | standard |
| 按钮按下 | 下移 1px，无夸张缩放 | 80-120ms | ease-out |
| 输入聚焦 | 边框与焦点环淡入 | 120-160ms | standard |
| 导航选中 | 底色与左侧标识淡入 | 160-200ms | standard |
| Switch | 滑块平移 + 轨道变色 | 160-200ms | standard |
| 下拉菜单 | opacity 0→1，Y -4→0 | 160-200ms | enter |
| Modal | 遮罩淡入，面板 Y 8→0 | 200-240ms | enter |
| Drawer | 水平滑入/滑出 | 240-320ms | standard |
| 页面切换 | 主内容轻淡入，不移动布局骨架 | 160-240ms | standard |
| 骨架屏 | 低对比 shimmer | 1.2-1.6s 循环 | linear |
| 图谱路径 | 首次加载可渐显，不逐段炫技绘制 | 300-400ms | ease-out |

遵循 `prefers-reduced-motion: reduce`：关闭位移、shimmer 和路径动画，仅保留即时状态切换或短淡入。

### 5. 状态视觉规范

- **空状态**：截图未直接覆盖。建议使用线性仓库/分支图标，不引入卡通插画；标题一句说明当前为空，正文说明下一步，单个绿色主 CTA 创建仓库/分支/任务。
- **加载状态**：优先保留页面骨架和面板尺寸；列表行使用骨架条，局部提交用 16px spinner。不可用整页 spinner 取代工作台结构。
- **错误状态**：危险红只用于图标、标题、边框和恢复操作；正文解释影响范围，提供“重试”主操作与“查看详情”次操作。
- **离线状态**：截图明确展示“离线可用”“本地已保存”。使用绿色圆点/勾 + 明确文字；若尚未同步，不得仍显示绿色成功，应改为警告色和“等待同步”。
- **保存状态**：顶部/底栏用小圆点 + “本地已保存”或 IndexedDB 状态；颜色之外必须有文字。
- **完成状态**：任务勾选框、状态 chip 和提交记录形成三重反馈，但每个单组件内最多使用两种强调手段。

### 6. 可访问性与响应式

#### 6.1 对比度与键盘

- 参考色对比度：强文字/画布约 18.6:1，正文约 10.1:1，弱文字约 5.3:1，均达到 AA 正文要求。
- 品牌绿/画布约 11.8:1；近黑文字/品牌绿约 11.4:1，适合主按钮。
- 边框/画布约 1.5:1，只能用于分层，不能单独承担文字或焦点识别。
- 所有可操作元素必须有可见 `:focus-visible`；焦点顺序遵循顶栏 → 侧栏 → 主区 → 右栏。
- 图标按钮使用 `aria-label` 和 tooltip；状态圆点配可读文本。
- 控件视觉高度可为 32-40px，但命中区必须扩展到至少 44x44px。
- 表格/图谱/热力图提供键盘导航和等价文本摘要；热力格使用 `aria-label` 描述日期与数量。

#### 6.2 响应式策略

截图只覆盖约 1536-1576px 宽的大屏桌面，以下断点为建议值而非截图事实：

| 断点 | 建议布局 |
| --- | --- |
| `>= 1280px` | 顶栏 + 固定左侧栏 + 主区 + 右侧栏完整显示 |
| `1024-1279px` | 右侧栏收为可打开面板；主区保留，搜索宽度缩短 |
| `768-1023px` | 左侧栏图标化或 Drawer；顶部次要状态移入菜单 |
| `< 768px` | 单列；图谱横向滚动/专用全屏；四列卖点改 1 列；任务元数据换行 |

字号不随视口连续缩放。Hero 可在桌面 48-56px、移动端离散降至 36-40px；工作台标题从 36-40px 降至 28-32px。固定格式热力图和图谱使用明确 `min-width` 或 `aspect-ratio`，避免内容挤压重排。

### 7. 图标、装饰与品牌规范

- **Logo**：白色圆角方块内为黑色分支图标，右侧名称 `CommitToDo`；暗色背景使用该版本。图标容器约 36-40px，最小不低于 32px；安全间距至少为图标宽度的 0.5 倍。
- **图标系统**：线性图标，约 1.5px 笔画，圆角端点；默认 16/20/24px；与文字视觉居中而非机械基线对齐。
- **营销主视觉**：黑底白色粒子构成分支流线，绿色节点表示活跃路径，终点白色发光圆环表示 commit。粒子发光只服务 Hero，不进入普通工作台。
- **背景装饰**：首页可使用极低对比点阵/噪点；工作台保持纯净冷黑面，不使用渐变球、彩色光斑或大面积毛玻璃。
- **文案**：短句、动词优先、开发者语汇；示例为“把目标分支化，把进展提交掉”“本地优先”“进入工作台”。
- **拟人化/Emoji**：截图无拟人化角色或 Emoji；正式界面不使用。

### 8. 反模式 / 红线

1. 不把所有深色表面做成同一纯黑，必须保留画布、侧栏、容器、悬浮层级。
2. 不使用紫蓝渐变、彩色光球、厚重玻璃模糊或高饱和霓虹泛光。
3. 不用圆角大于 12px 的普通卡片，不把按钮一律做成胶囊。
4. 不以阴影替代边框；常驻页面面板原则上无阴影。
5. 不在一个组件内同时使用绿底、绿边、绿光、绿色文字四重强调。
6. 不将“成功”“当前分支”“主 CTA”之外的大面积内容染绿。
7. 不依赖颜色区分分支、优先级或保存状态，必须配标签、图标或位置编码。
8. 不把任务行包装成层层嵌套卡片；列表靠分组、缩进和分隔线组织。
9. 不让低对比边框承担焦点状态；焦点必须有清晰外环。
10. 不在窄屏机械压缩三栏；侧栏和右栏应转为 Drawer/Sheet。
11. 不擅自引入真实照片、3D 插画、卡通角色或与 Git 隐喻无关的装饰。
12. 不把静态截图未出现的 modal、toast、移动端布局当作已确认设计。

### 9. 推断置信度

| 字段 | 置信度 | 说明 |
| --- | --- | --- |
| 暗色视觉方向 | 99% | 四张截图完全一致 |
| 工作台主色 | 92% | 像素聚类集中在 `#90D870` 至 `#A0D470` |
| 营销首页强调色 | 94% | 高频薄荷色集中在 `#80E48C` 附近 |
| 背景层级 | 90% | 多图共同呈现近黑与冷绿黑分层；压缩/抗锯齿会改变低位色值 |
| 分支辅助色 | 88% | main/launch/design 在多页稳定使用绿/青/蓝 |
| 字体族 | 62% | 截图可判断无衬线与等宽角色，无法确认实际字体文件 |
| 字号与间距 | 82% | 可按已知截图尺寸估算，浏览器缩放比未知 |
| 圆角与边框 | 90% | 多种控件和面板可交叉验证 |
| 阴影 | 78% | 可确认克制，但下拉/模态未出现 |
| 动效时长 | 35% | 静态图不可验证，全部为建议值 |
| 组件五态 | 58% | base/selected/部分 disabled 可见，其余为同系统推断 |
| 响应式行为 | 30% | 仅有大屏桌面截图 |
| WCAG 结论 | 82% | 基于参考色计算，需用实际 CSS 色值与字号复测 |

### 10. 未覆盖但建议补全的字段

- 浅色模式完整色板以及深浅模式切换是否跟随系统。
- 真实字体文件、字重加载范围、Windows/macOS 字体渲染差异。
- hover、focus、active、loading、错误表单的实际截图。
- Modal、Toast、Dropdown、Command Palette、Drawer 的成品状态。
- 手机与平板截图，特别是 Life Graph、任务列表和热力图的折叠方式。
- 动效录屏与 `prefers-reduced-motion` 实现。
- 超长中文/英文、空仓库、大数据量、断网未同步、数据损坏等边界状态。
- RTL、浏览器高对比模式、200% 缩放和屏幕阅读器验证。
- 品牌绿最终色值应以源 CSS/设计文件为准，并确认营销薄荷绿是否保留为独立 token。

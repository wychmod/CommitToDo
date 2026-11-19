# CommitToDo 首页视觉评定与生图提示词

日期：2026-11-19
范围：`web/src/presentation/screens/landing/`
查看方式：本地启动 Vite 后，用 Chrome（1512×950，DPR=1）实拍，非仅读代码。

## 一、截图

| 文件 | 内容 |
| --- | --- |
| `01-hero-1512x950.png` | 桌面首屏（1512×950，完整折叠线以上） |
| `02-full-page-1512.png` | 桌面整页（页高 1607px） |
| `03-mid-1512.png` | 首屏同屏，工作台面板完整露出 |
| `04-mobile-430.png` | 430×932 移动端整页 |

实测数据（Chrome 计算样式，非目测）：

- 视口 1512×949，文档高 1607px（约 1.7 屏）。
- `<h1>` 56px / 700；主标语 40px / 700；副文案 17px。
- 工作台面板：x=84.5，y=453，宽 1328，高 484 —— 底边 937，正好卡在折叠线上。
- 页脚 / 卡片：正文 12–13px；工作台内部 10–11px，次级信息 9–10px。
- 页面底色 `#000000`，面板 `#121313`，边框 `#30332f`，主色 `#80e48c`，主文字 `#f5f5f2`。

## 二、诊断：它现在是什么腔调

一句话：**这是一版 2020–2022 年"深色开发者工具模板"的合格执行**——纯黑底、薄荷绿点色、粒子星尘、玻璃面板、五栏产品截图、四宫格卖点。元素都齐，但没有一个是"被设计过的"。

### 1. 配色
- 纯 `#000` 大面积铺底，面板 `#121313` 与底色只差 18 级亮度，在实拍里几乎不可见；结果是整页像一片黑，靠 1px 边框硬切区块。
- 绿色 `#80e48c` 是柔和薄荷绿，黑底上偏"环保 / 终端高亮"，chroma 低、不发光，撑不起"主色"这个角色；同时绿、青 `#59cbd0`、蓝 `#6e95ff`、红 `#e6635b`、黄 `#e3a33c` 五色齐上（工作台标签、分支点、卡片描边），失去了单点强色的记忆点。
- `index.html` 的 `theme-color` 还是 `#0F172A`（旧 slate），与纯黑首页不是同一套体系，属于改版残留。

### 2. 字体与层级
- 实际字体是 **Segoe UI + 微软雅黑**，因为 `--v3-font-sans` 把系统字体排在最前；但 `index.html` 又加载了 IBM Plex Sans 400/500/600 —— **字体下载了却没用上**，落地页的文字气质停留在 Windows 默认界面字体。
- 标题呈"双主标题"结构：`CommitToDo` 56px/700 与"把目标分支化，把进展提交掉"40px/700 只差 1.4 倍，且都是 700 粗体、同为白色。**品牌名和主张在争夺同一个位置**，视线没有唯一落点。
- 层级断裂：首屏用完 56/40/17 之后，直接掉到 12px 卡片正文和 10px 工作台文字。中间没有 20–28px 的过渡层，于是"大标题—小字"之间是空的，读起来像标题下贴了一张截图。
- 等宽字体 JetBrains Mono 只用于 TODO/COMMIT 两个 16px 标签和 10px 页脚，功能上不承担信息，纯装饰。

### 3. 构图与节奏
- 首屏是"标题居中 + 按钮居中 + 视觉居中 + 五栏面板居中"的四段垂直堆叠，**全部居中 = 没有张力**。所有边缘都对称，眼睛只能从上往下扫。
- 间距失控：header 64px，`<h1>` 起点 y=72，**标题距导航只有 8px**；而下方 40px 标语、17px 副文案、按钮之间的间距也都在 12–16px 量级。上方窒息、下方松散。
- 粒子流用 `mt-[-69px]` 强行上提去贴标题，工作台又紧贴粒子底部，三块内容互相咬合，没有呼吸区。
- 整页只有 1607px 高，却仍然塞进"首屏 + 工作台 + 四卡 + 一条 CTA + 页脚"五个段落，每段高度都被压扁，节奏从头到尾一个速度。

### 4. 首屏信息密度与视觉焦点
- 首屏在 484px 高的面板里放了 5 栏 × 约 30 行，合计约 90 个可读元素（分支、任务、优先级、状态、时间、头像、提交、热力图）。**每一条都在 10–11px**，实拍里必须放大才能读。
- 于是首屏同时有四个视觉重心：56px 白色品牌词、40px 白色标语、粒子流最亮的白色光核、下方五栏面板的亮标签。**没有一个能压住场**。
- 工作台本应是"真实产品界面"，现在却像把整个后台缩到 40% 塞进首屏，既不可读，也不可信。

### 5. 主视觉
- 粒子流是全页最贵的一块实现（8200 粒子 + 4200 星云粒子/帧，canvas 逐帧重绘），但视觉结果是**通用粒子星尘 + 一条水平折线**。它看起来像 2018 年 After Effects 模板里的"科技感粒子"，不与"分支 / 提交"这一产品语义发生关系。
- 中间的三个点（白点 + 两个绿点）只是在一条直线上做上下偏移，读不出"分叉—合并"的因果；两侧 TODO / COMMIT 用 62px 虚线圈 + 白色发光圆环，是很容易撞车的通用图标语言。
- 15 个漂浮的 FileText 小图标（8–10px，opacity 0.44–0.66）在实拍中几乎不可见，只贡献噪点。

### 6. 动效
- 入场是 7 段 `v3-enter` 级联，最长延迟 900ms；同时 `landing-page.tsx` 在 1600ms 后把 `data-animated` 置 true，**用一条 CSS 规则把动画整体关掉**。前者是编排，后者是兜底，两者同时存在于同一套视觉里，说明动效没有被当成设计语言来管。
- 节点脉冲 `2.4s`、提交光晕 `3.2s`、文档漂浮 `8–12s` 三套节奏各自为政，没有统一的"一次呼吸"。
- `prefers-reduced-motion` 下直接把粒子层 `display:none`，于是主视觉彻底消失，只剩几根线——降级方案等于没有设计。

### 7. 具体"过时点"（落到元素）

| 位置 | 问题 |
| --- | --- |
| Header 左侧 4 个导航项 | 每项都配一个 lucide 图标（功能/定价/文档/更新日志），图标与文字同权重，是典型的后台侧栏语言被搬到官网顶部 |
| Header 右侧 `Local-first • PWA • IndexedDB` | 11px 等宽技术黑话，放在最贵的右上角，用户读到的是实现细节而不是价值；页脚又重复一次 |
| Header 右侧 `登录` + `开始使用` | 当前版本已删除账号体系（见项目记忆），`登录` 是死入口，且两个按钮同尺寸并列，主次不分 |
| Hero 按钮 | 37px 高、6px 圆角、自上而下的绿色渐变，属于 Bootstrap 时代的"主按钮"；次级按钮还带一个放大镜图标，语义与"查看任务流"不符 |
| 工作台五栏 | 分栏密度、10px 药丸标签、9px 头像圆点，是把后台管理界面等比缩小，既不像官网主视觉，也不像产品宣传图 |
| "为什么选择" 四宫格 | 等高 158px、顶部 1.5px 彩色描边、32px 方形图标、18px 标题 + 12px 正文 —— 标准的"四卡片卖点区"，正是当前 AI 工具官网集体抛弃的版式 |
| 底部 CTA | 22px 标题小于上方区块标题 32px，层级倒挂；右侧两个按钮与左侧文案挤在一条 1328px 的横条里 |
| 页脚 | 66px 高，只放 logo + 一句技术黑话 + 一句说明，信息价值低于其占位 |
| 移动端 430px | 工作台 `min-w-[1080px]`，而 `overflow-x-auto` 只在 `isTablet`（≥1024）生效；430px 时 `isMobile=true` 走 `overflow-hidden`，右侧 Commit 与 Heatmap 被直接裁掉（见 `04-mobile-430.png`） |

### 8. 与当前主流 AI 编码工具官网的差距

以 Trae / Qoder / Codex / WorkBuddy 这类首页为基准，它们共享的语言是：近黑高对比底、**一个超大主标题独占首屏**、副文案克制到一两行、**一个**强视觉焦点（真实产品界面 / 抽象光效 / 3D 结构，只选一个）、发丝级边框与极轻的微动效、以及拒绝三栏/四栏卡片堆叠。

当前首页在这五项上：底是黑的（符合）、主标题被品牌名分走一半（不符合）、副文案尚可（接近）、视觉焦点有四个（不符合）、卡片堆叠照做（不符合）。**不是差一点，是骨架层面就没按这套语言搭。**

## 三、结论：全新，不做延续

### 判断

**全新。** 现有首页唯一值得继承的是"深色 + 单一绿色点色 + 分支/合并作为叙事母题"这三件事的**意图**，而不是它们的**执行**。

### 为什么不是延续

1. 延续的前提是骨架成立、只换皮。但这里的骨架（居中四段堆叠、双主标题、五栏截图、四宫格）恰好是主流语言明确要否定的部分，换皮救不回来。
2. 主视觉的执行（粒子星尘）不仅过时，而且与产品语义无关；保留它就要继续为 12000+ 粒子/帧付出性能，却换不到记忆点。重画比调参便宜。
3. 用户的标准是"非常美、有冲击性"。以这个标准，现有首页属于"干净但不动人"，小修小补最多到"更干净的干净"。

### 如果一定要说"延续了什么"

- **品牌色**：保留绿色作为唯一强调色，但把 `#80e48c`（柔和薄荷）提纯为更电子的 `#5BFF9E`，并且只允许出现在三个地方：主标题里的两个关键字、合并节点的光、产品面板顶边的一根发丝高光。其它一切彩色标签（蓝/红/黄/青）全部取消。
- **母题**：保留"分叉—合并"这一条几何叙事，但形态从"水平粒子带 + 三个点"改为**一座发丝光线的分支雕塑**——连续线条、精确分叉、单点汇聚，可被理解为工程结构而非特效。
- **必须推翻的层**：字体系统（引入中文显示字重与字号跨度）、首屏构图（居中改左对齐非对称）、主视觉（粒子改线条结构光）、产品展示（五栏改双栏大图并被画框裁切）、卖点区（四宫格改编号式长条目）、按钮与导航语言（去渐变、去图标化）、动效编排（从 7 段级联改为"一束光沿分支走一次"）。

### 新方向的定位

一句话：**把"分支"当成建筑来拍。**

- 首屏不再是"标题 + 特效 + 截图"的三明治，而是一张**左文右构**的海报：左侧 60% 是 116px 级的中文显示标题（唯一焦点），右侧与下方是同一座分支结构，从画外斜插入画，分出两条长弧，在右上三分之一处汇聚成一个发光的绿色节点。
- 产品界面只出现**一次**，以一块被画框下边缘和右边缘裁切的大玻璃窗口出现，内部只保留"分支树 + 任务详情"两栏，正文 13–14px 保证可读。它的作用是"证明这东西真的存在"，而不是"展示功能清单"。
- 首屏之后不设四宫格。改用 01 / 02 / 03 的编号式长条目 + 一根贯穿的 1px 发丝线，让"分支"这条几何从首屏一直延伸到页尾，形成结构上的连续性。
- 动效只保留一个主动作：一束光沿主分支走到合并点，点亮节点后停下。其余全部是 120–160ms 的边框/位移微反馈。

这套方向能承载这个产品的原因：CommitToDo 的核心心智是"目标会长出分支，完成会收束成一次提交"。分支雕塑 = 心智的可视化，而不是装饰。同时它天然适配深色高对比与发丝线条——恰好是当前 AI 编码工具官网的语汇，但用的是这个产品独有的几何。

## 四、生图提示词

见 `prompt.txt`（英文主版本，单块可直接复制）与下方中文版。

### 使用说明（重要）

- **不要把当前首页截图作为参考图输入**。参考图会把粒子星尘、五栏工作台、双主标题一起带回来。若工具强制要参考图，请只提供"构图参考"（左文右构的深色官网海报），参考强度 ≤ 20%。
- 唯一需要从旧版继承的是色值：绿 `#5BFF9E`（由 `#80e48c` 提纯而来）、底色近黑 `#07080A`。
- 生成尺寸用 16:10（1512×950）或 3:2；要求"单张平面稿，无浏览器外框、无设备样机、无水印"。
- 中文标题在多数图像模型里会糊字。**处理办法**：把提示词里的中文标题原样保留；若出图文字明显错字，把该行改为英文同义短句（`Fork your goals. Commit your progress.`）重新生成，拿到构图与光影后，再在设计工具里替换为真正的中文字体排版。不要为了文字正确去牺牲构图。
- 落地实现时需要自托管一套中文显示字体（MiSans / 阿里巴巴普惠体 / 思源黑体 Heavy 级别）。当前 `web/index.html` 只加载了 IBM Plex Sans 与 JetBrains Mono，**没有任何中文显示字重**，116px 的中文标题用系统雅黑会立刻掉档。

### English prompt（主版本，直接复制）

```text
A high-end website homepage visual comp for a developer-grade personal productivity app, presented as a single flat UI artboard, 16:10 landscape, 1512×950, crisp 2x detail, no browser chrome, no device mockup, no watermark.

SCENE: a near-black graphite void (#07080A), vertical gradient falling to #040505 at the corners, 5% fine dither grain, subtle vignette. Absolutely no illustration characters, no 3D blobs, no stock photography.

LAYOUT (desktop, 96px side margins, 12-column grid):
- Slim 64px top bar: at the far left a minimal white branch-glyph mark plus the wordmark "CommitToDo" at 18px / 600 in bone white; four small nav labels at 13px in muted gray near the left-center; at the far right a single 40px pill button "开始使用", bone white fill, black text. A 1px hairline at 8% white runs along the bottom of the bar.
- Eyebrow at x=96, y=150: 11px uppercase technical mono, letter-spacing 0.18em, color #7C847E: "COMMITTODO — BRANCH-BASED TO-DO".
- Hero headline, left-aligned at x=96, y=196, max width 840: two lines of extremely large Chinese display type, 116px, weight 700, line-height 0.96, letter-spacing -0.02em, color bone white #F3F4EF. Line 1: "把目标分支化". Line 2: "把进展提交掉", with the two characters "提交" in electric mint green #5BFF9E carrying a soft 18px bloom.
- Sub-copy at x=96, y=470, 18px / 1.65, max width 440, color #8B928C: "一条主干，随时分叉，做完就合并。每次推进，都留在时间线上。"
- One primary CTA at x=96, y=548: a 52px-tall, fully rounded solid bone-white button with 15px black text "开始第一条分支 →". Beside it, a quiet gray text link "看它怎么工作" with no border and no fill.

VISUAL ANCHOR — the single focal point of the whole page: a monumental branch sculpture built from hairline luminous filaments, 1px, color drifting from cold bone white into mint. It enters from the bottom-left corner, travels right, forks into two long elegant arcs that open wide, and reconverges at one glowing node at approximately 68% width / 42% height. At the merge point sits a 22px molten-green sphere: intense mint core, wide soft volumetric bloom about 180px across, one thin elliptical orbital ring, and a few hair-thin light streaks trailing back along the lower arc. Shallow depth of field — filaments slightly out of focus behind the node. The filaments must read as precision engineering: continuous strokes, exact intersections, no scattered dust, no bokeh confetti, no starfield.

PRODUCT PANEL: bottom-right, one large anti-reflective glass window about 900px wide, emerging from behind the right edge of the headline and cropped by the bottom and right edges of the frame so it reads as a real product rather than a floating card. 1px border at 10% white, 14px corner radius, matte near-black fill #0B0D0C, a soft 60px ambient shadow, and a razor-thin mint highlight along its top edge. Inside, only two panes: on the left a vertical branch tree with three branch rows, tiny mint status dots, hairline connectors and 14px labels; on the right a task detail pane with three task rows and a compact commit timeline of four entries with short mono hashes and timestamps, 13px text, realistic Chinese UI copy. All text sharp, correctly spelled, evenly spaced, minimum 13px, no lorem ipsum, no fake glyphs.

COLOR: strictly three families only — graphite black, bone white, electric mint #5BFF9E. No blue, no purple, no orange, no cyan, no rainbow gradients, no multi-color glow.

LIGHT: one mint key light from the merge node (volumetric, soft falloff), one cool white rim light grazing the top edge of the glass panel and the filament, and 90% of the frame held in deep shadow. Cinematic contrast, blacks truly black, no grey haze.

TYPE: modern Chinese geometric-grotesque display face in the spirit of MiSans / PingFang SC, tight tracking, large optical size; small labels in a technical mono in the spirit of JetBrains Mono. Confident, editorial, expensive — not cute, not rounded-playful.

MATERIALS & DETAIL: matte black anodized surfaces, 1px hairlines, anti-reflective glass, 4% film grain, gentle vignette, no glossy skeuomorphism, no beveled edges.

AVOID: particle dust fields, starfields, nebula clouds, glowing nebula blooms, three-column or four-card feature grids, floating dashboard cards, five-column dashboard walls, isometric 3D illustrations, neon purple/blue SaaS gradients, gradient-filled buttons, blur-glass everywhere, emoji, a cartoon icon beside every nav item, unreadable 10px UI text, generic "AI brain" imagery, lens flare spikes, watermark, text garbling.

MOOD: an Apple keynote product page crossed with a terminal-native developer tool — restrained, quiet, one idea carried all the way to the edge of the frame.
```

### 中文版（对照用，同样单块）

```text
一张面向开发者级个人生产力应用的高端官网首页视觉稿，单张平面 UI 稿，16:10 横版，1512×950，2 倍精细度，不要浏览器外框、不要设备样机、不要水印。

场景：近黑石墨色虚空（#07080A），向四角过渡到 #040505 的垂直渐变，5% 细颗粒噪点，轻微暗角。绝对不要插画人物、不要 3D 软体、不要图库照片。

版式（桌面，左右边距 96px，12 栏网格）：
- 顶部 64px 细长条：最左为极简白色分支符号 + 文字标识 "CommitToDo"，18px / 600，骨白色；中偏左四个 13px 灰色导航标签；最右一颗 40px 胶囊按钮 "开始使用"，骨白填充、黑字。顶栏底部一根 8% 白的 1px 发丝线。
- x=96、y=150 的小标签：11px 大写技术等宽字，字距 0.18em，颜色 #7C847E，文案 "COMMITTODO — BRANCH-BASED TO-DO"。
- 主标题，左对齐，x=96、y=196，最大宽度 840：两行超大中文显示字，116px，字重 700，行高 0.96，字距 -0.02em，骨白 #F3F4EF。第一行 "把目标分支化"；第二行 "把进展提交掉"，其中 "提交" 两字为电光薄荷绿 #5BFF9E，带 18px 柔和辉光。
- 副文案：x=96、y=470，18px / 1.65，最大宽度 440，颜色 #8B928C，文案 "一条主干，随时分叉，做完就合并。每次推进，都留在时间线上。"
- 主按钮：x=96、y=548，52px 高、全圆角的骨白实心按钮，15px 黑字 "开始第一条分支 →"。旁边一个安静的灰色文字链 "看它怎么工作"，无边框无填充。

主视觉（全页唯一焦点）：一座由发丝级光线构成的分支雕塑，线宽 1px，颜色从冷骨白过渡到薄荷绿。它从画面左下角切入，向右行进，分叉成两条优雅的长弧并大幅张开，最终在画面 68% 宽、42% 高处汇聚于一个发光节点。汇聚点是一颗 22px 的熔融绿色球体：高亮薄荷核心、约 180px 的宽阔体积辉光、一圈极细的椭圆轨道环，以及几缕比发丝更细的光带沿下弧拖回。景深很浅，节点之后的线条略微失焦。线条必须像精密工程结构：连续、交点准确，没有散落尘点、没有焦外光斑、没有星空。

产品面板：右下角一块约 900px 宽的大尺寸防反光玻璃窗口，从标题右缘后方浮现，并被画框下边缘与右边缘裁切，读起来是真实产品而不是漂浮卡片。1px 边框（10% 白）、14px 圆角、哑光近黑填充 #0B0D0C、60px 柔和环境阴影、顶边一道极细的薄荷高光。内部只保留两栏：左侧纵向分支树，三行分支、细小薄荷状态点、发丝连接线、14px 标签；右侧任务详情栏，三行任务 + 四条提交时间线，含短等宽哈希与时间戳，13px 正文，真实的中文界面文案。所有文字清晰、拼写正确、间距均匀、不小于 13px，不要占位文、不要乱码字形。

色彩：严格只用三族——石墨黑、骨白、电光薄荷 #5BFF9E。不要蓝、不要紫、不要橙、不要青、不要彩虹渐变、不要多色辉光。

光线：唯一薄荷主光来自汇聚节点（体积光、柔和衰减），一道冷白轮廓光掠过玻璃面板顶边与线条，90% 的画面留在深阴影里。电影级对比，黑要真的黑，不能有灰雾。

字体气质：接近 MiSans / 苹方 的现代中文几何无衬线显示字，字距紧、光学尺寸大；小标签使用接近 JetBrains Mono 的技术等宽字。自信、编辑感、昂贵——不要可爱、不要圆润童趣。

材质与细节：哑光黑色阳极氧化表面、1px 发丝线、防反光玻璃、4% 胶片颗粒、柔和暗角，不要高光拟物、不要倒角边缘。

避免：粒子尘场、星空、星云、发光星云团、三栏或四卡片卖点网格、漂浮仪表盘卡片、五栏后台墙、等距 3D 插画、紫蓝霓虹 SaaS 渐变、渐变填充按钮、满屏毛玻璃、emoji、每个导航项都配卡通图标、10px 不可读的界面小字、通用的 "AI 大脑" 意象、镜头光斑尖刺、水印、文字错乱。

气质：苹果发布会产品页 × 终端原生开发者工具——克制、安静，一个想法一路推到画面边缘。
```

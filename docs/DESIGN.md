# CommitToDo 设计交接

**更新于 2026 年 11 月 20 日。** 首页明暗两稿、分组树和全套页面效果图已进入交接。面向 Web 实施的页面、组件、视觉和动效依据集中在本目录。画稿是带示例数据的桌面图，产品功能与版本以框架为准。

## 从哪里开始

| 要查的内容 | 入口 |
| --- | --- |
| 页面范围、路由、明暗稿、分组树操作、状态与响应式 | [页面设计](UI-PAGES.md) |
| 七种分支色相、语义色、共享尺寸、分组树和泳道图 | [视觉规范](UI-VISUAL.md) |
| 应用外壳、控件、业务组件、弹层及页面装配 | [组件清单](UI-COMPONENTS.md) |
| 首页首屏 1.4 秒编排、入视播放、暂停重播、减少动效 | [首页动效规范](HOMEPAGE-MOTION.md) |
| 按页面和操作直接看 PNG | [全套画稿总览](../2026-11-19/homepage-visual-review/outputs/design-system/index.html) |
| 提取样式值或渲染画稿 | [令牌 JSON](../2026-11-19/homepage-visual-review/outputs/design-system/design-tokens.json) · [生成的 CSS 变量](../2026-11-19/homepage-visual-review/outputs/design-system/tokens.css) |

## 确认的设计基准

- **营销首页。** 浅色纸白，深色蓝灰和局部点色。沿用「把小事放进自己的今天。」、便签工作台、分支时间树、生活场景与结束行动。章节顺序以两个选定原图为准。两张原图已按字节复制到交接目录。[浅色首页](../2026-11-19/homepage-visual-review/outputs/design-system/images/p00-home-light.png) · [深色首页](../2026-11-19/homepage-visual-review/outputs/design-system/images/p00-home-dark.png)
- **应用分支页。** 默认设计采用分组树，保留单根和三层结构。点分支名称进详情，点行尾「更多」查看操作，新建在右侧栏中进行。其他树稿可作探索参考。[选定分组树与操作画稿](../2026-11-19/homepage-visual-review/outputs/design-system/index.html#p02-branches) · [分支弹层](../2026-11-19/homepage-visual-review/outputs/design-system/index.html#branch-operations)
- **页面总量。** 12 个独立页面与 38 个补充视图或操作状态，各有浅色和深色，共 100 张页面图。视觉规范另有两张明暗样板。画稿统一放在交接目录，页面索引以原图和实际阶段为单位。[页面总览](../2026-11-19/homepage-visual-review/outputs/design-system/index.html)
- **共享示例。** 今天、分支详情和历程使用同一条「完成线框初稿」，归属「工作 / 产品设计」，11 月 20 日 16:42。示例便于核对跨页一致性。真实首条待办默认落在用户自己的根分支「我」。[功能框架](FRAMEWORK.md)

## 哪份文档决定什么

| 内容 | 优先依据 |
| --- | --- |
| 产品边界、使用术语与数据承诺 | [产品定位](PRODUCT-STRATEGY.md)与[产品框架](FRAMEWORK.md) |
| 对象状态、版本阶段、业务规则 | [产品框架](FRAMEWORK.md) |
| 存储、认证渠道、同步和工程选择 | [技术架构](TECH-ARCHITECTURE.md) |
| 页面层级、入口、可见状态与操作反馈 | [页面设计](UI-PAGES.md)与[组件清单](UI-COMPONENTS.md) |
| 样式数值、图形语义与动效 | [视觉规范](UI-VISUAL.md)、[令牌](../2026-11-19/homepage-visual-review/outputs/design-system/design-tokens.json)与[首页动效](HOMEPAGE-MOTION.md) |

- **MVP** 可直接使用本机工作区，本机备份、导出和从文件恢复按 MVP 验收。
- **V1** 内含年轮、本机快照恢复和异地 JSON 备份。异地备份使用匿名设备模式。
- **V2** 才出现可选账号和连续同步。登录、注册和找回套图采用邮箱流程作为视觉稿，实际渠道和同步冲突细节按 V2 技术决策落地。

## 实施核对

1. 从应用壳与基础令牌开始对照两套主题。桌面图用于版式检查，窄屏按页面设计的布局与交互规则验收。
2. 跑通本机纵切：首次添加并完成 → 生成提交 → 展开并定位时间树。用已确认的分组树走查新建、移动和收尾等相关状态。
3. 核查本机导出、文件校验、恢复前备份和恢复失败保留原数据。按上线阶段呈现页面入口。
4. 首页与应用分开验收。首页自动编排、暂停和重播仅作用于演示，应用状态变更与键盘焦点按组件说明验收。

## 画稿与历史记录

图库、截图和渲染源码放在 [design-system](../2026-11-19/homepage-visual-review/outputs/design-system/index.html) 对应目录。全套图稿包含经过确认的两张首页，不依赖临时附件路径。更新截图时可用同目录 `source/render.mjs` 的普通模式、`--branch-variants` 和 `--all-pages`，再运行 `source/catalog.mjs` 重建图册。

旧候选、旧页面架构和研究观测按历史状态留在原路径。仓库此前的归档仍可用于查决策经过。[历史归档](archive/README.md) · [旧动效研究](../2026-11-19/homepage-visual-review/outputs/homepage-images/motion/动效研究与提示词.md)

# 单行编辑与版本冲突生成提示词

使用内置 ImageGen 生成两张独立的 1536 × 1024 桌面画稿。两张均以[已定稿浅色首页](../../../design/images/p00-home-light.png)作为风格参考，示例记录为虚构数据。

两张属于后续单行编辑方案。版本冲突时保留正在编辑的字段，刷新后核对最新内容。受限字段、审计规则和待定项见[管理站设计与契约](../../DESIGN.md)。

## 编辑分支

[查看原图](13-row-edit-light.png)

```text
Use case: ui-mockup. Create one polished real 1536×1024 landscape desktop web application viewport for CommitToDo 管理站. Reference image is the approved CommitToDo homepage for visual style only. Carry forward the tilted outline C mark, black CommitToDo wordmark, ocean-blue controls, pale cool lines, light-blue selection, sharply set Chinese typography. Do not copy its landing-page layout. Full bleed flat screenshot at 100 percent desktop scale, no browser frame, no devices, no advertising, no slideshow or two frames. Use normal desktop sizing, restrained whites and blue-gray, real app density, small corner radii and precise alignment. Clear Chinese typography with literal labels.

Composition shared by both drawer states: white 64 px global header with around 72 px side insets; left tilted C logo “CommitToDo 管理站”, text tabs “总览”, “数据表”, “审计” with slim blue underline under 数据表; on right admin@example.com and outlined “退出登录”. No side nav. Below on paper-blue-gray canvas is quiet link “返回表清单”, heading “浏览 branches”, small pill “方案预览”, subtitle “示例数据”. White fine-bordered read-only table with headers “分支 ID”, “标题”, “状态”, “版本”, and a few clearly synthetic rows “br_demo_018 / 产品设计 / 进行中 / 7”, “br_demo_014 / 阅读笔记 / 进行中 / 3”, “br_demo_009 / 跑步 / 进行中 / 2”. Mark the first row by soft blue fill and thin blue left rule. Use a thin very-light slate scrim over the underlying page; maintain legibility. Open an elegant crisp right-side edit drawer, about 480px wide, flush with right edge, from below the 64px header to screen bottom. White drawer, 28px horizontal interior padding, subtle shadow and border. Top title “编辑分支” 24–28 px, quiet metadata “br_demo_018” in a neat mono chip, then 42px editable fields “标题” with “产品设计”, “目标” with “完善首页与工作台体验”, “颜色” with seven small same-size bordered swatches in coral, sky, honey, mint, iris, rose, teal order with sky (second) selected, and required bordered “修改原因 *” with “统一设计分支命名”. Below a thin separator, in quiet text a read-only summary “当前编辑版本 rev 7”, “状态　进行中”, and “归属　user_demo_01”. Keep this technical text neatly aligned, small but legible. No passwords, deletion, creation, force-save, role changes, marketing links, bulk actions, third-party assets, editorial taglines, or other unrelated controls. Concept for later limited single-row edit only.

State: standard edit ready. No alerts, errors or confirmation modal. One short gray helper under 修改原因: “将记录在管理审计中。” Sticky bottom of drawer after ample calm breathing room, buttons right aligned outlined “取消” then blue “保存更改”. Make editing visually distinct from read-only metadata. High contrast and natural rhythm.
```

## 记录已更新

[查看原图](14-row-conflict-light.png)

```text
Use case: ui-mockup. Create one polished real 1536×1024 landscape desktop web application viewport for CommitToDo 管理站. Reference image is the approved CommitToDo homepage for visual style only. Carry forward the tilted outline C mark, black CommitToDo wordmark, ocean-blue controls, pale cool lines, light-blue selection, sharply set Chinese typography. Do not copy its landing-page layout. Full bleed flat screenshot at 100 percent desktop scale, no browser frame, no devices, no advertising, no slideshow or two frames. Use normal desktop sizing, restrained whites and blue-gray, real app density, small corner radii and precise alignment. Clear Chinese typography with literal labels.

Composition shared by both drawer states: white 64 px global header with around 72 px side insets; left tilted C logo “CommitToDo 管理站”, text tabs “总览”, “数据表”, “审计” with slim blue underline under 数据表; on right admin@example.com and outlined “退出登录”. No side nav. Below on paper-blue-gray canvas is quiet link “返回表清单”, heading “浏览 branches”, small pill “方案预览”, subtitle “示例数据”. White fine-bordered read-only table with headers “分支 ID”, “标题”, “状态”, “版本”, and a few clearly synthetic rows “br_demo_018 / 产品设计 / 进行中 / 7”, “br_demo_014 / 阅读笔记 / 进行中 / 3”, “br_demo_009 / 跑步 / 进行中 / 2”. Mark the first row by soft blue fill and thin blue left rule. Use a thin very-light slate scrim over the underlying page; maintain legibility. Open an elegant crisp right-side edit drawer, about 480px wide, flush with right edge, from below the 64px header to screen bottom. White drawer, 28px horizontal interior padding, subtle shadow and border. Top title “编辑分支” 24–28 px, quiet metadata “br_demo_018” in a neat mono chip, then 42px editable fields “标题” with “产品设计”, “目标” with “完善首页与工作台体验”, “颜色” with seven small same-size bordered swatches in coral, sky, honey, mint, iris, rose, teal order with sky (second) selected, and required bordered “修改原因 *” with “统一设计分支命名”. Below a thin separator, in quiet text a read-only summary “当前编辑版本 rev 7”, “状态　进行中”, and “归属　user_demo_01”. Keep this technical text neatly aligned, small but legible. No passwords, deletion, creation, force-save, role changes, marketing links, bulk actions, third-party assets, editorial taglines, or other unrelated controls. Concept for later limited single-row edit only.

State: stale revision refresh required. Insert a small visually warm ivory warning with slim ochre border, fine stroke alert icon, heading “记录已更新” and one concise simplified line “刷新后核对最新内容，再提交修改。” Place it immediately below the drawer heading and above form fields. In this warning show the precise version comparison “编辑版本 rev 7　最新版本 rev 8”. The editable field values remain visible as the in-progress draft. Sticky footer has outlined “取消” and blue “刷新后重试”; this is the one primary action, with no “保存更改” and no overwrite button. Use measured and clear text, same restrained app layout with warm highlight only in the conflict alert.
```


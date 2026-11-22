# 管理站主页面 · ImageGen 提示词

参考图为[定稿浅色首页](../../../design/images/p00-home-light.png)。登录补充参考[浅色 Web 登录稿](../../../docs/web-auth/p09-login-imagegen-light.png)的双栏比例。以下按共用约束与单页提示词记录，生成时每张原图独立调用内置 ImageGen。

## 共用约束

```text
Use case: ui-mockup. Output one premium, full-bleed, landscape desktop web app viewport for CommitToDo 管理站, 1536×1024 or nearby, normal 100% desktop UI scale. Style reference is the supplied approved CommitToDo homepage; inherit thin cool-gray rules, paper-white surfaces, ink-blue type, a small tilted outline square C, restrained blue selection, coral/sky/honey nodes. Build a real product interface with a precise grid and exact high-contrast Simplified Chinese, not an advertisement, slide, device frame, browser chrome, huge typographic hero, or collage. Do not put anything outside the page. Use sharp true UI text, finely drawn monochrome line icons, modest 6–10px corners, virtually flat panels, and a few restrained notes of color. Keep the screen calm, fit important content inside the viewport, and fill available width gracefully. No marketing links, AI widgets, generic bento decorations, or unrelated actions.

Shared signed-in shell: 64px white horizontal top bar with centered max-width 1376px contents, 72px visual side gutters, tilted C + CommitToDo followed by small “管理站”, three text tabs “总览” “数据表” “审计” (active tab blue with a 2px underline), right-aligned “admin@example.com” and outlined “退出登录”. Thin divider below. No sidebar. Below, pale blue-gray page canvas with a prominent 30–34px left aligned page title, restrained 14px body and 13–14px table text. Use quiet padding, aligned numeric columns, editable and read-only states legible in words, no unrelated fake functions. Sample records never include real identities; show one small “示例数据” label near sample data.
```

## 登录管理站

[原图](01-login-light.png)

```text
Image 1 is approved light homepage and image 2 is approved Web sign-in, both style references. This is a separate internal administrator sign-in, not consumer sign-in. White 64px top header with the same CommitToDo wordmark and small outlined 管理站 tab; right only quiet “内部使用”. Beneath it a beautifully proportioned stable two-column layout centered at normal desktop scale. Left form width about 340px, heading “登录管理站” and caption “使用已获授权的管理员邮箱登录。”, 44px labeled fields “邮箱” (admin@example.com) and “密码” (empty, 输入密码 and small eye glyph), and full-width deep-blue “登录” arrow CTA. Neutral tidy form, no other functions and no sign-up, password reset, SSO, link to consumer workspace or app nav. Right a refined ice-blue product identity panel with a small paper check-note, clean caption “管理访问”, and an original abstract diagram on an inset white sheet showing three horizontal colored tracks with thin round paths merging into a single blue outline node with a tiny shield-check glyph. Visually echo the homepage time tree and receipt style with one small blue “权限校验” receipt at lower right. Diagram is decorative and contains no person, credentials, metric, or internal business records. Grounded subtle shadows only, fine typography, generous margin, full-bleed screen.
```

## 指标总览

[原图](02-overview-ready-light.png)

```text
“总览” selected. Design the primary operations analytics screen “指标总览”. To its right precision date controls “2026-11-01” to “2026-11-22” and outlined “刷新”. Under header a slim source strip “运营事件表 · 已就绪” and “首见表 · 已就绪”, “示例数据” at right. Next five small KPI cards in one row, exact labels and values: “日活账号” 128, “日活设备” 156, “周活” 642, “月活” 1,286, “新增账号” 24. Middle main visual: left 61% “活跃趋势” fine blue line with 7 real circular points and subtle grid lines, short honey line as compare series, sensible date axis. Right 39% “账号留存” with D1 42%, D7 26%, D30 “样本不足”, and restrained cohort microgrid with light blue fills and only three rows; missing observations use em dash. Bottom in same visible viewport three compact balanced panels “同步” (成功率 98.4%), “备份” (成功 36 / 失败 2), “有效提交” (活跃账号 64 / 提交 193). Graph design should feel like the thin timeline in reference, but conventional data axes and no decoration. Keep table/chart reading easy and spacious, show only requested numbers, no percent change badges, no export, no sidebars, no external logs.
```

## 数据表目录

[原图](04-tables-light.png)

```text
“数据表” selected. Page heading “数据表”, subheading “浏览云端业务与运营数据。当前仅提供只读访问。”, one subtle count “18 张表”. Main visible area is a generous structured catalog table, clear columns “名称”, “表”, “权限”, “状态”, and a right aligned row action. Show nine rows with very clear text and quiet two-tone icon blocks selected from the homepage branch colors: 分支 branches, 待办 tasks, 提交 commits, 里程碑 milestones, 账号 users, 设备 devices, 运营事件 ops_events, 用户首见 user_first_seen, 管理审计 admin_audit_log. Each permission “只读”; six ready with small mint dot and “已就绪” + blue “浏览 ›”; show ops_events and user_first_seen as “未就绪” with subdued gold dot and disabled browse, admin_audit_log can be ready. No technical environment identifier, generic top search, section numbers, create/insert/delete/export, bulk checkboxes or write controls. Emphasize table typography and dense but roomy rhythm (57px rows); horizontal rules fine with one lightly ice-blue hovered row. Bottom unobtrusive “已显示部分表” or no table footer; not a fake pager. The screenshot is one normal desktop viewport with clear alignment.
```

## 单表浏览

[原图](05-table-browser-light.png)

```text
“数据表” selected. Build the read-only branches table browser. Top quiet back arrow “返回表清单”, large “浏览 branches”, “分支” and quiet “只读” badge. One field with clearly visible label “按 ownerId 筛选”, placeholder “输入 ownerId”, outlined secondary “筛选”. Small “示例数据” near table top. Full-width cool white table with columns “_id”, “ownerId”, “title”, “status”, “rev”, “updatedAt” and right “详情”. Thin rules, 6–8 rows at ~45px. ID examples br_demo_018, br_demo_017, br_demo_016; owner u_demo_02; use readable titles “产品设计”, “页面调研”, “跑步”, “阅读”, “每周回顾”, and compact quiet text statuses 活跃 or 归档. Realistic rev integers 7, 3, 2 and concise YYYY-MM-DD HH:mm example values. Place blue “查看详情 ›” per row or unobtrusive line icon plus “详情”; one barely tinted row. Bottom “加载更多” outlined, no invented numbered pagination. No row creation, command bar, bulk select, editable lifecycle, or export. Carefully balanced width and native product density.
```

## 只读行详情

[原图](15-row-detail-light.png)。沿用上一节的表浏览提示词，追加如下要求。

```text
Show this viewport while its first row br_demo_018 is selected and a sophisticated, full-height-from-below-header right detail drawer is open. Drawer only 440–470px wide. Backdrop left with table discernible, modest bluish dim, selected row still visible. Drawer paper white with muted cool-blue border and fine shadow from vertical left seam. Header “行详情” with close × and subdued label “branches”; headline “产品设计”, small pills “只读” and “rev 7”. Read-only key/value data only: _id br_demo_018, ownerId u_demo_02, status active, updatedAt 2026-11-22 10:42, color sky. Generous line spacing and small monospaced values. A quiet contained “原始字段” inset with valid short JSON for this same record, secondary to field summary. No edit, delete, save or export. Strong information hierarchy, integrated with table rather than a modal in center.
```

# 管理审计与鉴权状态 · 生成提示词

四张浅色桌面稿由内置 ImageGen 逐张生成，统一为 1536 × 1024。登录邮箱与审计行均为视觉样例。字段白名单、鉴权状态和实施阶段以[管理站设计与契约](../../DESIGN.md)为准。

审计稿展示已有审计记录时的只读浏览形态。鉴权稿共用品牌顶栏与卡片骨架，分别使用珊瑚、蜂蜜黄、蓝三种状态点色。账号资料读取失败提供重新校验和退出，其余两种状态只提供退出。

## 管理审计

[06-audit-light.png](06-audit-light.png) · 输入参考为[定稿浅色首页](../../../design/images/p00-home-light.png)。

### 首稿

```text
Use case: ui-mockup. Generate exactly one high-fidelity CommitToDo internal admin desktop web page for 管理审计, full-bleed landscape 1536×1024 with no browser chrome. Image 1 is the approved light homepage for brand colors, tilted outlined C, and restrained typography; borrow its blue-highlight on white, clean icon strokes and paper-like clarity. The result is an actual work screen, with a precise horizontal UI shell and density suitable for reading rows. Match a 64px white header and centered 1376px max content with 72px margins. Left logo tilted outlined C and exact “CommitToDo 管理站”; inline tabs “总览”, “数据表”, “审计”, with only 审计 blue and a thin baseline underline directly below. Right “admin@example.com” and small outlined “退出登录” button. A light hairline divides the header. Very pale blue-gray body. On a shared left grid, h1 “管理审计” at 32px, then the single modest description “留存每次管理修改，便于追溯和核对。” At top right use a small outlined refresh button “刷新”. One unobtrusive blue-soft status chip “只读” and a neutral chip “示例数据” near the heading. One precise white hairline table surface, 10px corners, 13–14px text. Column labels exactly “时间”, “操作者”, “动作”, “目标”, “变更字段”. Seven neatly separated plausible synthetic rows. Dates 2026-11-22 and 2026-11-21; actor admin@example.com; action admin.update in monospaced small type; targets like branches / br_8c42, tasks / tk_415c, milestones / ms_713e, settings / st_71ac, commits / cm_a21f; short field chips title, goal, color, note, theme, summary. Do not show actions besides 刷新 and 加载更多. A thin vertical date grouping cue with two tiny aligned dots can subtly echo the homepage timeline if it does not disrupt tabular alignment. Table head lightly tinted, comfortable row height, accurate baseline and alignment. Slim footer “加载更多” with modest whitespace. Color restricted to deep slate type, cloud-white main surface, pale blues, softly muted cool gray metadata. Fine geometry and type, no marketing display title, no sidebar, no cards or chart, no gradient, no dramatic shadow, no splash photography, no dashboard widgets or personal records. Make Chinese clean and faithful.
```

### 审计字段定向修订

```text
Use case: precise-object-edit. The attached admin audit screen is the sole edit target. Keep the full 1536×1024 screen, paper-like icy white shades, type style and alignment, date groups, header including navigation and active underline, description, buttons, boundaries, all existing date/time, actors, action strings and targets exactly fixed. Change only the blue chips in the rightmost “变更字段” column. For time 14:26:17 (branches) use title, color. For 11:03:09 (tasks) use title, note. For 10:47:33 (milestones) use title, note. For 09:15:02 (settings) use theme. For 16:58:27 (commits) use only summary. For 14:22:41 (tasks) use only note. For 10:06:19 (branches) use title, goal. Copy these seven small sets literally and precisely and do not add any fields. No other difference.
```

## 无权访问

[07-forbidden-light.png](07-forbidden-light.png) · 输入参考为[定稿浅色首页](../../../design/images/p00-home-light.png)与 [Web 浅色登录稿](../../../docs/web-auth/p09-login-imagegen-light.png)。

### 生成

```text
Use case: ui-mockup. Generate exactly one realistic high-fidelity full-bleed landscape 1536×1024 desktop UI mockup for CommitToDo internal admin, light mode. The homepage reference sets the approved tilted outlined C mark, paper-white palette, restrained blue emphasis, legible typography, and thin branch-node motifs. The secondary Web login reference is for brand identity and compact typography, not its two columns. Show simple white 64px top bar with tilted outlined C and “CommitToDo 管理站”, left aligned at x=72, thin lower hairline. No navigation or right-side header controls. Below the header, very pale blue-gray body near white. Single white center card around 506px wide, 355px tall, horizontally centered, its top near y=224, subtle gray-blue 1px border, 12px corners and barely visible diffuse shadow. It has 40px padding, steady left-aligned content with comfortable breathing room. Top a small 40px branch-node status icon tile, then 30px semibold Chinese title, 14px body line height 1.6, a pale neutral inset account row, then compact button(s). Use dark ink, muted text, and colors in readable soft badge/icon accents only. Excellent crisp Chinese glyphs. Exact sane sizes and sparse design. Full real desktop UI edge to edge, no browser UI, no sidebar, no marketing illustration, no marketing slogan, no active account data outside the sample email, no giant logo, no footer, no decorative text. State: the current example email cannot access the internal management site. Icon tile soft peach with a small thin branching path that ends at a closed coral node, warm but calm. Use exact visible strings: header “CommitToDo 管理站”; title “无权访问管理站”; body “当前邮箱不在管理站白名单。请联系管理员确认访问权限。”; account row label “当前登录邮箱”, value “admin@example.com”; one outlined neutral button “退出登录”. No retry, no request-access button, no navigation, no data page.
```

## 邮箱未验证

[08-unverified-light.png](08-unverified-light.png) · 输入参考为[无权访问画稿](07-forbidden-light.png)作为画面编辑目标。

### 生成

```text
Use case: precise-object-edit, high-fidelity landscape web UI mockup. The attached image is the exact full-bleed edit target, the CommitToDo admin access screen and layout template. Preserve its resolution, background, hairline, margins, top-left outlined C and exact brand “CommitToDo 管理站”, card position, width, height, corner radius, light border, text baselines, neutral inset account row, color of the main text and all spacing. The viewport remains a single edge-to-edge desktop page, with no app menu, browser frame, public links, business data, or extra labels. A state change updates only the outlined node tile, title/body copy, and requested action(s). Accurately spell the supplied Simplified Chinese and example address. The state is signed in but email unverified. Replace the warm icon by a honey-yellow rounded tile of the same size, containing the same elegant fine branch lines with one amber hollow endpoint. Title “邮箱未验证”. Body exactly “请先完成邮箱验证，再访问管理站。” Account row remains “当前登录邮箱” on the left and “admin@example.com” on the right. The sole outlined button remains “退出登录”. No retry, no resend email, no extra action.
```

## 账号资料读取失败

[09-identity-error-light.png](09-identity-error-light.png) · 输入参考为[无权访问画稿](07-forbidden-light.png)作为画面编辑目标。

### 生成

```text
Use case: precise-object-edit, high-fidelity landscape web UI mockup. The attached image is the exact full-bleed edit target, the CommitToDo admin access screen and layout template. Preserve its resolution, background, hairline, margins, top-left outlined C and exact brand “CommitToDo 管理站”, card position, width, height, corner radius, light border, text baselines, neutral inset account row, color of the main text and all spacing. The viewport remains a single edge-to-edge desktop page, with no app menu, browser frame, public links, business data, or extra labels. A state change updates only the outlined node tile, title/body copy, and requested action(s). Accurately spell the supplied Simplified Chinese and example address. The state is a temporary account lookup failure, not a denial. Replace the warm icon by a pale soft blue rounded tile of the same size, with a thin cobalt branch path and one dashed connection along its small nodes. Title “无法读取账号资料”. Body exactly “云端账号资料暂不可用，请稍后重试。” Account row remains “当前登录邮箱” on the left and “admin@example.com” on the right. One blue solid button labeled “重新校验” appears at the original first button position, followed to its right by an outlined neutral button “退出登录”. No other action, no request ID, no extra text.
```


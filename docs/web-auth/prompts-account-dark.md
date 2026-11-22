# CommitToDo Web 账号设置深色稿

使用内置 ImageGen 生成。三张图沿用 [深色设置页](../../design/images/p07-settings-dark.png) 和 [现有账号与同步画稿](../../design/images/o07-sync-entry-dark.png) 的工作区外壳。邮箱使用示例值。

## 已登录

现有深色设置页与账号提示作为参考。 [画稿](settings-account-signed-in-imagegen-dark.png)

```text
Use case: ui-mockup. Generate one complete real-scale CommitToDo desktop browser viewport showing the signed-in state of 设置 → 账号. It is a production-capable, beautifully calm dark Web settings screen, not an advertising composition. Image 1 is the exact settings geometry/shell reference. Image 2 is the palette and inline account panel reference. Preserve Image 1's tilted outline C logo, wordmark, topbar with breadcrumb, small actions at right, global fixed left sidebar with the active 我的 entry, application navigation and footer. Preserve the baseline relative geometry of the topbar about 64 CSS px high, global sidebar about 232 px wide, main centered canvas from x335 to x1335, narrow 205px settings nav on the left and 780px main column. The output is one landscape desktop UI image at 1440×1040 or closest ratio, edge to edge, normal 100% zoom. No device frame, chrome, illustration, portrait, or promotional elements. UI text Simplified Chinese.
The main title is exactly “设置”. Put the original 文本 “我的工作区 / 我的 / 设置” in the topbar. The inner section nav has “外观”, “注解”, “账号”, “数据与备份”, “关于”. Only “账号” is active with the current blue-gray highlight, left accent and small outline user glyph. Keep natural 36px navigation rows. 
At the top of the main content column, one confident calm card titled “账号”. Fine muted border and 10px radius. Body contains a single compact row, with “邮箱” and directly under it the neutral sample email “name@example.com”. At row right a tiny calm teal status pill with dot and “已登录”. Below a short subdued divider, a right-aligned 34px outline button “退出登录”. Use a soft muted red accent for the outline and the button label only, not a bright filled destructive button. Beneath it an understated discrete card “本机数据”, one small storage/device icon and a row “存储位置” beside “当前设备”, followed by an unobtrusive link “数据与备份 →”. Keep standard vertical rhythm and leave comfortable whitespace under the cards. No user name, login provider, identity badges, no sync switches, no devices, no subscriptions.
Use the established uniform deep blue-gray dark theme: main #192230, left sidebar #1C2635, surfaces #232F40, header and borders #3A495D adjusted to contrast, text #EFF3F7, muted text #B5C1D1, focus blue #A4C8F8, localized teal #8DE2B9 for signed-in. No harsh split, glowing gradient, glass, grain, shadows except the soft depth actually necessary. Compact real desktop proportions: single title 38–40px, normal account section title 20px, utility body text 14px, subtitles or meta around 13px. Make Chinese glyphs clean and accurate. Keep shell, positioning and size extremely close to Image 1.
```

## 未登录

以这组已登录截图为构图参考。 [画稿](o07-account-signed-out-imagegen-dark.png)

```text
Use case: precise-object-edit. Image 1 is the newly designed signed-in dark CommitToDo account page. Create the matching signed-out O07 inline login state as one complete desktop Web viewport. Preserve Image 1's canvas ratio, exact dark theme values and textures, logo/header/breadcrumb, main headings and margins, global sidebar with 我的 selected, and secondary settings nav in exactly the same order (外观, 注解, 账号 selected, 数据与备份, 关于). Keep the main account panel at the same x/y/width with its lower part shaped by shorter content if needed. Preserve the separate 本机数据 card below, including 存储位置, 当前设备 and 数据与备份 →. 
Change only the upper account card contents. Its header still says “账号”. Under the hairline add a tiny outlined user icon on a subtly tinted square and an in-context explanatory sentence written verbatim “登录后可在多设备使用”, a modest useful text line “本机工作区仍可继续使用。” beneath. To the right in the same inline row are two compact controls, a 34px pale-blue filled dark-text “登录” and a blue-gray outline “注册”. Keep heading and controls desktop scale. Remove all signed-in example mailbox, signed-in pill and logout control. The entire page behind stays clear and usable. No modal, toast, illustration, OAuth, sync switch or extra marketing. Same uniform blue-gray realm, pale blue action, subdued panel contrast and edges. Normal 100% dark desktop app screenshot exactly like input with precise Chinese typography.
```

## 退出确认

以这组已登录截图为弹窗背景。 [画稿](settings-account-signout-imagegen-dark.png)

```text
Use case: precise-object-edit. Image 1 is the newly designed signed-in dark CommitToDo account page. Keep the exact same full desktop Web viewport ratio, tilted C brand and topbar, dark shell, two sidebars, all card positions, title and account content. Edit this image to show the moment just after someone clicked the inline “退出登录” button. Dim the entire page uniformly with a single translucent dark neutral scrim just enough for the background settings, generic email, and already-signed-in row to remain discernible. Do not blur or change the account page elements behind it. This is a calm small dialog centered in the entire viewport, approximately 430px wide and 158px tall in 100% desktop scale, with natural text sizes. High contrast deep slate #273446 surface, soft 1px border and small round corners, low quiet shadow. Place title “退出登录” and exact explanation “本机数据保留，同步停止。” in a comfortable left-aligned concise body. At bottom right place two practical 34px buttons, quiet outlined “取消” first and modest muted coral accent filled “退出登录” last. Respect the original dark blue-gray palette, no huge icon, no third confirmation, no new features, no English, no screenshot frame, no minuscule body. Good Chinese letterforms. Keep dialog content sharp; retain correct background geometry.
```

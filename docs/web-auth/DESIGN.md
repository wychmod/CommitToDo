# CommitToDo Web 认证视觉交接

**2026 年 11 月 22 日确认。** 登录、创建账号、找回密码三步，以及设置中三种账号状态，采用本目录的 8 组明暗画稿。独立认证页以 **左侧表单、右侧时间树** 的双栏稿为主参考。邮箱、待办和提交均为图中示例，页面行为、账号渠道及阶段按 [V2-01 账号与登录](../prd/V2-01-account-auth.md) 落地。

## 共用布局

- 桌面顶栏左侧为 CommitToDo 品牌，右侧保留「打开本机工作区」。下方使用两个独立区域，左侧承载表单及反馈，右侧沿用同一块时间树插画。对照画稿时以正常桌面比例、留白和表单功能层级为准，控件尺寸、字阶、边界与颜色按[设计令牌](../../design/design-tokens.json)取值。
- 右侧示例由三条分支轨道、勾选便签和「完成线框初稿」回执组成。橙、蓝、金沿用首页示例的分支色，勾选便签与回执保持分离。深色使用[定稿深色首页](../../design/images/p00-home-dark.png)的蓝灰基底，分支线和回执仍清晰可辨。
- 窄屏用单列表单，省略右侧插画，保留页头的本机工作区入口。登录、注册和找回之间保持表单入口位置稳定，步骤变化集中在左侧，右侧示例保持静止。动效与减少动效行为见[应用动效规范](../UI-MOTION.md#p09-登录--v2)。
- 设置中的账号状态使用工作区外壳。在相关操作处展示登录与注册入口，已登录时显示邮箱和退出入口，退出前说明本机数据与同步的变化。

## 登录

P09 · `/auth/login`。左侧包含邮箱、密码、忘记密码及创建账号入口。表单下方的动作与右侧演示画面保持清楚的阅读顺序。

[浅色原图](p09-login-imagegen-light.png) · [深色原图](p09-login-imagegen-dark.png)

## 创建账号

P10 · `/auth/signup`。沿用登录外壳，呈现邮箱、密码和确认密码。图中是填写完成的示例状态。

[浅色原图](p10-signup-imagegen-light.png) · [深色原图](p10-signup-imagegen-dark.png)

## 找回密码

P11 · `/auth/recover` · 第一步「填写邮箱」。使用三步进度指示，提交后进入同一路由的检查邮箱状态。

[浅色原图](p11-recover-imagegen-light.png) · [深色原图](p11-recover-imagegen-dark.png)

## 检查邮箱

S11 · 第二步「检查邮箱」。使用条件式发送说明，显示填写的邮箱、重发冷却和修改邮箱入口。倒计时显示值随请求状态更新。

[浅色原图](s11-recover-sent-imagegen-light.png) · [深色原图](s11-recover-sent-imagegen-dark.png)

## 设置新密码

S11 · 第三步「设置新密码」。保留新密码、确认新密码和返回登录入口。保存成功后回到登录。

[浅色原图](s11-recover-reset-imagegen-light.png) · [深色原图](s11-recover-reset-imagegen-dark.png)

## 账号设置

| 状态 | 浅色 | 深色 | 界面要点 |
| --- | --- | --- | --- |
| 未登录（O07） | [原图](o07-account-signed-out-imagegen-light.png) | [原图](o07-account-signed-out-imagegen-dark.png) | 在设置账号分区内提供登录与注册，工作区仍可使用。 |
| 已登录 | [原图](settings-account-signed-in-imagegen-light.png) | [原图](settings-account-signed-in-imagegen-dark.png) | 展示账号邮箱、已登录状态和退出入口。 |
| 退出登录确认 | [原图](settings-account-signout-imagegen-light.png) | [原图](settings-account-signout-imagegen-dark.png) | 说明「本机数据保留，同步停止。」并提供取消与退出登录。 |

## 居中备选

[P09 居中表单备选 · 浅色](p09-login-centered-imagegen-light.png)保留作视觉对照。登录、创建账号与找回流程共用本页上方的双栏方案。

## 实现验收

- 在桌面核对左侧表单、右侧时间树与顶栏本机入口。切换登录、创建账号或找回步骤时，右侧示例保持稳定。
- 在 390 px 窄屏核对单列表单与可达的「打开本机工作区」，确保软键盘弹起后仍可操作。
- 在设置中核对未登录提示作为行内入口、已登录账号与退出入口，以及由用户触发和关闭的退出确认弹窗。
- 逐页核对浅色和深色下的文本、输入边界、可操作状态和焦点描边。动效按[应用动效规范](../UI-MOTION.md)验收。

## 生成提示词

- [浅色登录与创建账号](prompts-login-signup-light.md)
- [浅色找回流程](prompts-recovery-light.md)
- [深色独立认证页](prompts-auth-dark.md)
- [浅色账号设置](prompts-account-light.md) · [深色账号设置](prompts-account-dark.md)
- [居中登录备选](prompts-alternative.md)

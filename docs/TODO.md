# 待办

> 本文档记录需要人工处理或等待外部信息的事项。完成一项后请直接勾掉或删除对应条目。

## 微信小程序接入（阻塞中）

- [ ] **安装微信开发者工具 Nightly**：需要 Electron Build ≥ 2.02.2607032，下载页 https://developers.weixin.qq.com/miniprogram/dev/devtools/log#nightly 。本机目前未安装，`wechatide` 命令不存在。
- [ ] **导出并接入开发者工具 Skill**：安装后在终端执行 `wechatide`（或在菜单「导出开发者工具 Skill」导出），把输出的 Skill 路径提供给 Agent 完成接入。
- [ ] **首次连接授权**：Agent 首次连接会在开发者工具内弹窗要求授权 `clientName`，需人工点「允许」；若提示扫码登录，由人工完成。
- [ ] **提供小程序 AppID**：仓库内没有 `project.config.json`，也没有真实 AppID，暂无法创建小程序工程。
- [ ] **核验 AppID 与 CloudBase 环境关联**：拿到 AppID 后，在控制台确认该小程序是否已关联环境 `committodo-d6gmapg0j6397889f`；若出现「环境迁移 / 转换」提示，需原样保留提示内容后再决策，不自行执行转换。

## 已完成（留档）

- [x] CloudBase CLI 就绪并验证可读环境：`committodo-d6gmapg0j6397889f`（个人版，`ap-shanghai`，`baas`）。
- [x] Web 端 CloudBase SDK 接入（`web/src/data/cloud/client.ts`），提交 `4df7ccb`，未 push。

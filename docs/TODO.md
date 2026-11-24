# 待办

> 本文档记录需要人工处理或等待外部信息的事项。完成一项后请直接勾掉或删除对应条目。

## 代码走查修复后的人工验证（2026-11-24）

本地门禁（lint / test / build）已全绿，但下面几条需要真实账号与云环境，无法在本地闭环：

- [ ] **异地备份重新上传一次**：`backup-sign` 的对象键改为 `remote-backups/<uid>/…`，旧键一律返回 `backup.legacy_key`。部署后在「数据与备份 → 异地备份」重新上传一份，确认下载与删除可用。
- [ ] **多设备同步复验**：`outbox.baseRev` 语义修正后，用两台设备登录同一账号，按 V2-02 §6 验收 1–3 重跑一次（编辑同一分支 → 3 秒内反向同步 → 不出现误判冲突）。
- [ ] **`sync-pull` 索引核对**：函数在集合缺 `updatedAt` 索引时改为报 `scan_overflow`。上线前在控制台确认 `branches` / `tasks` / `commits` / `milestones` / `badges` 五个集合都有 `updatedAt` 索引。
- [ ] **CI 首次运行**：新增 `.github/workflows/web.yml`，推上去确认 `npm ci` + lint + test + build 三步在干净环境通过。

## 微信小程序接入（阻塞中）

- [ ] **安装微信开发者工具 Nightly**：需要 Electron Build ≥ 2.02.2607032，下载页 https://developers.weixin.qq.com/miniprogram/dev/devtools/log#nightly 。本机目前未安装，`wechatide` 命令不存在。
- [ ] **导出并接入开发者工具 Skill**：安装后在终端执行 `wechatide`（或在菜单「导出开发者工具 Skill」导出），把输出的 Skill 路径提供给 Agent 完成接入。
- [ ] **首次连接授权**：Agent 首次连接会在开发者工具内弹窗要求授权 `clientName`，需人工点「允许」；若提示扫码登录，由人工完成。
- [ ] **提供小程序 AppID**：仓库内没有 `project.config.json`，也没有真实 AppID，暂无法创建小程序工程。
- [ ] **核验 AppID 与 CloudBase 环境关联**：拿到 AppID 后，在控制台确认该小程序是否已关联环境 `committodo-d6gmapg0j6397889f`；若出现「环境迁移 / 转换」提示，需原样保留提示内容后再决策，不自行执行转换。

## 已完成（留档）

- [x] CloudBase CLI 就绪并验证可读环境：`committodo-d6gmapg0j6397889f`（个人版，`ap-shanghai`，`baas`）。
- [x] Web 端 CloudBase SDK 接入（`web/src/data/cloud/client.ts`），提交 `4df7ccb`，未 push。
- [x] 代码走查发现的 P0/P1 问题全部修复（outbox `baseRev`、树级只读、导入归属、清空范围、`backup-sign` 鉴权、年度总结入导出、移动分支状态、收尾取消待办、同步状态、跨零点、增量分页、日期校验、断点、路由分包），并补 9 条回归用例与 CI 配置。


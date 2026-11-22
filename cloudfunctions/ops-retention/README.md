# ops-retention

清理 `ops_events` 中超过 400 天的原始事件，由定时触发器每天调用一次。

## 触发

- 触发器名：`ops-retention-daily`
- Cron：`0 10 3 * * * *`（每天 03:10，SCF 定时触发器按北京时间）
- 目标函数：`ops-retention`

创建命令：

```bash
tcb fn trigger create ops-retention --trigger-name ops-retention-daily --cron "0 10 3 * * * *" -e committodo-d6gmapg0j6397889f
```

## 行为

- 只删除 `at < 服务端当前时间 - 400 天` 的行，不碰其他集合。
- 单次最多删除 5000 行；未删完时下一次触发继续。
- 带用户身份的客户端调用返回 `ops_retention_forbidden`；定时触发器与控制台运维调用无用户身份，可执行。
- 返回 `{ ok, data: { retentionDays, cutoffIso, scanned, deleted, capped } }`。

## 部署

```bash
tcb fn deploy ops-retention --cwd admin -e committodo-d6gmapg0j6397889f
```

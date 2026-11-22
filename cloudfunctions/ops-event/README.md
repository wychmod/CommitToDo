# ops-event

客户端行为事件采集函数（写入 `ops_events`，并维护 `user_first_seen` 派生表）。

## 调用

```js
await app.callFunction({
  name: 'ops-event',
  data: {
    events: [
      {
        event: 'app.open',
        platform: 'web',
        localDate: '2026-11-22',
        tzOffset: 480,
        visitorId: 'v_xxx',
        deviceId: 'd_xxx',
        appVersion: '2.0.0',
      },
    ],
  },
});
```

- 单次最多 20 条，未知事件 / 未知 props 键 / 非法类型整包拒绝。
- `userId` 只由服务端从登录身份解析，客户端传值被忽略；未登录时要求 `visitorId` 或 `deviceId`。
- 去重键：`app.open` 为 `evt:app.open:<账号或匿名>:<设备>:<localDate>`；`account.signup` 为 `evt:account.signup:<账号>:<localDate>`；其余事件要求 8–64 位 `eventId`，键为 `evt:<event>:<eventId>`。
- 失败返回 `ok:false` + 错误码，客户端应静默忽略，不阻塞主流程。
- 不写邮箱、标题、备注、业务实体 ID、IP 或自由文本。

## 环境变量

无。函数名固定 `ops-event`（小写连字符）。

## 部署

```bash
tcb fn deploy ops-event --cwd admin -e committodo-d6gmapg0j6397889f
```

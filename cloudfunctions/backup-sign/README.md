# backup-sign

Web 异地备份的云函数。只做对象存储的读写，不碰任何业务集合。

## 部署前提

- 函数名必须是 `backup-sign`：SCF 不允许点号，`cloudbaserc.json`、目录名与 Web 调用名三处一致。
- 运行时 `Nodejs20.19`。`@cloudbase/node-sdk@4` 依赖 bson 7，需要 Node ≥ 20.19；旧函数若仍是 `Nodejs16.13`，运行时只在创建时生效，需重建函数再由 `tcb config update fn` 落地配置。
- 环境变量：
  - `BACKUP_BUCKET`：对象存储桶 ID。PG 环境必须显式指定，不能依赖默认桶。
  - `BACKUP_API_KEY`：service_role API Key。PG 存储由 RLS 把关，云函数默认是匿名角色，只有 service_role 能越过策略。
- `BACKUP_API_KEY` 属于密钥，**不写入仓库**。部署前确认云端函数仍保留该环境变量；用仓库内 `cloudbaserc.json` 覆盖部署时不要把已有的 key 冲掉。

## 存储路径与契约

- PG 模式统一走 `app.storage.from(BACKUP_BUCKET)`，路径是桶内对象名，不是 `cloud://` fileID。
- `upload` 返回 `{ remoteKey }`，`remoteKey` 即桶内对象名；`download` 用 `createSignedUrls` 批量签名接口返回 `{ url }`（单个 `createSignedUrl` 在 PG 模式下会走传统签名分支并返回 404）；`remove` 删除对象。
- 错误码：`backup.empty_payload`、`backup.invalid_key`、`backup.upload_failed`、`backup.download_failed`、`backup.not_found`、`backup.delete_failed`、`backup.unknown_action`。

## 部署与验证

```bash
tcb fn deploy backup-sign -e committodo-d6gmapg0j6397889f --region ap-shanghai --force
```

验证回合：上传 → `download` 取签名地址 → 实际下载比对正文 → `delete` → 再次 `download` 应返回 `backup.not_found`。

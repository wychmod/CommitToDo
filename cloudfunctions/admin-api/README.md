# admin-api

管理站唯一云端入口。所有 action 进入前都独立校验 CloudBase 登录身份与 `ADMIN_EMAILS` 白名单。

## 环境变量

| 变量 | 必填 | 说明 |
|---|---|---|
| `ADMIN_EMAILS` | 是 | 逗号分隔的邮箱白名单；函数内 `trim + 小写` 归一化；**为空时拒绝所有访问** |
| `ADMIN_EMAIL_VERIFICATION_MODE` | 否 | `enforce`（默认）要求账号资料明确返回邮箱已验证；`trust-login` 用于已确认登录强制验证、但接口不返回验证字段的环境 |

不要在仓库或前端写入真实邮箱；只在 CloudBase 函数环境变量中配置。

## 部署

```bash
cd admin
npx @cloudbase/cli functions:deploy admin-api -e committodo-d6gmapg0j6397889f
```

`admin/cloudbaserc.json` 的 `functionRoot` 指向 `../cloudfunctions`，只声明本函数，不修改根目录共享配置。

## 错误码

- `admin_unauthenticated`：未登录。
- `admin_email_unverified`：邮箱为空或未验证。
- `admin_forbidden`：不在白名单，或白名单为空。
- `admin_identity_unresolved`：账号资料读取失败，可重试。
- `admin_collection_missing`：依赖表尚未创建。
- `admin_metrics_unavailable`：指标事件表尚未就绪。
- `admin_not_implemented`：编辑能力尚未开放。

## 当前范围

只读：`whoami`、`meta.contract`、`tables.list`、`tables.rows`、`tables.row`、`metrics.overview`、`metrics.retention`、`metrics.timeseries`、`audit.list`。
`tables.update` 固定返回 `admin_not_implemented`，等 `admin_audit_log` 与事务写入验收后再开放。

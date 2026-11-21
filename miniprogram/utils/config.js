'use strict';

/**
 * 小程序环境参数。
 *
 * `ENV_ID` 留空时使用小程序默认云环境；与 Web 共用同一个 CloudBase 环境时
 * 填入部署参数里的 `envId`（与 `cloudbaserc.json` 一致）。
 * `WEB_URL` 只用于未绑定提示里的账号绑定入口说明，不做跳转。
 */
module.exports = {
  ENV_ID: '',
  READ_FUNCTION: 'workspace.read',
  CACHE_PREFIX: 'committo.mp.v1.',
  WEB_URL: 'https://committodo.example.com'
};

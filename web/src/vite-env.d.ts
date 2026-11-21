/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** CloudBase 环境 ID；仅本地/部署环境注入，不写进源码（TECH §9.1）。 */
  readonly VITE_CLOUDBASE_ENV_ID?: string;
  /** CloudBase 环境地域，例如 ap-shanghai。 */
  readonly VITE_CLOUDBASE_REGION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

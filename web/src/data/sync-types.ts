/**
 * 同步用例与云端适配共用的结果形状（PRD V2-02 §5 / §8.1）。
 */

export interface PushOpResult {
  opId: string;
  /** false 表示服务端按 `baseRev` 拒绝了过期写入。 */
  accepted: boolean;
  /** 冲突时服务端当前版本，供本地直接采用。 */
  serverRev?: number | null;
  server?: Record<string, unknown> | null;
}

export interface SyncRunSummary {
  pushed: number;
  conflicts: number;
  pending: number;
  lastSyncAt: number | null;
  /** 离线时不发请求，返回 `offline: true`，outbox 原样保留。 */
  offline: boolean;
}

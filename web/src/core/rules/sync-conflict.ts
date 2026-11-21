/**
 * 过期写入判定与冲突记录构造（PRD V2-02 OP-03 / §8.2）。
 *
 * 服务端按 `baseRev` 拒绝过期写入：客户端采用服务端当前版本，
 * 把本地被拒版本原样写入 `conflicts`，不静默覆盖，也不自动回写本地。
 */

export interface ConflictRecord {
  entity: string;
  entityId: string;
  /** 对象不在分支下（如设置）时为 null。 */
  branchId: string | null;
  /** 具体字段名；为空表示整行冲突。 */
  field: string | null;
  localPayload: Record<string, unknown> | null;
  serverPayload: Record<string, unknown> | null;
  deviceId: string | null;
  localRev: number | null;
  serverRev: number | null;
  at: number;
}

export interface ConflictInput extends Omit<ConflictRecord, 'branchId' | 'field'> {
  branchId?: string | null;
  field?: string | null;
}

export interface WriteAssessmentInput extends ConflictInput {
  baseRev: number | null;
  serverRev: number | null;
}

export interface WriteAssessment {
  /** true 表示服务端已拒绝本次写入，应采用服务端版本。 */
  stale: boolean;
  serverRev: number | null;
  /** 仅当 stale 时给出；`resolved` / `resolvedAt` 本期不写入。 */
  conflict: ConflictRecord | null;
}

/**
 * `baseRev = null` 是首次写入，不算过期；服务端版本未知时也无法判定，交给服务端。
 * 版本恰好相同表示基于最新版本，允许写入。
 */
export function isStaleWrite(baseRev: number | null, serverRev: number | null): boolean {
  if (baseRev === null || serverRev === null) return false;
  return baseRev !== serverRev;
}

export function buildConflict(input: ConflictInput): ConflictRecord {
  return {
    entity: input.entity,
    entityId: input.entityId,
    branchId: input.branchId ?? null,
    field: input.field ?? null,
    localPayload: input.localPayload,
    serverPayload: input.serverPayload,
    deviceId: input.deviceId,
    localRev: input.localRev,
    serverRev: input.serverRev,
    at: input.at,
  };
}

export function assessWrite(input: WriteAssessmentInput): WriteAssessment {
  if (!isStaleWrite(input.baseRev, input.serverRev)) {
    return { stale: false, serverRev: input.serverRev, conflict: null };
  }
  return {
    stale: true,
    serverRev: input.serverRev,
    conflict: buildConflict(input),
  };
}

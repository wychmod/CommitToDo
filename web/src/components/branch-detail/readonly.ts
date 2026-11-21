import type { BranchReadonlyReason } from '@/core/rules/branch-state';
import type { MessageKey } from '@/i18n';

const KEYS: Record<BranchReadonlyReason, MessageKey> = {
  archived: 'branchDetail.readonly.archived',
  merged: 'branchDetail.readonly.merged',
  dropped: 'branchDetail.readonly.dropped',
  deleted: 'branchDetail.readonly.deleted',
};

/** 分支详情页头与区块共用的只读原因文案。 */
export function branchReadonlyKey(reason: BranchReadonlyReason): MessageKey {
  return KEYS[reason];
}

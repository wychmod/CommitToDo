import { branchReadonlyReason } from '@/core/rules/branch-state';
import type { Branch } from '@/data/types';
import type { MessageKey } from '@/i18n';

const READONLY_KEYS: Record<string, MessageKey> = {
  archived: 'today.readonly.archived',
  dropped: 'today.readonly.dropped',
  merged: 'today.readonly.merged',
  deleted: 'today.readonly.deleted',
};

/** 待办所在分支的只读原因文案 key；分支缺失按已删除处理。 */
export function readonlyReasonKey(branch: Branch | undefined): MessageKey | null {
  const reason = branch ? branchReadonlyReason(branch) : 'deleted';
  return reason ? (READONLY_KEYS[reason] ?? null) : null;
}

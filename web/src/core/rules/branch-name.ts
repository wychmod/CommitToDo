/**
 * 分支名称校验（PRD §5）。
 *
 * 名称在同级内唯一：去掉首尾空白后比较；重命名时排除自身；
 * 已归档的同级仍参与查重，避免归档后重新启用撞名。
 */

export type NameBlockReason = 'empty' | 'duplicate';

export interface NameCheck {
  ok: boolean;
  reason: NameBlockReason | null;
  /** 去掉首尾空白后的名称，保存时使用。 */
  title: string;
}

export interface NameSibling {
  id: string;
  title: string;
}

export interface ValidateNameInput {
  title: string;
  /** 只传同一父分支下的同级；由调用方决定是否包含已归档。 */
  siblings: readonly NameSibling[];
  /** 重命名时传自身 id，避免与自己比较。 */
  selfId?: string;
}

export function normalizeBranchTitle(raw: string): string {
  return raw.trim();
}

export function validateBranchTitle({ title, siblings, selfId }: ValidateNameInput): NameCheck {
  const normalized = normalizeBranchTitle(title);
  if (normalized.length === 0) {
    return { ok: false, reason: 'empty', title: normalized };
  }

  const duplicate = siblings.some(
    (sibling) => sibling.id !== selfId && normalizeBranchTitle(sibling.title) === normalized,
  );

  return {
    ok: !duplicate,
    reason: duplicate ? 'duplicate' : null,
    title: normalized,
  };
}

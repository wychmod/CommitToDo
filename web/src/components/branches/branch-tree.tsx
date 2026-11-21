import { canCreateChild } from '@/core/rules/branch-hierarchy';
import { collectSubtree } from '@/core/rules/branch-path';
import { assessCreateQuota } from '@/core/rules/branch-quota';
import { finishEntryReason } from '@/core/rules/finish-precheck';
import type { Branch } from '@/data/types';
import { t } from '@/i18n';
import { isExpandedByDefault, useBranchesStore } from '@/stores/branches.store';
import { BranchRow, type BranchBlockReason } from './branch-row';
import styles from './branch-tree.module.css';

interface BranchTreeProps {
  branches: readonly Branch[];
  focusId: string | null;
  onFocusHandled: () => void;
  onCreateChild: (parent: Branch) => void;
  onRename: (branch: Branch) => void;
  onMove: (branch: Branch) => void;
  onFinish: (branch: Branch) => void;
  onDelete: (branch: Branch) => void;
}

function buildChildrenMap(branches: readonly Branch[]): Map<string, Branch[]> {
  const map = new Map<string, Branch[]>();
  for (const branch of branches) {
    if (!branch.parentId) continue;
    const list = map.get(branch.parentId);
    if (list) list.push(branch);
    else map.set(branch.parentId, [branch]);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.order - b.order || a.createdAt - b.createdAt);
  }
  return map;
}

function readonlyReason(branch: Branch): BranchBlockReason | null {
  return branch.archivedAt !== null || branch.status !== 'active' ? 'readonly' : null;
}

/**
 * 分支树（D-01 / OP-07）。
 *
 * 单根、最多三层；默认展开 L1 与 L2，展开状态由页面 store 记忆。
 * 不可用动作只标灰并给出原因，不在菜单里隐藏。
 */
export function BranchTree({
  branches,
  focusId,
  onFocusHandled,
  onCreateChild,
  onRename,
  onMove,
  onFinish,
  onDelete,
}: BranchTreeProps) {
  const expandedMap = useBranchesStore((state) => state.expanded);
  const setExpanded = useBranchesStore((state) => state.setExpanded);
  const childrenOf = buildChildrenMap(branches);
  const root = branches
    .filter((branch) => branch.depth === 0)
    .sort((a, b) => a.createdAt - b.createdAt)[0];

  if (!root) return null;

  const createReasonFor = (branch: Branch): BranchBlockReason | null => {
    const readonly = readonlyReason(branch);
    if (readonly) return readonly;
    if (!canCreateChild(branch.depth)) return 'depth';
    const quota = assessCreateQuota(branch.id, branch.depth, branches);
    if (quota.reason === 'parent-full') return 'parent-full';
    if (quota.reason === 'tree-full') return 'tree-full';
    return null;
  };

  const finishReasonFor = (branch: Branch): BranchBlockReason | null => {
    const readonly = readonlyReason(branch);
    if (readonly) return readonly;
    const parent = branch.parentId ? branches.find((row) => row.id === branch.parentId) : undefined;
    const descendants = collectSubtree(branches, branch.path).filter((row) => row.id !== branch.id);
    const reason = finishEntryReason(branch, parent, descendants);
    if (reason === null) return null;
    if (reason === 'parent-missing' || reason === 'parent-readonly') return 'finish-parent';
    if (reason === 'unfinished-descendant') return 'finish-children';
    return 'readonly';
  };

  const renderNode = (branch: Branch) => {
    const children = childrenOf.get(branch.id) ?? [];
    const expanded = expandedMap[branch.id] ?? isExpandedByDefault(branch.depth);
    const moveReason = readonlyReason(branch);

    return (
      <BranchRow
        key={branch.id}
        branch={branch}
        hasChildren={children.length > 0}
        expanded={expanded}
        focusId={focusId}
        createReason={createReasonFor(branch)}
        renameReason={readonlyReason(branch)}
        moveReason={moveReason}
        finishReason={finishReasonFor(branch)}
        deleteReason={readonlyReason(branch)}
        onToggle={setExpanded}
        onFocusHandled={onFocusHandled}
        onCreateChild={onCreateChild}
        onRename={onRename}
        onMove={onMove}
        onFinish={onFinish}
        onDelete={onDelete}
      >
        {children.length > 0 && expanded ? (
          <ul className={styles.group}>{children.map(renderNode)}</ul>
        ) : null}
      </BranchRow>
    );
  };

  return (
    <ul className={styles.tree} aria-label={t('branches.treeLabel')}>
      {renderNode(root)}
    </ul>
  );
}

import { useState } from 'react';
import { assessArchive, assessPause, assessResume } from '@/core/rules/branch-lifecycle';
import { canCreateChild } from '@/core/rules/branch-hierarchy';
import { collectSubtree } from '@/core/rules/branch-path';
import { assessCreateQuota } from '@/core/rules/branch-quota';
import { reorderIds, type DragPosition } from '@/core/rules/drag-order';
import { finishEntryReason } from '@/core/rules/finish-precheck';
import { canPinBranch, sortSiblingBranches } from '@/core/rules/order-branches';
import type { Branch } from '@/data/types';
import { t } from '@/i18n';
import { isExpandedByDefault, useBranchesStore } from '@/stores/branches.store';
import { useIsCompact } from '@/ui/use-compact';
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
  onPause: (branch: Branch) => void;
  onResume: (branch: Branch) => void;
  onArchive: (branch: Branch) => void;
  onReorder: (parentId: string, orderedIds: string[]) => void;
  onTogglePinned: (branch: Branch) => void;
}

function buildChildrenMap(branches: readonly Branch[]): Map<string, Branch[]> {
  const map = new Map<string, Branch[]>();
  for (const branch of branches) {
    if (!branch.parentId) continue;
    const list = map.get(branch.parentId);
    if (list) list.push(branch);
    else map.set(branch.parentId, [branch]);
  }
  for (const [parentId, list] of map) {
    map.set(parentId, sortSiblingBranches(list));
  }
  return map;
}

function readonlyReason(branch: Branch): BranchBlockReason | null {
  return branch.archivedAt !== null || branch.status !== 'active' ? 'readonly' : null;
}

/** 把生命周期不可用原因收敛成菜单可展示的三种。 */
function lifecycleReason(reason: string | null): BranchBlockReason | null {
  if (reason === null) return null;
  if (reason === 'active-descendants') return 'active-children';
  if (reason === 'ancestor-archived' || reason === 'ancestor-merged') {
    return 'ancestor-readonly';
  }
  return 'readonly';
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
  onPause,
  onResume,
  onArchive,
  onReorder,
  onTogglePinned,
}: BranchTreeProps) {
  const expandedMap = useBranchesStore((state) => state.expanded);
  const setExpanded = useBranchesStore((state) => state.setExpanded);
  const compact = useIsCompact();
  const dragEnabled = !compact;
  const [dragging, setDragging] = useState<{ id: string; parentId: string } | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    id: string;
    position: DragPosition;
  } | null>(null);
  const childrenOf = buildChildrenMap(branches);
  const byId = new Map(branches.map((branch) => [branch.id, branch]));
  const root = branches
    .filter((branch) => branch.depth === 0)
    .sort((a, b) => a.createdAt - b.createdAt)[0];

  if (!root) return null;

  const canAcceptDrop = (branch: Branch): boolean =>
    dragEnabled &&
    dragging !== null &&
    dragging.parentId === branch.parentId &&
    dragging.id !== branch.id &&
    branch.depth > 0 &&
    branch.pinnedAt === null;

  const startDrag = (branch: Branch) => {
    if (!branch.parentId) return;
    setDragging({ id: branch.id, parentId: branch.parentId });
    setDropTarget(null);
  };

  const dragOver = (branch: Branch, position: DragPosition) => {
    if (!canAcceptDrop(branch)) {
      setDropTarget(null);
      return;
    }
    setDropTarget({ id: branch.id, position });
  };

  const dropOn = (branch: Branch) => {
    const source = dragging;
    const target = dropTarget;
    setDragging(null);
    setDropTarget(null);
    if (!source || !target || source.parentId !== branch.parentId) return;
    const siblings = (childrenOf.get(source.parentId) ?? []).filter((row) => row.pinnedAt === null);
    const result = reorderIds(
      siblings.map((row) => row.id),
      source.id,
      target.id,
      target.position,
      { group: source.parentId },
      { group: branch.parentId ?? source.parentId },
    );
    if (!result.ok || !result.changed) return;
    onReorder(source.parentId, result.ids);
  };

  const moveSibling = (branch: Branch, delta: number) => {
    if (!branch.parentId || branch.pinnedAt !== null) return;
    const siblings = (childrenOf.get(branch.parentId) ?? []).filter((row) => row.pinnedAt === null);
    const ids = siblings.map((row) => row.id);
    const index = ids.indexOf(branch.id);
    const next = index + delta;
    if (index < 0 || next < 0 || next >= ids.length) return;
    [ids[index], ids[next]] = [ids[next]!, ids[index]!];
    onReorder(branch.parentId, ids);
  };

  const endDrag = () => {
    setDragging(null);
    setDropTarget(null);
  };

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
    const pinned = branch.pinnedAt !== null;
    const siblings = branch.parentId ? (childrenOf.get(branch.parentId) ?? []) : [];
    const normalSiblings = siblings.filter((row) => row.pinnedAt === null);
    const index = normalSiblings.findIndex((row) => row.id === branch.id);
    const moveUpReason: BranchBlockReason | null = pinned
      ? 'pinned'
      : index <= 0
        ? 'order-first'
        : null;
    const moveDownReason: BranchBlockReason | null = pinned
      ? 'pinned'
      : index < 0 || index >= normalSiblings.length - 1
        ? 'order-last'
        : null;

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
        pauseReason={lifecycleReason(assessPause(branch, byId).reason)}
        resumeReason={lifecycleReason(assessResume(branch, byId).reason)}
        archiveReason={lifecycleReason(assessArchive(branch, byId).reason)}
        pinned={pinned}
        pinReason={canPinBranch(branch) ? null : 'readonly'}
        moveUpReason={moveUpReason}
        moveDownReason={moveDownReason}
        onTogglePinned={onTogglePinned}
        onMoveUp={(row) => moveSibling(row, -1)}
        onMoveDown={(row) => moveSibling(row, 1)}
        dragEnabled={dragEnabled && normalSiblings.length > 1}
        dragging={dragging?.id === branch.id}
        dropPosition={dropTarget?.id === branch.id ? dropTarget.position : null}
        canAcceptDrop={canAcceptDrop(branch)}
        onDragStartBranch={startDrag}
        onDragOverBranch={dragOver}
        onDropOnBranch={dropOn}
        onDragEndBranch={endDrag}
        onToggle={setExpanded}
        onFocusHandled={onFocusHandled}
        onCreateChild={onCreateChild}
        onRename={onRename}
        onMove={onMove}
        onFinish={onFinish}
        onDelete={onDelete}
        onPause={onPause}
        onResume={onResume}
        onArchive={onArchive}
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

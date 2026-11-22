import type { CSSProperties } from 'react';
import { branchShadeForDepth, normalizeBranchColor } from '@/core/rules/branch-color';
import type { Branch } from '@/data/types';
import styles from './branch-tag.module.css';

interface BranchTagProps {
  branch: Branch | undefined;
  trail: string;
}

/** 待办行与回执里的分支标识：8 px 色块 + 路径。 */
export function BranchTag({ branch, trail }: BranchTagProps) {
  const color = branch ? normalizeBranchColor(branch.color) : 'sky';
  const shade = branch ? branchShadeForDepth(branch.depth) : 1;

  return (
    <span
      className={styles.tag}
      title={trail}
      style={{ '--branch': `var(--${color}-${shade})` } as CSSProperties}
    >
      <i className={styles.dot} aria-hidden="true" />
      <span className={styles.text}>{trail}</span>
    </span>
  );
}

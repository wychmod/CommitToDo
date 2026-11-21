/**
 * 树密度到行高与日期可见性的映射（K-01）。
 *
 * 紧凑 / 舒适两档必须同时作用于三件事：树行高、列表行高、节点旁日期。
 * 这里只返回度量，不持有展开状态；调用方传入的展开集合原样保留。
 */

export type TreeDensity = 'compact' | 'comfortable';

export interface DensityMetrics {
  density: TreeDensity;
  /** 分组树行高（px）。 */
  treeRowHeight: number;
  /** 列表行高（px）。 */
  listRowHeight: number;
  /** 节点旁是否显示日期。 */
  showNodeDate: boolean;
}

const COMFORTABLE: DensityMetrics = Object.freeze({
  density: 'comfortable',
  treeRowHeight: 48,
  listRowHeight: 44,
  showNodeDate: true,
});

const COMPACT: DensityMetrics = Object.freeze({
  density: 'compact',
  treeRowHeight: 32,
  listRowHeight: 36,
  showNodeDate: false,
});

/** 两档之外（缺省、空串、未知值）回落舒适。 */
export function resolveTreeDensity(value: unknown): DensityMetrics {
  return value === 'compact' ? COMPACT : COMFORTABLE;
}

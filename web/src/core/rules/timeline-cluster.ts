/**
 * 邻近节点聚合（M06 §4.1 / OP-02）。
 *
 * 只影响渲染：同一泳道内相邻节点的像素间距小于阈值时合并为一个数量节点。
 * 阈值与像素密度由调用方传入，不写死在数据里；簇内条目保持原顺序。
 */

export interface ClusterEvent {
  id: string;
  at: number;
}

export interface TimelineCluster<T extends ClusterEvent> {
  /** 用簇内第一条的 id 作稳定标识。 */
  id: string;
  at: number;
  items: T[];
}

export interface ClusterOptions {
  /** 小于该像素间距的相邻节点合并。 */
  minGapPx: number;
  /** 当前轨道每毫秒对应的像素数。 */
  pxPerMs: number;
}

/**
 * 按时间升序把相邻节点聚成簇。
 *
 * 间距 `>=` 阈值即不聚合（阈值两侧各一条时，正好等于阈值仍分开）。
 */
export function clusterTimeline<T extends ClusterEvent>(
  events: readonly T[],
  options: ClusterOptions,
): TimelineCluster<T>[] {
  if (events.length === 0) return [];

  const sorted = [...events].sort((a, b) => a.at - b.at);
  if (!(options.pxPerMs > 0) || !(options.minGapPx > 0)) {
    return sorted.map((item) => ({ id: item.id, at: item.at, items: [item] }));
  }

  const gapMs = options.minGapPx / options.pxPerMs;
  const clusters: TimelineCluster<T>[] = [];
  let current: TimelineCluster<T> = {
    id: sorted[0]!.id,
    at: sorted[0]!.at,
    items: [sorted[0]!],
  };

  for (let index = 1; index < sorted.length; index += 1) {
    const item = sorted[index]!;
    const previous = sorted[index - 1]!;
    if (item.at - previous.at < gapMs) {
      current.items.push(item);
    } else {
      clusters.push(current);
      current = { id: item.id, at: item.at, items: [item] };
    }
  }
  clusters.push(current);
  return clusters;
}

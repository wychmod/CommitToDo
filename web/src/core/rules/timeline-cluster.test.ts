import { describe, expect, it } from 'vitest';
import { clusterTimeline, type ClusterEvent } from './timeline-cluster';

function event(id: string, at: number): ClusterEvent & { label: string } {
  return { id, at, label: `节点 ${id}` };
}

const OPTIONS = { minGapPx: 10, pxPerMs: 0.001 };

describe('邻近节点聚合（M06 §4.1 / OP-02）', () => {
  it('阈值两侧：刚好等于阈值不聚合', () => {
    expect(clusterTimeline([event('a', 0), event('b', 10_000)], OPTIONS)).toHaveLength(2);
    expect(clusterTimeline([event('a', 0), event('b', 9_999)], OPTIONS)).toHaveLength(1);
  });

  it('聚合前后节点总数守恒', () => {
    const events = [event('a', 0), event('b', 2_000), event('c', 30_000), event('d', 31_000)];
    const clusters = clusterTimeline(events, OPTIONS);
    expect(clusters.reduce((sum, cluster) => sum + cluster.items.length, 0)).toBe(events.length);
  });

  it('簇内条目保持原顺序，详情内容不变', () => {
    const first = event('a', 0);
    const second = event('b', 1_000);
    const [cluster] = clusterTimeline([second, first], OPTIONS);
    expect(cluster!.items.map((item) => item.id)).toEqual(['a', 'b']);
    expect(cluster!.items[0]).toBe(first);
    expect(cluster!.items[1]).toBe(second);
  });

  it('整段只剩一个簇', () => {
    const clusters = clusterTimeline(
      [event('a', 0), event('b', 1_000), event('c', 2_000)],
      OPTIONS,
    );
    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.items).toHaveLength(3);
  });

  it('簇内混有提交与里程碑时只按时间聚合', () => {
    const clusters = clusterTimeline(
      [event('commit-1', 0), event('milestone-1', 500), event('commit-2', 50_000)],
      OPTIONS,
    );
    expect(clusters.map((cluster) => cluster.items.map((item) => item.id))).toEqual([
      ['commit-1', 'milestone-1'],
      ['commit-2'],
    ]);
  });

  it('阈值由入参决定，换一组参数结果随之变化', () => {
    const events = [event('a', 0), event('b', 5_000)];
    expect(clusterTimeline(events, { minGapPx: 10, pxPerMs: 0.001 })).toHaveLength(1);
    expect(clusterTimeline(events, { minGapPx: 1, pxPerMs: 0.001 })).toHaveLength(2);
  });
});

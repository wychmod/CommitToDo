/**
 * 注解可见性状态机（I-02）。
 *
 * 四个概念各一句人话、各自独立；开关唯一：
 * - `off`：不自动展开，也不显示折叠图标；
 * - `once`：未看过自动展开，看过折叠为图标；
 * - `always`：每次进入都展开。
 * 「已展示」标记按概念分键存在 `localStorage`（`hint.<id>.seen`），
 * 丢失或损坏视为未看过，最多让该注解重新展开一次。
 */

export type AnnotationMode = 'off' | 'once' | 'always';

export type AnnotationConcept = 'branch' | 'merge' | 'milestone-commit' | 'stall';

export type AnnotationState = 'hidden' | 'expanded' | 'collapsed';

/** 缺省、非法值与旧数据一律回落「只显示一次」。 */
export function normalizeAnnotationMode(value: unknown): AnnotationMode {
  if (value === 'off' || value === 'always') return value;
  return 'once';
}

/** 已展示标记的存储键；概念之间互不共用。 */
export function hintStorageKey(concept: AnnotationConcept): string {
  return `hint.${concept}.seen`;
}

/** 只有明确的 `'1'` 视为看过；缺失与损坏值都当作未看过。 */
export function parseSeenFlag(raw: unknown): boolean {
  return raw === '1';
}

export function annotationState(mode: unknown, seen: boolean): AnnotationState {
  const normalized = normalizeAnnotationMode(mode);
  if (normalized === 'off') return 'hidden';
  if (normalized === 'always') return 'expanded';
  return seen ? 'collapsed' : 'expanded';
}

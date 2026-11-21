/**
 * 全局搜索的查询归一与前缀匹配（PRD V1-04 §4.2 / OP-02）。
 *
 * 只做前缀匹配：查询取首行、去首尾空白并截断到 100 字符；
 * 拉丁字母不区分大小写，中文按字面比较。不做包含、模糊、拼音与错字纠正。
 */

export const SEARCH_QUERY_MAX_LENGTH = 100;

/** 输入框原文 → 真正参与匹配的查询串；空白与纯空格归一为空串。 */
export function normalizeSearchQuery(raw: string): string {
  const [firstLine = ''] = raw.split(/\r?\n/);
  return firstLine.trim().slice(0, SEARCH_QUERY_MAX_LENGTH);
}

/**
 * 标题或文案是否以查询串开头。
 *
 * 查询为空时一律不匹配，由调用方渲染空态，不展示全量结果。
 */
export function matchesSearchPrefix(text: string, query: string): boolean {
  if (query.length === 0) return false;
  return text.toLowerCase().startsWith(query.toLowerCase());
}

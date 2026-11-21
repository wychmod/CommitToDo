import type { ExportDataResult } from '@/data/export-data';

/**
 * 触发浏览器下载（PRD M10 OP-01）。
 *
 * 只负责把已生成的文本交给浏览器；被拦截时浏览器不会抛错，
 * 页面按「下载被拦截」给出重试说明（8.3 人工验收）。
 */
export function downloadExport(result: ExportDataResult): boolean {
  try {
    const blob = new Blob([result.text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = result.fileName;
    anchor.rel = 'noopener';
    anchor.click();
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}

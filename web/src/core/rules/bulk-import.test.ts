import { describe, expect, it } from 'vitest';
import { BULK_IMPORT_MAX, parseBulkImport, withoutBulkEntry } from './bulk-import';

describe('批量导入拆分（V1-07 / B-02）', () => {
  it('逐行去首尾空白并跳过空行', () => {
    const result = parseBulkImport('  交周报  \n\n  写方案\n\t\n复盘');
    expect(result.entries).toEqual([
      { line: 1, title: '交周报' },
      { line: 3, title: '写方案' },
      { line: 5, title: '复盘' },
    ]);
    expect(result.effectiveCount).toBe(3);
    expect(result.overLimit).toBe(false);
  });

  it('兼容 CRLF 与连续空行', () => {
    const result = parseBulkImport('第一行\r\n\r\n\r\n第二行\r\n');
    expect(result.entries.map((entry) => entry.title)).toEqual(['第一行', '第二行']);
    expect(result.effectiveCount).toBe(2);
  });

  it('纯空行或空白字符不产生条目', () => {
    const result = parseBulkImport(' \n\t\n  \r\n');
    expect(result.entries).toEqual([]);
    expect(result.effectiveCount).toBe(0);
    expect(result.overLimit).toBe(false);
  });

  it('每行原文即标题，不解析日期与分支', () => {
    const result = parseBulkImport('明天交周报 #工作');
    expect(result.entries[0]!.title).toBe('明天交周报 #工作');
  });

  it('非空恰好 200 行可导入，201 行拒绝且不截断', () => {
    const twoHundred = Array.from({ length: BULK_IMPORT_MAX }, (_, index) => `第 ${index} 条`);
    const accepted = parseBulkImport(twoHundred.join('\n'));
    expect(accepted.effectiveCount).toBe(BULK_IMPORT_MAX);
    expect(accepted.overLimit).toBe(false);

    const over = parseBulkImport([...twoHundred, '第 200 条'].join('\n'));
    expect(over.effectiveCount).toBe(BULK_IMPORT_MAX + 1);
    expect(over.overLimit).toBe(true);
    expect(over.entries).toHaveLength(BULK_IMPORT_MAX + 1);
  });

  it('空行不计入上限：含空行共 220 行、非空 200 行时仍可导入', () => {
    const lines: string[] = Array.from({ length: 200 }, (_, index) => `条目 ${index}`);
    lines.push(...Array.from({ length: 20 }, () => '   '));
    const result = parseBulkImport(lines.join('\n'));
    expect(result.effectiveCount).toBe(200);
    expect(result.overLimit).toBe(false);
  });

  it('单行超过 200 字符按原样保留', () => {
    const long = '长'.repeat(201);
    expect(parseBulkImport(long).entries[0]!.title).toBe(long);
  });

  it('重复标题不去重', () => {
    const result = parseBulkImport('交周报\n交周报');
    expect(result.effectiveCount).toBe(2);
  });

  it('预览删除后计数同步', () => {
    const parsed = parseBulkImport('一\n二\n三');
    const remaining = withoutBulkEntry(parsed.entries, 2);
    expect(remaining.map((entry) => entry.title)).toEqual(['一', '三']);
    expect(remaining).toHaveLength(2);
  });
});

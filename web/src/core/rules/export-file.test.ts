import { describe, expect, it } from 'vitest';
import {
  buildExportFile,
  exportByteLength,
  exportFileName,
  EXPORT_APP_VERSION,
  EXPORT_SCHEMA_VERSION,
  isExampleRecord,
} from './export-file';

const tables = () => ({
  branches: [{ id: 'b1', ownerId: 'local' }],
  tasks: [{ id: 't1', ownerId: 'local', status: 'open' }],
  commits: [
    { id: 'c1', ownerId: 'local', voidedAt: null },
    { id: 'c2', ownerId: 'local', voidedAt: 123 },
  ],
  milestones: [{ id: 'm1', ownerId: 'local', note: '一件小事' }],
  badges: [{ id: 'bb1', ownerId: 'local', catalogId: 'first' }],
  settings: [{ id: 'app', ownerId: 'local', theme: 'light' }],
  events: [{ id: 'e1', ownerId: 'local', action: 'branch.create' }],
});

type TestRow = { id: string } & Record<string, unknown>;

const build = (over: Partial<ReturnType<typeof tables>> = {}) =>
  buildExportFile<TestRow>({
    exportedAt: '2026-11-21T09:00:00.000Z',
    localDate: '2026-11-21',
    ...tables(),
    ...over,
  });

describe('导出文件（OP-01 / §8.2）', () => {
  it('顶层只有版本、时间、应用版本与七张表，业务行原样保留', () => {
    const file = build();

    expect(Object.keys(file.payload).sort()).toEqual(
      [
        'appVersion',
        'badges',
        'branches',
        'commits',
        'events',
        'exportedAt',
        'milestones',
        'schemaVersion',
        'settings',
        'tasks',
      ].sort(),
    );
    expect(file.payload).toMatchObject({
      schemaVersion: EXPORT_SCHEMA_VERSION,
      exportedAt: '2026-11-21T09:00:00.000Z',
      appVersion: EXPORT_APP_VERSION,
    });
    expect(file.payload.commits.map((row) => row.voidedAt)).toEqual([null, 123]);
    expect(file.payload.milestones[0].note).toBe('一件小事');
  });

  it('七个计数字段齐全且与数组长度一致', () => {
    expect(build().counts).toEqual({
      branches: 1,
      tasks: 1,
      commits: 2,
      milestones: 1,
      badges: 1,
      settings: 1,
      events: 1,
    });
  });

  it('文件名由本地日期生成', () => {
    expect(build().fileName).toBe('committo-export-2026-11-21.json');
    expect(exportFileName('2027-01-02')).toBe('committo-export-2027-01-02.json');
  });

  it('剔除示例命名空间，即使与真实记录 id 相同', () => {
    const file = build({
      branches: [
        { id: 'same', ownerId: 'local' },
        { id: 'same', ownerId: 'example' },
        { id: 'example:built-in', ownerId: 'local' },
      ],
      tasks: [],
      commits: [],
      milestones: [],
      badges: [],
      settings: [],
      events: [],
    });

    expect(file.payload.branches).toEqual([{ id: 'same', ownerId: 'local' }]);
    expect(file.counts.branches).toBe(1);
  });

  it('示例记录识别覆盖 owner 与 id 前缀', () => {
    expect(isExampleRecord({ id: 'x', ownerId: 'example' })).toBe(true);
    expect(isExampleRecord({ id: 'example:x', ownerId: 'local' })).toBe(true);
    expect(isExampleRecord({ id: 'x', ownerId: 'local' })).toBe(false);
  });

  it('体积估算按 UTF-8 字节计算', () => {
    const bytes = exportByteLength({ text: '中文' });
    expect(bytes).toBeGreaterThan(10);
  });
});

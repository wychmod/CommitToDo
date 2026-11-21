import { describe, expect, it } from 'vitest';
import { EXPORT_SCHEMA_VERSION } from './export-file';
import { validateImportFile } from './import-validate';

const tables = () => ({
  branches: [{ id: 'b1', ownerId: 'local', title: '工作' }],
  tasks: [{ id: 't1', ownerId: 'local', status: 'open' }],
  commits: [{ id: 'c1', ownerId: 'local', voidedAt: 123 }],
  milestones: [{ id: 'm1', ownerId: 'local' }],
  badges: [{ id: 'bb1', ownerId: 'local' }],
  settings: [{ id: 'app', ownerId: 'local', theme: 'light' }],
  events: [{ id: 'e1', ownerId: 'local', action: 'branch.create' }],
});

const file = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: '2026-11-21T09:00:00.000Z',
    appVersion: '0.1.0',
    ...tables(),
    ...over,
  });

const expectFail = (text: string) => {
  const result = validateImportFile(text);
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('应当失败');
  return result.error;
};

describe('导入文件校验（OP-04 / §4.2）', () => {
  it('合法文件返回各表条数与摘要，voidedAt 原样保留', () => {
    const result = validateImportFile(file());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.summary).toEqual({
      schemaVersion: EXPORT_SCHEMA_VERSION,
      exportedAt: '2026-11-21T09:00:00.000Z',
      appVersion: '0.1.0',
      counts: {
        branches: 1,
        tasks: 1,
        commits: 1,
        milestones: 1,
        badges: 1,
        settings: 1,
        events: 1,
      },
    });
    expect(result.value.tables.commits[0].voidedAt).toBe(123);
  });

  it('不是 JSON 或不是对象时拒绝', () => {
    expect(expectFail('not json').code).toBe('backup.invalid_file');
    expect(expectFail('[1,2]').code).toBe('backup.invalid_file');
  });

  it('缺 schemaVersion 时拒绝并指向该字段', () => {
    const error = expectFail(file({ schemaVersion: undefined }));
    expect(error).toMatchObject({ code: 'backup.invalid_file', field: 'schemaVersion' });
  });

  it('schemaVersion 类型或取值非法时拒绝', () => {
    expect(expectFail(file({ schemaVersion: '1' })).field).toBe('schemaVersion');
    expect(expectFail(file({ schemaVersion: 0 })).field).toBe('schemaVersion');
    expect(expectFail(file({ schemaVersion: 1.5 })).field).toBe('schemaVersion');
  });

  it('版本不是当前版本时给出不支持', () => {
    const error = expectFail(file({ schemaVersion: EXPORT_SCHEMA_VERSION + 1 }));
    expect(error).toMatchObject({ code: 'backup.version_unsupported', field: 'schemaVersion' });
  });

  it('缺表或某张表不是数组时拒绝', () => {
    const missing = JSON.parse(file()) as Record<string, unknown>;
    delete missing.events;
    expect(expectFail(JSON.stringify(missing))).toMatchObject({
      code: 'backup.invalid_file',
      field: 'data',
    });

    expect(expectFail(file({ tasks: {} }))).toMatchObject({
      code: 'backup.invalid_file',
      field: 'data',
    });
  });

  it('行缺少 id 或 id 重复时拒绝', () => {
    expect(expectFail(file({ branches: [{ ownerId: 'local' }] })).field).toBe('data');
    expect(
      expectFail(
        file({
          branches: [
            { id: 'same', ownerId: 'local' },
            { id: 'same', ownerId: 'local' },
          ],
        }),
      ).field,
    ).toBe('data');
  });

  it('各表为空数组时合法', () => {
    const empty = {
      branches: [],
      tasks: [],
      commits: [],
      milestones: [],
      badges: [],
      settings: [],
      events: [],
    };
    const result = validateImportFile(file(empty));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.values(result.value.summary.counts)).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  it('示例命名空间记录被剔除，不参与条数', () => {
    const result = validateImportFile(
      file({
        branches: [
          { id: 'same', ownerId: 'local' },
          { id: 'same', ownerId: 'example' },
        ],
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.tables.branches).toHaveLength(1);
    expect(result.value.summary.counts.branches).toBe(1);
  });

  it('校验不修改输入对象（voidedAt 保持原值）', () => {
    const source = JSON.parse(file()) as { commits: { voidedAt: number }[] };
    const before = JSON.stringify(source);
    validateImportFile(JSON.stringify(source));
    expect(JSON.stringify(source)).toBe(before);
    expect(source.commits[0].voidedAt).toBe(123);
  });
});

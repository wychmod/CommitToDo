import { formatValue } from './format';

/** 只对已知枚举字段做本地化，避免把用户文本里的同名单词误翻译。 */
const ENUM_FIELDS = new Set([
  'status',
  'theme',
  'treeDensity',
  'annotations',
  'datePrecision',
  'source',
  'result',
  'syncStatus',
]);

const ENUM_TEXT: Record<string, string> = {
  active: '活跃',
  archived: '归档',
  deleted: '已删除',
  done: '已完成',
  completed: '已完成',
  pending: '待处理',
  todo: '待办',
  cancelled: '已取消',
  canceled: '已取消',
  dropped: '已放弃',
  failed: '失败',
  success: '成功',
  conflict: '冲突',
  applied: '已应用',
  ready: '已就绪',
  not_ready: '未就绪',
  light: '浅色',
  dark: '深色',
  compact: '紧凑',
  comfortable: '舒适',
  off: '关闭',
  once: '仅一次',
  always: '始终',
  day: '日',
  month: '月',
  client: '客户端',
  server: '服务端',
};

const FIELD_LABELS: Record<string, string> = {
  _id: '记录 ID',
  id: '记录 ID',
  ownerId: '所有者',
  title: '标题',
  goal: '目标',
  color: '颜色',
  note: '备注',
  dueDate: '截止日期',
  plannedDate: '计划日期',
  order: '排序',
  summary: '摘要',
  theme: '主题',
  treeDensity: '树密度',
  annotations: '标注',
  reminderEnabled: '回顾提醒',
  status: '状态',
  rev: '版本',
  updatedAt: '更新时间',
  createdAt: '创建时间',
};

export type FieldKind = 'text' | 'textarea' | 'date' | 'number' | 'color' | 'enum' | 'boolean';

export const EDIT_FIELD_KINDS: Record<string, Record<string, FieldKind>> = {
  branches: { title: 'text', goal: 'text', color: 'color' },
  tasks: { title: 'text', note: 'textarea', dueDate: 'date', plannedDate: 'date', order: 'number' },
  commits: { summary: 'text' },
  milestones: { title: 'text', note: 'textarea' },
  settings: {
    theme: 'enum',
    treeDensity: 'enum',
    annotations: 'enum',
    reminderEnabled: 'boolean',
  },
  year_reviews: { note: 'textarea' },
};

export const ENUM_OPTIONS: Record<string, string[]> = {
  color: ['coral', 'sky', 'honey', 'mint', 'iris', 'rose', 'teal'],
  theme: ['light', 'dark'],
  treeDensity: ['compact', 'comfortable'],
  annotations: ['off', 'once', 'always'],
  reminderEnabled: ['true', 'false'],
};

export function fieldLabel(key: string): string {
  return FIELD_LABELS[key] || key;
}

export function formatFieldValue(_collection: string, key: string, value: unknown): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? '开启' : '关闭';
  if (typeof value === 'string' && ENUM_FIELDS.has(key) && ENUM_TEXT[value]) {
    return ENUM_TEXT[value];
  }
  return formatValue(value);
}

export function enumText(value: string): string {
  return ENUM_TEXT[value] || value;
}

/** 把行内值转换为编辑草稿字符串/布尔值。 */
export function draftOf(value: unknown): string | boolean {
  if (typeof value === 'boolean') return value;
  if (value == null) return '';
  return String(value);
}

/** 把编辑草稿转换为提交值；null 表示清空可空字段。 */
export function patchValueOf(field: string, kind: FieldKind, raw: string | boolean): unknown {
  if (kind === 'boolean') return raw === true || raw === 'true';
  const text = String(raw).trim();
  if (kind === 'number') return text === '' ? null : Number(text);
  if (kind === 'date') return text === '' ? null : text;
  if (text === '' && (field === 'summary' || field === 'title')) return '';
  return text === '' ? null : text;
}

export function isEditableCollection(collection: string): boolean {
  return Boolean(EDIT_FIELD_KINDS[collection]);
}

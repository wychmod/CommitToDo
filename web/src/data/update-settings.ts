import { fail, ok, type Result } from '@/core/errors';
import { db, LOCAL_OWNER_ID } from './db';
import { defaultWriteDeps, type WriteDeps } from './deps';
import { writeEvent } from './events';
import { settingsRepository } from './repositories';
import { DEFAULT_SETTINGS, SETTINGS_ID } from './settings-defaults';
import type { Settings } from './types';

/**
 * 改偏好（M01 OP-03–OP-05）。
 *
 * 一个用户动作一个用例：主题、树密度、注解与回顾提醒共用同一条 `settings` 单行，
 * 写入后同事务记一条 `settings.update` 事件（CODE-STRUCTURE §4.2）。
 * 偏好写入失败返回 `Result`，页面保持用户刚选的值并提供重试。
 */

export type SettingsPatch = Partial<
  Pick<Settings, 'theme' | 'treeDensity' | 'annotations' | 'reminderEnabled'>
>;

type ChoiceField = Exclude<keyof SettingsPatch, 'reminderEnabled'>;

const ALLOWED: Record<ChoiceField, readonly string[]> = {
  theme: ['light', 'dark'],
  treeDensity: ['compact', 'comfortable'],
  annotations: ['off', 'once', 'always'],
};

const CHOICE_KEYS = Object.keys(ALLOWED) as ChoiceField[];
const PATCH_KEYS: Array<keyof SettingsPatch> = [...CHOICE_KEYS, 'reminderEnabled'];

export async function updateSettings(
  input: SettingsPatch,
  deps: WriteDeps = defaultWriteDeps,
): Promise<Result<Settings>> {
  const fields = PATCH_KEYS.filter((key) => input[key] !== undefined);
  if (fields.length === 0) {
    return fail('validation.invalid_input');
  }

  for (const field of CHOICE_KEYS) {
    if (input[field] !== undefined && !ALLOWED[field].includes(input[field] as string)) {
      return fail('validation.invalid_input', { field });
    }
  }
  if (input.reminderEnabled !== undefined && typeof input.reminderEnabled !== 'boolean') {
    return fail('validation.invalid_input', { field: 'reminderEnabled' });
  }

  try {
    return await db.transaction('rw', [db.settings, db.events, db.outbox], async (tx) => {
      const existing = await settingsRepository.getById(SETTINGS_ID);
      const at = deps.clock.now();
      const row: Settings = {
        ...DEFAULT_SETTINGS,
        ...existing,
        ...input,
        id: SETTINGS_ID,
        ownerId: LOCAL_OWNER_ID,
        rev: (existing?.rev ?? 0) + 1,
        updatedAt: at,
      };

      await settingsRepository.put(row);
      await writeEvent(tx, 'settings.update', SETTINGS_ID, { fields: [...fields].sort() }, deps);

      return ok(row);
    });
  } catch (cause) {
    return fail('storage.write_failed', { retriable: true, cause });
  }
}

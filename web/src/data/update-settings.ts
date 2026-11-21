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
 * 一个用户动作一个用例：主题、树密度、注解三者共用同一条 `settings` 单行，
 * 写入后同事务记一条 `settings.update` 事件（CODE-STRUCTURE §4.2）。
 * 偏好写入失败返回 `Result`，页面保持用户刚选的值并提供重试。
 */

export type SettingsPatch = Partial<Pick<Settings, 'theme' | 'treeDensity' | 'annotations'>>;

const ALLOWED: Record<keyof SettingsPatch, readonly string[]> = {
  theme: ['light', 'dark'],
  treeDensity: ['compact', 'comfortable'],
  annotations: ['off', 'once', 'always'],
};

const PATCH_KEYS = Object.keys(ALLOWED) as Array<keyof SettingsPatch>;

export async function updateSettings(
  input: SettingsPatch,
  deps: WriteDeps = defaultWriteDeps,
): Promise<Result<Settings>> {
  const fields = PATCH_KEYS.filter((key) => input[key] !== undefined);
  if (fields.length === 0) {
    return fail('validation.invalid_input');
  }

  for (const field of fields) {
    if (!ALLOWED[field].includes(input[field] as string)) {
      return fail('validation.invalid_input', { field });
    }
  }

  try {
    return await db.transaction('rw', [db.settings, db.events], async (tx) => {
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

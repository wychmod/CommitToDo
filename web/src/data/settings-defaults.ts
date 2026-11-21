import type { Settings } from './types';

/**
 * `settings` 是单行偏好表（TECH §5.3，主键固定 `id = 'app'`）。
 *
 * 行尚未创建时按这里渲染默认值；第一次改偏好才由用例写入。
 */

export const SETTINGS_ID = 'app';

export type SettingsFields = Pick<
  Settings,
  'theme' | 'treeDensity' | 'annotations' | 'reminderEnabled' | 'lastAutoBackupAt'
>;

export const DEFAULT_SETTINGS: Readonly<SettingsFields> = Object.freeze({
  theme: 'light',
  treeDensity: 'comfortable',
  annotations: 'once',
  reminderEnabled: true,
  lastAutoBackupAt: null,
});

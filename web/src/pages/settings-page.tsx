import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AnnotationMode } from '@/core/rules/annotation-visibility';
import type { Theme } from '@/core/rules/theme-preference';
import type { TreeDensity } from '@/core/rules/tree-density';
import { useSettingsState } from '@/data/hooks';
import { updateSettings, type SettingsPatch } from '@/data/update-settings';
import { t, type MessageKey } from '@/i18n';
import { LoadingShell } from '@/ui/loading-shell';
import { PageShell } from '@/ui/page-shell';
import styles from './settings-page.module.css';

interface Preferences {
  theme: Theme;
  treeDensity: TreeDensity;
  annotations: AnnotationMode;
}

interface Option<T extends string> {
  value: T;
  labelKey: MessageKey;
}

interface OptionGroupProps<T extends string> {
  legendKey: MessageKey;
  name: string;
  value: T;
  options: ReadonlyArray<Option<T>>;
  onChange: (value: T) => void;
}

function OptionGroup<T extends string>({
  legendKey,
  name,
  value,
  options,
  onChange,
}: OptionGroupProps<T>) {
  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>{t(legendKey)}</legend>
      <div className={styles.options}>
        {options.map((option) => (
          <label key={option.value} className={styles.option}>
            <input
              className={styles.input}
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span className={styles.optionText}>{t(option.labelKey)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const THEME_OPTIONS: ReadonlyArray<Option<Theme>> = [
  { value: 'light', labelKey: 'settings.theme.light' },
  { value: 'dark', labelKey: 'settings.theme.dark' },
];

const DENSITY_OPTIONS: ReadonlyArray<Option<TreeDensity>> = [
  { value: 'comfortable', labelKey: 'settings.density.comfortable' },
  { value: 'compact', labelKey: 'settings.density.compact' },
];

const ANNOTATION_OPTIONS: ReadonlyArray<Option<AnnotationMode>> = [
  { value: 'once', labelKey: 'settings.annotations.once' },
  { value: 'always', labelKey: 'settings.annotations.always' },
  { value: 'off', labelKey: 'settings.annotations.off' },
];

/** 设置（P07）：主题、树密度、注解三组偏好，保存失败时保留用户选择并可重试。 */
export function SettingsPage() {
  const { loaded, settings } = useSettingsState();
  const [draft, setDraft] = useState<Preferences>({
    theme: settings.theme,
    treeDensity: settings.treeDensity,
    annotations: settings.annotations,
  });
  const [pending, setPending] = useState<SettingsPatch | null>(null);
  const [failedPatch, setFailedPatch] = useState<SettingsPatch | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loaded) return;
    setDraft({
      theme: settings.theme,
      treeDensity: settings.treeDensity,
      annotations: settings.annotations,
    });
  }, [loaded, settings.theme, settings.treeDensity, settings.annotations]);

  const save = async (patch: SettingsPatch) => {
    setDraft((current) => ({ ...current, ...patch }));
    setPending(patch);
    setFailedPatch(null);
    setSaving(true);
    const result = await updateSettings(patch);
    setSaving(false);
    setPending(null);
    if (!result.ok) setFailedPatch(patch);
  };

  return (
    <PageShell titleKey="page.settings.title" bodyKey="page.settings.body">
      {!loaded ? (
        <LoadingShell />
      ) : (
        <div className={styles.stack}>
          <section className={styles.section} aria-labelledby="settings-appearance">
            <h2 id="settings-appearance" className={styles.heading}>
              {t('settings.appearance')}
            </h2>
            <OptionGroup
              legendKey="settings.theme"
              name="theme"
              value={draft.theme}
              options={THEME_OPTIONS}
              onChange={(theme) => void save({ theme })}
            />
            <OptionGroup
              legendKey="settings.density"
              name="density"
              value={draft.treeDensity}
              options={DENSITY_OPTIONS}
              onChange={(treeDensity) => void save({ treeDensity })}
            />
          </section>

          <section className={styles.section} aria-labelledby="settings-annotations">
            <h2 id="settings-annotations" className={styles.heading}>
              {t('settings.annotations')}
            </h2>
            <p className={styles.hint}>{t('settings.annotations.hint')}</p>
            <OptionGroup
              legendKey="settings.annotations.mode"
              name="annotations"
              value={draft.annotations}
              options={ANNOTATION_OPTIONS}
              onChange={(annotations) => void save({ annotations })}
            />
          </section>

          <section className={styles.section} aria-labelledby="settings-data">
            <h2 id="settings-data" className={styles.heading}>
              {t('settings.data')}
            </h2>
            <p className={styles.hint}>{t('settings.data.hint')}</p>
            <Link className={styles.entry} to="/data">
              {t('nav.data')}
            </Link>
          </section>

          <div className={styles.status} role="status" aria-live="polite">
            {saving && pending ? t('settings.saving') : null}
          </div>

          {failedPatch ? (
            <div className={styles.error} role="alert">
              <span>{t('settings.saveFailed')}</span>
              <button type="button" className={styles.retry} onClick={() => void save(failedPatch)}>
                {t('error.retry')}
              </button>
            </div>
          ) : null}
        </div>
      )}
    </PageShell>
  );
}

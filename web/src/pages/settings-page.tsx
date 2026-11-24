import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '@/components/today/confirm-dialog';
import { consumeTakeoverNotice } from '@/components/auth/takeover-notice';
import type { AnnotationMode } from '@/core/rules/annotation-visibility';
import { resolveSyncStatus } from '@/core/rules/sync-backoff';
import type { Theme } from '@/core/rules/theme-preference';
import type { TreeDensity } from '@/core/rules/tree-density';
import { getLastReportedDate, isStatsEnabled, setStatsEnabled } from '@/data/anonymous-stats';
import { signOut } from '@/data/cloud/auth';
import { useSettingsState } from '@/data/hooks';
import { runSync } from '@/data/sync';
import { useMigration, useSyncSnapshot } from '@/data/sync-hooks';
import { updateSettings, type SettingsPatch } from '@/data/update-settings';
import { t, type MessageKey } from '@/i18n';
import { useAuthStore } from '@/stores/auth.store';
import { LoadingShell } from '@/ui/loading-shell';
import { PageShell } from '@/ui/page-shell';
import {
  ArchiveIcon,
  ArrowIcon,
  BranchIcon,
  HelpIcon,
  SunIcon,
  TuneIcon,
  UserIcon,
} from '@/ui/icons';
import styles from './settings-page.module.css';

const COLLECTION_KEYS: Record<string, MessageKey> = {
  branches: 'sync.collection.branches',
  tasks: 'sync.collection.tasks',
  commits: 'sync.collection.commits',
  milestones: 'sync.collection.milestones',
  badges: 'sync.collection.badges',
  events: 'sync.collection.events',
  settings: 'sync.collection.settings',
};

const MIGRATION_NOTICE_KEY = 'committodo.migration.notice';

function formatTime(at: number | null): string {
  return at === null ? t('sync.lastSync.never') : new Date(at).toLocaleString('zh-CN');
}

interface Preferences {
  theme: Theme;
  treeDensity: TreeDensity;
  annotations: AnnotationMode;
  reminderEnabled: boolean;
}

interface Option<T extends string> {
  value: T;
  labelKey: MessageKey;
}

interface OptionGroupProps<T extends string> {
  legendKey: MessageKey;
  descriptionKey: MessageKey;
  name: string;
  value: T;
  options: ReadonlyArray<Option<T>>;
  onChange: (value: T) => void;
}

function OptionGroup<T extends string>({
  legendKey,
  descriptionKey,
  name,
  value,
  options,
  onChange,
}: OptionGroupProps<T>) {
  const labelId = useId();
  return (
    <div className={styles.group} role="group" aria-labelledby={labelId}>
      <span className={styles.rowText}>
        <span id={labelId} className={styles.legend}>
          {t(legendKey)}
        </span>
        <small className={styles.rowHint}>{t(descriptionKey)}</small>
      </span>
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
    </div>
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

const REMINDER_OPTIONS: ReadonlyArray<Option<'on' | 'off'>> = [
  { value: 'on', labelKey: 'settings.reminders.on' },
  { value: 'off', labelKey: 'settings.reminders.off' },
];

/** 设置（P07）：外观、注解、提醒、账号与同步、数据入口。 */
export function SettingsPage() {
  const { loaded, settings } = useSettingsState();
  const location = useLocation();
  const navigate = useNavigate();
  const principalId = useAuthStore((state) => state.principalId);
  const email = useAuthStore((state) => state.email);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [takeoverNotice, setTakeoverNotice] = useState(false);
  const [draft, setDraft] = useState<Preferences>({
    theme: settings.theme,
    treeDensity: settings.treeDensity,
    annotations: settings.annotations,
    reminderEnabled: settings.reminderEnabled,
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
      reminderEnabled: settings.reminderEnabled,
    });
  }, [
    loaded,
    settings.theme,
    settings.treeDensity,
    settings.annotations,
    settings.reminderEnabled,
  ]);

  // 从登录页带回 `#account` / `#sync` 时定位到对应分区。
  useEffect(() => {
    if (!loaded) return;
    const id = location.hash.replace('#', '');
    if (!id) return;
    document.getElementById(id)?.scrollIntoView({ block: 'start' });
  }, [loaded, location.hash]);

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

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    clearSession();
    setSigningOut(false);
    setConfirmingSignOut(false);
    navigate('/today', { replace: true });
  };

  // 登录/注册把本机数据归属到账号后，在本页提示一次「登录后由同步接管」（V2-01 §8.1-12）。
  useEffect(() => {
    if (!principalId) return;
    setTakeoverNotice(consumeTakeoverNotice());
  }, [principalId]);

  const accountNext = `${location.pathname}#account`;
  const syncNext = `${location.pathname}#sync`;
  const activeNav =
    location.hash === '#notes' ? 'notes' : location.hash === '#about' ? 'about' : 'appearance';

  return (
    <PageShell narrow titleKey="page.settings.title" bodyKey="page.settings.body">
      {!loaded ? (
        <LoadingShell />
      ) : (
        <div className={styles.layout}>
          <nav className={styles.nav} aria-label={t('settings.nav.label')}>
            <a
              className={styles.navLink}
              href="#appearance"
              aria-current={activeNav === 'appearance' ? 'page' : undefined}
            >
              <SunIcon size={17} />
              {t('settings.appearance')}
            </a>
            <a
              className={styles.navLink}
              href="#notes"
              aria-current={activeNav === 'notes' ? 'page' : undefined}
            >
              <HelpIcon size={17} />
              {t('settings.annotations')}
            </a>
            <Link className={styles.navLink} to="/data">
              <ArchiveIcon size={17} />
              {t('settings.data')}
            </Link>
            <a
              className={styles.navLink}
              href="#about"
              aria-current={activeNav === 'about' ? 'page' : undefined}
            >
              <TuneIcon size={17} />
              {t('settings.about')}
            </a>
          </nav>

          <div className={styles.stack}>
            <section
              id="appearance"
              className={`${styles.section} ${styles.panelSection}`}
              aria-labelledby="appearance-title"
            >
              <h2 id="appearance-title" className={styles.heading}>
                {t('settings.appearance')}
              </h2>
              <OptionGroup
                legendKey="settings.theme"
                descriptionKey="settings.theme.hint"
                name="theme"
                value={draft.theme}
                options={THEME_OPTIONS}
                onChange={(theme) => void save({ theme })}
              />
              <OptionGroup
                legendKey="settings.density"
                descriptionKey="settings.density.hint"
                name="density"
                value={draft.treeDensity}
                options={DENSITY_OPTIONS}
                onChange={(treeDensity) => void save({ treeDensity })}
              />
              <div className={styles.example} data-density={draft.treeDensity}>
                <div className={styles.exampleHead}>
                  <span className={styles.exampleIcon} aria-hidden="true">
                    <BranchIcon size={18} />
                  </span>
                  <div className={styles.exampleText}>
                    <strong className={styles.exampleTitle}>
                      {t('settings.density.example.title')}
                    </strong>
                    <span className={styles.hint}>
                      {draft.treeDensity === 'comfortable'
                        ? t('settings.density.example.comfortable')
                        : t('settings.density.example.compact')}
                    </span>
                  </div>
                </div>
                <div className={styles.treeFragment} aria-hidden="true">
                  <span className={styles.treeRow}>
                    <span className={styles.treeDot} />
                    {t('settings.density.example.work')}
                  </span>
                  <span className={styles.treeRow}>
                    <span className={styles.treeDot} />
                    {t('settings.density.example.design')}
                    <span className={styles.treeDate}>{t('settings.density.example.date')}</span>
                  </span>
                </div>
              </div>
            </section>

            <section
              id="notes"
              className={`${styles.section} ${styles.panelSection}`}
              aria-labelledby="notes-title"
            >
              <h2 id="notes-title" className={styles.heading}>
                {t('settings.annotations')}
              </h2>
              <p className={styles.hint}>{t('settings.annotations.hint')}</p>
              <OptionGroup
                legendKey="settings.annotations.mode"
                descriptionKey="settings.annotations.modeHint"
                name="annotations"
                value={draft.annotations}
                options={ANNOTATION_OPTIONS}
                onChange={(annotations) => void save({ annotations })}
              />
            </section>

            <section
              className={`${styles.section} ${styles.panelSection}`}
              aria-labelledby="reminders-title"
            >
              <h2 id="reminders-title" className={styles.heading}>
                {t('settings.reminders')}
              </h2>
              <p className={styles.hint}>{t('settings.reminders.hint')}</p>
              <OptionGroup
                legendKey="settings.reminders.mode"
                descriptionKey="settings.reminders.modeHint"
                name="reminders"
                value={draft.reminderEnabled ? 'on' : 'off'}
                options={REMINDER_OPTIONS}
                onChange={(value) => void save({ reminderEnabled: value === 'on' })}
              />
            </section>

            <section
              id="account"
              className={`${styles.section} ${styles.panelSection}`}
              aria-labelledby="settings-account"
            >
              <h2 id="settings-account" className={styles.heading}>
                {t('settings.account')}
              </h2>
              {principalId ? (
                <>
                  <div className={styles.accountRow}>
                    <div className={styles.accountText}>
                      <span className={styles.accountLabel}>{t('auth.email')}</span>
                      <span className={styles.accountEmail}>{email}</span>
                    </div>
                    <span className={styles.accountStatus}>{t('settings.account.status')}</span>
                  </div>
                  <div className={styles.accountFoot}>
                    <button
                      type="button"
                      className={styles.dangerButton}
                      onClick={() => setConfirmingSignOut(true)}
                    >
                      {t('settings.account.signOut')}
                    </button>
                  </div>
                </>
              ) : (
                <div className={styles.accountRow}>
                  <span className={styles.accountIcon} aria-hidden="true">
                    <UserIcon size={18} />
                  </span>
                  <div className={styles.accountText}>
                    <span className={styles.accountHeadline}>
                      {t('settings.account.signedOutTitle')}
                    </span>
                    <span className={styles.accountHint}>{t('settings.account.hint')}</span>
                  </div>
                  <div className={styles.accountActions}>
                    <Link
                      className={styles.primaryButton}
                      to={`/auth/login?next=${encodeURIComponent(accountNext)}`}
                    >
                      {t('settings.account.login')}
                    </Link>
                    <Link
                      className={styles.secondaryButton}
                      to={`/auth/signup?next=${encodeURIComponent(accountNext)}`}
                    >
                      {t('settings.account.register')}
                    </Link>
                  </div>
                </div>
              )}
              {principalId && takeoverNotice ? (
                <p className={styles.notice}>{t('auth.takeover.notice')}</p>
              ) : null}
            </section>

            <section
              id="sync"
              className={`${styles.section} ${styles.panelSection}`}
              aria-labelledby="settings-sync"
            >
              <h2 id="settings-sync" className={styles.heading}>
                {t('settings.sync')}
              </h2>
              {principalId ? (
                <>
                  <p className={styles.hint}>{t('settings.sync.hint')}</p>
                  <SyncPanel principalId={principalId} />
                </>
              ) : (
                <div className={styles.syncRowOut}>
                  <span className={styles.rowHint}>{t('settings.sync.hint')}</span>
                  <div className={styles.accountActions}>
                    <Link
                      className={styles.secondaryButton}
                      to={`/auth/login?next=${encodeURIComponent(syncNext)}`}
                    >
                      {t('settings.account.login')}
                    </Link>
                    <Link
                      className={styles.secondaryButton}
                      to={`/auth/signup?next=${encodeURIComponent(syncNext)}`}
                    >
                      {t('settings.account.register')}
                    </Link>
                  </div>
                </div>
              )}
            </section>

            <section
              id="about"
              className={`${styles.section} ${styles.panelSection}`}
              aria-labelledby="about-title"
            >
              <h2 id="about-title" className={styles.heading}>
                {t('settings.about')}
              </h2>
              <div className={styles.aboutRow}>
                <div className={styles.aboutText}>
                  <strong className={styles.aboutTitle}>{t('settings.about.localData')}</strong>
                  <span className={styles.hint}>{t('settings.about.localDataHint')}</span>
                </div>
                <Link className={styles.entry} to="/data">
                  {t('settings.about.dataLink')}
                  <ArrowIcon size={15} />
                </Link>
              </div>
            </section>

            <div className={styles.status} role="status" aria-live="polite">
              {saving && pending ? t('settings.saving') : null}
            </div>

            {failedPatch ? (
              <div className={styles.error} role="alert">
                <span>{t('settings.saveFailed')}</span>
                <button
                  type="button"
                  className={styles.retry}
                  onClick={() => void save(failedPatch)}
                >
                  {t('error.retry')}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {confirmingSignOut ? (
        <ConfirmDialog
          titleKey="settings.account.signOutTitle"
          bodyKey="settings.account.signOutBody"
          confirmKey="settings.account.signOut"
          busy={signingOut}
          onConfirm={() => void handleSignOut()}
          onClose={() => {
            if (!signingOut) setConfirmingSignOut(false);
          }}
        />
      ) : null}
    </PageShell>
  );
}

/** 同步分区（PRD V2-02 §4.1 / O08 入口），未登录时由外层显示 O07 提示。 */
function SyncPanel({ principalId }: { principalId: string }) {
  const { pending, conflicts, attempts, devices, online, syncing, lastSyncAt } = useSyncSnapshot();
  const { progress, error, running, start } = useMigration(principalId);
  const [manualSyncing, setManualSyncing] = useState(false);
  const [statsOn, setStatsOn] = useState(isStatsEnabled);
  const [lastReported, setLastReported] = useState(getLastReportedDate);
  const [showNotice, setShowNotice] = useState(false);
  const attempted = useRef(false);

  useEffect(() => {
    setStatsOn(isStatsEnabled());
    setLastReported(getLastReportedDate());
  }, [principalId]);

  useEffect(() => {
    if (!progress) return;
    if (progress.completed >= progress.total) {
      try {
        if (window.localStorage.getItem(MIGRATION_NOTICE_KEY) !== 'shown') {
          window.localStorage.setItem(MIGRATION_NOTICE_KEY, 'shown');
          setShowNotice(true);
        }
      } catch {
        setShowNotice(true);
      }
      return;
    }
    if (attempted.current || running || error) return;
    attempted.current = true;
    void start();
  }, [progress, running, error, start]);

  // 「同步中」同时反映自动补推 / 轮询与手动点击，避免状态显示与实际行为不一致。
  const status = resolveSyncStatus({
    online,
    syncing: syncing || manualSyncing,
    pending,
    attempts,
  });
  const liveDevices = devices.filter((device) => device.removedAt === null);

  const syncNow = async () => {
    if (!online || manualSyncing) return;
    setManualSyncing(true);
    await runSync(principalId);
    setManualSyncing(false);
  };

  const toggleStats = (next: boolean) => {
    setStatsEnabled(next);
    setStatsOn(next);
    setLastReported(getLastReportedDate());
  };

  return (
    <div className={styles.syncPanel}>
      <div className={styles.syncStatus}>
        <div className={styles.syncLine}>
          <span className={`${styles.badge} ${styles[status]}`}>
            {t(`sync.status.${status}` as MessageKey)}
          </span>
          <span className={styles.syncValue}>
            {t('sync.pending.label')} {pending} {t('sync.unit.item')}
          </span>
        </div>
        <span className={styles.hint}>
          {t('sync.lastSync.label')} · {formatTime(lastSyncAt)}
        </span>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.entryButton}
            disabled={!online || manualSyncing}
            onClick={() => void syncNow()}
          >
            {t('sync.action.syncNow')}
          </button>
          {status === 'failed' ? (
            <button type="button" className={styles.entryButton} onClick={() => void syncNow()}>
              {t('sync.action.retry')}
            </button>
          ) : null}
        </div>
        {!online ? <p className={styles.hint}>{t('sync.offline.hint')}</p> : null}
        {status === 'failed' ? <p className={styles.hint}>{t('sync.failed.hint')}</p> : null}
      </div>

      <div className={styles.syncRow}>
        <div className={styles.syncLine}>
          <span className={styles.syncTerm}>{t('sync.devices.title')}</span>
          <span className={styles.syncValue}>
            {liveDevices.length} {t('sync.unit.device')}
          </span>
        </div>
        <Link className={styles.entry} to="/settings/sync/devices">
          {t('sync.devices.detail')}
        </Link>
      </div>

      <div className={styles.syncRow}>
        <div className={styles.syncLine}>
          <span className={styles.syncTerm}>{t('sync.conflicts.title')}</span>
          <span className={styles.syncValue}>
            {conflicts} {t('sync.unit.conflict')}
          </span>
        </div>
        <Link className={styles.entry} to="/settings/sync/conflicts">
          {t('sync.conflicts.detail')}
        </Link>
      </div>

      <div className={styles.syncRow}>
        <span className={styles.syncTerm}>{t('settings.sync.helpLink')}</span>
        <Link className={styles.entry} to="/me/help">
          {t('page.me.help')}
        </Link>
      </div>

      {showNotice ? <p className={styles.notice}>{t('sync.migration.done')}</p> : null}

      {progress && progress.completed < progress.total ? (
        <div className={styles.migration}>
          <span className={styles.syncValue}>
            {t('sync.migration.progress')} {progress.completed}/{progress.total}{' '}
            {t('sync.migration.collections')}
          </span>
          {progress.collection ? (
            <span className={styles.hint}>
              {t('sync.migration.current')} ·{' '}
              {t(COLLECTION_KEYS[progress.collection] ?? 'sync.collection.branches')}
            </span>
          ) : null}
          <span className={styles.hint}>
            {t('sync.migration.pushed')} {progress.pushed} {t('sync.unit.item')}
          </span>
          {error ? <span className={styles.errorText}>{t('sync.migration.failed')}</span> : null}
          {error ? (
            <button
              type="button"
              className={styles.entryButton}
              onClick={() => {
                attempted.current = true;
                void start();
              }}
            >
              {t('sync.migration.continue')}
            </button>
          ) : null}
        </div>
      ) : null}

      <div className={styles.stats}>
        <label className={styles.switchRow}>
          <input
            type="checkbox"
            checked={statsOn}
            onChange={(event) => toggleStats(event.target.checked)}
          />
          <span>{t('sync.stats.title')}</span>
          <span className={styles.hint}>{statsOn ? t('sync.stats.on') : t('sync.stats.off')}</span>
        </label>
        <p className={styles.hint}>{t('sync.stats.description')}</p>
        <p className={styles.hint}>
          {t('sync.stats.lastReported')} · {lastReported ?? t('sync.stats.never')}
        </p>
      </div>
    </div>
  );
}

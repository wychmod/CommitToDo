import { BackButton } from '@/components/back-button';
import { buildDeviceList } from '@/core/rules/device-list';
import { useSyncSnapshot } from '@/data/sync-hooks';
import { t } from '@/i18n';
import { PageShell } from '@/ui/page-shell';
import styles from './sync-pages.module.css';

function formatSyncTime(at: number | null): string {
  return at === null ? t('sync.lastSync.never') : new Date(at).toLocaleString('zh-CN');
}

/** 设备列表（PRD V2-02 §4.2 / O08-sync-devices），只读。 */
export function SyncDevicesPage() {
  const { devices, currentDeviceId, now } = useSyncSnapshot();
  const list = buildDeviceList({ currentDeviceId, devices, now });

  return (
    <PageShell
      titleKey="page.syncDevices.title"
      bodyKey="page.syncDevices.body"
      back={<BackButton fallbackTo="/settings#sync" />}
    >
      {list.length === 0 ? (
        <p className={styles.empty}>{t('sync.devices.empty')}</p>
      ) : (
        <ul className={styles.list}>
          {list.map((device) => (
            <li key={device.id} className={styles.item}>
              <div className={styles.itemHead}>
                <span className={styles.itemTitle}>{device.label || device.platform}</span>
                {device.isCurrent ? (
                  <span className={styles.tag}>{t('sync.devices.current')}</span>
                ) : null}
              </div>
              <dl className={styles.meta}>
                <div>
                  <dt>{t('sync.devices.platform')}</dt>
                  <dd>{device.platform || '—'}</dd>
                </div>
                <div>
                  <dt>{t('sync.lastSync.label')}</dt>
                  <dd>{formatSyncTime(device.lastSyncAt)}</dd>
                </div>
              </dl>
              {device.stale ? <p className={styles.warn}>{t('sync.devices.stale')}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}

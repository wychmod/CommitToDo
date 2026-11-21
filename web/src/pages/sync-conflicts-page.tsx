import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BackButton } from '@/components/back-button';
import { currentTzOffset, toLocalDate } from '@/core/clock';
import { db } from '@/data/db';
import { useSyncSnapshot } from '@/data/sync-hooks';
import type { SyncConflict } from '@/data/types';
import { t } from '@/i18n';
import { PageShell } from '@/ui/page-shell';
import styles from './sync-pages.module.css';

const META_KEYS = new Set([
  'id',
  '_id',
  'ownerId',
  'rev',
  'createdAt',
  'updatedAt',
  'deletedAt',
  'tzOffset',
  'deviceId',
  'resolved',
  'resolvedAt',
]);

function formatTime(at: number): string {
  return new Date(at).toLocaleString('zh-CN');
}

function conflictName(conflict: SyncConflict): string {
  const payload = conflict.localPayload ?? conflict.serverPayload;
  for (const key of ['title', 'name', 'label', 'email']) {
    const value = payload?.[key];
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return conflict.entityId;
}

function payloadEntries(
  conflict: SyncConflict,
  payload: Record<string, unknown> | null,
): Array<[string, string]> {
  if (!payload) return [];
  const keys = conflict.field ? [conflict.field] : Object.keys(payload);
  return keys
    .filter((key) => !META_KEYS.has(key))
    .map((key): [string, string] | null => {
      const value = payload[key];
      if (value === null || value === undefined || value === '') return null;
      if (typeof value === 'object') return null;
      return [key, String(value)];
    })
    .filter((entry): entry is [string, string] => entry !== null)
    .slice(0, 8);
}

/** 冲突记录与两版对照（PRD V2-02 §4.3 / O08-sync-conflict），只读。 */
export function SyncConflictsPage() {
  const conflicts = useLiveQuery(() => db.conflicts.orderBy('at').reverse().toArray(), [], []);
  const { devices } = useSyncSnapshot();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = conflicts.find((row) => row.id === selectedId) ?? conflicts[0] ?? null;
  const deviceLabel = (deviceId: string | null): string => {
    if (!deviceId) return '—';
    return devices.find((device) => device.id === deviceId)?.label ?? deviceId;
  };

  return (
    <PageShell
      titleKey="page.syncConflicts.title"
      bodyKey="page.syncConflicts.body"
      back={<BackButton fallbackTo="/settings#sync" />}
    >
      {conflicts.length === 0 ? (
        <p className={styles.empty}>{t('sync.conflicts.empty')}</p>
      ) : (
        <div className={styles.split}>
          <ul className={styles.list}>
            {conflicts.map((conflict) => (
              <li key={conflict.id}>
                <button
                  type="button"
                  className={`${styles.itemButton} ${
                    selected?.id === conflict.id ? styles.itemActive : ''
                  }`}
                  onClick={() => setSelectedId(conflict.id)}
                >
                  <span className={styles.itemTitle}>{conflictName(conflict)}</span>
                  <span className={styles.hint}>{formatTime(conflict.at)}</span>
                  <span className={styles.hint}>
                    {t('sync.conflicts.field')} · {conflict.field ?? t('sync.conflicts.wholeRow')}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {selected ? (
            <section className={styles.detail} aria-live="polite">
              <p className={styles.active}>{t('sync.conflicts.active')}</p>
              <div className={styles.compare}>
                <div className={styles.version}>
                  <h2 className={styles.versionTitle}>{t('sync.conflicts.local')}</h2>
                  <dl className={styles.meta}>
                    <div>
                      <dt>{t('sync.conflicts.time')}</dt>
                      <dd>{formatTime(selected.at)}</dd>
                    </div>
                    <div>
                      <dt>{t('sync.conflicts.device')}</dt>
                      <dd>{deviceLabel(selected.deviceId)}</dd>
                    </div>
                  </dl>
                  <dl className={styles.meta}>
                    {payloadEntries(selected, selected.localPayload).map(([key, value]) => (
                      <div key={key} className={styles.valueRow}>
                        <dt>{key}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                  {payloadEntries(selected, selected.localPayload).length === 0 ? (
                    <p className={styles.hint}>{t('sync.conflicts.emptyPayload')}</p>
                  ) : null}
                </div>

                <div className={styles.version}>
                  <h2 className={styles.versionTitle}>{t('sync.conflicts.server')}</h2>
                  <dl className={styles.meta}>
                    <div>
                      <dt>{t('sync.conflicts.time')}</dt>
                      <dd>{formatTime(selected.at)}</dd>
                    </div>
                    <div>
                      <dt>{t('sync.conflicts.device')}</dt>
                      <dd>{deviceLabel(selected.deviceId)}</dd>
                    </div>
                  </dl>
                  <dl className={styles.meta}>
                    {payloadEntries(selected, selected.serverPayload).map(([key, value]) => (
                      <div key={key} className={styles.valueRow}>
                        <dt>{key}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                  {payloadEntries(selected, selected.serverPayload).length === 0 ? (
                    <p className={styles.hint}>{t('sync.conflicts.emptyPayload')}</p>
                  ) : null}
                </div>
              </div>

              {selected.branchId ? (
                <Link
                  className={styles.entry}
                  to={`/history?branch=${encodeURIComponent(selected.branchId)}&date=${toLocalDate(
                    selected.at,
                    currentTzOffset(selected.at),
                  )}`}
                >
                  {t('sync.conflicts.history')}
                </Link>
              ) : (
                <p className={styles.hint}>{t('sync.conflicts.noBranch')}</p>
              )}
              <p className={styles.hint}>{t('sync.conflicts.readonly')}</p>
            </section>
          ) : null}
        </div>
      )}
    </PageShell>
  );
}

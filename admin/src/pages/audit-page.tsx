import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import {
  callAdminApi,
  errorMessage,
  isApiError,
  type AuditListData,
  type AuditRow,
  type TableRowData,
  type TableUpdateData,
} from '@/lib/admin-api';
import { formatDateTime } from '@/lib/format';
import { EDIT_FIELD_KINDS, fieldLabel, formatFieldValue } from '@/lib/display';
import { CloseIcon, LedgerIcon } from '@/components/icons';
import { EmptyState } from '@/components/empty-state';
import { ErrorPanel } from '@/components/error-panel';
import { TableSkeleton } from '@/components/skeleton';
import { Chip } from '@/components/status-chip';
import { copy } from '@/i18n';

interface PageError {
  code?: string;
  message: string;
  requestId?: string;
}

interface RollbackTarget {
  audit: AuditRow;
  row: Record<string, unknown>;
  fields: string[];
  patch: Record<string, unknown>;
}

function ChangeFields({ row }: { row: AuditRow }) {
  if (!row.changedFields || !row.changedFields.length) {
    return <span className="admin-faint">—</span>;
  }
  return (
    <span className="admin-chip-row">
      {row.changedFields.map((field) => (
        <Chip key={field} tone="accent">
          {field}
        </Chip>
      ))}
    </span>
  );
}

/** 只回退可写表、已应用且改动字段落在白名单内的审计记录。 */
function canRollback(row: AuditRow): boolean {
  const kinds = EDIT_FIELD_KINDS[row.collection || ''];
  if (!kinds || row.action !== 'admin.update') return false;
  if (row.status && row.status !== 'applied') return false;
  if (!row.before) return false;
  return Object.keys(row.before).some((field) => kinds[field]);
}

export function AuditPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<PageError | null>(null);
  const [rollback, setRollback] = useState<RollbackTarget | null>(null);
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sample, setSample] = useState(false);

  const load = useCallback(
    async (reset: boolean) => {
      if (reset) {
        setLoading(true);
        setRows([]);
        setCursor(null);
      } else {
        setLoadingMore(true);
      }
      setError(null);
      try {
        const result = await callAdminApi<AuditListData>('audit.list', {
          limit: 50,
          cursor: reset ? undefined : cursor || undefined,
        });
        setRows((previous) => (reset ? result.rows : [...previous, ...result.rows]));
        setCursor(result.nextCursor);
        setSample(Boolean(result.sample));
      } catch (caught) {
        setError({
          code: isApiError(caught) ? caught.code : undefined,
          message: errorMessage(caught),
          requestId: isApiError(caught) ? caught.requestId : '',
        });
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [cursor],
  );

  useEffect(() => {
    void load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groups = useMemo(() => {
    const map = new Map<string, AuditRow[]>();
    for (const row of rows) {
      const key = formatDateTime(row.at).slice(0, 10);
      const bucket = map.get(key);
      if (bucket) bucket.push(row);
      else map.set(key, [row]);
    }
    return [...map.entries()];
  }, [rows]);

  const openRollback = async (row: AuditRow) => {
    const kinds = EDIT_FIELD_KINDS[row.collection || ''] || {};
    const before = row.before || {};
    const fields = Object.keys(before).filter((field) => kinds[field]);
    if (!fields.length) return;

    setNotice('');
    setActionError('');
    setBusy(true);
    try {
      const result = await callAdminApi<TableRowData>('tables.row', {
        collection: row.collection,
        id: row.docId,
      });
      const changed = fields.filter(
        (field) =>
          JSON.stringify(result.row[field] ?? null) !== JSON.stringify(before[field] ?? null),
      );
      if (!changed.length) {
        setNotice(copy.audit.rollbackNoChange);
        return;
      }
      const patch: Record<string, unknown> = {};
      for (const field of changed) patch[field] = before[field];
      setRollback({ audit: row, row: result.row, fields: changed, patch });
    } catch (caught) {
      setActionError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const closeRollback = () => {
    if (busy) return;
    setRollback(null);
    setActionError('');
  };

  const confirmRollback = async () => {
    if (!rollback) return;
    setBusy(true);
    setActionError('');
    try {
      const result = await callAdminApi<TableUpdateData>('tables.update', {
        collection: rollback.audit.collection,
        id: rollback.audit.docId,
        patch: rollback.patch,
        expectedRev: Number(rollback.row.rev ?? 0),
        reason: `回退审计 ${rollback.audit._id || ''}`.trim(),
      });
      setRollback(null);
      setNotice(copy.audit.rolledBack.replace('{id}', result.auditId));
      await load(true);
    } catch (caught) {
      setActionError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="admin-page">
      <header className="admin-page__head">
        <div className="admin-page__titles">
          <div className="admin-title-row">
            <h1>{copy.audit.title}</h1>
            <Chip>{copy.audit.readChip}</Chip>
            {sample ? <Chip tone="accent">{copy.overview.sample}</Chip> : null}
          </div>
          <p className="admin-page__subtitle">{copy.audit.description}</p>
        </div>
        <button
          type="button"
          className="admin-btn"
          onClick={() => void load(true)}
          disabled={loading}
        >
          {copy.audit.refresh}
        </button>
      </header>

      {notice ? (
        <p className="admin-editor__notice" role="status">
          {notice}
        </p>
      ) : null}

      {actionError ? (
        <p className="admin-alert" role="alert">
          {actionError}
        </p>
      ) : null}

      {loading ? <TableSkeleton rows={7} /> : null}

      {error ? (
        <ErrorPanel
          message={error.message}
          code={error.code}
          requestId={error.requestId}
          onRetry={() => void load(true)}
        />
      ) : null}

      {!loading && !error ? (
        <div className="admin-panel">
          {!rows.length ? (
            <EmptyState
              icon={<LedgerIcon />}
              title={copy.audit.emptyTitle}
              description={copy.audit.emptyBody}
            />
          ) : (
            <>
              <div className="admin-table-desktop">
                <table className="admin-table admin-table--audit">
                  <thead>
                    <tr>
                      <th>{copy.audit.time}</th>
                      <th>{copy.audit.actor}</th>
                      <th>{copy.audit.action}</th>
                      <th>{copy.audit.target}</th>
                      <th>{copy.audit.fields}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map(([date, groupRows]) => (
                      <Fragment key={date}>
                        <tr className="admin-audit-date">
                          <td colSpan={5}>
                            <span className="admin-audit-date__dot" aria-hidden="true" />
                            {date}
                          </td>
                        </tr>
                        {groupRows.map((row, index) => (
                          <tr key={String(row._id || `${date}-${index}`)}>
                            <td className="admin-mono admin-nowrap">
                              {formatDateTime(row.at).slice(11)}
                            </td>
                            <td>{row.actorEmail || '—'}</td>
                            <td>
                              <Chip>{row.action || '—'}</Chip>
                            </td>
                            <td>
                              <span className="admin-mono">{row.collection || '—'}</span>
                              <span className="admin-faint"> / </span>
                              <span className="admin-mono">{row.docId || '—'}</span>
                            </td>
                            <td>
                              <div className="admin-audit-fields">
                                <ChangeFields row={row} />
                                {canRollback(row) ? (
                                  <button
                                    type="button"
                                    className="admin-link-btn"
                                    onClick={() => void openRollback(row)}
                                    disabled={busy}
                                  >
                                    {copy.audit.rollback}
                                  </button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="admin-list-cards admin-table-mobile">
                {rows.map((row, index) => (
                  <article className="admin-audit-card" key={String(row._id || index)}>
                    <div className="admin-audit-card__top">
                      <span className="admin-mono">{formatDateTime(row.at)}</span>
                      <span className="admin-mono admin-audit-card__action">{row.action || '—'}</span>
                    </div>
                    <div className="admin-audit-card__actor">{row.actorEmail || '—'}</div>
                    <div className="admin-audit-card__target">
                      <span className="admin-mono">{row.collection || '—'}</span>
                      <span className="admin-faint"> / </span>
                      <span className="admin-mono">{row.docId || '—'}</span>
                    </div>
                    <div className="admin-audit-fields">
                      <ChangeFields row={row} />
                      {canRollback(row) ? (
                        <button
                          type="button"
                          className="admin-link-btn"
                          onClick={() => void openRollback(row)}
                          disabled={busy}
                        >
                          {copy.audit.rollback}
                        </button>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}

          {rows.length ? (
            <div className="admin-panel__foot">
              <button
                type="button"
                className="admin-load-more"
                onClick={() => void load(false)}
                disabled={loadingMore || !cursor}
              >
                {loadingMore ? copy.audit.loadingMore : copy.audit.loadMore}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {rollback ? (
        <div className="admin-modal-layer">
          <div className="admin-drawer__scrim" onClick={closeRollback} aria-hidden="true" />
          <div
            className="admin-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-rollback-title"
          >
            <div className="admin-modal__head">
              <h2 id="admin-rollback-title">{copy.audit.rollbackTitle}</h2>
              <button
                type="button"
                className="admin-icon-btn"
                onClick={closeRollback}
                disabled={busy}
                aria-label={copy.tableDetail.close}
              >
                <CloseIcon />
              </button>
            </div>
            <div className="admin-modal__body">
              <p className="admin-modal__lead">
                {copy.audit.rollbackBody.replace(
                  '{target}',
                  `${rollback.audit.collection || ''} / ${rollback.audit.docId || ''}`,
                )}
              </p>
              <ul className="admin-confirm__list">
                {rollback.fields.map((field) => (
                  <li className="admin-confirm__row" key={field}>
                    <span className="admin-confirm__field">{fieldLabel(field)}</span>
                    <span className="admin-confirm__change">
                      <span className="admin-confirm__old">
                        {formatFieldValue(
                          rollback.audit.collection || '',
                          field,
                          rollback.row[field],
                        )}
                      </span>
                      <span className="admin-confirm__arrow" aria-hidden="true">
                        →
                      </span>
                      <span className="admin-confirm__new">
                        {formatFieldValue(
                          rollback.audit.collection || '',
                          field,
                          rollback.patch[field],
                        )}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              {actionError ? (
                <p className="admin-alert" role="alert">
                  {actionError}
                </p>
              ) : null}
            </div>
            <div className="admin-modal__foot">
              <button type="button" className="admin-btn" onClick={closeRollback} disabled={busy}>
                {copy.tableDetail.cancel}
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                onClick={() => void confirmRollback()}
                disabled={busy}
              >
                {busy ? copy.tableDetail.saving : copy.audit.rollbackConfirm}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

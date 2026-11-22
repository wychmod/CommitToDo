import { useMemo, useState } from 'react';
import {
  callAdminApi,
  errorMessage,
  isApiError,
  type TableRowData,
  type TableUpdateData,
} from '@/lib/admin-api';
import {
  EDIT_FIELD_KINDS,
  ENUM_OPTIONS,
  draftOf,
  enumText,
  fieldLabel,
  formatFieldValue,
  patchValueOf,
  type FieldKind,
} from '@/lib/display';
import { copy } from '@/i18n';

interface RowEditorProps {
  collection: string;
  row: Record<string, unknown>;
  writableFields: string[];
  onCancel: () => void;
  onSaved: (row: Record<string, unknown>, auditId: string) => void;
}

type Draft = Record<string, string | boolean>;
type Phase = 'form' | 'confirm';

function displayValue(kind: FieldKind, value: unknown): string {
  if (value == null || value === '') return copy.tableDetail.emptyValue;
  if (typeof value === 'boolean') return value ? '开启' : '关闭';
  if (kind === 'boolean') return String(value) === 'true' ? '开启' : '关闭';
  if (kind === 'enum' || kind === 'color') return enumText(String(value));
  return String(value);
}

export function RowEditor({
  collection,
  row,
  writableFields,
  onCancel,
  onSaved,
}: RowEditorProps) {
  const kinds = EDIT_FIELD_KINDS[collection] || {};
  const fields = useMemo(() => {
    const known = writableFields.filter((field) => kinds[field]);
    return known.length ? known : Object.keys(kinds);
  }, [kinds, writableFields]);

  const [base, setBase] = useState(row);
  const [draft, setDraft] = useState<Draft>(() => {
    const next: Draft = {};
    for (const field of fields) next[field] = draftOf(row[field]);
    return next;
  });
  const [reason, setReason] = useState('');
  const [phase, setPhase] = useState<Phase>('form');
  const [message, setMessage] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [conflict, setConflict] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const currentValues = useMemo(() => {
    const values: Record<string, unknown> = {};
    for (const field of fields) {
      values[field] = patchValueOf(field, kinds[field] || 'text', draftOf(base[field]));
    }
    return values;
  }, [base, fields, kinds]);

  const nextValues = useMemo(() => {
    const values: Record<string, unknown> = {};
    for (const field of fields) {
      values[field] = patchValueOf(field, kinds[field] || 'text', draft[field]);
    }
    return values;
  }, [draft, fields, kinds]);

  const changedFields = useMemo(
    () =>
      fields.filter(
        (field) => JSON.stringify(currentValues[field]) !== JSON.stringify(nextValues[field]),
      ),
    [currentValues, fields, nextValues],
  );

  const setField = (field: string, value: string | boolean) => {
    setDraft((previous) => ({ ...previous, [field]: value }));
    setFieldError('');
    setMessage('');
  };

  const validate = (): boolean => {
    if (!changedFields.length) {
      setMessage(copy.tableDetail.noChanges);
      return false;
    }
    if (fields.includes('title') && !String(draft.title ?? '').trim()) {
      setFieldError(copy.tableDetail.requiredField.replace('{field}', fieldLabel('title')));
      return false;
    }
    if (fields.includes('order')) {
      const order = String(draft.order ?? '').trim();
      if (order !== '' && (!/^\d+$/.test(order) || Number(order) > 9999)) {
        setFieldError('order：必须是 0–9999 的整数');
        return false;
      }
    }
    if (!reason.trim() || reason.trim().length > 200) {
      setMessage(copy.tableDetail.reasonRequired);
      return false;
    }
    return true;
  };

  const handleReview = () => {
    setNotice('');
    setConflict('');
    if (!validate()) return;
    setMessage('');
    setPhase('confirm');
  };

  const handleSave = async () => {
    const patch: Record<string, unknown> = {};
    for (const field of changedFields) patch[field] = nextValues[field];
    setSaving(true);
    setMessage('');
    setConflict('');
    try {
      const result = await callAdminApi<TableUpdateData>('tables.update', {
        collection,
        id: String(base._id ?? base.id ?? ''),
        patch,
        expectedRev: Number(base.rev ?? 0),
        reason: reason.trim(),
      });
      onSaved(result.row, result.auditId);
    } catch (caught) {
      if (isApiError(caught) && caught.code === 'admin_conflict') {
        setConflict(caught.message);
        setPhase('form');
      } else {
        setMessage(errorMessage(caught));
        setPhase('form');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setMessage('');
    try {
      const result = await callAdminApi<TableRowData>('tables.row', {
        collection,
        id: String(base._id ?? base.id ?? ''),
      });
      setBase(result.row);
      setConflict('');
      setNotice(copy.tableDetail.refreshed.replace('{rev}', String(result.row.rev ?? 0)));
    } catch (caught) {
      setMessage(errorMessage(caught));
    } finally {
      setRefreshing(false);
    }
  };

  const renderField = (field: string) => {
    const kind: FieldKind = kinds[field] || 'text';
    const value = draft[field];
    const options = ENUM_OPTIONS[field] || ENUM_OPTIONS.color;

    if (kind === 'color') {
      return (
        <div className="admin-editor__field" key={field}>
          <span className="admin-editor__label">{fieldLabel(field)}</span>
          <div className="admin-editor__swatches" role="group" aria-label={fieldLabel(field)}>
            {options.map((option) => (
              <button
                key={option}
                type="button"
                className={`admin-swatch admin-swatch--${option}${
                  value === option ? ' admin-swatch--active' : ''
                }`}
                aria-label={enumText(option)}
                aria-pressed={value === option}
                onClick={() => setField(field, option)}
              />
            ))}
          </div>
        </div>
      );
    }

    if (kind === 'enum' || kind === 'boolean') {
      return (
        <label className="admin-editor__field" key={field}>
          <span className="admin-editor__label">{fieldLabel(field)}</span>
          <select
            className="admin-input"
            value={String(value)}
            onChange={(event) => setField(field, event.target.value)}
          >
            {options.map((option) => (
              <option key={option} value={option}>
                {kind === 'boolean' ? (option === 'true' ? '开启' : '关闭') : enumText(option)}
              </option>
            ))}
          </select>
        </label>
      );
    }

    return (
      <label className="admin-editor__field" key={field}>
        <span className="admin-editor__label">{fieldLabel(field)}</span>
        {kind === 'textarea' ? (
          <textarea
            className="admin-input admin-editor__textarea"
            value={String(value)}
            rows={3}
            onChange={(event) => setField(field, event.target.value)}
          />
        ) : (
          <input
            className="admin-input"
            type={kind === 'date' ? 'date' : kind === 'number' ? 'number' : 'text'}
            min={kind === 'number' ? 0 : undefined}
            max={kind === 'number' ? 9999 : undefined}
            value={String(value)}
            onChange={(event) => setField(field, event.target.value)}
          />
        )}
        {fieldError && fieldError.startsWith(fieldLabel(field)) ? (
          <span className="admin-editor__error">{fieldError}</span>
        ) : null}
      </label>
    );
  };

  if (phase === 'confirm') {
    return (
      <div className="admin-editor">
        <div className="admin-editor__scroll">
          <section className="admin-confirm">
            <h3>{copy.tableDetail.confirmTitle}</h3>
            <p>{copy.tableDetail.confirmBody}</p>
            <ul className="admin-confirm__list">
              {changedFields.map((field) => {
                const kind: FieldKind = kinds[field] || 'text';
                return (
                  <li className="admin-confirm__row" key={field}>
                    <span className="admin-confirm__field">{fieldLabel(field)}</span>
                    <span className="admin-confirm__change">
                      <span className="admin-confirm__old">
                        {displayValue(kind, currentValues[field])}
                      </span>
                      <span className="admin-confirm__arrow" aria-hidden="true">
                        →
                      </span>
                      <span className="admin-confirm__new">
                        {displayValue(kind, nextValues[field])}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="admin-confirm__reason">
              <strong>{copy.tableDetail.reason}</strong>
              <span>{reason.trim()}</span>
            </p>
          </section>

          {message ? (
            <p className="admin-alert" role="alert">
              {message}
            </p>
          ) : null}
        </div>

        <div className="admin-editor__actions">
          <button type="button" className="admin-btn" onClick={() => setPhase('form')} disabled={saving}>
            {copy.tableDetail.backToEdit}
          </button>
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            onClick={() => void handleSave()}
            disabled={saving}
          >
            {saving ? copy.tableDetail.saving : copy.tableDetail.confirmSave}
          </button>
        </div>
      </div>
    );
  }

  const readOnly = (
    <dl className="admin-editor__meta">
      <div>
        <dt>{fieldLabel('_id')}</dt>
        <dd className="admin-mono">{String(base._id ?? base.id ?? '—')}</dd>
      </div>
      {base.status != null ? (
        <div>
          <dt>{fieldLabel('status')}</dt>
          <dd>{formatFieldValue(collection, 'status', base.status)}</dd>
        </div>
      ) : null}
      {base.rev != null ? (
        <div>
          <dt>{fieldLabel('rev')}</dt>
          <dd>rev {String(base.rev)}</dd>
        </div>
      ) : null}
      {base.ownerId != null ? (
        <div>
          <dt>{fieldLabel('ownerId')}</dt>
          <dd className="admin-mono">{String(base.ownerId)}</dd>
        </div>
      ) : null}
      {base.updatedAt != null ? (
        <div>
          <dt>{fieldLabel('updatedAt')}</dt>
          <dd>{formatFieldValue(collection, 'updatedAt', base.updatedAt)}</dd>
        </div>
      ) : null}
    </dl>
  );

  return (
    <form
      className="admin-editor"
      onSubmit={(event) => {
        event.preventDefault();
        handleReview();
      }}
    >
      <div className="admin-editor__scroll">
        {readOnly}

        {fields.map(renderField)}

        <label className="admin-editor__field">
          <span className="admin-editor__label">{copy.tableDetail.reason}</span>
          <input
            className="admin-input"
            value={reason}
            maxLength={200}
            placeholder={copy.tableDetail.reasonPlaceholder}
            onChange={(event) => {
              setReason(event.target.value);
              setMessage('');
            }}
          />
        </label>

        {conflict ? (
          <div className="admin-alert admin-alert--conflict" role="alert">
            <strong>{copy.tableDetail.conflictTitle}</strong>
            <span>{conflict}</span>
            <button
              type="button"
              className="admin-btn admin-btn--quiet"
              onClick={() => void handleRefresh()}
              disabled={refreshing}
            >
              {copy.tableDetail.refresh}
            </button>
          </div>
        ) : null}

        {message ? (
          <p className="admin-alert" role="alert">
            {message}
          </p>
        ) : null}

        {fieldError ? (
          <p className="admin-alert" role="alert">
            {fieldError}
          </p>
        ) : null}

        {notice ? <p className="admin-editor__notice">{notice}</p> : null}
      </div>

      <div className="admin-editor__actions">
        <button type="button" className="admin-btn" onClick={onCancel} disabled={saving}>
          {copy.tableDetail.cancel}
        </button>
        <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
          {copy.tableDetail.save}
        </button>
      </div>
    </form>
  );
}

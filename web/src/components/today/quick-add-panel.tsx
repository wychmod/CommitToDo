import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { systemClock, today } from '@/core/clock';
import { isBranchAccepting } from '@/core/rules/branch-state';
import { visibleDefaultTree } from '@/core/rules/branch-visibility';
import { BULK_IMPORT_MAX, parseBulkImport } from '@/core/rules/bulk-import';
import { branchTrail, parseQuickAdd, resolveBranchQuery } from '@/core/rules/quick-add';
import { bulkImportTasks } from '@/data/bulk-import';
import { useBranches } from '@/data/hooks';
import { createTask } from '@/data/create-task';
import { t } from '@/i18n';
import { useShellStore } from '@/stores/shell.store';
import styles from './quick-add-panel.module.css';

const DATE_HINT = /(下周|周[一二三四五六日天]|\d{1,2}\s*[月日号])/;

type QuickAddMode = 'single' | 'batch';

/**
 * 快速添加（O01）。
 *
 * 单条：单行输入 → 识别日期与 `#分支` → 保存前回显；识别失败保留原文。
 * 批量：多行文本逐行预览、可删行，一次事务导入到同一分支；超过 200 行整批拒绝。
 * 两种模式共用右下角的提交按钮，保存成功关闭面板。
 */
export function QuickAddPanel() {
  const closeOverlay = useShellStore((state) => state.closeOverlay);
  const overlayBranchId = useShellStore((state) => state.overlayBranchId);
  const rawBranches = useBranches();
  const branches = useMemo(() => rawBranches ?? [], [rawBranches]);
  const todayDate = today(systemClock);

  const [mode, setMode] = useState<QuickAddMode>('single');
  const [text, setText] = useState('');
  const [due, setDue] = useState('');
  const [branchId, setBranchId] = useState(overlayBranchId ?? '');
  const [dateTouched, setDateTouched] = useState(false);
  const [branchTouched, setBranchTouched] = useState(overlayBranchId !== null);
  const [bulkText, setBulkText] = useState('');
  const [bulkRemoved, setBulkRemoved] = useState<number[]>([]);
  const [bulkBranchId, setBulkBranchId] = useState(overlayBranchId ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accepting = useMemo(
    () =>
      visibleDefaultTree(branches)
        .filter(isBranchAccepting)
        .sort((a, b) => a.depth - b.depth || a.order - b.order),
    [branches],
  );
  const byId = useMemo(() => new Map(accepting.map((branch) => [branch.id, branch])), [accepting]);
  const root = accepting.find((branch) => branch.depth === 0);

  const parsed = parseQuickAdd(text, todayDate);
  const matched = parsed.branchQuery ? resolveBranchQuery(accepting, parsed.branchQuery) : null;

  useEffect(() => {
    if (!dateTouched) setDue(parsed.dueDate ?? '');
  }, [parsed.dueDate, dateTouched]);

  useEffect(() => {
    if (!branchTouched) setBranchId(matched?.id ?? '');
  }, [matched?.id, branchTouched]);

  const bulkParsed = useMemo(() => parseBulkImport(bulkText), [bulkText]);
  const bulkEntries = useMemo(
    () => bulkParsed.entries.filter((entry) => !bulkRemoved.includes(entry.line)),
    [bulkParsed.entries, bulkRemoved],
  );
  const bulkOverLimit = bulkEntries.length > BULK_IMPORT_MAX;
  const bulkCount = bulkEntries.length;

  useEffect(() => {
    if (mode !== 'batch' || bulkBranchId || !root) return;
    setBulkBranchId(root.id);
  }, [mode, bulkBranchId, root]);

  const chosen = byId.get(branchId);
  const effectiveBranch = chosen?.id ?? matched?.id ?? root?.id ?? '';
  const selectedBranch = byId.get(effectiveBranch);
  const effectiveBranchTrail = selectedBranch ? branchTrail(selectedBranch, byId) : '';
  const branchUnrecognized = parsed.branchQuery !== null && matched === null;
  const dateUnrecognized = !due && parsed.dateToken === null && DATE_HINT.test(text);

  const bulkBranch = byId.get(bulkBranchId) ?? root;
  const effectiveBulkBranch = bulkBranch?.id ?? '';
  const bulkBranchTrail = bulkBranch ? branchTrail(bulkBranch, byId) : '';

  const switchMode = (next: QuickAddMode) => {
    setMode(next);
    setError(null);
  };

  const saveSingle = async () => {
    if (!parsed.title.trim()) {
      setError(t('quickAdd.error.empty'));
      return;
    }
    if (!effectiveBranch) {
      setError(t('quickAdd.error.storage'));
      return;
    }

    setBusy(true);
    setError(null);
    const result = await createTask({
      title: parsed.title,
      branchId: effectiveBranch,
      dueDate: due || null,
    });
    setBusy(false);
    if (result.ok) closeOverlay();
    else setError(t('quickAdd.error.storage'));
  };

  const saveBatch = async () => {
    if (bulkCount === 0 || bulkOverLimit || !effectiveBulkBranch) return;

    setBusy(true);
    setError(null);
    const result = await bulkImportTasks({
      titles: bulkEntries.map((entry) => entry.title),
      branchId: effectiveBulkBranch,
    });
    setBusy(false);
    if (result.ok) closeOverlay();
    else setError(t('quickAdd.batch.importFailed'));
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (mode === 'batch') await saveBatch();
    else await saveSingle();
  };

  const removeBulkLine = (line: number) => {
    setBulkRemoved((current) => [...current, line]);
    setError(null);
  };

  return (
    <div className={styles.backdrop} role="presentation" onPointerDown={closeOverlay}>
      <form
        className={styles.panel}
        aria-label={t('quickAdd.title')}
        onPointerDown={(event) => event.stopPropagation()}
        onSubmit={save}
      >
        <div className={styles.header}>
          <h2 className={styles.title}>{t('quickAdd.title')}</h2>
          <button type="button" className={styles.close} onClick={closeOverlay}>
            {t('shell.close')}
          </button>
        </div>

        <div className={styles.modes} role="tablist" aria-label={t('quickAdd.title')}>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'single'}
            className={styles.mode}
            data-active={mode === 'single' || undefined}
            onClick={() => switchMode('single')}
          >
            {t('quickAdd.mode.single')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'batch'}
            className={styles.mode}
            data-active={mode === 'batch' || undefined}
            onClick={() => switchMode('batch')}
          >
            {t('quickAdd.mode.batch')}
          </button>
        </div>

        {mode === 'single' ? (
          <div className={styles.pane} role="tabpanel">
            <label className={styles.field}>
              <span className={styles.label}>{t('quickAdd.field.text')}</span>
              <input
                className={styles.input}
                value={text}
                autoFocus
                placeholder={t('quickAdd.field.textPlaceholder')}
                onChange={(event) => {
                  setText(event.target.value);
                  setError(null);
                }}
              />
            </label>
            <p className={styles.hint}>{t('quickAdd.hint')}</p>

            <div className={styles.preview}>
              <span className={styles.previewItem}>
                <span className={styles.previewLabel}>{t('quickAdd.preview.date')}</span>
                <span className={styles.previewValue} data-warn={dateUnrecognized || undefined}>
                  {dateUnrecognized
                    ? t('quickAdd.unrecognizedDate')
                    : due || t('quickAdd.noneDate')}
                </span>
              </span>
              <span className={styles.previewItem}>
                <span className={styles.previewLabel}>{t('quickAdd.preview.branch')}</span>
                <span className={styles.previewValue} data-warn={branchUnrecognized || undefined}>
                  {branchUnrecognized ? t('quickAdd.unrecognizedBranch') : effectiveBranchTrail}
                </span>
              </span>
            </div>

            <div className={styles.row}>
              <label className={styles.field}>
                <span className={styles.label}>{t('quickAdd.field.due')}</span>
                <input
                  type="date"
                  className={styles.input}
                  value={due}
                  onChange={(event) => {
                    setDateTouched(true);
                    setDue(event.target.value);
                  }}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>{t('quickAdd.field.branch')}</span>
                <select
                  className={styles.input}
                  value={effectiveBranch}
                  onChange={(event) => {
                    setBranchTouched(true);
                    setBranchId(event.target.value);
                  }}
                >
                  {accepting.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branchTrail(branch, byId)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        ) : (
          <div className={styles.pane} role="tabpanel">
            <label className={styles.field}>
              <span className={styles.label}>{t('quickAdd.batch.text')}</span>
              <textarea
                className={styles.textarea}
                value={bulkText}
                rows={5}
                autoFocus
                placeholder={t('quickAdd.batch.placeholder')}
                onChange={(event) => {
                  setBulkText(event.target.value);
                  setBulkRemoved([]);
                  setError(null);
                }}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>{t('quickAdd.batch.target')}</span>
              <select
                className={styles.input}
                value={effectiveBulkBranch}
                onChange={(event) => {
                  setBulkBranchId(event.target.value);
                  setError(null);
                }}
              >
                {accepting.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branchTrail(branch, byId)}
                  </option>
                ))}
              </select>
            </label>

            <p className={styles.summary}>
              {t('quickAdd.batch.summaryPrefix')}
              {bulkCount}
              {t('quickAdd.batch.summaryMiddle')}
              {bulkBranchTrail}
              {t('quickAdd.batch.summarySuffix')}
            </p>

            {bulkOverLimit ? (
              <p className={styles.error} role="alert">
                {t('quickAdd.batch.overLimit')}
              </p>
            ) : null}

            {bulkCount === 0 ? (
              <p className={styles.hint}>{t('quickAdd.batch.empty')}</p>
            ) : (
              <ul className={styles.bulkList}>
                {bulkEntries.map((entry) => (
                  <li key={entry.line} className={styles.bulkItem}>
                    <span className={styles.bulkTitle}>{entry.title}</span>
                    <button
                      type="button"
                      className={styles.bulkRemove}
                      aria-label={`${t('quickAdd.batch.remove')}：${entry.title}`}
                      onClick={() => removeBulkLine(entry.line)}
                    >
                      {t('quickAdd.batch.remove')}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}

        <div className={styles.actions}>
          <button
            type="submit"
            className={styles.save}
            disabled={
              busy ||
              (mode === 'batch' && (bulkCount === 0 || bulkOverLimit || !effectiveBulkBranch))
            }
          >
            {busy
              ? mode === 'batch'
                ? t('quickAdd.batch.importing')
                : t('quickAdd.saving')
              : mode === 'batch'
                ? `${t('quickAdd.batch.importPrefix')}${bulkCount}${t('quickAdd.batch.importSuffix')}`
                : t('quickAdd.save')}
          </button>
        </div>
      </form>
    </div>
  );
}

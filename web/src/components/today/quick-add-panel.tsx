import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { systemClock, today } from '@/core/clock';
import { isBranchAccepting } from '@/core/rules/branch-state';
import { branchTrail, parseQuickAdd, resolveBranchQuery } from '@/core/rules/quick-add';
import { useBranches } from '@/data/hooks';
import { createTask } from '@/data/create-task';
import { t } from '@/i18n';
import { useShellStore } from '@/stores/shell.store';
import styles from './quick-add-panel.module.css';

const DATE_HINT = /(下周|周[一二三四五六日天]|\d{1,2}\s*[月日号])/;

/**
 * 快速添加（O01）。
 *
 * 单行输入 → 识别日期与 `#分支` → 保存前回显；识别失败保留原文，
 * 日期与分支可手动改。保存成功关闭面板，今天页随 useLiveQuery 刷新。
 */
export function QuickAddPanel() {
  const closeOverlay = useShellStore((state) => state.closeOverlay);
  const overlayBranchId = useShellStore((state) => state.overlayBranchId);
  const rawBranches = useBranches();
  const branches = useMemo(() => rawBranches ?? [], [rawBranches]);
  const todayDate = today(systemClock);

  const [text, setText] = useState('');
  const [due, setDue] = useState('');
  const [branchId, setBranchId] = useState(overlayBranchId ?? '');
  const [dateTouched, setDateTouched] = useState(false);
  const [branchTouched, setBranchTouched] = useState(overlayBranchId !== null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accepting = useMemo(
    () =>
      branches
        .filter((branch) => branch.deletedAt === null && isBranchAccepting(branch))
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

  const chosen = byId.get(branchId);
  const effectiveBranch = chosen?.id ?? matched?.id ?? root?.id ?? '';
  const selectedBranch = byId.get(effectiveBranch);
  const effectiveBranchTrail = selectedBranch ? branchTrail(selectedBranch, byId) : '';
  const branchUnrecognized = parsed.branchQuery !== null && matched === null;
  const dateUnrecognized = !due && parsed.dateToken === null && DATE_HINT.test(text);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
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
              {dateUnrecognized ? t('quickAdd.unrecognizedDate') : due || t('quickAdd.noneDate')}
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

        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}

        <div className={styles.actions}>
          <button type="submit" className={styles.save} disabled={busy}>
            {busy ? t('quickAdd.saving') : t('quickAdd.save')}
          </button>
        </div>
      </form>
    </div>
  );
}

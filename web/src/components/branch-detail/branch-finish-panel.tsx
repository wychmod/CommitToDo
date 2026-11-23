import { useState } from 'react';
import type { FinishBlockReason } from '@/core/rules/finish-precheck';
import { finishBranch } from '@/data/finish-branch';
import { useBranchFinishPlan } from '@/data/hooks';
import type { Branch } from '@/data/types';
import { t, type MessageKey } from '@/i18n';
import { Button } from '@/ui/button';
import { Dialog, DialogActions, DialogHeader } from '@/ui/dialog';
import styles from './branch-finish-panel.module.css';

const BLOCK_KEYS: Record<FinishBlockReason, MessageKey> = {
  root: 'branchDetail.finish.blocked.root',
  readonly: 'branchDetail.finish.blocked.readonly',
  'parent-missing': 'branchDetail.finish.blocked.parentMissing',
  'parent-readonly': 'branchDetail.finish.blocked.parentReadonly',
  'unfinished-descendant': 'branchDetail.finish.blocked.unfinished',
};

type Step = 1 | 2 | 3;
type Destination = 'archive' | 'keep';

interface BranchFinishPanelProps {
  branch: Branch;
  branches: readonly Branch[];
  onClose: () => void;
  onFinished: (branch: Branch) => void;
}

function trailOf(target: Branch, byId: ReadonlyMap<string, Branch>): string {
  const titles: string[] = [];
  let current: Branch | undefined = target;
  let guard = 0;
  while (current && guard < 32) {
    titles.unshift(current.title);
    current = current.parentId ? byId.get(current.parentId) : undefined;
    guard += 1;
  }
  return titles.join(' / ');
}

/**
 * 收尾确认（B06 / B07，M08 OP-01–OP-05）。
 *
 * 三步：后果 → 去向 → 最终确认；390 px 下为全屏步骤页，可返回上一步。
 * 预检不通过时只说明原因，不显示最终确认；写入失败保留面板与选择，可重试。
 */
export function BranchFinishPanel({
  branch,
  branches,
  onClose,
  onFinished,
}: BranchFinishPanelProps) {
  const view = useBranchFinishPlan(branch.id);
  const [step, setStep] = useState<Step>(1);
  const [destination, setDestination] = useState<Destination>('archive');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const byId = new Map(branches.map((row) => [row.id, row]));
  const precheck = view.precheck;
  const parent = precheck?.parent ? (byId.get(precheck.parent.id) ?? null) : null;
  const parentTrail = parent ? trailOf(parent, byId) : null;

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    const result = await finishBranch({
      branchId: branch.id,
      archived: destination === 'archive',
    });
    if (result.ok) {
      onFinished(result.value);
      return;
    }
    setBusy(false);
    setFailed(true);
  };

  const steps: { step: Step; key: MessageKey }[] = [
    { step: 1, key: 'branchDetail.finish.step1' },
    { step: 2, key: 'branchDetail.finish.step2' },
    { step: 3, key: 'branchDetail.finish.step3' },
  ];

  return (
    <Dialog onClose={onClose} busy={busy} size="lg" className={styles.panel}>
      <DialogHeader title={t('branchDetail.finish.title')} />

      <ol className={styles.steps} aria-label={t('branchDetail.finish.title')}>
        {steps.map((item) => (
          <li
            key={item.step}
            className={styles.step}
            data-active={item.step === step ? '' : undefined}
            data-done={item.step < step ? '' : undefined}
          >
            {t(item.key)}
          </li>
        ))}
      </ol>

      {view.status === 'loading' ? (
        <p className={styles.state} role="status">
          {t('branchDetail.finish.loading')}
        </p>
      ) : null}

      {view.status === 'error' ? (
        <div className={styles.blocked} role="alert">
          <p>{t('branchDetail.finish.loadFailed')}</p>
          <Button onClick={view.retry}>{t('branchDetail.retry')}</Button>
        </div>
      ) : null}

      {view.status === 'ready' && (!precheck || !precheck.allowed) ? (
        <div className={styles.blocked} role="alert">
          <p>{t('branchDetail.finish.blocked')}</p>
          <p className={styles.reason}>{t(BLOCK_KEYS[precheck?.reason ?? 'readonly'])}</p>
        </div>
      ) : null}

      {view.status === 'ready' && precheck?.allowed ? (
        <div className={styles.body}>
          {step === 1 ? (
            <dl className={styles.facts}>
              <div className={styles.fact}>
                <dt>{t('branchDetail.finish.into')}</dt>
                <dd>{parentTrail ?? parent?.title ?? '—'}</dd>
              </div>
              <div className={styles.fact}>
                <dt>{t('branchDetail.finish.commits')}</dt>
                <dd>
                  {t('branchDetail.finish.commitsValuePrefix')}
                  {precheck.commitCount}
                  {t('branchDetail.finish.commitsValueSuffix')}
                </dd>
              </div>
              <div className={styles.fact}>
                <dt>{t('branchDetail.finish.tasks')}</dt>
                <dd>
                  {t('branchDetail.finish.tasksValuePrefix')}
                  {precheck.openTaskCount}
                  {t('branchDetail.finish.tasksValueSuffix')}
                </dd>
              </div>
              <div className={styles.fact}>
                <dt>{t('branchDetail.finish.children')}</dt>
                <dd>{t('branchDetail.finish.childrenValue')}</dd>
              </div>
            </dl>
          ) : null}

          {step === 1 ? (
            <p className={styles.warning}>{t('branchDetail.finish.irreversible')}</p>
          ) : null}

          {step === 2 ? (
            <fieldset className={styles.destinations}>
              <legend className={styles.legend}>{t('branchDetail.finish.destination')}</legend>
              {(['archive', 'keep'] as const).map((value) => (
                <label
                  key={value}
                  className={styles.destination}
                  data-selected={destination === value ? '' : undefined}
                >
                  <input
                    type="radio"
                    name="finish-destination"
                    value={value}
                    checked={destination === value}
                    onChange={() => setDestination(value)}
                  />
                  <span className={styles.destinationBody}>
                    <span className={styles.destinationName}>
                      {t(
                        value === 'archive'
                          ? 'branchDetail.finish.archive'
                          : 'branchDetail.finish.keep',
                      )}
                    </span>
                    <span className={styles.destinationNote}>
                      {t(
                        value === 'archive'
                          ? 'branchDetail.finish.archiveNote'
                          : 'branchDetail.finish.keepNote',
                      )}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
          ) : null}

          {step === 3 ? (
            <div className={styles.summary}>
              <p className={styles.summaryTitle}>{t('branchDetail.finish.summary')}</p>
              <p>
                {t(
                  destination === 'archive'
                    ? 'branchDetail.finish.summaryArchivePrefix'
                    : 'branchDetail.finish.summaryKeepPrefix',
                )}
                {parent?.title ?? '—'}
                {t(
                  destination === 'archive'
                    ? 'branchDetail.finish.summaryArchiveSuffix'
                    : 'branchDetail.finish.summaryKeepSuffix',
                )}
              </p>
              <p className={styles.warning}>{t('branchDetail.finish.irreversible')}</p>
            </div>
          ) : null}

          {failed ? (
            <p className={styles.error} role="alert">
              {t('branchDetail.finish.failed')}
            </p>
          ) : null}
        </div>
      ) : null}

      <DialogActions>
        <Button
          onClick={step === 1 ? onClose : () => setStep((value) => (value - 1) as Step)}
          disabled={busy}
        >
          {step === 1 ? t('shell.cancel') : t('branchDetail.finish.prev')}
        </Button>
        {step < 3 ? (
          <Button
            variant="primary"
            onClick={() => setStep((value) => (value + 1) as Step)}
            disabled={busy || view.status !== 'ready' || !precheck?.allowed}
          >
            {t('branchDetail.finish.next')}
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={submit}
            disabled={busy || view.status !== 'ready' || !precheck?.allowed}
          >
            {busy
              ? t('branches.saving')
              : t(
                  destination === 'archive'
                    ? 'branchDetail.finish.confirmArchive'
                    : 'branchDetail.finish.confirmKeep',
                )}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

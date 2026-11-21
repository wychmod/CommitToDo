import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { localClockTime, localDate, systemClock } from '@/core/clock';
import { BRANCH_COLORS, DEFAULT_BRANCH_COLOR, type BranchColor } from '@/core/rules/branch-color';
import {
  deriveOnboardingStep,
  needsOnboarding,
  shouldShowOnboarding,
} from '@/core/rules/onboarding-state';
import { completeTask } from '@/data/complete-task';
import { createBranch } from '@/data/create-branch';
import { createTask } from '@/data/create-task';
import { useOnboardingData } from '@/data/hooks';
import { loadSampleTree } from '@/data/sample-namespace';
import type { Commit } from '@/data/types';
import { t, type MessageKey } from '@/i18n';
import { useOnboardingStore } from '@/stores/onboarding.store';
import styles from './onboarding-card.module.css';

const COLOR_KEYS: Record<BranchColor, MessageKey> = {
  coral: 'branches.color.coral',
  sky: 'branches.color.sky',
  honey: 'branches.color.honey',
  mint: 'branches.color.mint',
  iris: 'branches.color.iris',
  rose: 'branches.color.rose',
  teal: 'branches.color.teal',
};

interface Receipt {
  commit: Commit;
  taskTitle: string;
  branchTitle: string;
}

/**
 * 今天页顶部的三步引导卡（PRD M12 A-01 / OP-01–OP-04）。
 *
 * 步骤由真实数据推导，没有「下一步」假按钮；离开后已完成的步骤保留，
 * 未保存的输入不保留并在卡片底部说明。跳过后整卡收起，已建数据保留。
 */
export function OnboardingCard() {
  const navigate = useNavigate();
  const view = useOnboardingData();
  const started = useOnboardingStore((state) => state.started);
  const skipped = useOnboardingStore((state) => state.skipped);
  const finished = useOnboardingStore((state) => state.finished);
  const branchId = useOnboardingStore((state) => state.branchId);
  const markStarted = useOnboardingStore((state) => state.markStarted);
  const recordBranch = useOnboardingStore((state) => state.recordBranch);
  const recordTask = useOnboardingStore((state) => state.recordTask);
  const skip = useOnboardingStore((state) => state.skip);
  const finish = useOnboardingStore((state) => state.finish);

  const [title, setTitle] = useState('');
  const [color, setColor] = useState<BranchColor>(DEFAULT_BRANCH_COLOR);
  const [taskTitle, setTaskTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<MessageKey | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const state = { started, skipped, finished };
  const step = deriveOnboardingStep(view.data);
  const visible = view.status === 'ready' && shouldShowOnboarding(state, view.data);

  useEffect(() => {
    if (visible && !started) markStarted();
  }, [visible, started, markStarted]);

  if (!visible) return null;

  const branch = branchId ? view.branches.find((item) => item.id === branchId) : undefined;
  const rootBranch = view.branches.find((item) => item.id === view.rootId);
  const targetBranchId = branch?.id ?? view.rootId;
  const targetBranchTitle = branch?.title ?? rootBranch?.title ?? '';

  const saveBranch = async () => {
    if (busy) return;
    if (!title.trim() || !view.rootId) {
      setErrorKey('onboarding.error.titleEmpty');
      return;
    }
    setBusy(true);
    setErrorKey(null);
    const result = await createBranch({ title, parentId: view.rootId, color });
    setBusy(false);
    if (!result.ok) {
      setErrorKey(
        result.error.field === 'title' ? 'onboarding.error.titleEmpty' : 'onboarding.error.failed',
      );
      return;
    }
    recordBranch(result.value.id);
    setTitle('');
  };

  const saveTask = async () => {
    if (busy) return;
    if (!taskTitle.trim() || !targetBranchId) {
      setErrorKey('onboarding.error.titleEmpty');
      return;
    }
    setBusy(true);
    setErrorKey(null);
    const result = await createTask({
      title: taskTitle,
      branchId: targetBranchId,
      dueDate: dueDate || null,
    });
    setBusy(false);
    if (!result.ok) {
      setErrorKey(
        result.error.field === 'title' ? 'onboarding.error.titleEmpty' : 'onboarding.error.failed',
      );
      return;
    }
    recordTask(result.value.id);
    setTaskTitle('');
  };

  const completeFirst = async () => {
    const target = view.firstOpenTask;
    if (!target || busy) return;
    setBusy(true);
    setErrorKey(null);
    const result = await completeTask({ taskId: target.id });
    setBusy(false);
    if (!result.ok) {
      setErrorKey('onboarding.error.failed');
      return;
    }
    setReceipt({
      commit: result.value.commit,
      taskTitle: target.title,
      branchTitle:
        view.branches.find((item) => item.id === target.branchId)?.title ?? targetBranchTitle,
    });
  };

  const openSample = async () => {
    if (busy) return;
    setBusy(true);
    setErrorKey(null);
    const result = await loadSampleTree();
    setBusy(false);
    if (!result.ok) {
      setErrorKey('onboarding.error.sampleFailed');
      return;
    }
    navigate('/sample');
  };

  const completedCount = step === 'done' ? 3 : step - 1;
  const doneCommit = receipt?.commit ?? view.firstCommit;

  return (
    <section className={styles.card} aria-label={t('onboarding.title')}>
      <header className={styles.head}>
        <div>
          <span className={styles.kicker}>{t('onboarding.kicker')}</span>
          <h2 className={styles.title}>{t('onboarding.title')}</h2>
        </div>
        <button type="button" className={styles.skip} onClick={skip}>
          {t('onboarding.skip')}
        </button>
      </header>

      <ol className={styles.steps}>
        {(['branch', 'task', 'commit'] as const).map((key, index) => (
          <li
            key={key}
            className={styles.step}
            data-current={index + 1 === (step === 'done' ? 4 : step)}
            data-done={index < completedCount}
          >
            <span className={styles.stepIndex}>{index + 1}</span>
            <span className={styles.stepLabel}>{t(`onboarding.step.${key}` as MessageKey)}</span>
          </li>
        ))}
      </ol>

      {step === 1 ? (
        <div className={styles.body}>
          <p className={styles.prompt}>{t('onboarding.step.branchPrompt')}</p>
          <label className={styles.field}>
            <span className={styles.label}>{t('onboarding.field.name')}</span>
            <input
              className={styles.input}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t('onboarding.field.namePlaceholder')}
              disabled={busy}
            />
          </label>
          <fieldset className={styles.colors}>
            <legend className={styles.label}>{t('onboarding.field.color')}</legend>
            <div className={styles.swatches}>
              {BRANCH_COLORS.map((preset) => (
                <label key={preset} className={styles.swatchLabel}>
                  <input
                    type="radio"
                    name="onboarding-color"
                    value={preset}
                    checked={color === preset}
                    onChange={() => setColor(preset)}
                  />
                  <span className={styles.swatch} data-color={preset} aria-hidden="true" />
                  <span className={styles.colorName}>{t(COLOR_KEYS[preset])}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className={styles.actions}>
            <button type="button" className={styles.primary} onClick={saveBranch} disabled={busy}>
              {busy ? t('onboarding.saving') : t('onboarding.saveBranch')}
            </button>
            <button type="button" className={styles.ghost} onClick={openSample} disabled={busy}>
              {t('onboarding.sample')}
            </button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className={styles.body}>
          <p className={styles.prompt}>
            {t('onboarding.step.taskPromptPrefix')}
            {t('onboarding.step.taskPromptMiddle')}
          </p>
          <label className={styles.field}>
            <span className={styles.label}>{t('onboarding.field.task')}</span>
            <input
              className={styles.input}
              value={taskTitle}
              onChange={(event) => setTaskTitle(event.target.value)}
              placeholder={t('onboarding.field.taskPlaceholder')}
              disabled={busy}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>{t('onboarding.field.date')}</span>
            <input
              type="date"
              className={styles.input}
              value={dueDate}
              min={localDate(systemClock.now())}
              onChange={(event) => setDueDate(event.target.value)}
              disabled={busy}
            />
          </label>
          <button type="button" className={styles.primary} onClick={saveTask} disabled={busy}>
            {busy ? t('onboarding.saving') : t('onboarding.saveTask')}
          </button>
        </div>
      ) : null}

      {step === 3 ? (
        <div className={styles.body}>
          <p className={styles.prompt}>{t('onboarding.step.commitPrompt')}</p>
          {view.firstOpenTask ? (
            <div className={styles.target}>
              <span className={styles.targetTitle}>{view.firstOpenTask.title}</span>
              <button
                type="button"
                className={styles.primary}
                onClick={completeFirst}
                disabled={busy}
              >
                {busy ? t('onboarding.saving') : t('onboarding.completeTask')}
              </button>
            </div>
          ) : (
            <p className={styles.prompt}>{t('onboarding.step.noOpenTask')}</p>
          )}
        </div>
      ) : null}

      {step === 'done' ? (
        <div className={styles.receipt}>
          <p className={styles.receiptTitle}>{t('onboarding.receipt.title')}</p>
          {receipt ? (
            <>
              <p className={styles.receiptLine}>
                {receipt.taskTitle} · {receipt.branchTitle}
              </p>
              <p className={styles.receiptTime}>
                {t('onboarding.receipt.submitted')} {localClockTime(receipt.commit.at)}
              </p>
            </>
          ) : (
            <p className={styles.receiptLine}>{t('onboarding.receipt.done')}</p>
          )}
          <div className={styles.actions}>
            {doneCommit ? (
              <Link
                className={styles.primary}
                to={`/history?commit=${doneCommit.id}`}
                onClick={finish}
              >
                {t('onboarding.receipt.history')}
              </Link>
            ) : null}
            <button type="button" className={styles.ghost} onClick={finish}>
              {t('onboarding.receipt.continue')}
            </button>
          </div>
        </div>
      ) : null}

      {errorKey ? (
        <p className={styles.error} role="alert">
          {t(errorKey)}
        </p>
      ) : null}

      <p className={styles.hint}>{t('onboarding.inputHint')}</p>

      {needsOnboarding(view.data) && (step === 1 || step === 2) ? (
        <p className={styles.skipHint}>{t('onboarding.skipHint')}</p>
      ) : null}
    </section>
  );
}

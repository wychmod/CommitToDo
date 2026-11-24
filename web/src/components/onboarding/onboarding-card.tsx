import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { localClockTime, localDate, systemClock } from '@/core/clock';
import { BRANCH_COLORS, DEFAULT_BRANCH_COLOR, type BranchColor } from '@/core/rules/branch-color';
import type { OnboardingStep } from '@/core/rules/onboarding-state';
import { completeTask } from '@/data/complete-task';
import { createBranch } from '@/data/create-branch';
import { createTask } from '@/data/create-task';
import type { OnboardingDataView } from '@/data/hooks';
import { loadSampleTree } from '@/data/sample-namespace';
import { CheckIcon, HistoryIcon, ListIcon } from '@/ui/icons';
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

/**
 * 今天页的三步引导（PRD M12 A-01 / OP-01–OP-04）。
 *
 * 步骤由真实数据推导，没有「下一步」假按钮；离开后已完成的步骤保留，
 * 未保存的输入不保留并在卡片底部说明。跳过后整卡收起，已建数据保留。
 */
export function OnboardingCard({ view, step }: { view: OnboardingDataView; step: OnboardingStep }) {
  const navigate = useNavigate();
  const started = useOnboardingStore((state) => state.started);
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
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!started) markStarted();
  }, [started, markStarted]);

  const branch = branchId ? view.branches.find((item) => item.id === branchId) : undefined;
  const targetBranchId = branch?.id ?? view.rootId;
  const completed = step === 'done';

  useEffect(() => {
    window.scrollTo(0, 0);
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

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
  const doneCommit = view.firstCommit;
  const receiptBranch = doneCommit
    ? (view.branches.find((item) => item.id === doneCommit.sourceBranchId) ??
      view.branches.find((item) => item.id === doneCommit.branchId))
    : undefined;

  return (
    <section
      className={styles.card}
      data-onboarding-active={!completed ? '' : undefined}
      data-onboarding-complete={completed ? '' : undefined}
      aria-labelledby="onboarding-heading"
    >
      <header className={styles.head}>
        <h1 className={styles.title} id="onboarding-heading" ref={headingRef} tabIndex={-1}>
          <svg
            className={styles.ornament}
            viewBox="0 0 400 40"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path d="m14 6 14 11M3 27l15 5M386 6l-14 11m25 10-15 5" />
          </svg>
          {t('onboarding.kicker')}
        </h1>
        {completed ? null : (
          <button type="button" className={styles.skip} onClick={skip} disabled={busy}>
            {t('onboarding.skip')}
          </button>
        )}
      </header>

      <ol className={styles.steps} aria-label={t('onboarding.title')}>
        {(['branch', 'task', 'commit'] as const).map((key, index) => (
          <li
            key={key}
            className={styles.step}
            aria-current={index + 1 === step ? 'step' : undefined}
            data-done={index < completedCount}
          >
            <span className={styles.stepIndex} aria-hidden="true">
              {index < completedCount ? <CheckIcon size={24} /> : index + 1}
            </span>
            <span>{t(`onboarding.step.${key}`)}</span>
          </li>
        ))}
      </ol>

      {step === 1 ? (
        <>
          <div className={styles.body}>
            <div className={styles.stepIllustration} aria-hidden="true">
              <svg className={styles.illustrationRays} viewBox="0 0 48 48">
                <path d="m4 32 8 2M14 15l9 9m9-19 1 10" />
              </svg>
              <span className={styles.illustrationCheck}>
                <svg viewBox="0 0 48 48">
                  <circle cx="24" cy="8" r="3.5" />
                  <circle cx="14" cy="38" r="3.5" />
                  <circle cx="34" cy="38" r="3.5" />
                  <path d="M24 12v9m-10 0h20m-20 0v13m20-13v13" />
                </svg>
              </span>
            </div>
            <div className={styles.formColumn}>
              <h2 className={styles.formTitle}>{t('onboarding.step.branch')}</h2>
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
                    <label
                      key={preset}
                      className={styles.swatchLabel}
                      title={t(COLOR_KEYS[preset])}
                    >
                      <input
                        type="radio"
                        name="onboarding-color"
                        value={preset}
                        aria-label={t(COLOR_KEYS[preset])}
                        checked={color === preset}
                        disabled={busy}
                        onChange={() => setColor(preset)}
                      />
                      <span className={styles.swatch} data-color={preset} aria-hidden="true" />
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          </div>
          <p className={styles.setupMessage}>{t('onboarding.step.branchPrompt')}</p>
          <div className={styles.setupActions}>
            <button type="button" className={styles.primary} onClick={saveBranch} disabled={busy}>
              {busy ? t('onboarding.saving') : t('onboarding.saveBranch')}
            </button>
            <button type="button" className={styles.ghost} onClick={openSample} disabled={busy}>
              {t('onboarding.sample')}
            </button>
          </div>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <div className={styles.body}>
            <div className={styles.stepIllustration} aria-hidden="true">
              <span className={styles.illustrationCheck}>
                <ListIcon size={24} />
              </span>
            </div>
            <div className={styles.formColumn}>
              <h2 className={styles.formTitle}>{t('onboarding.step.task')}</h2>
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
            </div>
          </div>
          <p className={styles.setupMessage}>
            {t('onboarding.step.taskPromptPrefix')}
            {t('onboarding.step.taskPromptMiddle')}
          </p>
          <div className={styles.setupActions}>
            <button type="button" className={styles.primary} onClick={saveTask} disabled={busy}>
              {busy ? t('onboarding.saving') : t('onboarding.saveTask')}
            </button>
          </div>
        </>
      ) : null}

      {step === 3 ? (
        <>
          <div className={styles.body}>
            <div className={styles.stepIllustration} aria-hidden="true">
              <span className={styles.illustrationCheck}>
                <CheckIcon size={24} />
              </span>
            </div>
            <div className={styles.formColumn}>
              <h2 className={styles.formTitle}>{t('onboarding.step.commit')}</h2>
              {view.firstOpenTask ? (
                <div className={styles.target}>
                  <span className={styles.targetTitle}>{view.firstOpenTask.title}</span>
                </div>
              ) : (
                <p className={styles.prompt}>{t('onboarding.step.noOpenTask')}</p>
              )}
            </div>
          </div>
          <p className={styles.setupMessage}>{t('onboarding.step.commitPrompt')}</p>
          {view.firstOpenTask ? (
            <div className={styles.setupActions}>
              <button
                type="button"
                className={styles.primary}
                onClick={completeFirst}
                disabled={busy}
              >
                {busy ? t('onboarding.saving') : t('onboarding.completeTask')}
              </button>
            </div>
          ) : null}
        </>
      ) : null}

      {step === 'done' ? (
        <div className={styles.receipt}>
          <div className={styles.receiptHero}>
            <div className={styles.receiptArt} aria-hidden="true">
              <svg className={styles.receiptRays} viewBox="0 0 64 64">
                <path d="m7 54 15 3M21 21l15 15M55 5l2 16" />
              </svg>
              <span className={styles.receiptBadge}>
                <CheckIcon size={24} />
              </span>
            </div>
            <div className={styles.receiptContent}>
              <h2 className={styles.receiptTitle}>{t('onboarding.receipt.title')}</h2>
              {doneCommit ? (
                <div className={styles.receiptData}>
                  <p className={styles.receiptLine}>
                    <span className={styles.receiptTaskCheck} aria-hidden="true">
                      <CheckIcon size={14} />
                    </span>
                    <span>
                      {doneCommit.summary}
                      {receiptBranch ? ` · ${receiptBranch.title}` : ''}
                    </span>
                  </p>
                  <p className={styles.receiptTime}>
                    <HistoryIcon size={24} />
                    <span>
                      {t('onboarding.receipt.submitted')}{' '}
                      <time>{localClockTime(doneCommit.at)}</time>
                    </span>
                  </p>
                </div>
              ) : null}
            </div>
          </div>
          <p className={styles.receiptMessage}>{t('onboarding.receipt.done')}</p>
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
      <svg
        className={styles.receiptTrail}
        viewBox="0 0 1360 175"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M-8 91C210 44 256 111 434 146S974 212 1368 12" />
      </svg>
      <div className={styles.receiptNote} aria-hidden="true">
        <CheckIcon size={24} />
      </div>

      {errorKey ? (
        <p className={styles.error} role="alert">
          {t(errorKey)}
        </p>
      ) : null}

      {step === 1 || step === 2 ? (
        <p className={styles.hint}>
          {t('onboarding.inputHint')} {t('onboarding.skipHint')}
        </p>
      ) : null}
    </section>
  );
}

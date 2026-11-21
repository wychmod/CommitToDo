import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from 'react';
import type { ErrorCode, Result } from '@/core/errors';
import {
  BRANCH_COLORS,
  DEFAULT_BRANCH_COLOR,
  inheritedBranchColor,
  type BranchColor,
} from '@/core/rules/branch-color';
import { assessMove } from '@/core/rules/branch-hierarchy';
import { validateBranchTitle } from '@/core/rules/branch-name';
import { collectSubtree } from '@/core/rules/branch-path';
import {
  BRANCH_CHILD_LIMITS,
  assessCreateQuota,
  countActiveChildren,
} from '@/core/rules/branch-quota';
import { createBranch } from '@/data/create-branch';
import { moveBranch } from '@/data/move-branch';
import { renameBranch } from '@/data/rename-branch';
import type { Branch } from '@/data/types';
import { t, type MessageKey } from '@/i18n';
import styles from './branch-panel.module.css';

export type BranchPanelState =
  | { mode: 'create'; parent: Branch }
  | { mode: 'rename'; branch: Branch }
  | { mode: 'move'; branch: Branch };

interface BranchPanelProps {
  state: BranchPanelState;
  /** 未删除的全部分支，用于同级校验、额度与移动候选。 */
  branches: readonly Branch[];
  onClose: () => void;
  onSaved: (branch: Branch) => void;
}

const COLOR_KEYS: Record<BranchColor, MessageKey> = {
  coral: 'branches.color.coral',
  sky: 'branches.color.sky',
  honey: 'branches.color.honey',
  mint: 'branches.color.mint',
  iris: 'branches.color.iris',
  rose: 'branches.color.rose',
  teal: 'branches.color.teal',
};

type MoveReason =
  'current' | 'readonly' | 'self' | 'descendant' | 'too-deep' | 'parent-full' | 'duplicate';

const MOVE_REASON_KEYS: Record<MoveReason, MessageKey> = {
  current: 'branches.move.current',
  readonly: 'branches.reason.readonly',
  self: 'branches.error.moveSelf',
  descendant: 'branches.error.moveSelf',
  'too-deep': 'branches.error.moveTooDeep',
  'parent-full': 'branches.error.parentFull',
  duplicate: 'branches.error.moveDuplicate',
};

interface MoveCandidate {
  branch: Branch;
  reason: MoveReason | null;
  remaining: number;
}

function buildMoveCandidates(subject: Branch, live: readonly Branch[]): MoveCandidate[] {
  const subtree = collectSubtree(live, subject.path);
  const subtreeIds = new Set(subtree.map((branch) => branch.id));
  const subtreeMaxDepth = subtree.reduce(
    (max, branch) => Math.max(max, branch.depth),
    subject.depth,
  );

  return live
    .filter((branch) => !subtreeIds.has(branch.id))
    .map((target) => {
      const limit = BRANCH_CHILD_LIMITS[target.depth + 1] ?? 0;
      const used = countActiveChildren(target.id, live);
      const remaining = Math.max(0, limit - used);

      let reason: MoveReason | null = null;
      if (target.id === subject.parentId) {
        reason = 'current';
      } else if (target.archivedAt !== null || target.status !== 'active') {
        reason = 'readonly';
      } else {
        const assessment = assessMove(subject, subtreeMaxDepth, target);
        if (!assessment.allowed) {
          reason =
            assessment.reason === 'descendant'
              ? 'descendant'
              : assessment.reason === 'too-deep'
                ? 'too-deep'
                : assessment.reason === 'self'
                  ? 'self'
                  : 'readonly';
        } else if (used >= limit) {
          reason = 'parent-full';
        } else {
          const name = validateBranchTitle({
            title: subject.title,
            siblings: live.filter((branch) => branch.parentId === target.id),
            selfId: subject.id,
          });
          if (!name.ok) reason = 'duplicate';
        }
      }

      return { branch: target, reason, remaining };
    })
    .sort((a, b) => a.branch.depth - b.branch.depth || a.branch.path.localeCompare(b.branch.path));
}

function trailOf(target: Branch, byId: Map<string, Branch>): string {
  const titles: string[] = [];
  let current: Branch | undefined = target;
  while (current) {
    titles.unshift(current.title);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return titles.join(' / ');
}

function errorKeyFor(code: ErrorCode, mode: BranchPanelState['mode']): MessageKey {
  switch (code) {
    case 'validation.title_empty':
      return 'branches.error.empty';
    case 'domain.conflict':
      return mode === 'move' ? 'branches.error.moveDuplicate' : 'branches.error.duplicate';
    case 'domain.quota_exceeded':
      return mode === 'move' ? 'branches.error.moveTooDeep' : 'branches.error.parentFull';
    case 'domain.readonly_branch':
      return 'branches.error.readonly';
    case 'validation.invalid_input':
      return mode === 'move' ? 'branches.error.moveSelf' : 'branches.error.empty';
    default:
      return 'branches.error.storage';
  }
}

/**
 * 分支侧栏（B02–B05）。
 *
 * 新建、改名、移动共用一个面板：表单失败时保留输入与已选目标，
 * 不关闭面板，也不在树上留下半成品节点。
 */
export function BranchPanel({ state, branches, onClose, onSaved }: BranchPanelProps) {
  const live = branches.filter((branch) => branch.deletedAt === null);
  const byId = new Map(live.map((branch) => [branch.id, branch]));
  const parentId = state.mode === 'create' ? state.parent.id : state.branch.parentId;
  const selfId = state.mode === 'rename' ? state.branch.id : undefined;

  const [title, setTitle] = useState(state.mode === 'rename' ? state.branch.title : '');
  const [color, setColor] = useState<BranchColor>(DEFAULT_BRANCH_COLOR);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<MessageKey | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLFieldSetElement>(null);

  useEffect(() => {
    if (state.mode === 'move') {
      const first = listRef.current?.querySelector<HTMLInputElement>('input:not(:disabled)');
      first?.focus();
    } else {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [state.mode]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const siblings = live.filter((branch) => branch.parentId === parentId);
  const nameCheck = validateBranchTitle({ title, siblings, selfId });
  const quota =
    state.mode === 'create' ? assessCreateQuota(state.parent.id, state.parent.depth, live) : null;
  const candidates = state.mode === 'move' ? buildMoveCandidates(state.branch, live) : [];
  const selectedCandidate = candidates.find((item) => item.branch.id === selectedId);

  const canSubmit =
    !busy &&
    (state.mode === 'create'
      ? nameCheck.ok && quota !== null && quota.allowed
      : state.mode === 'rename'
        ? nameCheck.ok && nameCheck.title !== state.branch.title
        : Boolean(selectedCandidate && !selectedCandidate.reason));

  const titleKey: MessageKey =
    state.mode === 'create'
      ? state.parent.depth === 0
        ? 'branches.panel.createTitle'
        : 'branches.panel.createChildTitle'
      : state.mode === 'rename'
        ? 'branches.panel.renameTitle'
        : 'branches.panel.moveTitle';

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    setBusy(true);
    setErrorKey(null);

    let result: Result<Branch>;
    if (state.mode === 'create') {
      result = await createBranch({ title: nameCheck.title, parentId: state.parent.id, color });
    } else if (state.mode === 'rename') {
      result = await renameBranch({ branchId: state.branch.id, title: nameCheck.title });
    } else {
      if (!selectedCandidate || selectedCandidate.reason) {
        setBusy(false);
        return;
      }
      result = await moveBranch({
        branchId: state.branch.id,
        targetParentId: selectedCandidate.branch.id,
      });
    }

    if (result.ok) {
      onSaved(result.value);
      return;
    }
    setBusy(false);
    setErrorKey(errorKeyFor(result.error.code, state.mode));
  };

  const stop = (event: MouseEvent<HTMLElement>) => event.stopPropagation();

  const nameHint = !touched
    ? null
    : nameCheck.reason === 'empty'
      ? t('branches.error.empty')
      : nameCheck.reason === 'duplicate'
        ? t('branches.error.duplicate')
        : null;

  return (
    <div className={styles.backdrop} role="presentation" onClick={onClose}>
      <section
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={t(titleKey)}
        onClick={stop}
      >
        <header className={styles.head}>
          <h2>{t(titleKey)}</h2>
          <button type="button" className={styles.close} onClick={onClose}>
            {t('shell.close')}
          </button>
        </header>

        <form className={styles.form} onSubmit={onSubmit}>
          {state.mode === 'move' ? null : (
            <label className={styles.field}>
              <span className={styles.label}>{t('branches.field.title')}</span>
              <input
                ref={inputRef}
                className={styles.input}
                value={title}
                placeholder={t('branches.field.titlePlaceholder')}
                onChange={(event) => {
                  setTitle(event.target.value);
                  setTouched(true);
                }}
                aria-invalid={nameHint ? true : undefined}
              />
            </label>
          )}

          {nameHint ? (
            <p className={styles.hint} role="alert">
              {nameHint}
            </p>
          ) : null}

          {state.mode === 'create' ? (
            <div className={styles.field}>
              <span className={styles.label}>{t('branches.field.parent')}</span>
              <p className={styles.value}>{state.parent.title}</p>
            </div>
          ) : null}

          {state.mode === 'create' && state.parent.depth === 0 ? (
            <fieldset className={styles.field}>
              <legend className={styles.label}>{t('branches.field.color')}</legend>
              <div className={styles.colors}>
                {BRANCH_COLORS.map((preset) => (
                  <label key={preset} className={styles.colorOption}>
                    <input
                      type="radio"
                      name="branch-color"
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
          ) : null}

          {state.mode === 'create' && state.parent.depth > 0 ? (
            <div className={styles.field}>
              <span className={styles.label}>{t('branches.field.color')}</span>
              <p className={styles.inherited}>
                <span
                  className={styles.swatch}
                  data-color={inheritedBranchColor(state.parent.color)}
                  aria-hidden="true"
                />
                {t('branches.colorInherited')}
              </p>
            </div>
          ) : null}

          {quota ? (
            <p className={styles.meta}>
              {quota.allowed
                ? `${t('branches.quota.prefix')} ${quota.used} / ${quota.limit} ${t('branches.slots.suffix')}`
                : quota.reason === 'tree-full'
                  ? t('branches.error.treeFull')
                  : quota.reason === 'depth-limit'
                    ? t('branches.error.depth')
                    : t('branches.error.parentFull')}
            </p>
          ) : null}

          {state.mode === 'move' ? (
            <fieldset ref={listRef} className={styles.field}>
              <legend className={styles.label}>{t('branches.field.targetParent')}</legend>
              <div className={styles.candidates}>
                {candidates.map((candidate) => (
                  <label
                    key={candidate.branch.id}
                    className={styles.candidate}
                    data-disabled={candidate.reason ? '' : undefined}
                  >
                    <input
                      type="radio"
                      name="move-target"
                      value={candidate.branch.id}
                      checked={selectedId === candidate.branch.id}
                      disabled={Boolean(candidate.reason)}
                      onChange={() => setSelectedId(candidate.branch.id)}
                    />
                    <span className={styles.candidateBody}>
                      <span className={styles.candidateTitle}>{candidate.branch.title}</span>
                      <span className={styles.candidateMeta}>
                        {candidate.reason
                          ? t(MOVE_REASON_KEYS[candidate.reason])
                          : `${t('branches.remaining.prefix')} ${candidate.remaining} ${t('branches.slots.suffix')}`}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}

          {state.mode === 'move' && selectedCandidate ? (
            <p className={styles.meta}>
              {t('branches.move.newPath')}
              {': '}
              {trailOf(selectedCandidate.branch, byId)} / {state.branch.title}
            </p>
          ) : null}

          {errorKey ? (
            <p className={styles.error} role="alert">
              {t(errorKey)}
            </p>
          ) : null}

          <div className={styles.actions}>
            <button type="button" className={styles.cancel} onClick={onClose} disabled={busy}>
              {t('shell.cancel')}
            </button>
            <button type="submit" className={styles.submit} disabled={!canSubmit}>
              {busy ? t('branches.saving') : t('branches.save')}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

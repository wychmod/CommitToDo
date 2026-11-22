import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
  TEMPLATES,
  TEMPLATE_BRANCH_COUNT,
  TEMPLATE_TASK_COUNT,
  type TemplateId,
} from '@/core/rules/template-catalog';
import { applyTemplate } from '@/data/apply-template';
import { useTemplateState } from '@/data/hooks';
import { t, type MessageKey } from '@/i18n';
import { LoadingShell } from '@/ui/loading-shell';
import { PageShell } from '@/ui/page-shell';
import styles from './templates-page.module.css';

const TEMPLATE_COPY: Record<TemplateId, { name: MessageKey; body: MessageKey }> = {
  fitness: { name: 'template.fitness.name', body: 'template.fitness.body' },
  reading: { name: 'template.reading.name', body: 'template.reading.body' },
  job: { name: 'template.job.name', body: 'template.job.body' },
  'side-project': { name: 'template.sideProject.name', body: 'template.sideProject.body' },
};

/**
 * 从模板开始（PRD V2-03 OP-07 / OP-11）。
 *
 * 只在空白工作区可达；直接访问时若已有内容则回到分支页。
 * 预览与生成都只读模板常量，生成结果仍是普通分支与待办，之后可自由修改。
 */
export function TemplatesPage() {
  const view = useTemplateState();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<TemplateId>('fitness');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  if (view.status === 'loading') return <LoadingShell />;
  if (view.status === 'ready' && !view.blank) return <Navigate to="/branches" replace />;

  const template = TEMPLATES.find((entry) => entry.id === selected) ?? TEMPLATES[0]!;
  const groups = template.secondaries.map((title, index) => ({
    title,
    kind: index === 0 ? 'secondary-a' : 'secondary-b',
  }));

  const apply = async (): Promise<void> => {
    setBusy(true);
    setError(false);
    const result = await applyTemplate(selected);
    setBusy(false);
    if (result.ok) {
      navigate('/branches', { replace: true });
      return;
    }
    setError(true);
  };

  const switchTemplate = (): void => {
    const index = TEMPLATES.findIndex((entry) => entry.id === selected);
    const next = TEMPLATES[(index + 1) % TEMPLATES.length]!;
    setSelected(next.id);
    setError(false);
  };

  return (
    <PageShell
      titleKey="template.title"
      bodyKey="template.body"
      back={
        <Link className={styles.back} to="/branches">
          {t('template.back')}
        </Link>
      }
    >
      <div className={styles.layout}>
        <ul className={styles.list}>
          {TEMPLATES.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                className={entry.id === selected ? styles.cardActive : styles.card}
                aria-pressed={entry.id === selected}
                onClick={() => setSelected(entry.id)}
              >
                <span className={styles.cardName}>{t(TEMPLATE_COPY[entry.id].name)}</span>
                <span className={styles.cardBody}>{t(TEMPLATE_COPY[entry.id].body)}</span>
                <span className={styles.cardTree}>
                  <span className={styles.cardPrimary}>{entry.primary}</span>
                  {entry.secondaries.map((title) => (
                    <span key={title} className={styles.cardBranch}>
                      {title}
                    </span>
                  ))}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <section className={styles.preview} aria-labelledby="template-preview-title">
          <h2 id="template-preview-title" className={styles.previewTitle}>
            {t('template.preview')}
          </h2>
          <p className={styles.counts}>
            {TEMPLATE_BRANCH_COUNT} {t('template.branchCount')} · {TEMPLATE_TASK_COUNT}{' '}
            {t('template.taskCount')}
          </p>
          <div className={styles.tree}>
            <p className={styles.primary}>{template.primary}</p>
            {groups.map((group) => (
              <div key={group.title} className={styles.group}>
                <p className={styles.secondary}>{group.title}</p>
                <ul className={styles.tasks}>
                  {template.tasks
                    .filter((task) => task.branch === group.kind)
                    .map((task) => (
                      <li key={task.title} className={styles.task}>
                        <span>{task.title}</span>
                        <span className={styles.noDue}>{t('template.noDue')}</span>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className={styles.applyBar}>
        {error ? (
          <p className={styles.error} role="alert">
            {t('template.failed')}
          </p>
        ) : null}
        <div className={styles.applyActions}>
          <button type="button" className={styles.switch} onClick={switchTemplate} disabled={busy}>
            {t('template.switch')}
          </button>
          <button
            type="button"
            className={styles.apply}
            onClick={() => void apply()}
            disabled={busy}
          >
            {busy ? t('template.applying') : t('template.apply')}
          </button>
        </div>
      </div>
    </PageShell>
  );
}

import { useEffect, useRef, useState } from 'react';
import type { YearShareModel } from '@/core/rules/year-share';
import { t } from '@/i18n';
import styles from './year-share-preview.module.css';

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 1500;

function drawYearShare(canvas: HTMLCanvasElement, model: YearShareModel, showNames: boolean): void {
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('canvas.unavailable');

  const root = document.documentElement;
  const computed = getComputedStyle(root);
  const token = (name: string): string => computed.getPropertyValue(name).trim();
  const numberToken = (name: string): number => Number.parseFloat(token(name));
  const fontFamily = getComputedStyle(document.body).fontFamily;
  const padding = numberToken('--s6') * 3;
  const bodySize = numberToken('--type-body') * 2;
  const smallSize = numberToken('--type-secondary') * 2;
  const titleSize = numberToken('--type-heading') * 2;

  context.fillStyle = token('--panel');
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  context.textBaseline = 'top';
  context.textAlign = 'left';
  context.fillStyle = token('--text');
  context.font = `600 ${titleSize}px ${fontFamily}`;
  context.fillText(`${model.year}${t('year.headingSuffix')}`, padding, padding);

  context.textAlign = 'right';
  context.font = `600 ${numberToken('--type-section') * 2}px ${fontFamily}`;
  context.fillText(
    `${model.total}${t('year.share.commitsSuffix')}`,
    CANVAS_WIDTH - padding,
    padding + titleSize,
  );

  const laneTop = padding + numberToken('--s10') * 3;
  const metricsHeight = numberToken('--s10') * 2.5;
  const laneBottom = CANVAS_HEIGHT - padding - metricsHeight;
  const nameWidth = showNames ? numberToken('--timeline-label-width') * 1.5 : 0;
  const lineStart = padding + nameWidth;
  const lineEnd = CANVAS_WIDTH - padding;
  const laneHeight = (laneBottom - laneTop) / Math.max(1, model.lanes.length);
  const yearStart = Date.UTC(model.year, 0, 1);
  const yearEnd = Date.UTC(model.year + 1, 0, 1);

  for (const [index, lane] of model.lanes.entries()) {
    const y = laneTop + laneHeight * (index + 0.5);
    const color = lane.color === null ? token('--neutral') : token(`--${lane.color}-1`);
    context.strokeStyle = color;
    context.lineWidth = numberToken('--timeline-rail') * 2;
    context.beginPath();
    context.moveTo(lineStart, y);
    context.lineTo(lineEnd, y);
    context.stroke();

    if (showNames) {
      const title = lane.branchId === null ? t('year.branches.mine') : lane.title;
      if (title !== null) {
        context.textAlign = 'left';
        context.fillStyle = token('--text');
        context.font = `${bodySize}px ${fontFamily}`;
        context.fillText(
          title,
          padding,
          y - bodySize / 2,
          Math.max(0, nameWidth - numberToken('--s3')),
        );
      }
    }

    context.fillStyle = color;
    for (const node of lane.nodes) {
      const at = Date.parse(`${node.date}T00:00:00Z`);
      const ratio = Math.max(0, Math.min(1, (at - yearStart) / (yearEnd - yearStart)));
      const x = lineStart + (lineEnd - lineStart) * ratio;
      context.beginPath();
      context.arc(x, y, numberToken('--timeline-commit-diameter'), 0, Math.PI * 2);
      context.fill();
    }
  }

  const metrics = [
    { value: model.metrics.commits, label: t('year.metric.commits') },
    { value: model.metrics.activeLevelOneBranches, label: t('year.metric.branches') },
    { value: model.metrics.opened, label: t('year.metric.opened') },
    { value: model.metrics.finished, label: t('year.metric.finished') },
  ];
  const metricWidth = (CANVAS_WIDTH - padding * 2) / metrics.length;
  const metricTop = CANVAS_HEIGHT - padding - metricsHeight + numberToken('--s4') * 2;
  for (const [index, metric] of metrics.entries()) {
    const x = padding + metricWidth * index;
    context.textAlign = 'left';
    context.fillStyle = token('--text');
    context.font = `600 ${numberToken('--type-section') * 2}px ${fontFamily}`;
    context.fillText(String(metric.value), x, metricTop);
    context.fillStyle = token('--muted');
    context.font = `${smallSize}px ${fontFamily}`;
    context.fillText(metric.label, x, metricTop + numberToken('--type-section') * 2.5);
  }
}

/** S05-year-share：4:5 本地画布；名称开关仅本次预览有效，保存失败可重试。 */
export function YearSharePreview({
  model,
  onClose,
}: {
  model: YearShareModel;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showNames, setShowNames] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setError(false);
    try {
      drawYearShare(canvas, model, showNames);
    } catch {
      setError(true);
    }
  }, [model, showNames]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const save = async (): Promise<void> => {
    const canvas = canvasRef.current;
    if (!canvas || saving) return;
    setSaving(true);
    setError(false);
    try {
      drawYearShare(canvas, model, showNames);
      const blob = await new Promise<Blob>((resolve, reject) => {
        try {
          canvas.toBlob((value) => {
            if (value) resolve(value);
            else reject(new Error('canvas.encode_failed'));
          }, 'image/png');
        } catch (cause) {
          reject(cause);
        }
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `CommitToDo-${model.year}.png`;
      anchor.hidden = true;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.backdrop} role="presentation" onPointerDown={onClose}>
      <section
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={t('year.share.title')}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <h2 className={styles.title}>{t('year.share.title')}</h2>
          <button type="button" className={styles.close} onClick={onClose} autoFocus>
            {t('year.share.close')}
          </button>
        </header>

        <div className={styles.body}>
          <canvas
            ref={canvasRef}
            className={styles.canvas}
            aria-label={`${model.year}${t('year.share.previewSuffix')}`}
          />
          {error ? (
            <p className={styles.error} role="alert">
              {t('year.share.failed')}
            </p>
          ) : null}
        </div>

        <footer className={styles.footer}>
          <label className={styles.names}>
            <input
              type="checkbox"
              checked={showNames}
              onChange={(event) => setShowNames(event.target.checked)}
            />
            <span>{t('year.share.showNames')}</span>
          </label>
          <button
            type="button"
            className={styles.save}
            disabled={saving || !model.available}
            onClick={() => void save()}
          >
            {saving ? t('year.share.saving') : t('year.share.save')}
          </button>
        </footer>
      </section>
    </div>
  );
}

import { useState } from 'react';
import {
  annotationState,
  hintStorageKey,
  parseSeenFlag,
  type AnnotationConcept,
} from '@/core/rules/annotation-visibility';
import { useSettingsState } from '@/data/hooks';
import { t, type MessageKey } from '@/i18n';
import { InfoIcon } from '@/ui/icons';
import styles from './annotation.module.css';

interface AnnotationProps {
  concept: AnnotationConcept;
  /** 该概念唯一的一句人话，文案只进 i18n。 */
  textKey: MessageKey;
}

function readSeen(concept: AnnotationConcept): boolean {
  try {
    return parseSeenFlag(window.localStorage.getItem(hintStorageKey(concept)));
  } catch {
    return false;
  }
}

function markSeen(concept: AnnotationConcept): void {
  try {
    window.localStorage.setItem(hintStorageKey(concept), '1');
  } catch {
    // 标记丢失最多让该注解重新自动展开一次，可接受（M01 §5）。
  }
}

/**
 * 一句话注解（I-01 / I-02）。
 *
 * 展开卡片是浮层，占用固定高度的槽位，展开与收起不推动下方内容；
 * 关闭后折叠为小图标，点击可再次展开；`off` 模式不渲染任何入口。
 */
export function Annotation({ concept, textKey }: AnnotationProps) {
  const { loaded, settings } = useSettingsState();
  const [seen, setSeen] = useState(() => readSeen(concept));
  const [manual, setManual] = useState<'none' | 'open' | 'closed'>('none');

  // 偏好尚未读出时不做判断，避免先展开再隐藏的闪烁。
  if (!loaded) return null;

  const state = annotationState(settings.annotations, seen);
  if (state === 'hidden') return null;

  const expanded = manual === 'none' ? state === 'expanded' : manual === 'open';

  const dismiss = () => {
    if (settings.annotations === 'once') {
      markSeen(concept);
      setSeen(true);
    }
    setManual('closed');
  };

  return (
    <div className={styles.slot}>
      {expanded ? (
        <div className={styles.card} role="note">
          <p className={styles.text}>{t(textKey)}</p>
          <button type="button" className={styles.dismiss} onClick={dismiss}>
            {t('annotation.dismiss')}
          </button>
        </div>
      ) : (
        <button
          type="button"
          className={styles.toggle}
          aria-label={t('annotation.expand')}
          onClick={() => setManual('open')}
        >
          <InfoIcon size={16} />
        </button>
      )}
    </div>
  );
}

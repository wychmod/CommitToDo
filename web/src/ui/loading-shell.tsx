import { t } from '@/i18n';
import styles from './loading-shell.module.css';

/**
 * 数据尚未就绪时的统一加载外壳（M01 §4.1）。
 *
 * 保留内容区基本布局的占位行，不用整屏 spinner；文案对屏幕阅读器可读。
 */
export function LoadingShell() {
  return (
    <div className={styles.loading} role="status" aria-live="polite">
      <span className={styles.label}>{t('state.loading')}</span>
      <span className={styles.row} aria-hidden="true" />
      <span className={styles.row} aria-hidden="true" />
      <span className={styles.row} aria-hidden="true" />
    </div>
  );
}

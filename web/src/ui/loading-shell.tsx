import { t } from '@/i18n';

/** 数据尚未就绪时的统一加载外壳。 */
export function LoadingShell() {
  return (
    <p role="status" aria-live="polite">
      {t('state.loading')}
    </p>
  );
}

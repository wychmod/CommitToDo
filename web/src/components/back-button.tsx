import { useLocation, useNavigate } from 'react-router-dom';
import { t } from '@/i18n';
import { ArrowLeftIcon } from '@/ui/icons';
import styles from './back-button.module.css';

interface BackButtonProps {
  /** 没有站内历史（直接打开二级页）时落到所属一级入口。 */
  fallbackTo: string;
}

/**
 * 二级页返回（M01 OP-07）。
 *
 * 站内返回优先走浏览器历史，以恢复滚动位置与页面状态；
 * 直接打开或刷新进入时历史栈没有上一页，改用所属一级入口兜底。
 */
export function BackButton({ fallbackTo }: BackButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const goBack = () => {
    if (location.key !== 'default') {
      navigate(-1);
      return;
    }
    navigate(fallbackTo);
  };

  return (
    <button type="button" className={styles.back} onClick={goBack}>
      <ArrowLeftIcon size={16} />
      {t('shell.back')}
    </button>
  );
}

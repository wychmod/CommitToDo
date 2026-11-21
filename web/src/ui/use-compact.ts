import { useEffect, useState } from 'react';

const QUERY = '(max-width: 760px)';

/** 760 px 及以下视为窄屏，用于关闭桌面专属交互（如 HTML5 拖拽）。 */
export function useIsCompact(): boolean {
  const [compact, setCompact] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches,
  );

  useEffect(() => {
    const media = window.matchMedia(QUERY);
    const onChange = () => setCompact(media.matches);
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return compact;
}

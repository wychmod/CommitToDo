import { useCallback, useEffect, useRef, useState } from 'react';
import { HOME_DEMO_CHECK_AT, HOME_DEMO_END, homeDemoFrameAt } from '@/core/rules/home-demo';
import type { HomeDemoFrame } from '@/core/rules/home-demo';

export type HomeDemoStatus = 'waiting' | 'playing' | 'paused' | 'done';

export interface HomeDemo {
  status: HomeDemoStatus;
  frame: HomeDemoFrame;
  /** 示例待办当前是否已勾选；用户手动撤销时为 false。 */
  checked: boolean;
  start: () => void;
  pause: () => void;
  resume: () => void;
  replay: () => void;
  toggleCheck: () => void;
  showStaticResult: () => void;
  setVisible: (visible: boolean) => void;
}

/**
 * 首屏示例的播放控制。
 *
 * 只改前端演示状态，不碰业务库；进入视口后才开始，离开视口冻结计时，
 * 用户主动暂停后返回仍保持暂停（HOMEPAGE-MOTION.md）。
 */
export function useHomeDemo(reducedMotion: boolean): HomeDemo {
  const [status, setStatus] = useState<HomeDemoStatus>(reducedMotion ? 'done' : 'waiting');
  const [elapsed, setElapsed] = useState(reducedMotion ? HOME_DEMO_END : 0);
  const [checked, setChecked] = useState(reducedMotion);
  const [runId, setRunId] = useState(0);
  const elapsedRef = useRef(elapsed);
  const visibleRef = useRef(true);

  useEffect(() => {
    if (status !== 'playing') return;
    let base = elapsedRef.current;
    let last = performance.now();
    let raf = requestAnimationFrame(function tick(now) {
      if (visibleRef.current) {
        base += now - last;
        const next = Math.min(HOME_DEMO_END, base);
        elapsedRef.current = next;
        setElapsed(next);
        setChecked(next >= HOME_DEMO_CHECK_AT);
        if (next >= HOME_DEMO_END) {
          setStatus('done');
          return;
        }
      }
      last = now;
      raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, [status, runId]);

  useEffect(() => {
    if (!reducedMotion) return;
    setStatus('done');
    setElapsed(HOME_DEMO_END);
    elapsedRef.current = HOME_DEMO_END;
    setChecked(true);
  }, [reducedMotion]);

  const start = useCallback(() => {
    setStatus((current) => (current === 'waiting' ? 'playing' : current));
  }, []);

  const pause = useCallback(() => {
    setStatus((current) => (current === 'playing' ? 'paused' : current));
  }, []);

  const resume = useCallback(() => {
    setStatus((current) => (current === 'paused' ? 'playing' : current));
  }, []);

  const replay = useCallback(() => {
    elapsedRef.current = 0;
    setElapsed(reducedMotion ? HOME_DEMO_END : 0);
    setChecked(reducedMotion);
    setRunId((id) => id + 1);
    setStatus(reducedMotion ? 'done' : 'playing');
  }, [reducedMotion]);

  const toggleCheck = useCallback(() => {
    elapsedRef.current = HOME_DEMO_END;
    setElapsed(HOME_DEMO_END);
    setStatus('done');
    setChecked((current) => !current);
  }, []);

  const showStaticResult = useCallback(() => {
    if (status !== 'waiting') return;
    elapsedRef.current = HOME_DEMO_END;
    setElapsed(HOME_DEMO_END);
    setChecked(true);
    setStatus('done');
  }, [status]);

  const setVisible = useCallback((visible: boolean) => {
    visibleRef.current = visible;
  }, []);

  return {
    status,
    frame: homeDemoFrameAt(elapsed),
    checked,
    start,
    pause,
    resume,
    replay,
    toggleCheck,
    showStaticResult,
    setVisible,
  };
}

/** 系统「减少动效」偏好；只读媒体查询，不写回任何设置。 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return reduced;
}

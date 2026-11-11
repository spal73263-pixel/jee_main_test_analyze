import { useEffect, useRef } from 'react';

export function useAutoRefresh(refreshFn, minIntervalMs = 2000) {
  const fnRef = useRef(refreshFn);
  const lastRunRef = useRef(0);

  useEffect(() => {
    fnRef.current = refreshFn;
  }, [refreshFn]);

  useEffect(() => {
    const trigger = () => {
      if (document.visibilityState && document.visibilityState !== 'visible') {
        return;
      }
      const now = Date.now();
      if (now - lastRunRef.current < minIntervalMs) {
        return;
      }
      lastRunRef.current = now;
      if (typeof fnRef.current === 'function') {
        fnRef.current();
      }
    };

    window.addEventListener('focus', trigger);
    document.addEventListener('visibilitychange', trigger);
    return () => {
      window.removeEventListener('focus', trigger);
      document.removeEventListener('visibilitychange', trigger);
    };
  }, [minIntervalMs]);
}

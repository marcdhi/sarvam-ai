import { useEffect, useRef, useCallback } from 'react';

export function usePolling(
  fn: () => Promise<boolean>, // returns true to stop polling
  interval: number = 2000,
  enabled: boolean = false
) {
  const savedCallback = useRef(fn);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    savedCallback.current = fn;
  }, [fn]);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      stop();
      return;
    }

    const tick = async () => {
      try {
        const shouldStop = await savedCallback.current();
        if (shouldStop) {
          stop();
        }
      } catch {
        // Continue polling on error
      }
    };

    tick(); // Run immediately
    timerRef.current = setInterval(tick, interval);

    return stop;
  }, [enabled, interval, stop]);

  return { stop };
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRegisterLiveMode } from '../context/LiveModeContext';

interface UsePollingOptions {
  intervalMs?: number;
  enabled?: boolean;
  /** Показывать индикатор Live в шапке (по умолчанию true) */
  live?: boolean;
}

export function usePolling<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
  { intervalMs = 5000, enabled = true, live = true }: UsePollingOptions = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const result = await fetcher();
      if (mounted.current) {
        setData(result);
        setError(null);
        setLastUpdatedAt(Date.now());
      }
    } catch (e) {
      if (mounted.current) {
        setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [fetcher]);

  useEffect(() => {
    mounted.current = true;
    if (!enabled) return;
    setLoading(true);
    refresh();
    const id = setInterval(refresh, intervalMs);
    return () => {
      mounted.current = false;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh, intervalMs, enabled, ...deps]);

  useRegisterLiveMode(intervalMs, lastUpdatedAt, enabled && live);

  return { data, loading, error, refresh, lastUpdatedAt };
}

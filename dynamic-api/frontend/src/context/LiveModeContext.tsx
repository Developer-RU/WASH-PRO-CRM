import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type LiveModeState =
  | { kind: 'live'; intervalMs: number; lastUpdatedAt: number | null }
  | { kind: 'static' };

interface LiveModeContextValue {
  live: LiveModeState | null;
  setLive: (state: LiveModeState | null) => void;
}

const LiveModeContext = createContext<LiveModeContextValue | null>(null);

export function LiveModeProvider({ children }: { children: ReactNode }) {
  const [live, setLiveState] = useState<LiveModeState | null>(null);

  const setLive = useCallback((state: LiveModeState | null) => {
    setLiveState(state);
  }, []);

  const value = useMemo(() => ({ live, setLive }), [live, setLive]);

  return <LiveModeContext.Provider value={value}>{children}</LiveModeContext.Provider>;
}

export function useLiveMode() {
  const ctx = useContext(LiveModeContext);
  if (!ctx) {
    throw new Error('useLiveMode must be used within LiveModeProvider');
  }
  return ctx;
}

/** Registers the current page live refresh state in the app header. */
export function useRegisterLiveMode(intervalMs: number, lastUpdatedAt: number | null, enabled = true) {
  const { setLive } = useLiveMode();

  useEffect(() => {
    if (!enabled) {
      setLive(null);
      return;
    }
    setLive({ kind: 'live', intervalMs, lastUpdatedAt });
    return () => setLive(null);
  }, [intervalMs, lastUpdatedAt, enabled, setLive]);
}

/** Registers static data mode for pages without auto-refresh. */
export function useRegisterStaticDataMode(enabled = true) {
  const { setLive } = useLiveMode();

  useEffect(() => {
    if (!enabled) {
      setLive(null);
      return;
    }
    setLive({ kind: 'static' });
    return () => setLive(null);
  }, [enabled, setLive]);
}

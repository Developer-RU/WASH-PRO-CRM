import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export interface LiveModeState {
  intervalMs: number;
  lastUpdatedAt: number | null;
}

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

/** Регистрирует live-режим текущей страницы в шапке приложения. */
export function useRegisterLiveMode(intervalMs: number, lastUpdatedAt: number | null, enabled = true) {
  const { setLive } = useLiveMode();

  useEffect(() => {
    if (!enabled) {
      setLive(null);
      return;
    }
    setLive({ intervalMs, lastUpdatedAt });
    return () => setLive(null);
  }, [intervalMs, lastUpdatedAt, enabled, setLive]);
}

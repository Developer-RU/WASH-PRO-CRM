/** Интервал live-обновления по умолчанию (мс) */
export const DEFAULT_LIVE_INTERVAL_MS = 10_000;

/** SCADA / текущее состояние — чаще */
export const LIVE_INTERVAL_FAST_MS = 3_000;

/** Обзор */
export const LIVE_INTERVAL_DASHBOARD_MS = 5_000;

/** Настройки и редко меняющиеся данные */
export const LIVE_INTERVAL_SLOW_MS = 15_000;

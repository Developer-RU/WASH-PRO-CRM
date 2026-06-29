import { useLiveMode } from '../context/LiveModeContext';

function formatInterval(ms: number): string {
  if (ms < 1000) return `${ms} мс`;
  const sec = Math.round(ms / 1000);
  return sec === 1 ? '1 сек' : `${sec} сек`;
}

const badgeClass =
  'hidden items-center gap-2 rounded-full border px-3 py-1 text-xs sm:flex';

export function LiveModeIndicator() {
  const { live } = useLiveMode();
  if (!live) return null;

  if (live.kind === 'static') {
    return (
      <div
        className={`${badgeClass} border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300`}
        title="Данные загружаются при открытии страницы"
      >
        <span className="relative flex h-2 w-2">
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        <span className="font-medium">Live</span>
        <span className="text-emerald-600/80 dark:text-emerald-400/80">статические данные</span>
      </div>
    );
  }

  const updated = live.lastUpdatedAt
    ? new Date(live.lastUpdatedAt).toLocaleTimeString('ru', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '—';

  return (
    <div
      className={`${badgeClass} border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300`}
      title="Данные обновляются автоматически"
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      <span className="font-medium">Live</span>
      <span className="text-emerald-600/80 dark:text-emerald-400/80">каждые {formatInterval(live.intervalMs)}</span>
      <span className="text-emerald-600/60 dark:text-emerald-400/60">· {updated}</span>
    </div>
  );
}

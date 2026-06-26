const RU_PLURAL = (n: number, one: string, few: string, many: string) => {
  const abs = Math.abs(n) % 100;
  const n1 = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (n1 > 1 && n1 < 5) return few;
  if (n1 === 1) return one;
  return many;
};

/** Преобразование секунд в удобный формат (45 секунд, 12 минут, …) */
export function formatDurationHuman(totalSec?: number | null): string {
  if (totalSec == null || totalSec < 0) return '—';
  if (totalSec === 0) return '0 секунд';

  const units: { sec: number; one: string; few: string; many: string }[] = [
    { sec: 31536000, one: 'год', few: 'года', many: 'лет' },
    { sec: 2592000, one: 'месяц', few: 'месяца', many: 'месяцев' },
    { sec: 86400, one: 'день', few: 'дня', many: 'дней' },
    { sec: 3600, one: 'час', few: 'часа', many: 'часов' },
    { sec: 60, one: 'минута', few: 'минуты', many: 'минут' },
    { sec: 1, one: 'секунда', few: 'секунды', many: 'секунд' },
  ];

  for (const u of units) {
    if (totalSec >= u.sec) {
      const n = Math.floor(totalSec / u.sec);
      return `${n} ${RU_PLURAL(n, u.one, u.few, u.many)}`;
    }
  }
  return `${totalSec} секунд`;
}

/** Формат паузы мм:сс */
export function formatPause(sec?: number | null): string {
  if (sec == null) return '—';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export interface CurrencyConfig {
  code: string;
  name?: string;
  symbol?: string;
}

export function formatMoney(amount: number | undefined | null, currency: CurrencyConfig = { code: 'RUB', symbol: '₽' }): string {
  const value = amount ?? 0;
  if (currency.code && currency.code !== 'CUSTOM') {
    try {
      return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: currency.code,
        maximumFractionDigits: 2,
      }).format(value);
    } catch {
      /* fallback */
    }
  }
  const sym = currency.symbol ?? currency.code;
  return `${value.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${sym}`;
}

export function deriveLogLevel(entry: { action: string; statusCode?: number }): string {
  if (entry.action === 'error') return 'Error';
  if (entry.statusCode && entry.statusCode >= 500) return 'Critical';
  if (entry.statusCode && entry.statusCode >= 400) return 'Warning';
  if (entry.action === 'api_call') return 'Info';
  return 'Debug';
}

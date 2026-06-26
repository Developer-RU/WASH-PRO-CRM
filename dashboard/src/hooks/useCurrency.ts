import { useCallback, useMemo } from 'react';
import { apiList } from '../api/client';
import { usePolling } from './usePolling';
import type { Currency } from '../types';
import type { CurrencyConfig } from '../utils/format';

const FALLBACK: CurrencyConfig = { code: 'RUB', name: 'Российский рубль', symbol: '₽' };

function toConfig(c: Currency): CurrencyConfig {
  return { code: c.code, name: c.name, symbol: c.symbol };
}

export function useCurrency() {
  const fetchCurrencies = useCallback(() => apiList<Currency>('/crm/currencies'), []);
  const { data: currencies, loading, refresh } = usePolling(fetchCurrencies, [], {
    intervalMs: 30000,
    live: false,
  });

  const currency = useMemo(() => {
    const list = currencies || [];
    const def = list.find((c) => c.isDefault) || list[0];
    return def ? toConfig(def) : FALLBACK;
  }, [currencies]);

  return { currency, currencies: currencies || [], loading, refresh };
}

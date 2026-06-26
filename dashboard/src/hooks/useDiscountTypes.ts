import { useCallback, useMemo } from 'react';
import { apiList } from '../api/client';
import { LIVE_INTERVAL_SLOW_MS } from '../constants/live';
import { usePolling } from './usePolling';
import { discountTypesByNumber, resolveDiscountTypeLabel } from '../utils/discountTypes';
import type { DiscountType } from '../types';

export function useDiscountTypes() {
  const fetchTypes = useCallback(() => apiList<DiscountType>('/crm/discount-types'), []);
  const { data: types, loading, refresh } = usePolling(fetchTypes, [], { intervalMs: LIVE_INTERVAL_SLOW_MS });

  const byNumber = useMemo(() => discountTypesByNumber(types || []), [types]);

  const label = useCallback(
    (discountType: string | number | undefined) => resolveDiscountTypeLabel(discountType, byNumber),
    [byNumber]
  );

  return { types: types || [], byNumber, label, loading, refresh };
}

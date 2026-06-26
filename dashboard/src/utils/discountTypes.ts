import type { DiscountType } from '../types';

export function discountTypesByNumber(types: DiscountType[]): Map<number, DiscountType> {
  return new Map(types.map((t) => [t.number, t]));
}

export function resolveDiscountTypeLabel(
  discountType: string | number | undefined,
  byNumber: Map<number, DiscountType>
): string {
  if (discountType == null || discountType === '') return '—';
  const num = Number(discountType);
  if (!Number.isNaN(num) && byNumber.has(num)) {
    return byNumber.get(num)!.name;
  }
  return String(discountType);
}

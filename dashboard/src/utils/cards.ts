import type { CardStatus } from '../types';

export type { CardStatus };

export const CARD_STATUS_LABELS: Record<CardStatus, string> = {
  success: 'Успешно',
  rejected: 'Отклонено',
};

const LEGACY_SUCCESS = new Set(['active']);

/** Приводит статус карты к success | rejected. */
export function normalizeCardStatus(status: string): CardStatus {
  const value = String(status || '').trim().toLowerCase();
  if (value === 'success' || value === 'rejected') return value;
  if (LEGACY_SUCCESS.has(value)) return 'success';
  return 'rejected';
}

export function getCardStatusLabel(status: string): string {
  return CARD_STATUS_LABELS[normalizeCardStatus(status)];
}

export function getCardStatusBadgeVariant(status: string): 'success' | 'error' {
  return normalizeCardStatus(status) === 'success' ? 'success' : 'error';
}

export function isCardStatus(value: string): value is CardStatus {
  return value === 'success' || value === 'rejected';
}

/** @deprecated используйте CARD_STATUS_LABELS */
export const cardStatusLabel = CARD_STATUS_LABELS;

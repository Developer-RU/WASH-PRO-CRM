import { describe, expect, it } from 'vitest';
import { computeExpiresAt, normalizeDataRetentionDays } from './data-retention';

describe('data-retention', () => {
  it('normalizeDataRetentionDays returns undefined for empty values', () => {
    expect(normalizeDataRetentionDays(undefined)).toBeUndefined();
    expect(normalizeDataRetentionDays(null)).toBeUndefined();
    expect(normalizeDataRetentionDays('')).toBeUndefined();
  });

  it('normalizeDataRetentionDays parses positive integers', () => {
    expect(normalizeDataRetentionDays(30)).toBe(30);
    expect(normalizeDataRetentionDays('7')).toBe(7);
  });

  it('normalizeDataRetentionDays rejects invalid values', () => {
    expect(() => normalizeDataRetentionDays(0)).toThrow();
    expect(() => normalizeDataRetentionDays(-1)).toThrow();
  });

  it('computeExpiresAt returns undefined when retention is not set', () => {
    expect(computeExpiresAt(undefined)).toBeUndefined();
  });

  it('computeExpiresAt adds days from now', () => {
    const expiresAt = computeExpiresAt(10)!;
    const diffDays = Math.round((expiresAt.getTime() - Date.now()) / 86400000);
    expect(diffDays).toBe(10);
  });
});

export function normalizeDataRetentionDays(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const n = typeof value === 'number' ? value : parseInt(String(value), 10);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error('Data retention must be a positive number of days');
  }
  return Math.floor(n);
}

/** Returns MongoDB TTL date for new records, or undefined when retention is not set (forever). */
export function computeExpiresAt(dataRetentionDays?: number): Date | undefined {
  if (!dataRetentionDays) return undefined;
  const expiresAt = new Date();
  expiresAt.setUTCDate(expiresAt.getUTCDate() + dataRetentionDays);
  return expiresAt;
}

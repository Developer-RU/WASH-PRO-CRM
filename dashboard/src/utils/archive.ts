import { api, apiList } from '../api/client';
import type { ArchiveGroupSettings } from '../types';

export type ArchiveGroupKey = 'cards' | 'postStates' | 'usageStats' | 'financeStats';

const GROUP_CONFIG: Record<ArchiveGroupKey, { path: string; dateField: string }> = {
  cards: { path: '/crm/cards', dateField: 'createdAt' },
  postStates: { path: '/crm/post-states', dateField: 'lastMessageAt' },
  usageStats: { path: '/crm/usage-stats', dateField: 'recordedAt' },
  financeStats: { path: '/crm/finance-stats', dateField: 'recordedAt' },
};

function recordDate(item: Record<string, unknown>, dateField: string): Date | null {
  const raw = (item[dateField] ?? item.createdAt) as string | undefined;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Удаляет (или только считает) записи старше retentionDays. */
export async function executeArchiveGroup(
  groupKey: ArchiveGroupKey,
  group: ArchiveGroupSettings
): Promise<number> {
  const config = GROUP_CONFIG[groupKey];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - group.retentionDays);

  const items = await apiList<Record<string, unknown> & { id: string }>(config.path);
  const expired = items.filter((item) => {
    const d = recordDate(item, config.dateField);
    return d != null && d.getTime() < cutoff.getTime();
  });

  if (group.deleteAfter) {
    for (const item of expired) {
      await api(`${config.path}/${item.id}`, { method: 'DELETE' });
    }
  }

  return expired.length;
}

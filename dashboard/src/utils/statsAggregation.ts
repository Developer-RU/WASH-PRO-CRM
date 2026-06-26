import { refId, resolveWashAddress, UNDEFINED_WASH_LABEL } from './refs';
import type { FinanceStat, Post, PostIdRef, UsageStat, Wash, WashRef } from '../types';

function recordTime(item: { recordedAt?: string; createdAt?: string }): number {
  const raw = item.recordedAt ?? item.createdAt;
  if (!raw) return 0;
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/** Последняя запись на каждый пост (финансы). */
export function latestFinanceByPost(stats: FinanceStat[]): FinanceStat[] {
  const byPost = new Map<string, FinanceStat>();
  for (const row of stats) {
    const postKey = refId(row.postId) || row.id;
    const prev = byPost.get(postKey);
    if (!prev || recordTime(row) >= recordTime(prev)) {
      byPost.set(postKey, row);
    }
  }
  return [...byPost.values()];
}

/** Последняя запись на каждый пост и категорию (использование). */
export function latestUsageByPostAndCategory(stats: UsageStat[]): UsageStat[] {
  const byKey = new Map<string, UsageStat>();
  for (const row of stats) {
    const postKey = refId(row.postId) || row.id;
    const key = `${postKey}:${row.category}`;
    const prev = byKey.get(key);
    if (!prev || recordTime(row) >= recordTime(prev)) {
      byKey.set(key, row);
    }
  }
  return [...byKey.values()];
}

export function resolvePostNumber(
  postId: PostIdRef | string | undefined,
  postById: Map<string, Pick<Post, 'postNumber'>>
): string {
  if (postId != null && typeof postId === 'object' && postId.postNumber != null) {
    return String(postId.postNumber);
  }
  const id = refId(postId);
  if (!id) return '—';
  const post = postById.get(id);
  return post ? String(post.postNumber) : '—';
}

export function resolveStatWashAddress(
  washId: WashRef | string,
  postId: PostIdRef | string | undefined,
  postById: Map<string, Pick<Post, 'washId'>>,
  washById: Map<string, Pick<Wash, 'address'>>
): string {
  if (washId != null && typeof washId === 'object' && washId.address) {
    return washId.address;
  }
  const fromStat = resolveWashAddress(washId, washById);
  if (fromStat !== '—' && fromStat !== UNDEFINED_WASH_LABEL) return fromStat;

  const post =
    postId != null && typeof postId === 'object'
      ? postId
      : postById.get(refId(postId));
  const postWashId = post && typeof post === 'object' ? post.washId : undefined;
  return resolveWashAddress(postWashId ?? washId, washById);
}

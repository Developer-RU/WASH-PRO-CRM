import { useCallback, useMemo } from 'react';
import { apiList } from '../api/client';
import { PageHeader, Loading, StatCard, periodLabel, categoryLabel } from '../components/UI';
import { DataTable, type DataTableBulkAction, type DataTableColumn, type DataTableFilter } from '../components/DataTable';
import { DEFAULT_LIVE_INTERVAL_MS } from '../constants/live';
import { usePolling } from '../hooks/usePolling';
import { formatDurationHuman, formatDateTime } from '../utils/format';
import { createExportBulkAction } from '../utils/export';
import {
  latestUsageByPostAndCategory,
  resolvePostNumber,
  resolveStatWashAddress,
} from '../utils/statsAggregation';
import type { Post, UsageStat, Wash } from '../types';

const USAGE_CATEGORIES = [
  { key: 'regular', label: 'Использование клиентами' },
  { key: 'service', label: 'Сервисное использование' },
  { key: 'unlimited', label: 'VIP-использование' },
] as const;

interface UsagePageData {
  stats: UsageStat[];
  posts: Post[];
  washes: Wash[];
}

function PeriodUsageSection({
  title,
  stats,
  postById,
  washById,
}: {
  title: string;
  stats: UsageStat[];
  postById: Map<string, Post>;
  washById: Map<string, Wash>;
}) {
  const latest = useMemo(() => latestUsageByPostAndCategory(stats), [stats]);

  const totals = useMemo(() => {
    const result: Record<string, number> = { regular: 0, service: 0, unlimited: 0 };
    latest.forEach((s) => {
      result[s.category] = (result[s.category] || 0) + (s.usageTime || 0);
    });
    return result;
  }, [latest]);

  const postNumber = useCallback(
    (s: UsageStat) => resolvePostNumber(s.postId, postById),
    [postById]
  );

  const address = useCallback(
    (s: UsageStat) => resolveStatWashAddress(s.washId, s.postId, postById, washById),
    [postById, washById]
  );

  const categoryFilter: DataTableFilter<UsageStat> = useMemo(
    () => ({
      id: 'category',
      label: 'Категория',
      options: [
        { value: 'regular', label: categoryLabel.regular },
        { value: 'service', label: categoryLabel.service },
        { value: 'unlimited', label: categoryLabel.unlimited },
      ],
      match: (s, v) => s.category === v,
    }),
    []
  );

  const columns: DataTableColumn<UsageStat>[] = useMemo(
    () => [
      {
        key: 'post',
        header: 'Пост',
        sortable: true,
        sortValue: (s) => Number(postNumber(s)) || 0,
        searchValue: (s) => postNumber(s),
        render: (s) => <span className="font-mono">{postNumber(s)}</span>,
      },
      {
        key: 'address',
        header: 'Адрес объекта',
        sortable: true,
        sortValue: (s) => address(s),
        searchValue: (s) => address(s),
        render: (s) => address(s),
      },
      {
        key: 'category',
        header: 'Категория',
        sortable: true,
        searchValue: (s) => categoryLabel[s.category] || s.category,
        sortValue: (s) => s.category,
        render: (s) => categoryLabel[s.category] || s.category,
      },
      {
        key: 'usageTime',
        header: 'Время использования',
        sortable: true,
        sortValue: (s) => s.usageTime,
        render: (s) => formatDurationHuman(s.usageTime),
      },
      {
        key: 'launchCount',
        header: 'Запуски',
        sortable: true,
        sortValue: (s) => s.launchCount,
        render: (s) => s.launchCount,
      },
      {
        key: 'clientCount',
        header: 'Клиенты',
        sortable: true,
        sortValue: (s) => s.clientCount,
        render: (s) => s.clientCount,
      },
      {
        key: 'recordedAt',
        header: 'Дата и время',
        sortable: true,
        sortValue: (s) => s.recordedAt || '',
        render: (s) => formatDateTime(s.recordedAt),
      },
    ],
    [postNumber, address]
  );

  const bulkActions = useMemo((): DataTableBulkAction<UsageStat>[] => [
    createExportBulkAction(`usage-${title}.csv`, [
      { header: 'Пост', value: (s) => postNumber(s) },
      { header: 'Адрес объекта', value: (s) => address(s) },
      { header: 'Категория', value: (s) => categoryLabel[s.category] || s.category },
      { header: 'Время (сек)', value: (s) => String(s.usageTime ?? 0) },
      { header: 'Запуски', value: (s) => String(s.launchCount ?? 0) },
      { header: 'Клиенты', value: (s) => String(s.clientCount ?? 0) },
      { header: 'Дата и время', value: (s) => s.recordedAt || '' },
    ]),
  ], [title, postNumber, address]);

  return (
    <section className="mb-8">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        {USAGE_CATEGORIES.map((cat) => (
          <StatCard
            key={cat.key}
            label={cat.label}
            value={formatDurationHuman(totals[cat.key])}
            hint="Сумма последних данных по каждому посту"
          />
        ))}
      </div>
      <DataTable columns={columns} data={stats} rowKey={(s) => s.id} filters={[categoryFilter]} pageSize={10} emptyMessage="Нет записей" bulkActions={bulkActions} />
    </section>
  );
}

export function UsagePage() {
  const fetchData = useCallback(async (): Promise<UsagePageData> => {
    const [stats, posts, washes] = await Promise.all([
      apiList<UsageStat>('/crm/usage-stats'),
      apiList<Post>('/crm/posts'),
      apiList<Wash>('/crm/washes'),
    ]);
    return { stats, posts, washes };
  }, []);

  const { data, loading } = usePolling(fetchData, [], { intervalMs: DEFAULT_LIVE_INTERVAL_MS });

  const postById = useMemo(
    () => new Map((data?.posts || []).map((p) => [p.id, p])),
    [data?.posts]
  );
  const washById = useMemo(
    () => new Map((data?.washes || []).map((w) => [w.id, w])),
    [data?.washes]
  );

  const before = useMemo(
    () => (data?.stats || []).filter((s) => s.period === 'before_collection'),
    [data?.stats]
  );
  const after = useMemo(
    () => (data?.stats || []).filter((s) => s.period === 'after_collection'),
    [data?.stats]
  );

  if (loading && !data) return <Loading />;

  return (
    <div>
      <PageHeader title="Статистика использования" subtitle="Время в секундах, отображение в удобном формате" />
      <PeriodUsageSection title={periodLabel.before_collection} stats={before} postById={postById} washById={washById} />
      <PeriodUsageSection title={periodLabel.after_collection} stats={after} postById={postById} washById={washById} />
    </div>
  );
}

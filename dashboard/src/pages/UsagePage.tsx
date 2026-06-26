import { useCallback, useMemo } from 'react';
import { apiList } from '../api/client';
import { PageHeader, Loading, StatCard, periodLabel, categoryLabel } from '../components/UI';
import { DataTable, type DataTableColumn, type DataTableFilter } from '../components/DataTable';
import { usePolling } from '../hooks/usePolling';
import { formatDurationHuman } from '../utils/format';
import type { UsageStat } from '../types';

const USAGE_CATEGORIES = [
  { key: 'regular', label: 'Использование клиентами' },
  { key: 'service', label: 'Сервисное использование' },
  { key: 'unlimited', label: 'VIP-использование' },
] as const;

function PeriodUsageSection({ title, stats }: { title: string; stats: UsageStat[] }) {
  const totals = useMemo(() => {
    const result: Record<string, number> = { regular: 0, service: 0, unlimited: 0 };
    stats.forEach((s) => {
      result[s.category] = (result[s.category] || 0) + (s.usageTime || 0);
    });
    return result;
  }, [stats]);

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
        header: 'Дата',
        sortable: true,
        sortValue: (s) => s.recordedAt || '',
        render: (s) => (s.recordedAt ? new Date(s.recordedAt).toLocaleString('ru') : '—'),
      },
    ],
    []
  );

  return (
    <section className="mb-8">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        {USAGE_CATEGORIES.map((cat) => (
          <StatCard
            key={cat.key}
            label={cat.label}
            value={formatDurationHuman(totals[cat.key])}
          />
        ))}
      </div>
      <DataTable columns={columns} data={stats} rowKey={(s) => s.id} filters={[categoryFilter]} pageSize={10} emptyMessage="Нет записей" />
    </section>
  );
}

export function UsagePage() {
  const fetchStats = useCallback(() => apiList<UsageStat>('/crm/usage-stats'), []);
  const { data: stats, loading } = usePolling(fetchStats, [], { intervalMs: 10000 });

  const before = useMemo(
    () => (stats || []).filter((s) => s.period === 'before_collection'),
    [stats]
  );
  const after = useMemo(
    () => (stats || []).filter((s) => s.period === 'after_collection'),
    [stats]
  );

  if (loading && !stats) return <Loading />;

  return (
    <div>
      <PageHeader title="Статистика использования" subtitle="Время в секундах, отображение в удобном формате" />
      <PeriodUsageSection title={periodLabel.before_collection} stats={before} />
      <PeriodUsageSection title={periodLabel.after_collection} stats={after} />
    </div>
  );
}

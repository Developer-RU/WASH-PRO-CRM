import { useCallback, useMemo } from 'react';
import { apiList } from '../api/client';
import { PageHeader, Loading, StatCard, periodLabel } from '../components/UI';
import { DataTable, type DataTableColumn, type DataTableFilter } from '../components/DataTable';
import { usePolling } from '../hooks/usePolling';
import { useCurrency } from '../hooks/useCurrency';
import { formatMoney } from '../utils/format';
import type { FinanceStat } from '../types';

function PeriodSection({
  title,
  stats,
  currency,
}: {
  title: string;
  stats: FinanceStat[];
  currency: { code: string; symbol?: string };
}) {
  const totals = useMemo(
    () => ({
      cash: stats.reduce((s, x) => s + (x.cash || 0), 0),
      cashless: stats.reduce((s, x) => s + (x.cashless || 0), 0),
      discount: stats.reduce((s, x) => s + (x.discountOps || 0), 0),
    }),
    [stats]
  );

  const periodFilter: DataTableFilter<FinanceStat> = useMemo(
    () => ({
      id: 'washId',
      label: 'Объект (ID)',
      options: [...new Set(stats.map((s) => s.washId))].map((id) => ({ value: id, label: id.slice(-8) })),
      match: (s, v) => s.washId === v,
    }),
    [stats]
  );

  const columns: DataTableColumn<FinanceStat>[] = useMemo(
    () => [
      {
        key: 'cash',
        header: 'Наличные',
        sortable: true,
        sortValue: (s) => s.cash,
        render: (s) => formatMoney(s.cash, currency),
      },
      {
        key: 'cashless',
        header: 'Внешние (безнал)',
        sortable: true,
        sortValue: (s) => s.cashless,
        render: (s) => formatMoney(s.cashless, currency),
      },
      {
        key: 'discountOps',
        header: 'Скидочные средства',
        sortable: true,
        sortValue: (s) => s.discountOps,
        render: (s) => formatMoney(s.discountOps, currency),
      },
      {
        key: 'totalRevenue',
        header: 'Выручка',
        sortable: true,
        sortValue: (s) => s.totalRevenue,
        render: (s) => <span className="font-medium">{formatMoney(s.totalRevenue, currency)}</span>,
      },
      {
        key: 'recordedAt',
        header: 'Дата записи',
        sortable: true,
        sortValue: (s) => s.recordedAt || '',
        render: (s) => (s.recordedAt ? new Date(s.recordedAt).toLocaleString('ru') : '—'),
      },
    ],
    [currency]
  );

  return (
    <section className="mb-8">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard label="Наличные средства" value={formatMoney(totals.cash, currency)} />
        <StatCard label="Внешние средства" value={formatMoney(totals.cashless, currency)} />
        <StatCard label="Скидочные средства" value={formatMoney(totals.discount, currency)} />
      </div>
      <DataTable columns={columns} data={stats} rowKey={(s) => s.id} filters={periodFilter.options.length ? [periodFilter] : []} pageSize={10} emptyMessage="Нет записей" searchPlaceholder="Поиск…" />
    </section>
  );
}

export function FinancePage() {
  const { currency } = useCurrency();
  const fetchStats = useCallback(() => apiList<FinanceStat>('/crm/finance-stats'), []);
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
      <PageHeader title="Финансовая статистика" subtitle="До и после инкассации" />
      <PeriodSection title={periodLabel.before_collection} stats={before} currency={currency} />
      <PeriodSection title={periodLabel.after_collection} stats={after} currency={currency} />
    </div>
  );
}

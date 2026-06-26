import { useCallback, useMemo } from 'react';
import { apiList } from '../api/client';
import { PageHeader, Loading, StatCard, periodLabel } from '../components/UI';
import { DataTable, type DataTableBulkAction, type DataTableColumn, type DataTableFilter } from '../components/DataTable';
import { DEFAULT_LIVE_INTERVAL_MS } from '../constants/live';
import { usePolling } from '../hooks/usePolling';
import { useCurrency } from '../hooks/useCurrency';
import { formatMoney, formatDateTime } from '../utils/format';
import { createExportBulkAction } from '../utils/export';
import {
  latestFinanceByPost,
  resolvePostNumber,
  resolveStatWashAddress,
} from '../utils/statsAggregation';
import type { FinanceStat, Post, Wash } from '../types';

interface FinancePageData {
  stats: FinanceStat[];
  posts: Post[];
  washes: Wash[];
}

function PeriodSection({
  title,
  stats,
  currency,
  postById,
  washById,
}: {
  title: string;
  stats: FinanceStat[];
  currency: { code: string; symbol?: string };
  postById: Map<string, Post>;
  washById: Map<string, Wash>;
}) {
  const latest = useMemo(() => latestFinanceByPost(stats), [stats]);

  const totals = useMemo(
    () => ({
      cash: latest.reduce((s, x) => s + (x.cash || 0), 0),
      cashless: latest.reduce((s, x) => s + (x.cashless || 0), 0),
      discount: latest.reduce((s, x) => s + (x.discountOps || 0), 0),
    }),
    [latest]
  );

  const postNumber = useCallback(
    (s: FinanceStat) => resolvePostNumber(s.postId, postById),
    [postById]
  );

  const address = useCallback(
    (s: FinanceStat) => resolveStatWashAddress(s.washId, s.postId, postById, washById),
    [postById, washById]
  );

  const addressFilter: DataTableFilter<FinanceStat> = useMemo(() => {
    const addresses = [...new Set(stats.map((s) => address(s)))].filter((a) => a !== '—');
    return {
      id: 'address',
      label: 'Объект',
      options: addresses.map((a) => ({ value: a, label: a })),
      match: (s, v) => address(s) === v,
    };
  }, [stats, address]);

  const columns: DataTableColumn<FinanceStat>[] = useMemo(
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
        header: 'Дата и время',
        sortable: true,
        sortValue: (s) => s.recordedAt || '',
        render: (s) => formatDateTime(s.recordedAt),
      },
    ],
    [currency, postNumber, address]
  );

  const bulkActions = useMemo((): DataTableBulkAction<FinanceStat>[] => [
    createExportBulkAction(`finance-${title}.csv`, [
      { header: 'Пост', value: (s) => postNumber(s) },
      { header: 'Адрес объекта', value: (s) => address(s) },
      { header: 'Наличные', value: (s) => String(s.cash ?? 0) },
      { header: 'Безнал', value: (s) => String(s.cashless ?? 0) },
      { header: 'Скидки', value: (s) => String(s.discountOps ?? 0) },
      { header: 'Выручка', value: (s) => String(s.totalRevenue ?? 0) },
      { header: 'Дата и время', value: (s) => s.recordedAt || '' },
    ]),
  ], [title, postNumber, address]);

  return (
    <section className="mb-8">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard label="Наличные средства" value={formatMoney(totals.cash, currency)} hint="Сумма последних данных по каждому посту" />
        <StatCard label="Внешние средства" value={formatMoney(totals.cashless, currency)} hint="Сумма последних данных по каждому посту" />
        <StatCard label="Скидочные средства" value={formatMoney(totals.discount, currency)} hint="Сумма последних данных по каждому посту" />
      </div>
      <DataTable
        columns={columns}
        data={stats}
        rowKey={(s) => s.id}
        filters={addressFilter.options.length ? [addressFilter] : []}
        pageSize={10}
        emptyMessage="Нет записей"
        searchPlaceholder="Поиск…"
        bulkActions={bulkActions}
      />
    </section>
  );
}

export function FinancePage() {
  const { currency } = useCurrency();

  const fetchData = useCallback(async (): Promise<FinancePageData> => {
    const [stats, posts, washes] = await Promise.all([
      apiList<FinanceStat>('/crm/finance-stats'),
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
      <PageHeader title="Финансовая статистика" subtitle="До и после инкассации" />
      <PeriodSection title={periodLabel.before_collection} stats={before} currency={currency} postById={postById} washById={washById} />
      <PeriodSection title={periodLabel.after_collection} stats={after} currency={currency} postById={postById} washById={washById} />
    </div>
  );
}

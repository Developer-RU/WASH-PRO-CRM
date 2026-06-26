import { useCallback, useMemo } from 'react';
import { apiList } from '../api/client';
import { PageHeader, StatCard, Loading, Badge } from '../components/UI';
import { DataTable, type DataTableColumn, type DataTableFilter } from '../components/DataTable';
import { DashboardCharts } from '../components/DashboardCharts';
import { usePolling } from '../hooks/usePolling';
import { useCurrency } from '../hooks/useCurrency';
import { formatMoney } from '../utils/format';
import type { Wash, Post, PostState, Notification, UsageStat, FinanceStat } from '../types';

interface DashboardData {
  washes: Wash[];
  posts: Post[];
  states: PostState[];
  notifications: Notification[];
  usageStats: UsageStat[];
  financeStats: FinanceStat[];
}

export function DashboardPage() {
  const { currency } = useCurrency();

  const fetchData = useCallback(async (): Promise<DashboardData> => {
    const [washes, posts, states, notifications, usageStats, financeStats] = await Promise.all([
      apiList<Wash>('/crm/washes'),
      apiList<Post>('/crm/posts'),
      apiList<PostState>('/crm/post-states'),
      apiList<Notification>('/crm/notifications'),
      apiList<UsageStat>('/crm/usage-stats'),
      apiList<FinanceStat>('/crm/finance-stats'),
    ]);
    return { washes, posts, states, notifications, usageStats, financeStats };
  }, []);

  const { data, loading } = usePolling(fetchData, [], { intervalMs: 5000 });

  const finance = useMemo(() => {
    if (!data) return { cash: 0, cashless: 0, revenue: 0, discounts: 0 };
    const before = data.financeStats.filter((s) => s.period === 'before_collection');
    return {
      cash: before.reduce((s, x) => s + (x.cash || 0), 0),
      cashless: before.reduce((s, x) => s + (x.cashless || 0), 0),
      revenue: before.reduce((s, x) => s + (x.totalRevenue || 0), 0),
      discounts: before.reduce((s, x) => s + (x.discountOps || 0), 0),
    };
  }, [data]);

  const activeErrors = useMemo(() => {
    if (!data) return 0;
    const postErrors = data.posts.filter((p) => p.status === 'error').length;
    const notifErrors = data.notifications.filter((n) => !n.read && n.severity === 'error').length;
    return postErrors + notifErrors;
  }, [data]);

  const notificationFilters: DataTableFilter<Notification>[] = useMemo(
    () => [
      {
        id: 'severity',
        label: 'Важность',
        options: [
          { value: 'error', label: 'Ошибка' },
          { value: 'warning', label: 'Предупреждение' },
          { value: 'info', label: 'Информация' },
        ],
        match: (n, v) => n.severity === v,
      },
      {
        id: 'read',
        label: 'Статус',
        options: [
          { value: 'unread', label: 'Непрочитанные' },
          { value: 'read', label: 'Прочитанные' },
        ],
        match: (n, v) => (v === 'read' ? n.read : !n.read),
      },
    ],
    []
  );

  const notificationColumns: DataTableColumn<Notification>[] = useMemo(
    () => [
      {
        key: 'type',
        header: 'Тип',
        sortable: true,
        searchValue: (n) => n.type,
        sortValue: (n) => n.type,
        render: (n) => (
          <Badge variant={n.severity === 'error' ? 'error' : n.severity === 'warning' ? 'warning' : 'default'}>
            {n.type}
          </Badge>
        ),
      },
      {
        key: 'message',
        header: 'Сообщение',
        sortable: true,
        searchValue: (n) => n.message,
        sortValue: (n) => n.message,
        render: (n) => <span className="text-sm">{n.message}</span>,
      },
      {
        key: 'date',
        header: 'Дата',
        sortable: true,
        sortValue: (n) => n.createdAt || '',
        render: (n) => (
          <span className="text-sm text-slate-500">
            {n.createdAt ? new Date(n.createdAt).toLocaleString('ru') : '—'}
          </span>
        ),
      },
    ],
    []
  );

  if (loading && !data) return <Loading />;
  if (!data) return <Loading />;

  const online = data.posts.filter((p) => p.status === 'online').length;
  const offline = data.posts.filter((p) => p.status === 'offline').length;
  const errors = data.posts.filter((p) => p.status === 'error').length;
  const recentNotifications = [...data.notifications]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 50);

  return (
    <div>
      <PageHeader title="Обзор" subtitle={`Версия ${import.meta.env.VITE_APP_VERSION || '1.0.0'}`} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <StatCard label="Наличная выручка" value={formatMoney(finance.cash, currency)} />
        <StatCard label="Безналичная выручка" value={formatMoney(finance.cashless, currency)} />
        <StatCard label="Общая выручка" value={formatMoney(finance.revenue, currency)} />
        <StatCard label="Сумма скидок" value={formatMoney(finance.discounts, currency)} />
        <StatCard label="Активные ошибки" value={activeErrors} hint="Посты + непрочитанные уведомления" />
      </div>

      <DashboardCharts
        posts={data.posts}
        usageStats={data.usageStats}
        financeStats={data.financeStats}
        currency={currency}
        online={online}
        offline={offline}
        errorCount={errors}
      />

      <div className="card">
        <h2 className="mb-4 font-semibold">Последние уведомления</h2>
        <DataTable
          columns={notificationColumns}
          data={recentNotifications}
          rowKey={(n) => n.id}
          filters={notificationFilters}
          searchPlaceholder="Поиск уведомлений…"
          pageSize={10}
          emptyMessage="Нет уведомлений"
        />
      </div>
    </div>
  );
}

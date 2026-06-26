import { useCallback, useMemo } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { apiList } from '../api/client';
import { PageHeader, Loading, Badge } from '../components/UI';
import { DataTable, type DataTableColumn, type DataTableFilter } from '../components/DataTable';
import { usePolling } from '../hooks/usePolling';
import { formatMoney } from '../utils/format';
import { useCurrency } from '../hooks/useCurrency';
import type { Card } from '../types';

const TABS = [
  { to: '/cards/discount', label: 'Скидочные карты', type: 'regular' as const },
  { to: '/cards/service', label: 'Сервисные карты', type: 'service' as const },
  { to: '/cards/vip', label: 'VIP-обслуживание', type: 'unlimited' as const },
];

const cardStatusFilter: DataTableFilter<Card> = {
  id: 'status',
  label: 'Статус',
  options: [
    { value: 'active', label: 'active' },
    { value: 'blocked', label: 'blocked' },
    { value: 'expired', label: 'expired' },
  ],
  match: (c, v) => c.status === v,
};

function discountColumns(currency: { code: string; symbol?: string }): DataTableColumn<Card>[] {
  return [
    {
      key: 'cardNumber',
      header: 'Номер карты',
      sortable: true,
      searchValue: (c) => c.cardNumber,
      sortValue: (c) => c.cardNumber,
      render: (c) => <span className="font-mono">{c.cardNumber}</span>,
    },
    {
      key: 'discountType',
      header: 'Тип скидки',
      sortable: true,
      searchValue: (c) => c.discountType || '',
      render: (c) => c.discountType || (c.discount > 0 ? 'Процентная' : '—'),
    },
    {
      key: 'balance',
      header: 'Баланс',
      sortable: true,
      sortValue: (c) => c.balance,
      render: (c) => formatMoney(c.balance, currency),
    },
    {
      key: 'discount',
      header: 'Размер скидки',
      sortable: true,
      sortValue: (c) => c.discount,
      render: (c) => `${c.discount}%`,
    },
    {
      key: 'status',
      header: 'Статус',
      sortable: true,
      sortValue: (c) => c.status,
      render: (c) => <Badge variant={c.status === 'active' ? 'success' : 'warning'}>{c.status}</Badge>,
    },
    {
      key: 'createdAt',
      header: 'Дата создания',
      sortable: true,
      sortValue: (c) => c.createdAt || '',
      render: (c) => (c.createdAt ? new Date(c.createdAt).toLocaleString('ru') : '—'),
    },
  ];
}

function periodColumns(): DataTableColumn<Card>[] {
  return [
    {
      key: 'cardNumber',
      header: 'Номер карты',
      sortable: true,
      searchValue: (c) => c.cardNumber,
      sortValue: (c) => c.cardNumber,
      render: (c) => <span className="font-mono">{c.cardNumber}</span>,
    },
    {
      key: 'validFrom',
      header: 'Начало действия',
      sortable: true,
      sortValue: (c) => c.validFrom || '',
      render: (c) => (c.validFrom ? new Date(c.validFrom).toLocaleString('ru') : '—'),
    },
    {
      key: 'validUntil',
      header: 'Окончание действия',
      sortable: true,
      sortValue: (c) => c.validUntil || '',
      render: (c) => (c.validUntil ? new Date(c.validUntil).toLocaleString('ru') : '—'),
    },
    {
      key: 'status',
      header: 'Статус',
      sortable: true,
      sortValue: (c) => c.status,
      render: (c) => <Badge variant={c.status === 'active' ? 'success' : 'warning'}>{c.status}</Badge>,
    },
  ];
}

export function CardsLayout() {
  const location = useLocation();
  return (
    <div>
      <PageHeader title="Карты" subtitle="Скидочные, сервисные и VIP-карты" />
      <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={clsx(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              location.pathname.startsWith(tab.to)
                ? 'border-brand-600 text-brand-700 dark:text-brand-300'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
      <Outlet />
    </div>
  );
}

export function CardsDiscountPage() {
  return <CardsTable cardType="regular" title="Скидочные карты" />;
}

export function CardsServicePage() {
  return <CardsTable cardType="service" title="Сервисные карты" period />;
}

export function CardsVipPage() {
  return <CardsTable cardType="unlimited" title="VIP-обслуживание" period />;
}

function CardsTable({
  cardType,
  title,
  period,
}: {
  cardType: Card['cardType'];
  title: string;
  period?: boolean;
}) {
  const { currency } = useCurrency();
  const fetchCards = useCallback(() => apiList<Card>('/crm/cards'), []);
  const { data: cards, loading } = usePolling(fetchCards, [], { intervalMs: 10000 });

  const filtered = useMemo(
    () => (cards || []).filter((c) => c.cardType === cardType),
    [cards, cardType]
  );

  const columns = useMemo(
    () => (period ? periodColumns() : discountColumns(currency)),
    [period, currency]
  );

  if (loading && !cards) return <Loading />;

  return (
    <DataTable
      columns={columns}
      data={filtered}
      rowKey={(c) => c.id}
      filters={[cardStatusFilter]}
      searchPlaceholder={`Поиск в разделе «${title}»…`}
    />
  );
}

/** @deprecated use CardsLayout + subpages */
export function CardsPage() {
  return <CardsDiscountPage />;
}

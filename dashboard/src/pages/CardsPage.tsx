import { useCallback, useMemo } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { apiList } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { PageHeader, Loading, Badge } from '../components/UI';
import { DataTable, type DataTableBulkAction, type DataTableColumn, type DataTableFilter } from '../components/DataTable';
import { DEFAULT_LIVE_INTERVAL_MS } from '../constants/live';
import { usePolling } from '../hooks/usePolling';
import { formatMoney, formatDateTime } from '../utils/format';
import { useCurrency } from '../hooks/useCurrency';
import { useDiscountTypes } from '../hooks/useDiscountTypes';
import { bulkPut } from '../utils/bulk';
import { createExportBulkAction } from '../utils/export';
import { refId, resolvePostLabel } from '../utils/refs';
import {
  CARD_STATUS_LABELS,
  getCardStatusBadgeVariant,
  getCardStatusLabel,
  normalizeCardStatus,
} from '../utils/cards';
import type { Card, Post, Wash } from '../types';

const TABS = [
  { to: '/cards/discount', label: 'Скидочные карты', type: 'regular' as const },
  { to: '/cards/service', label: 'Сервисные карты', type: 'service' as const },
  { to: '/cards/vip', label: 'VIP-обслуживание', type: 'unlimited' as const },
];

const cardStatusFilter: DataTableFilter<Card> = {
  id: 'status',
  label: 'Статус',
  options: [
    { value: 'success', label: CARD_STATUS_LABELS.success },
    { value: 'rejected', label: CARD_STATUS_LABELS.rejected },
  ],
  match: (c, v) => c.status === v,
};

interface CardsColumnContext {
  currency: { code: string; symbol?: string };
  postLabel: (c: Card) => string;
  discountTypeLabel: (c: Card) => string;
}

function postColumn(ctx: CardsColumnContext): DataTableColumn<Card> {
  return {
    key: 'post',
    header: 'Пост',
    sortable: true,
    searchValue: (c) => ctx.postLabel(c),
    sortValue: (c) => ctx.postLabel(c),
    render: (c) => <span className="text-sm">{ctx.postLabel(c)}</span>,
  };
}

function statusColumn(): DataTableColumn<Card> {
  return {
    key: 'status',
    header: 'Статус',
    sortable: true,
    sortValue: (c) => c.status,
    render: (c) => (
      <Badge variant={getCardStatusBadgeVariant(c.status)}>
        {getCardStatusLabel(c.status)}
      </Badge>
    ),
  };
}

function datetimeColumn(): DataTableColumn<Card> {
  return {
    key: 'createdAt',
    header: 'Дата и время',
    sortable: true,
    sortValue: (c) => c.createdAt || '',
    render: (c) => formatDateTime(c.createdAt),
  };
}

function discountColumns(ctx: CardsColumnContext): DataTableColumn<Card>[] {
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
      searchValue: (c) => ctx.discountTypeLabel(c),
      sortValue: (c) => ctx.discountTypeLabel(c),
      render: (c) => ctx.discountTypeLabel(c),
    },
    {
      key: 'balance',
      header: 'Баланс',
      sortable: true,
      sortValue: (c) => c.balance,
      render: (c) => formatMoney(c.balance, ctx.currency),
    },
    {
      key: 'discount',
      header: 'Сумма скидки',
      sortable: true,
      sortValue: (c) => c.discount,
      render: (c) => formatMoney(c.discount, ctx.currency),
    },
    postColumn(ctx),
    statusColumn(),
    datetimeColumn(),
  ];
}

function periodColumns(ctx: CardsColumnContext): DataTableColumn<Card>[] {
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
    postColumn(ctx),
    statusColumn(),
    datetimeColumn(),
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
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('update');
  const { currency } = useCurrency();
  const { label: discountTypeLabel } = useDiscountTypes();

  const fetchData = useCallback(async () => {
    const [cards, posts, washes] = await Promise.all([
      apiList<Card>('/crm/cards?populate=postId,washId'),
      apiList<Post>('/crm/posts'),
      apiList<Wash>('/crm/washes'),
    ]);
    return {
      cards: cards.map((c) => ({ ...c, status: normalizeCardStatus(c.status) })),
      posts,
      washes,
    };
  }, []);

  const { data, loading, refresh } = usePolling(fetchData, [], { intervalMs: DEFAULT_LIVE_INTERVAL_MS });

  const postById = useMemo(
    () => new Map((data?.posts || []).map((p) => [p.id, p])),
    [data?.posts]
  );
  const washById = useMemo(
    () => new Map((data?.washes || []).map((w) => [w.id, w])),
    [data?.washes]
  );

  const postLabel = useCallback(
    (c: Card) => {
      const populatedPost = typeof c.postId === 'object' ? c.postId : postById.get(refId(c.postId));
      return resolvePostLabel(populatedPost || c.postId, postById, washById);
    },
    [postById, washById]
  );

  const filtered = useMemo(
    () => (data?.cards || []).filter((c) => c.cardType === cardType),
    [data?.cards, cardType]
  );

  const columnCtx = useMemo(
    (): CardsColumnContext => ({
      currency,
      postLabel,
      discountTypeLabel: (c) => discountTypeLabel(c.discountType),
    }),
    [currency, postLabel, discountTypeLabel]
  );

  const columns = useMemo(
    () => (period ? periodColumns(columnCtx) : discountColumns(columnCtx)),
    [period, columnCtx]
  );

  const bulkActions = useMemo((): DataTableBulkAction<Card>[] => {
    const actions: DataTableBulkAction<Card>[] = [
      createExportBulkAction(`cards-${cardType}.csv`, period
        ? [
            { header: 'Номер карты', value: (c) => c.cardNumber },
            { header: 'Начало', value: (c) => c.validFrom || '' },
            { header: 'Окончание', value: (c) => c.validUntil || '' },
            { header: 'Пост', value: (c) => postLabel(c) },
            { header: 'Статус', value: (c) => getCardStatusLabel(c.status) },
            { header: 'Дата и время', value: (c) => c.createdAt || '' },
          ]
        : [
            { header: 'Номер карты', value: (c) => c.cardNumber },
            { header: 'Тип скидки', value: (c) => discountTypeLabel(c.discountType) },
            { header: 'Баланс', value: (c) => String(c.balance) },
            { header: 'Сумма скидки', value: (c) => String(c.discount) },
            { header: 'Пост', value: (c) => postLabel(c) },
            { header: 'Статус', value: (c) => getCardStatusLabel(c.status) },
            { header: 'Дата и время', value: (c) => c.createdAt || '' },
          ]),
    ];

    if (canEdit) {
      const setStatus = (status: string, label: string): DataTableBulkAction<Card> => ({
        id: `status-${status}`,
        label,
        confirmMessage: (_rows, ids) => `Изменить статус у ${ids.length} карт?`,
        onAction: async (rows) => {
          await bulkPut('/crm/cards', rows, (c) => c.id, (c) => ({
            ...c,
            washId: refId(c.washId),
            postId: refId(c.postId),
            status,
          }));
          refresh();
        },
      });
      actions.push(setStatus('success', 'Успешно'), setStatus('rejected', 'Отклонено'));
    }

    return actions;
  }, [canEdit, cardType, period, postLabel, discountTypeLabel, refresh]);

  if (loading && !data) return <Loading />;

  return (
    <DataTable
      columns={columns}
      data={filtered}
      rowKey={(c) => c.id}
      filters={[cardStatusFilter]}
      searchPlaceholder={`Поиск в разделе «${title}»…`}
      bulkActions={bulkActions}
    />
  );
}

/** @deprecated use CardsLayout + subpages */
export function CardsPage() {
  return <CardsDiscountPage />;
}

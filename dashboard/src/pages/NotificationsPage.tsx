import { useCallback, useMemo } from 'react';
import { api, apiList } from '../api/client';
import { PageHeader, Loading, Badge } from '../components/UI';
import { DataTable, type DataTableColumn, type DataTableFilter } from '../components/DataTable';
import { usePolling } from '../hooks/usePolling';
import type { Notification } from '../types';

export function NotificationsPage() {
  const fetchItems = useCallback(() => apiList<Notification>('/crm/notifications'), []);
  const { data: items, loading, refresh } = usePolling(fetchItems, [], { intervalMs: 10000 });

  const markRead = async (id: string) => {
    await api(`/crm/notifications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ read: true }),
    });
    refresh();
  };

  const filters: DataTableFilter<Notification>[] = useMemo(
    () => [
      {
        id: 'read',
        label: 'Статус',
        options: [
          { value: 'unread', label: 'Непрочитанные' },
          { value: 'read', label: 'Прочитанные' },
        ],
        match: (n, v) => (v === 'read' ? n.read : !n.read),
      },
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
        id: 'type',
        label: 'Тип',
        options: [
          { value: 'connection_lost', label: 'connection_lost' },
          { value: 'equipment_error', label: 'equipment_error' },
          { value: 'queue_overflow', label: 'queue_overflow' },
          { value: 'backup_error', label: 'backup_error' },
        ],
        match: (n, v) => n.type === v,
      },
    ],
    []
  );

  const columns: DataTableColumn<Notification>[] = useMemo(
    () => [
      {
        key: 'type',
        header: 'Тип',
        searchValue: (n) => n.type,
        render: (n) => n.type,
      },
      {
        key: 'severity',
        header: 'Важность',
        sortValue: (n) => n.severity,
        searchValue: (n) => n.severity,
        render: (n) => (
          <Badge variant={n.severity === 'error' ? 'error' : n.severity === 'warning' ? 'warning' : 'default'}>
            {n.severity}
          </Badge>
        ),
      },
      {
        key: 'message',
        header: 'Сообщение',
        searchValue: (n) => n.message,
        render: (n) => <span className={n.read ? 'opacity-60' : ''}>{n.message}</span>,
      },
      {
        key: 'channels',
        header: 'Каналы',
        searchValue: (n) => (n.channels || []).join(', '),
        render: (n) => <span className="text-xs">{(n.channels || []).join(', ')}</span>,
      },
      {
        key: 'date',
        header: 'Дата',
        sortValue: (n) => n.createdAt || '',
        render: (n) => (n.createdAt ? new Date(n.createdAt).toLocaleString('ru') : '—'),
      },
      {
        key: 'actions',
        header: '',
        render: (n) =>
          !n.read ? (
            <button type="button" className="btn-secondary text-xs" onClick={() => markRead(n.id)}>
              Прочитано
            </button>
          ) : null,
      },
    ],
    []
  );

  if (loading && !items) return <Loading />;

  return (
    <div>
      <PageHeader title="Уведомления" subtitle="Telegram и Web Notifications" />
      <DataTable
        columns={columns}
        data={items || []}
        rowKey={(n) => n.id}
        filters={filters}
        searchPlaceholder="Поиск уведомлений…"
      />
    </div>
  );
}

import { useCallback, useMemo, useState } from 'react';
import { getSystemLogs } from '../api/client';
import { PageHeader, Loading } from '../components/UI';
import { DataTable, type DataTableColumn, type DataTableFilter } from '../components/DataTable';
import { usePolling } from '../hooks/usePolling';
import { deriveLogLevel } from '../utils/format';
import type { LogEntry } from '../types';

export function LogsPage() {
  const [apiPage, setApiPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchLogs = useCallback(async () => {
    const params = new URLSearchParams({ page: String(apiPage), limit: '100' });
    return getSystemLogs(params.toString());
  }, [apiPage]);

  const { data: logs, loading } = usePolling(fetchLogs, [apiPage], { intervalMs: 10000 });

  const dateFiltered = useMemo(() => {
    let list = logs || [];
    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      list = list.filter((l) => new Date(l.createdAt).getTime() >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo).getTime() + 86400000;
      list = list.filter((l) => new Date(l.createdAt).getTime() <= to);
    }
    return list;
  }, [logs, dateFrom, dateTo]);

  const filters: DataTableFilter<LogEntry>[] = useMemo(
    () => [
      {
        id: 'level',
        label: 'Уровень',
        options: [
          { value: 'Debug', label: 'Debug' },
          { value: 'Info', label: 'Info' },
          { value: 'Warning', label: 'Warning' },
          { value: 'Error', label: 'Error' },
          { value: 'Critical', label: 'Critical' },
        ],
        match: (l, v) => deriveLogLevel(l) === v,
      },
      {
        id: 'action',
        label: 'Категория',
        options: [
          { value: 'api_call', label: 'API запросы' },
          { value: 'error', label: 'Ошибки' },
          { value: 'webhook_dispatch', label: 'Сетевые' },
          { value: 'cron_run', label: 'Фоновые задачи' },
          { value: 'mcp_call', label: 'Системные' },
          { value: 'login', label: 'Авторизация' },
        ],
        match: (l, v) => l.action === v,
      },
    ],
    []
  );

  const columns: DataTableColumn<LogEntry>[] = useMemo(
    () => [
      {
        key: 'level',
        header: 'Уровень',
        sortValue: (l) => deriveLogLevel(l),
        searchValue: (l) => deriveLogLevel(l),
        render: (l) => deriveLogLevel(l),
      },
      {
        key: 'action',
        header: 'Категория',
        searchValue: (l) => `${l.action} ${l.source || ''}`,
        sortValue: (l) => l.action,
        render: (l) => <span className="font-mono text-xs">{l.action}</span>,
      },
      {
        key: 'message',
        header: 'Сообщение',
        searchValue: (l) => l.message,
        sortValue: (l) => l.message,
        render: (l) => <span className="text-sm">{l.message}</span>,
      },
      {
        key: 'statusCode',
        header: 'Код',
        sortValue: (l) => l.statusCode || 0,
        render: (l) => l.statusCode || '—',
      },
      {
        key: 'ip',
        header: 'IP',
        searchValue: (l) => l.ip || '',
        sortValue: (l) => l.ip || '',
        render: (l) => <span className="font-mono text-xs">{l.ip || '—'}</span>,
      },
      {
        key: 'createdAt',
        header: 'Дата',
        sortValue: (l) => l.createdAt,
        render: (l) => new Date(l.createdAt).toLocaleString('ru'),
      },
    ],
    []
  );

  if (loading && !logs) return <Loading />;

  return (
    <div>
      <PageHeader title="Логирование и диагностика" subtitle="Сортировка, фильтры и поиск по всем полям" />

      <DataTable
        columns={columns}
        data={dateFiltered}
        rowKey={(l) => l.id}
        filters={filters}
        pageSize={25}
        searchPlaceholder="Поиск в логах…"
        toolbar={
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="label !mb-1">С</label>
              <input type="date" className="input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="label !mb-1">По</label>
              <input type="date" className="input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary" disabled={apiPage <= 1} onClick={() => setApiPage((p) => p - 1)}>
                API −
              </button>
              <span className="flex items-center text-sm text-slate-500">API стр. {apiPage}</span>
              <button type="button" className="btn-secondary" onClick={() => setApiPage((p) => p + 1)}>
                API +
              </button>
            </div>
          </div>
        }
      />
    </div>
  );
}

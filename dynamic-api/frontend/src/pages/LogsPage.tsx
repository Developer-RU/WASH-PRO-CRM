import { useEffect, useState, useCallback } from 'react';
import { api } from '../services/api';
import { LogEntry } from '../types';
import { PageHeader, LoadingSpinner, EmptyState, Pagination, SearchInput } from '../components/UI';
import { useDebouncedValue } from '../utils/search';

const ACTION_COLORS: Record<string, string> = {
  login: 'badge-green',
  logout: 'badge-blue',
  error: 'badge-red',
  api_call: 'badge-purple',
  endpoint_create: 'badge-yellow',
  endpoint_update: 'badge-yellow',
  endpoint_delete: 'badge-red',
  user_create: 'badge-blue',
  user_update: 'badge-blue',
  user_delete: 'badge-red',
  webhook_dispatch: 'badge-purple',
  cron_run: 'badge-yellow',
  mcp_call: 'badge-green',
  api_key_used: 'badge-yellow',
};

const FILTER_ACTIONS = [
  '',
  'login',
  'logout',
  'api_call',
  'error',
  'mcp_call',
  'api_key_used',
  'webhook_dispatch',
  'cron_run',
  'endpoint_create',
  'endpoint_update',
  'endpoint_delete',
  'user_create',
  'user_update',
  'user_delete',
];

function displaySource(log: LogEntry): string {
  if (log.source) return log.source;
  if (log.action === 'mcp_call') return 'mcp';
  if (log.action === 'webhook_dispatch' || log.action === 'cron_run') return 'system';
  if (log.userAgent === 'mcp-server') return 'mcp';
  if (log.userAgent === 'cron-scheduler') return 'cron';
  return '—';
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    api.getLogs(page, limit, filter || undefined, debouncedSearch)
      .then((res) => {
        setLogs(res.data);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, limit, filter, debouncedSearch]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => { setPage(1); }, [debouncedSearch]);

  const handleFilter = (action: string) => {
    setFilter(action);
    setPage(1);
  };

  return (
    <div>
      <PageHeader title="Audit Logs" subtitle="System activity, API calls, webhooks, cron, and MCP events" />

      <SearchInput
        className="mb-4"
        value={search}
        onChange={setSearch}
        placeholder="Search by message, action, source or IP..."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTER_ACTIONS.map((action) => (
          <button
            key={action || 'all'}
            onClick={() => handleFilter(action)}
            className={`btn-secondary py-1.5 text-xs ${filter === action ? 'ring-2 ring-brand-500' : ''}`}
          >
            {action || 'All'}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : logs.length === 0 ? (
        <EmptyState message={search ? 'No logs match your search' : 'No logs found'} />
      ) : (
        <div className="card overflow-hidden !p-0">
          <div className="table-container rounded-none border-0">
            <table className="table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Action</th>
                  <th>Source</th>
                  <th>Message</th>
                  <th>User</th>
                  <th>Status</th>
                  <th>Response Time</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id}>
                    <td className="whitespace-nowrap text-xs text-dark-muted">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td>
                      <span className={ACTION_COLORS[log.action] || 'badge-blue'}>
                        {log.action}
                      </span>
                    </td>
                    <td className="text-xs text-dark-muted">{displaySource(log)}</td>
                    <td className="max-w-xs truncate">{log.message}</td>
                    <td className="text-dark-muted">{log.userId?.login || '—'}</td>
                    <td>
                      {log.statusCode && (
                        <span className={log.statusCode < 400 ? 'badge-green' : 'badge-red'}>
                          {log.statusCode}
                        </span>
                      )}
                    </td>
                    <td className="text-xs text-dark-muted">
                      {log.responseTime ? `${log.responseTime}ms` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 pb-4">
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              limit={limit}
              onPageChange={setPage}
              onLimitChange={(l) => { setLimit(l); setPage(1); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

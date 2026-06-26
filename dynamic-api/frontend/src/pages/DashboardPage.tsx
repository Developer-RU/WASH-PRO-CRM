import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  Users, Globe, Activity, AlertTriangle, Clock, Webhook, Key, Bot,
  AlertCircle, ChevronRight,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { api, UnauthorizedError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { DashboardStats } from '../types';
import { StatCard, PageHeader, LoadingSpinner } from '../components/UI';
import { useTheme } from '../context/ThemeContext';
import type { Theme } from '../themes';

const chartThemes: Record<Theme, { grid: string; tick: string; tooltip: Record<string, string | number> }> = {
  dark: {
    grid: '#334155',
    tick: '#94a3b8',
    tooltip: { background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 12, color: '#f1f5f9' },
  },
  light: {
    grid: '#e2e8f0',
    tick: '#64748b',
    tooltip: { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, color: '#0f172a' },
  },
  ocean: {
    grid: '#1e3a5f',
    tick: '#7da8c4',
    tooltip: { background: '#081630', border: '1px solid #1e3a5f', borderRadius: 8, fontSize: 12, color: '#e0f2fe' },
  },
  forest: {
    grid: '#1a3d2e',
    tick: '#86b09a',
    tooltip: { background: '#0a1f16', border: '1px solid #1a3d2e', borderRadius: 8, fontSize: 12, color: '#ecfdf5' },
  },
};

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <h3 className="mb-4 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const chartTheme = chartThemes[theme];
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    api.getDashboardStats()
      .then(setStats)
      .catch((err) => {
        if (err instanceof UnauthorizedError) return;
        console.error(err);
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  if (!user || !api.isAuthenticated) return <Navigate to="/login" replace />;
  if (loading) return <LoadingSpinner />;
  if (!stats) {
    return (
      <div className="py-12 text-center text-dark-muted">
        {loadError ? 'Failed to load dashboard. Please try again.' : 'Failed to load dashboard'}
      </div>
    );
  }

  const requestChartData = stats.requestsOverTime.map((r, i) => ({
    date: r.date.slice(5),
    requests: r.count,
    errors: stats.errorsOverTime[i]?.count || 0,
    logins: stats.loginsOverTime[i]?.count || 0,
  }));

  const webhookChartData = stats.webhooksOverTime.map((r) => ({
    date: r.date.slice(5),
    success: r.success,
    error: r.error,
  }));

  const cronChartData = stats.cronRunsOverTime.map((r) => ({
    date: r.date.slice(5),
    success: r.success,
    error: r.error,
  }));

  const trafficChartData = stats.trafficBySourceOverTime.map((r) => ({
    date: r.date.slice(5),
    direct: r.direct,
    mcp: r.mcp,
    cron: r.cron,
    api_key: r.api_key,
  }));

  const health = stats.automationHealth;
  const hasHealthIssues =
    health.cronErrors.length > 0 ||
    health.webhookErrors.length > 0 ||
    health.unusedApiKeys.length > 0;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="System overview — last 7 days for requests, errors, and charts" />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Users" value={stats.users} icon={Users} color="#0891b2" subtitle={`${stats.activeUsers} active (7d)`} />
        <StatCard title="Endpoints" value={stats.endpoints} icon={Globe} color="#0e7490" />
        <StatCard title="Requests" value={stats.requests} icon={Activity} color="#10b981" subtitle="last 7 days" />
        <StatCard title="Errors" value={stats.errors} icon={AlertTriangle} color="#ef4444" subtitle="last 7 days" />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Cron Jobs" value={stats.cronJobs} icon={Clock} color="#8b5cf6" subtitle={`${stats.cronJobsEnabled} enabled`} />
        <StatCard title="Webhooks" value={stats.webhooks} icon={Webhook} color="#ec4899" subtitle={`${stats.webhooksEnabled} enabled`} />
        <StatCard title="API Keys" value={stats.apiKeys} icon={Key} color="#f59e0b" subtitle="active keys" />
        <StatCard title="MCP Tools" value={stats.mcpTools} icon={Bot} color="#06b6d4" subtitle="enabled endpoints" />
      </div>

      {hasHealthIssues && (
        <div className="card mb-6 border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
            <AlertCircle className="h-4 w-4" />
            Automation health
          </div>
          <div className="space-y-3 text-sm">
            {health.cronErrors.length > 0 && (
              <div>
                <div className="mb-1 font-medium text-slate-700 dark:text-slate-200">Cron failures</div>
                <ul className="space-y-1">
                  {health.cronErrors.map((job) => (
                    <li key={job.id}>
                      <Link to="/cron" className="text-brand-600 hover:underline dark:text-brand-300">
                        {job.name}
                      </Link>
                      {job.message && <span className="text-slate-500"> — {job.message}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {health.webhookErrors.length > 0 && (
              <div>
                <div className="mb-1 font-medium text-slate-700 dark:text-slate-200">Webhook delivery errors</div>
                <ul className="space-y-1">
                  {health.webhookErrors.map((hook) => (
                    <li key={hook.id}>
                      <Link to="/webhooks" className="text-brand-600 hover:underline dark:text-brand-300">
                        {hook.name}
                      </Link>
                      <span className="text-slate-500"> — {hook.url}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {health.unusedApiKeys.length > 0 && (
              <div>
                <div className="mb-1 font-medium text-slate-700 dark:text-slate-200">Unused API keys</div>
                <ul className="space-y-1">
                  {health.unusedApiKeys.map((key) => (
                    <li key={key.id}>
                      <Link to="/api-keys" className="text-brand-600 hover:underline dark:text-brand-300">
                        {key.name}
                      </Link>
                      <span className="text-slate-500"> — {key.keyPrefix}…</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <Link to="/mcp" className="mt-3 inline-flex items-center gap-1 text-xs text-brand-600 hover:underline dark:text-brand-300">
            Open MCP Server <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Requests Over Time">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={requestChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
              <XAxis dataKey="date" tick={{ fill: chartTheme.tick, fontSize: 11 }} />
              <YAxis tick={{ fill: chartTheme.tick, fontSize: 11 }} />
              <Tooltip contentStyle={chartTheme.tooltip} />
              <Area type="monotone" dataKey="requests" stroke="#0891b2" fill="#0891b220" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Errors Over Time">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={requestChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
              <XAxis dataKey="date" tick={{ fill: chartTheme.tick, fontSize: 11 }} />
              <YAxis tick={{ fill: chartTheme.tick, fontSize: 11 }} />
              <Tooltip contentStyle={chartTheme.tooltip} />
              <Area type="monotone" dataKey="errors" stroke="#ef4444" fill="#ef444420" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Logins">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={requestChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
              <XAxis dataKey="date" tick={{ fill: chartTheme.tick, fontSize: 11 }} />
              <YAxis tick={{ fill: chartTheme.tick, fontSize: 11 }} />
              <Tooltip contentStyle={chartTheme.tooltip} />
              <Area type="monotone" dataKey="logins" stroke="#0e7490" fill="#0e749020" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="API Traffic by Source">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trafficChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
              <XAxis dataKey="date" tick={{ fill: chartTheme.tick, fontSize: 11 }} />
              <YAxis tick={{ fill: chartTheme.tick, fontSize: 11 }} />
              <Tooltip contentStyle={chartTheme.tooltip} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="direct" stackId="1" stroke="#0891b2" fill="#0891b2" fillOpacity={0.5} />
              <Area type="monotone" dataKey="mcp" stackId="1" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.5} />
              <Area type="monotone" dataKey="cron" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.5} />
              <Area type="monotone" dataKey="api_key" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.5} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Webhook Deliveries">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={webhookChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
              <XAxis dataKey="date" tick={{ fill: chartTheme.tick, fontSize: 11 }} />
              <YAxis tick={{ fill: chartTheme.tick, fontSize: 11 }} />
              <Tooltip contentStyle={chartTheme.tooltip} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="success" stroke="#10b981" fill="#10b98140" />
              <Area type="monotone" dataKey="error" stroke="#ef4444" fill="#ef444440" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Cron Runs">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={cronChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
              <XAxis dataKey="date" tick={{ fill: chartTheme.tick, fontSize: 11 }} />
              <YAxis tick={{ fill: chartTheme.tick, fontSize: 11 }} />
              <Tooltip contentStyle={chartTheme.tooltip} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="success" stroke="#10b981" fill="#10b98140" />
              <Area type="monotone" dataKey="error" stroke="#ef4444" fill="#ef444440" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="card p-4 text-sm text-slate-600 dark:text-slate-400">
        <span className="font-medium text-slate-800 dark:text-slate-200">Traffic summary (7d):</span>{' '}
        direct {stats.trafficBySource.direct} · MCP {stats.trafficBySource.mcp} · cron {stats.trafficBySource.cron} · API keys {stats.trafficBySource.api_key}
      </div>
    </div>
  );
}

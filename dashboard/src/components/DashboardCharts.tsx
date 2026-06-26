import { useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { useTheme } from '../context/ThemeContext';
import { categoryLabel } from './UI';
import { formatMoney, type CurrencyConfig } from '../utils/format';
import type { FinanceStat, Post, UsageStat } from '../types';

const CATEGORY_COLORS = ['#14b8a6', '#3b82f6', '#8b5cf6'];

interface DashboardChartsProps {
  posts: Post[];
  usageStats: UsageStat[];
  financeStats: FinanceStat[];
  currency: CurrencyConfig;
  online: number;
  offline: number;
  errorCount: number;
}

function ChartCard({ title, children, empty }: { title: string; children: React.ReactNode; empty?: boolean }) {
  return (
    <div className="card">
      <h2 className="mb-4 font-semibold">{title}</h2>
      {empty ? (
        <p className="flex h-56 items-center justify-center text-sm text-slate-500">Нет данных для графика</p>
      ) : (
        <div className="h-56">{children}</div>
      )}
    </div>
  );
}

export function DashboardCharts({
  posts,
  usageStats,
  financeStats,
  currency,
  online,
  offline,
  errorCount,
}: DashboardChartsProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const gridColor = isDark ? '#334155' : '#e2e8f0';
  const axisColor = isDark ? '#94a3b8' : '#64748b';
  const tooltipStyle = {
    backgroundColor: isDark ? '#0f172a' : '#fff',
    border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
    borderRadius: '8px',
    fontSize: '12px',
  };

  const postStatusCards = [
    { label: 'Постов онлайн', value: online, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
    { label: 'Постов офлайн', value: offline, color: 'text-slate-600', bg: 'bg-slate-50 dark:bg-slate-800/50' },
    { label: 'Постов в ошибке', value: errorCount, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/40' },
  ];

  const usageByCategory = useMemo(() => {
    const cats = ['regular', 'service', 'unlimited'] as const;
    return cats.map((category, i) => {
      const usageTime = usageStats
        .filter((s) => s.category === category)
        .reduce((sum, s) => sum + (s.usageTime || 0), 0);
      return {
        name: categoryLabel[category],
        value: usageTime,
        fill: CATEGORY_COLORS[i],
      };
    }).filter((x) => x.value > 0);
  }, [usageStats]);

  const revenueTimeline = useMemo(() => {
    const byDate: Record<string, number> = {};
    financeStats.forEach((s) => {
      const key = s.recordedAt
        ? new Date(s.recordedAt).toLocaleDateString('ru', { day: '2-digit', month: 'short' })
        : 'Текущий';
      byDate[key] = (byDate[key] || 0) + (s.totalRevenue || 0);
    });
    return Object.entries(byDate).map(([name, revenue]) => ({ name, revenue: Math.round(revenue) }));
  }, [financeStats]);

  return (
    <div className="mb-6 space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {postStatusCards.map((c) => (
          <div key={c.label} className={`card ${c.bg}`}>
            <div className="text-sm text-slate-500">{c.label}</div>
            <div className={`mt-1 text-3xl font-bold ${c.color}`}>{c.value}</div>
            <div className="mt-1 text-xs text-slate-400">из {posts.length} постов</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Использование по категориям клиентов" empty={usageByCategory.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={usageByCategory}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {usageByCategory.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} сек`, 'Время']} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Выручка" empty={revenueTimeline.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={revenueTimeline} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="name" tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} width={56} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number) => [formatMoney(value, currency), 'Выручка']}
              />
              <Line type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

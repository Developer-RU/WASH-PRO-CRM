import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Columns3,
  Activity,
  CreditCard,
  BarChart3,
  Wallet,
  Archive,
  HardDrive,
  Bot,
  Bell,
  Coins,
  Tags,
  FileText,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  BookOpen,
  Github,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LiveModeProvider } from '../context/LiveModeContext';
import { LiveModeIndicator } from './LiveModeIndicator';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  admin?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: 'Главное',
    items: [{ to: '/', label: 'Обзор', icon: LayoutDashboard }],
  },
  {
    title: 'Объекты',
    items: [
      { to: '/washes', label: 'Автомойки самообслуживания', icon: Building2 },
      { to: '/posts', label: 'Посты', icon: Columns3 },
      { to: '/states', label: 'Текущее состояние', icon: Activity },
    ],
  },
  {
    title: 'Карты',
    items: [
      { to: '/cards/discount', label: 'Скидочные', icon: CreditCard },
      { to: '/cards/service', label: 'Сервисные', icon: CreditCard },
      { to: '/cards/vip', label: 'VIP', icon: CreditCard },
    ],
  },
  {
    title: 'Аналитика',
    items: [
      { to: '/usage', label: 'Статистика использования', icon: BarChart3 },
      { to: '/finance', label: 'Финансовая статистика', icon: Wallet },
      { to: '/archive', label: 'Архивирование', icon: Archive },
    ],
  },
  {
    title: 'Система',
    items: [
      { to: '/notifications', label: 'Уведомления', icon: Bell },
      { to: '/backups', label: 'Резервные копии', icon: HardDrive, admin: true },
      { to: '/telegram', label: 'Telegram', icon: Bot, admin: true },
      { to: '/currency', label: 'Валюты', icon: Coins, admin: true },
      { to: '/discount-types', label: 'Типы скидок', icon: Tags, admin: true },
      { to: '/logs', label: 'Логи', icon: FileText, admin: true },
    ],
  },
];

const resourceLinks = [
  { href: 'https://developer-ru.github.io/WASH-PRO-CRM/', label: 'Документация', icon: BookOpen },
  { href: 'https://github.com/Developer-RU/WASH-PRO-CRM', label: 'WASH-PRO-CRM', icon: Github },
] as const;

export function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const filteredGroups = useMemo(
    () =>
      navGroups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => !item.admin || isAdmin),
        }))
        .filter((group) => group.items.length > 0),
    [isAdmin]
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-40 flex h-full w-64 flex-col border-r border-slate-200 bg-white transition-transform dark:border-slate-800 dark:bg-slate-900',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex h-16 shrink-0 items-center gap-2 border-b border-slate-200 px-5 dark:border-slate-800">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white font-bold">W</div>
          <div>
            <div className="font-semibold">WASH PRO CRM</div>
            <div className="text-xs text-slate-500">SCADA система</div>
          </div>
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto p-3">
          {filteredGroups.map((group) => (
            <div key={group.title} className="mb-4 last:mb-0">
              <div className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {group.title}
              </div>
              <div className="space-y-0.5">
                {group.items.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      clsx(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                        isActive
                          ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                      )
                    }
                  >
                    <Icon size={18} />
                    {label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-slate-200 p-3 dark:border-slate-800">
          <div className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Resources
          </div>
          <div className="space-y-0.5">
            {resourceLinks.map(({ href, label, icon: Icon }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <Icon size={18} />
                {label}
              </a>
            ))}
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:ml-64">
        <LiveModeProvider>
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900 lg:px-6">
            <button className="lg:hidden" onClick={() => setMobileOpen((v) => !v)}>
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <div className="flex items-center gap-3">
              <LiveModeIndicator />
              <div className="text-sm text-slate-500">
                {user?.name || user?.login}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={toggleTheme} className="btn-secondary !px-2" title="Тема">
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button onClick={() => logout()} className="btn-secondary !px-2" title="Выход">
                <LogOut size={18} />
              </button>
            </div>
          </header>
          <main className="min-h-0 flex-1 overflow-auto p-4 lg:p-6">
            <Outlet />
          </main>
        </LiveModeProvider>
      </div>
    </div>
  );
}

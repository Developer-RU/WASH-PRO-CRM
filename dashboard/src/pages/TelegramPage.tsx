import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { api, apiList } from '../api/client';
import { PageHeader, Loading } from '../components/UI';
import { LIVE_INTERVAL_SLOW_MS } from '../constants/live';
import { usePolling } from '../hooks/usePolling';
import type { CrmSetting } from '../types';

const ALL_COMMANDS = ['/status', '/washes', '/posts', '/revenue', '/statistics', '/cards'];

interface TelegramSettings {
  token: string;
  adminIds: string;
  commands: string[];
  enabled: boolean;
  settingId: string | null;
}

function parseTelegramSettings(settings: CrmSetting[]): TelegramSettings {
  const tg = settings.find((s) => s.key === 'telegram');
  if (!tg) {
    return { token: '', adminIds: '', commands: ALL_COMMANDS, enabled: false, settingId: null };
  }
  const v = tg.value as {
    token?: string;
    adminIds?: number[];
    allowedCommands?: string[];
    enabled?: boolean;
  };
  return {
    token: v.token || '',
    adminIds: (v.adminIds || []).join(', '),
    commands: v.allowedCommands || ALL_COMMANDS,
    enabled: v.enabled ?? false,
    settingId: tg.id,
  };
}

export function TelegramPage() {
  const [token, setToken] = useState('');
  const [adminIds, setAdminIds] = useState('');
  const [commands, setCommands] = useState<string[]>(ALL_COMMANDS);
  const [enabled, setEnabled] = useState(false);
  const [settingId, setSettingId] = useState<string | null>(null);
  const formInitialized = useRef(false);

  const fetchData = useCallback(async () => {
    const settings = await apiList<CrmSetting>('/crm/settings');
    return parseTelegramSettings(settings);
  }, []);

  const { data, loading } = usePolling(fetchData, [], { intervalMs: LIVE_INTERVAL_SLOW_MS });

  useEffect(() => {
    if (!data || formInitialized.current) return;
    setToken(data.token);
    setAdminIds(data.adminIds);
    setCommands(data.commands);
    setEnabled(data.enabled);
    setSettingId(data.settingId);
    formInitialized.current = true;
  }, [data]);

  const toggleCommand = (cmd: string) => {
    setCommands((prev) => (prev.includes(cmd) ? prev.filter((c) => c !== cmd) : [...prev, cmd]));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!settingId) return;
    await api(`/crm/settings/${settingId}`, {
      method: 'PUT',
      body: JSON.stringify({
        key: 'telegram',
        value: {
          token,
          adminIds: adminIds.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n)),
          allowedCommands: commands,
          enabled,
        },
      }),
    });
    alert('Настройки Telegram сохранены');
    formInitialized.current = false;
  };

  if (loading && !data) return <Loading />;

  return (
    <div>
      <PageHeader title="Telegram Bot" subtitle="Настройка бота уведомлений и команд" />
      <form onSubmit={handleSubmit} className="card max-w-lg space-y-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Бот включён
        </label>
        <div>
          <label className="label">Token</label>
          <input className="input font-mono text-xs" value={token} onChange={(e) => setToken(e.target.value)} placeholder="123456:ABC..." />
        </div>
        <div>
          <label className="label">ID администраторов (через запятую)</label>
          <input className="input" value={adminIds} onChange={(e) => setAdminIds(e.target.value)} placeholder="123456789, 987654321" />
        </div>
        <div>
          <label className="label mb-2">Разрешённые команды</label>
          <div className="flex flex-wrap gap-2">
            {ALL_COMMANDS.map((cmd) => (
              <label key={cmd} className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-700">
                <input type="checkbox" checked={commands.includes(cmd)} onChange={() => toggleCommand(cmd)} />
                {cmd}
              </label>
            ))}
          </div>
        </div>
        <button type="submit" className="btn-primary" disabled={!settingId}>Сохранить</button>
      </form>
    </div>
  );
}

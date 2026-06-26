import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api, apiList } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { PageHeader, Loading } from '../components/UI';
import { DataTable, type DataTableColumn, type DataTableFilter } from '../components/DataTable';
import type { ArchiveLog, CrmSetting, ArchiveGroupSettings, ArchiveSettings } from '../types';

const RETENTION_OPTIONS = [30, 90, 180, 365];

const ARCHIVE_GROUPS: { key: keyof Pick<ArchiveSettings, 'cards' | 'postStates' | 'usageStats' | 'financeStats'>; label: string }[] = [
  { key: 'cards', label: 'Архив карт' },
  { key: 'postStates', label: 'Архив состояний постов' },
  { key: 'usageStats', label: 'Архив статистики использования' },
  { key: 'financeStats', label: 'Архив финансовой статистики' },
];

const defaultGroup = (): ArchiveGroupSettings => ({
  enabled: true,
  autoRun: false,
  saveArchive: true,
  deleteAfter: false,
  retentionDays: 90,
  policy: 'standard',
});

function normalizeArchiveSettings(raw: Record<string, unknown>): ArchiveSettings {
  const base: ArchiveSettings = {
    retentionDays: (raw.retentionDays as number) ?? 90,
    autoArchive: (raw.autoArchive as boolean) ?? true,
    autoDelete: (raw.autoDelete as boolean) ?? false,
  };
  for (const g of ARCHIVE_GROUPS) {
    const existing = raw[g.key] as ArchiveGroupSettings | undefined;
    base[g.key] = existing ? { ...defaultGroup(), ...existing } : defaultGroup();
  }
  return base;
}

export function ArchivePage() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('update', 'delete');
  const [logs, setLogs] = useState<ArchiveLog[]>([]);
  const [setting, setSetting] = useState<ArchiveSettings>(normalizeArchiveSettings({}));
  const [settingId, setSettingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [l, settings] = await Promise.all([
      apiList<ArchiveLog>('/crm/archive-logs'),
      apiList<CrmSetting>('/crm/settings'),
    ]);
    setLogs(l);
    const archive = settings.find((s) => s.key === 'archive');
    if (archive) {
      setSettingId(archive.id);
      setSetting(normalizeArchiveSettings(archive.value as Record<string, unknown>));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const savePolicy = async (e: FormEvent) => {
    e.preventDefault();
    if (!settingId) return;
    await api(`/crm/settings/${settingId}`, {
      method: 'PUT',
      body: JSON.stringify({ key: 'archive', value: setting }),
    });
    setMessage('Настройки архивирования сохранены');
  };

  const runArchive = async (groupKey: string) => {
    await api('/crm/archive-logs', {
      method: 'POST',
      body: JSON.stringify({
        action: 'archive',
        recordsAffected: 0,
        policyDays: setting[groupKey as keyof ArchiveSettings] as number || setting.retentionDays,
        createdAt: new Date().toISOString(),
        details: { manual: true, group: groupKey },
      }),
    });
    setMessage(`Запрос на архивирование (${groupKey}) отправлен`);
    load();
  };

  const updateGroup = (key: keyof ArchiveSettings, patch: Partial<ArchiveGroupSettings>) => {
    setSetting((prev) => ({
      ...prev,
      [key]: { ...(prev[key] as ArchiveGroupSettings), ...patch },
    }));
  };

  const logFilters: DataTableFilter<ArchiveLog>[] = [
    {
      id: 'action',
      label: 'Действие',
      options: [
        { value: 'archive', label: 'archive' },
        { value: 'delete', label: 'delete' },
        { value: 'transfer', label: 'transfer' },
      ],
      match: (l, v) => l.action === v,
    },
  ];

  const logColumns: DataTableColumn<ArchiveLog>[] = [
    {
      key: 'action',
      header: 'Действие',
      sortable: true,
      searchValue: (l) => l.action,
      sortValue: (l) => l.action,
      render: (l) => l.action,
    },
    {
      key: 'group',
      header: 'Группа',
      render: (l) => (l.details?.group as string) || '—',
    },
    {
      key: 'records',
      header: 'Записей',
      sortable: true,
      sortValue: (l) => l.recordsAffected,
      render: (l) => l.recordsAffected,
    },
    {
      key: 'policy',
      header: 'Срок хранения',
      render: (l) => `${l.policyDays} дней`,
    },
    {
      key: 'date',
      header: 'Дата',
      sortable: true,
      sortValue: (l) => l.createdAt || '',
      render: (l) => (l.createdAt ? new Date(l.createdAt).toLocaleString('ru') : '—'),
    },
  ];

  if (loading) return <Loading />;

  return (
    <div>
      <PageHeader title="Архивирование" subtitle="Аналитика → Архивирование" />
      {message && <p className="mb-4 text-sm text-emerald-600">{message}</p>}

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        {ARCHIVE_GROUPS.map(({ key, label }) => {
          const group = setting[key] as ArchiveGroupSettings;
          return (
            <form key={key} onSubmit={savePolicy} className="card space-y-3">
              <h2 className="font-semibold">{label}</h2>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={group.enabled}
                  onChange={(e) => updateGroup(key, { enabled: e.target.checked })}
                  disabled={!canEdit}
                />
                Включение архивирования
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={group.autoRun}
                  onChange={(e) => updateGroup(key, { autoRun: e.target.checked })}
                  disabled={!canEdit}
                />
                Автозапуск архивирования
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={group.saveArchive}
                  onChange={(e) => updateGroup(key, { saveArchive: e.target.checked })}
                  disabled={!canEdit}
                />
                Сохранение архива
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={group.deleteAfter}
                  onChange={(e) => updateGroup(key, { deleteAfter: e.target.checked })}
                  disabled={!canEdit}
                />
                Удаление исходных данных после архивирования
              </label>
              <div>
                <label className="label">Срок хранения данных</label>
                <select
                  className="input"
                  value={group.retentionDays}
                  onChange={(e) => updateGroup(key, { retentionDays: Number(e.target.value) })}
                  disabled={!canEdit}
                >
                  {RETENTION_OPTIONS.map((d) => (
                    <option key={d} value={d}>{d} дней</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Политика хранения</label>
                <select
                  className="input"
                  value={group.policy}
                  onChange={(e) => updateGroup(key, { policy: e.target.value })}
                  disabled={!canEdit}
                >
                  <option value="standard">Стандартная</option>
                  <option value="compressed">Сжатие</option>
                  <option value="cold">Холодное хранение</option>
                </select>
              </div>
              {canEdit && (
                <div className="flex gap-2 pt-1">
                  <button type="submit" className="btn-primary">Сохранить</button>
                  <button type="button" className="btn-secondary" onClick={() => runArchive(key)}>
                    Запустить
                  </button>
                </div>
              )}
            </form>
          );
        })}
      </div>

      <h2 className="mb-3 font-semibold">Журнал архивирования</h2>
      <DataTable columns={logColumns} data={logs} rowKey={(l) => l.id} filters={logFilters} searchPlaceholder="Поиск в журнале…" />
    </div>
  );
}

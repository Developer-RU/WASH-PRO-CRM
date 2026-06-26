import { FormEvent, useCallback, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { api, apiList } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { usePolling } from '../hooks/usePolling';
import { PageHeader, Loading, Modal, Badge, statusLabel } from '../components/UI';
import { DataTable, type DataTableColumn, type DataTableFilter } from '../components/DataTable';
import type { Post, Wash } from '../types';

export function PostsPage() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('create', 'update');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ washId: '', postNumber: 1, name: '', serialNumber: '', status: 'offline' as Post['status'] });

  const fetchData = useCallback(async () => {
    const [posts, washes] = await Promise.all([apiList<Post>('/crm/posts'), apiList<Wash>('/crm/washes')]);
    return { posts, washes };
  }, []);

  const { data, loading, refresh } = usePolling(fetchData, [], { intervalMs: 10000 });

  const washName = useCallback(
    (id: string) => data?.washes.find((w) => w.id === id)?.name || id.slice(-6),
    [data?.washes]
  );

  const filters: DataTableFilter<Post>[] = useMemo(() => {
    const washOptions = (data?.washes || []).map((w) => ({ value: w.id, label: w.name }));
    return [
      {
        id: 'status',
        label: 'Статус',
        options: [
          { value: 'online', label: 'Онлайн' },
          { value: 'offline', label: 'Офлайн' },
          { value: 'error', label: 'Ошибка' },
          { value: 'maintenance', label: 'Обслуживание' },
        ],
        match: (p, v) => p.status === v,
      },
      {
        id: 'washId',
        label: 'Объект',
        options: washOptions,
        match: (p, v) => p.washId === v,
      },
    ];
  }, [data?.washes]);

  const columns: DataTableColumn<Post>[] = useMemo(
    () => [
      {
        key: 'postNumber',
        header: 'Номер поста',
        sortValue: (p) => p.postNumber,
        searchValue: (p) => `${p.postNumber} ${p.name} ${p.serialNumber}`,
        render: (p) => <span className="font-mono">{p.postNumber}</span>,
      },
      {
        key: 'wash',
        header: 'Объект',
        sortValue: (p) => washName(p.washId),
        searchValue: (p) => washName(p.washId),
        render: (p) => washName(p.washId),
      },
      {
        key: 'name',
        header: 'Название',
        searchValue: (p) => p.name,
        sortValue: (p) => p.name,
        render: (p) => p.name,
      },
      {
        key: 'serialNumber',
        header: 'Серийный номер',
        sortValue: (p) => p.serialNumber,
        searchValue: (p) => p.serialNumber,
        render: (p) => <span className="font-mono text-xs">{p.serialNumber}</span>,
      },
      {
        key: 'status',
        header: 'Статус',
        sortValue: (p) => p.status,
        searchValue: (p) => p.status,
        render: (p) => (
          <Badge variant={p.status === 'online' ? 'success' : p.status === 'error' ? 'error' : 'warning'}>
            {statusLabel[p.status] || p.status}
          </Badge>
        ),
      },
    ],
    [washName]
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await api('/crm/posts', {
      method: 'POST',
      body: JSON.stringify({ ...form, postNumber: Number(form.postNumber), settings: {} }),
    });
    setModal(false);
    refresh();
  };

  if (loading && !data) return <Loading />;

  return (
    <div>
      <PageHeader
        title="Посты"
        subtitle="Посты объектов самообслуживания"
        actions={canEdit && <button type="button" className="btn-primary" onClick={() => setModal(true)}><Plus size={16} /> Добавить</button>}
      />
      <DataTable columns={columns} data={data?.posts || []} rowKey={(p) => p.id} filters={filters} searchPlaceholder="Поиск постов…" />

      <Modal open={modal} onClose={() => setModal(false)} title="Новый пост">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="label">Объект</label>
            <select className="input" value={form.washId} onChange={(e) => setForm({ ...form, washId: e.target.value })} required>
              <option value="">Выберите...</option>
              {(data?.washes || []).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div><label className="label">Номер поста</label><input className="input" type="number" min={1} value={form.postNumber} onChange={(e) => setForm({ ...form, postNumber: Number(e.target.value) })} required /></div>
          <div><label className="label">Название</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div><label className="label">Серийный номер</label><input className="input" value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} required /></div>
          <button type="submit" className="btn-primary w-full">Создать</button>
        </form>
      </Modal>
    </div>
  );
}

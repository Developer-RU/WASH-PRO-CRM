import { FormEvent, useCallback, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { api, apiList } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { usePolling } from '../hooks/usePolling';
import { PageHeader, Loading, Modal, ErrorMessage } from '../components/UI';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import type { Wash, Post } from '../types';

const emptyForm = { name: '', description: '', address: '', registeredAt: undefined as string | undefined, cloudEnabled: false };

export function WashesPage() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('create', 'update', 'delete');
  const [error, setError] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const [washes, posts] = await Promise.all([
      apiList<Wash>('/crm/washes'),
      apiList<Post>('/crm/posts'),
    ]);
    return { washes, posts };
  }, []);

  const { data, loading, refresh } = usePolling(fetchData, [], { intervalMs: 15000 });

  const postCountByWash = useMemo(() => {
    const map: Record<string, number> = {};
    data?.posts.forEach((p) => {
      map[p.washId] = (map[p.washId] || 0) + 1;
    });
    return map;
  }, [data?.posts]);

  const openCreate = () => {
    setForm(emptyForm);
    setEditId(null);
    setModal(true);
  };

  const openEdit = (w: Wash) => {
    setForm({
      name: w.name,
      description: w.description || '',
      address: w.address,
      registeredAt: w.registeredAt,
      cloudEnabled: w.cloudEnabled ?? false,
    });
    setEditId(w.id);
    setModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить объект?')) return;
    try {
      await api(`/crm/washes/${id}`, { method: 'DELETE' });
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления');
    }
  };

  const columns: DataTableColumn<Wash>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Название объекта',
        sortable: true,
        searchValue: (w) => `${w.name} ${w.description || ''}`,
        sortValue: (w) => w.name,
        render: (w) => (
          <div>
            <div className="font-medium">{w.name}</div>
            {w.description && <div className="text-xs text-slate-500">{w.description}</div>}
          </div>
        ),
      },
      {
        key: 'address',
        header: 'Адрес',
        sortable: true,
        searchValue: (w) => w.address,
        sortValue: (w) => w.address,
        render: (w) => w.address,
      },
      {
        key: 'registeredAt',
        header: 'Дата регистрации',
        sortable: true,
        sortValue: (w) => w.registeredAt || '',
        render: (w) => (w.registeredAt ? new Date(w.registeredAt).toLocaleDateString('ru') : '—'),
      },
      {
        key: 'posts',
        header: 'Количество постов',
        sortable: true,
        sortValue: (w) => postCountByWash[w.id] || 0,
        render: (w) => postCountByWash[w.id] || 0,
      },
      ...(canEdit
        ? [
            {
              key: 'actions',
              header: '',
              render: (w: Wash) => (
                <div className="text-right">
                  <button type="button" className="btn-secondary mr-2" onClick={() => openEdit(w)}>
                    Изменить
                  </button>
                  <button type="button" className="btn-secondary text-red-600" onClick={() => handleDelete(w.id)}>
                    Удалить
                  </button>
                </div>
              ),
            } as DataTableColumn<Wash>,
          ]
        : []),
    ],
    [canEdit, postCountByWash]
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const body = editId
        ? {
            name: form.name,
            description: form.description,
            address: form.address,
            registeredAt: form.registeredAt || new Date().toISOString(),
            cloudEnabled: form.cloudEnabled ?? false,
          }
        : { ...form, registeredAt: new Date().toISOString(), cloudEnabled: false };
      if (editId) {
        await api(`/crm/washes/${editId}`, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        await api('/crm/washes', { method: 'POST', body: JSON.stringify(body) });
      }
      setModal(false);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения');
    }
  };

  if (loading && !data) return <Loading />;

  return (
    <div>
      <PageHeader
        title="Объекты"
        subtitle="Управление объектами самообслуживания"
        actions={canEdit && <button className="btn-primary" onClick={openCreate}><Plus size={16} /> Добавить</button>}
      />
      {error && <div className="mb-4"><ErrorMessage message={error} /></div>}
      <DataTable
        columns={columns}
        data={data?.washes || []}
        rowKey={(w) => w.id}
        searchPlaceholder="Поиск объектов…"
      />

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Редактировать объект' : 'Новый объект'}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div><label className="label">Название</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div><label className="label">Описание</label><input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div><label className="label">Адрес</label><input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required /></div>
          <button type="submit" className="btn-primary w-full">Сохранить</button>
        </form>
      </Modal>
    </div>
  );
}

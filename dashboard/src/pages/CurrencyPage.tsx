import { FormEvent, useCallback, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { api, apiList } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { usePolling } from '../hooks/usePolling';
import { PageHeader, Loading, Modal, Badge } from '../components/UI';
import { DataTable, type DataTableColumn, type DataTableFilter } from '../components/DataTable';
import type { Currency } from '../types';

const emptyForm = { code: '', name: '', symbol: '', isDefault: false };

export function CurrencyPage() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('create', 'update', 'delete');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);

  const fetchCurrencies = useCallback(() => apiList<Currency>('/crm/currencies'), []);
  const { data: currencies, loading, refresh } = usePolling(fetchCurrencies, [], { intervalMs: 15000 });

  const openCreate = () => {
    setForm(emptyForm);
    setEditId(null);
    setModal(true);
  };

  const openEdit = (c: Currency) => {
    setForm({ code: c.code, name: c.name, symbol: c.symbol, isDefault: c.isDefault });
    setEditId(c.id);
    setModal(true);
  };

  const setAsDefault = async (c: Currency) => {
    const list = currencies || [];
    for (const item of list) {
      if (item.isDefault && item.id !== c.id) {
        await api(`/crm/currencies/${item.id}`, {
          method: 'PUT',
          body: JSON.stringify({ ...item, isDefault: false }),
        });
      }
    }
    await api(`/crm/currencies/${c.id}`, {
      method: 'PUT',
      body: JSON.stringify({ code: c.code, name: c.name, symbol: c.symbol, isDefault: true }),
    });
    refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить валюту?')) return;
    await api(`/crm/currencies/${id}`, { method: 'DELETE' });
    refresh();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const body = { ...form, code: form.code.toUpperCase() };
    if (editId) {
      await api(`/crm/currencies/${editId}`, { method: 'PUT', body: JSON.stringify(body) });
      if (body.isDefault) {
        const list = currencies || [];
        for (const item of list) {
          if (item.isDefault && item.id !== editId) {
            await api(`/crm/currencies/${item.id}`, {
              method: 'PUT',
              body: JSON.stringify({ ...item, isDefault: false }),
            });
          }
        }
      }
    } else {
      await api('/crm/currencies', { method: 'POST', body: JSON.stringify(body) });
    }
    setModal(false);
    refresh();
  };

  const filters: DataTableFilter<Currency>[] = [
    {
      id: 'isDefault',
      label: 'По умолчанию',
      options: [{ value: 'yes', label: 'Активная' }],
      match: (c, v) => v === 'yes' && c.isDefault,
    },
  ];

  const columns: DataTableColumn<Currency>[] = useMemo(
    () => [
      {
        key: 'code',
        header: 'Код',
        sortable: true,
        searchValue: (c) => `${c.code} ${c.name} ${c.symbol}`,
        sortValue: (c) => c.code,
        render: (c) => <span className="font-mono font-medium">{c.code}</span>,
      },
      {
        key: 'name',
        header: 'Название',
        sortable: true,
        sortValue: (c) => c.name,
        render: (c) => c.name,
      },
      {
        key: 'symbol',
        header: 'Символ',
        sortable: true,
        sortValue: (c) => c.symbol,
        render: (c) => <span className="text-lg">{c.symbol}</span>,
      },
      {
        key: 'isDefault',
        header: 'По умолчанию',
        sortable: true,
        sortValue: (c) => (c.isDefault ? 1 : 0),
        render: (c) =>
          c.isDefault ? (
            <Badge variant="success">Активна</Badge>
          ) : canEdit ? (
            <button type="button" className="btn-secondary !py-1 !px-2 text-xs" onClick={() => setAsDefault(c)}>
              Сделать активной
            </button>
          ) : (
            '—'
          ),
      },
      ...(canEdit
        ? [
            {
              key: 'actions',
              header: '',
              render: (c: Currency) => (
                <div className="text-right">
                  <button type="button" className="btn-secondary mr-2" onClick={() => openEdit(c)}>
                    Изменить
                  </button>
                  {!c.isDefault && (
                    <button type="button" className="btn-secondary text-red-600" onClick={() => handleDelete(c.id)}>
                      Удалить
                    </button>
                  )}
                </div>
              ),
            } as DataTableColumn<Currency>,
          ]
        : []),
    ],
    [canEdit, currencies]
  );

  if (loading && !currencies) return <Loading />;

  return (
    <div>
      <PageHeader
        title="Валюты"
        subtitle="Справочник валют — название и символ хранятся в /api/crm/currencies"
        actions={canEdit && <button type="button" className="btn-primary" onClick={openCreate}><Plus size={16} /> Добавить</button>}
      />
      <DataTable columns={columns} data={currencies || []} rowKey={(c) => c.id} filters={filters} searchPlaceholder="Поиск валют…" />

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Редактировать валюту' : 'Новая валюта'}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="label">Код ISO</label>
            <input className="input font-mono" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required maxLength={3} placeholder="RUB" />
          </div>
          <div>
            <label className="label">Название валюты</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Российский рубль" />
          </div>
          <div>
            <label className="label">Символ</label>
            <input className="input" value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} required placeholder="₽" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />
            Использовать по умолчанию в интерфейсе
          </label>
          <button type="submit" className="btn-primary w-full">Сохранить</button>
        </form>
      </Modal>
    </div>
  );
}

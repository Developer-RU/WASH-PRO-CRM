import { FormEvent, useCallback, useMemo, useState } from 'react';
import { api, apiList } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { LIVE_INTERVAL_SLOW_MS } from '../constants/live';
import { usePolling } from '../hooks/usePolling';
import { PageHeader, Loading, Modal } from '../components/UI';
import { DataTable, type DataTableBulkAction, type DataTableColumn } from '../components/DataTable';
import { createExportBulkAction } from '../utils/export';
import type { DiscountType } from '../types';

export function DiscountTypesPage() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('update');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '' });
  const [editId, setEditId] = useState<string | null>(null);
  const [editNumber, setEditNumber] = useState<number | null>(null);

  const fetchTypes = useCallback(() => apiList<DiscountType>('/crm/discount-types'), []);
  const { data: types, loading, refresh } = usePolling(fetchTypes, [], { intervalMs: LIVE_INTERVAL_SLOW_MS });

  const sorted = useMemo(
    () => [...(types || [])].sort((a, b) => a.number - b.number),
    [types]
  );

  const openEdit = (item: DiscountType) => {
    setForm({ name: item.name });
    setEditId(item.id);
    setEditNumber(item.number);
    setModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editId || editNumber == null) return;
    await api(`/crm/discount-types/${editId}`, {
      method: 'PUT',
      body: JSON.stringify({ number: editNumber, name: form.name }),
    });
    setModal(false);
    refresh();
  };

  const columns: DataTableColumn<DiscountType>[] = useMemo(
    () => [
      {
        key: 'number',
        header: 'Номер',
        sortable: true,
        sortValue: (t) => t.number,
        searchValue: (t) => String(t.number),
        render: (t) => <span className="font-mono font-medium">{t.number}</span>,
      },
      {
        key: 'name',
        header: 'Название',
        sortable: true,
        sortValue: (t) => t.name,
        searchValue: (t) => t.name,
        render: (t) => t.name,
      },
      ...(canEdit
        ? [
            {
              key: 'actions',
              header: '',
              render: (t: DiscountType) => (
                <div className="text-right">
                  <button type="button" className="btn-secondary" onClick={() => openEdit(t)}>
                    Изменить
                  </button>
                </div>
              ),
            } as DataTableColumn<DiscountType>,
          ]
        : []),
    ],
    [canEdit]
  );

  const bulkActions = useMemo((): DataTableBulkAction<DiscountType>[] => [
    createExportBulkAction('discount-types.csv', [
      { header: 'Номер', value: (t) => String(t.number) },
      { header: 'Название', value: (t) => t.name },
    ]),
  ], []);

  if (loading && !types) return <Loading />;

  return (
    <div>
      <PageHeader
        title="Типы скидок"
        subtitle="Справочник номеров 1–5 и их названий для скидочных карт"
      />
      <DataTable
        columns={columns}
        data={sorted}
        rowKey={(t) => t.id}
        searchPlaceholder="Поиск типов скидок…"
        bulkActions={bulkActions}
        pageSize={10}
        emptyMessage="Типы скидок не настроены"
      />

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editNumber != null ? `Тип скидки №${editNumber}` : 'Тип скидки'}
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="label">Номер</label>
            <input className="input font-mono" value={editNumber ?? ''} readOnly disabled />
          </div>
          <div>
            <label className="label">Название</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ name: e.target.value })}
              required
              placeholder="Например: Карта такси"
            />
          </div>
          <button type="submit" className="btn-primary w-full">
            Сохранить
          </button>
        </form>
      </Modal>
    </div>
  );
}

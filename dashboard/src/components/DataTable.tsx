import { ReactNode, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import clsx from 'clsx';
import { Empty } from './UI';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  searchValue?: (row: T) => string;
  className?: string;
}

export interface DataTableFilter<T> {
  id: string;
  label: string;
  options: { value: string; label: string }[];
  allLabel?: string;
  match: (row: T, value: string) => boolean;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  searchPlaceholder?: string;
  pageSize?: number;
  emptyMessage?: string;
  toolbar?: ReactNode;
  filters?: DataTableFilter<T>[];
}

function resolveSortable<T>(col: DataTableColumn<T>): DataTableColumn<T> {
  const sortValue = col.sortValue ?? (col.searchValue ? (row: T) => col.searchValue!(row) : undefined);
  const sortable = col.sortable !== false && !!sortValue;
  return { ...col, sortValue, sortable };
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  searchPlaceholder = 'Поиск…',
  pageSize = 15,
  emptyMessage = 'Нет данных',
  toolbar,
  filters = [],
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  const resolvedColumns = useMemo(() => columns.map(resolveSortable), [columns]);
  const searchableColumns = resolvedColumns.filter((c) => c.searchValue);

  const filtered = useMemo(() => {
    let rows = data;

    for (const f of filters) {
      const val = filterValues[f.id];
      if (val) rows = rows.filter((row) => f.match(row, val));
    }

    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((row) =>
        searchableColumns.some((col) => (col.searchValue!(row) || '').toLowerCase().includes(q))
      );
    }

    return rows;
  }, [data, search, searchableColumns, filters, filterValues]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = resolvedColumns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return filtered;
    return [...filtered].sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir, resolvedColumns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const setFilter = (id: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [id]: value }));
    setPage(1);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          {toolbar}
        </div>

        {filters.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {filters.map((f) => (
              <div key={f.id} className="min-w-[140px]">
                <label className="label !mb-1">{f.label}</label>
                <select
                  className="input"
                  value={filterValues[f.id] || ''}
                  onChange={(e) => setFilter(f.id, e.target.value)}
                >
                  <option value="">{f.allLabel ?? 'Все'}</option>
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card overflow-x-auto !p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
            <tr>
              {resolvedColumns.map((col) => (
                <th key={col.key} className={clsx('px-4 py-3 font-medium', col.className)}>
                  {col.sortable ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:text-brand-600"
                      onClick={() => toggleSort(col.key)}
                    >
                      {col.header}
                      {sortKey === col.key && (sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={resolvedColumns.length}>
                  <Empty message={emptyMessage} />
                </td>
              </tr>
            ) : (
              paged.map((row) => (
                <tr key={rowKey(row)} className="border-b border-slate-100 dark:border-slate-800">
                  {resolvedColumns.map((col) => (
                    <td key={col.key} className={clsx('px-4 py-3', col.className)}>
                      {col.render ? col.render(row) : null}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>
          {sorted.length} записей
          {sorted.length > pageSize && ` · стр. ${currentPage} из ${totalPages}`}
        </span>
        {sorted.length > pageSize && (
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" disabled={currentPage <= 1} onClick={() => setPage((p) => p - 1)}>
              Назад
            </button>
            <button type="button" className="btn-secondary" disabled={currentPage >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Далее
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

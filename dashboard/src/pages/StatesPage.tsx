import { useCallback, useMemo } from 'react';
import { apiList } from '../api/client';
import { PageHeader, Loading, Badge } from '../components/UI';
import { DataTable, type DataTableColumn, type DataTableFilter } from '../components/DataTable';
import { LiveModeTimer } from '../components/LiveModeTimer';
import { usePolling } from '../hooks/usePolling';
import { formatPause } from '../utils/format';
import type { PostState, Post, Wash } from '../types';

interface StateRow {
  id: string;
  postId: string;
  washId: string;
  address: string;
  postLabel: string;
  modeNumber?: number;
  freePause?: number;
  paidPause?: number;
  modeTime?: number;
  modeName?: string;
  hasData: boolean;
  fetchedAt: number;
}

export function StatesPage() {
  const fetchData = useCallback(async () => {
    const [states, posts, washes] = await Promise.all([
      apiList<PostState>('/crm/post-states'),
      apiList<Post>('/crm/posts'),
      apiList<Wash>('/crm/washes'),
    ]);
    const fetchedAt = Date.now();
    const stateByPost = new Map(states.map((s) => [s.postId, s]));
    const washById = new Map(washes.map((w) => [w.id, w]));

    const rows: StateRow[] = posts.map((post) => {
      const state = stateByPost.get(post.id);
      const wash = washById.get(post.washId);
      const hasData = !!(state?.lastMessageAt || state?.modeTime != null || state?.mode);
      return {
        id: state?.id || post.id,
        postId: post.id,
        washId: post.washId,
        address: wash?.address || '—',
        postLabel: `#${post.postNumber} ${post.name}`,
        modeNumber: state?.modeNumber,
        freePause: state?.freePause,
        paidPause: state?.paidPause,
        modeTime: state?.modeTime,
        modeName: state?.modeName || state?.mode,
        hasData,
        fetchedAt,
      };
    });

    return rows;
  }, []);

  const { data: rows, loading } = usePolling(fetchData, [], { intervalMs: 3000 });

  const filters: DataTableFilter<StateRow>[] = useMemo(
    () => [
      {
        id: 'hasData',
        label: 'Данные',
        options: [
          { value: 'yes', label: 'Есть данные' },
          { value: 'no', label: 'Ожидание' },
        ],
        match: (r, v) => (v === 'yes' ? r.hasData : !r.hasData),
      },
    ],
    []
  );

  const columns: DataTableColumn<StateRow>[] = useMemo(
    () => [
      {
        key: 'address',
        header: 'Адрес объекта',
        sortable: true,
        searchValue: (r) => r.address,
        sortValue: (r) => r.address,
        render: (r) => r.address,
      },
      {
        key: 'post',
        header: 'Номер поста',
        sortable: true,
        searchValue: (r) => r.postLabel,
        sortValue: (r) => r.postLabel,
        render: (r) => <span className="font-medium">{r.postLabel}</span>,
      },
      {
        key: 'modeNumber',
        header: 'Номер режима',
        sortable: true,
        sortValue: (r) => r.modeNumber ?? -1,
        render: (r) => (r.hasData ? (r.modeNumber ?? '—') : <span className="text-slate-400">Ожидание первых данных</span>),
      },
      {
        key: 'freePause',
        header: 'Бесплатная пауза',
        sortValue: (r) => r.freePause ?? -1,
        render: (r) => (r.hasData ? formatPause(r.freePause) : '—'),
      },
      {
        key: 'paidPause',
        header: 'Платная пауза',
        sortValue: (r) => r.paidPause ?? -1,
        render: (r) => (r.hasData ? formatPause(r.paidPause) : '—'),
      },
      {
        key: 'modeTime',
        header: 'Время режима',
        sortValue: (r) => r.modeTime ?? -1,
        render: (r) => (
          <LiveModeTimer
            baseSeconds={r.modeTime}
            fetchedAt={r.fetchedAt}
            waiting={!r.hasData}
          />
        ),
      },
      {
        key: 'mode',
        header: 'Режим',
        searchValue: (r) => r.modeName || '',
        sortValue: (r) => r.modeName || '',
        render: (r) => r.hasData ? (r.modeName || '—') : '—',
      },
    ],
    []
  );

  if (loading && !rows) return <Loading />;

  return (
    <div>
      <PageHeader
        title="Текущее состояние постов"
        subtitle="Все посты всех объектов · обновление каждые 3 сек"
        actions={<Badge variant="success">Live</Badge>}
      />
      <DataTable
        columns={columns}
        data={rows || []}
        rowKey={(r) => r.postId}
        filters={filters}
        searchPlaceholder="Поиск по адресу или посту…"
        pageSize={20}
      />
    </div>
  );
}

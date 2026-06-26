import { api } from '../api/client';

export async function bulkDelete(pathPrefix: string, ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => api(`${pathPrefix}/${id}`, { method: 'DELETE' })));
}

export async function bulkPatch<T extends object>(
  pathPrefix: string,
  rows: T[],
  getId: (row: T) => string,
  patch: Partial<T> | ((row: T) => Partial<T>)
): Promise<void> {
  await Promise.all(
    rows.map((row) => {
      const body = typeof patch === 'function' ? patch(row) : patch;
      return api(`${pathPrefix}/${getId(row)}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
    })
  );
}

export async function bulkPut<T extends object>(
  pathPrefix: string,
  rows: T[],
  getId: (row: T) => string,
  buildBody: (row: T) => object
): Promise<void> {
  await Promise.all(
    rows.map((row) =>
      api(`${pathPrefix}/${getId(row)}`, {
        method: 'PUT',
        body: JSON.stringify(buildBody(row)),
      })
    )
  );
}

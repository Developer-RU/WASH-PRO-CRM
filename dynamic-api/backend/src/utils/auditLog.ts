import { ILog } from '../models';
import { JwtPayload } from '../types';

const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

export function resolveLogUserId(user?: JwtPayload): ILog['userId'] {
  const id = user?.userId;
  if (!id || !OBJECT_ID_PATTERN.test(id)) return undefined;
  return id as unknown as ILog['userId'];
}

/** Drop undefined/null fields so MongoDB documents stay lean. */
export function compactLogEntry(entry: Partial<ILog>): Partial<ILog> {
  const compact: Partial<ILog> = {};
  for (const [key, value] of Object.entries(entry)) {
    if (value !== undefined && value !== null && value !== '') {
      (compact as Record<string, unknown>)[key] = value;
    }
  }
  return compact;
}

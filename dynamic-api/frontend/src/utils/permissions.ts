import { User } from '../types';

export function userHasPermission(user: User | null | undefined, permission: string): boolean {
  if (!user?.groupIds?.length) return false;
  return user.groupIds.some((group) => {
    if (typeof group === 'string') return false;
    return group.permissions?.includes(permission);
  });
}

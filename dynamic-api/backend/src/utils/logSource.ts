import { LogSource } from '../types';

type RequestMeta = {
  userAgent?: string;
  source?: LogSource;
  skipAuditLog?: boolean;
};

type AuthUser = { login?: string } | undefined;

export function resolveLogSource(meta?: RequestMeta, user?: AuthUser): LogSource {
  if (meta?.source) return meta.source;
  if (meta?.userAgent === 'mcp-server') return 'mcp';
  if (meta?.userAgent === 'cron-scheduler') return 'cron';
  if (user?.login?.startsWith('apikey:')) return 'api_key';
  return 'direct';
}

export function shouldSkipApiAuditLog(meta?: RequestMeta): boolean {
  return Boolean(meta?.skipAuditLog || meta?.userAgent === 'mcp-server');
}

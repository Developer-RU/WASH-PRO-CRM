import { describe, expect, it } from 'vitest';
import { resolveLogSource, shouldSkipApiAuditLog } from './logSource';
import { compactLogEntry, resolveLogUserId } from './auditLog';

describe('audit log helpers', () => {
  it('resolves MCP source from user agent', () => {
    expect(resolveLogSource({ userAgent: 'mcp-server' })).toBe('mcp');
  });

  it('resolves API key source from login', () => {
    expect(resolveLogSource(undefined, { login: 'apikey:dap_abc' })).toBe('api_key');
  });

  it('skips duplicate api_call for MCP', () => {
    expect(shouldSkipApiAuditLog({ userAgent: 'mcp-server' })).toBe(true);
  });

  it('stores only valid Mongo user ids', () => {
    expect(resolveLogUserId({ userId: '507f1f77bcf86cd799439011', login: 'u', email: '', groupIds: [], permissions: [] })).toBe('507f1f77bcf86cd799439011');
    expect(resolveLogUserId({ userId: 'apikey:abc', login: 'apikey:abc', email: '', groupIds: [], permissions: [] })).toBeUndefined();
  });

  it('compacts empty log fields', () => {
    const compact = compactLogEntry({
      action: 'api_call',
      message: 'GET /api/x - 200',
      userId: undefined,
      ip: undefined,
      userAgent: '',
    });
    expect(compact).toEqual({ action: 'api_call', message: 'GET /api/x - 200' });
  });
});

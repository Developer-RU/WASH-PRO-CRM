import { describe, expect, it } from 'vitest';
import {
  checkNetworkAccess,
  matchDomain,
  matchIpRange,
  validateNetworkAccessInput,
  normalizeNetworkAccessInput,
  resolveEffectiveNetworkAccess,
} from './networkAccess';

describe('network access security', () => {
  it('allows when rules disabled', () => {
    expect(checkNetworkAccess({ enabled: false, allowedDomains: [], allowedIpRanges: [] }, {}).allowed).toBe(true);
  });

  it('denies unknown domain', () => {
    const result = checkNetworkAccess(
      { enabled: true, allowedDomains: ['api.example.com'], allowedIpRanges: [] },
      { headers: { origin: 'https://evil.test' } }
    );
    expect(result.allowed).toBe(false);
  });

  it('allows wildcard domain', () => {
    expect(matchDomain('app.example.com', '*.example.com')).toBe(true);
    expect(matchDomain('evil.com', '*.example.com')).toBe(false);
  });

  it('matches CIDR ranges', () => {
    expect(matchIpRange('192.168.1.10', '192.168.1.0/24')).toBe(true);
    expect(matchIpRange('10.0.0.1', '192.168.1.0/24')).toBe(false);
  });

  it('rejects invalid network access input', () => {
    const errors = validateNetworkAccessInput({
      enabled: true,
      allowedDomains: ['not a domain!'],
      allowedIpRanges: ['999.1.1.1'],
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('merges group and endpoint rules when inherited', () => {
    const rules = resolveEffectiveNetworkAccess(
      {
        inheritGroupNetworkAccess: true,
        networkAccess: { enabled: true, allowedDomains: ['api.local'], allowedIpRanges: [] },
      },
      { networkAccess: { enabled: true, allowedDomains: ['admin.local'], allowedIpRanges: ['127.0.0.1'] } }
    );
    expect(rules?.allowedDomains).toEqual(expect.arrayContaining(['api.local', 'admin.local']));
    expect(rules?.allowedIpRanges).toContain('127.0.0.1');
  });

  it('deduplicates normalized domains', () => {
    const normalized = normalizeNetworkAccessInput({
      enabled: true,
      allowedDomains: ['API.Example.COM', 'api.example.com'],
      allowedIpRanges: [],
    });
    expect(normalized.allowedDomains).toEqual(['api.example.com']);
  });
});

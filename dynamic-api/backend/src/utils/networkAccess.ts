import { NetworkAccessRules } from '../types';

const DOMAIN_PATTERN =
  /^(\*\.)?(localhost|[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*)$/i;

const IPV4_PATTERN = /^(\d{1,3}\.){3}\d{1,3}$/;

function normalizeDomain(value: string): string {
  let domain = value.trim().toLowerCase();
  if (!domain) return '';

  try {
    if (domain.includes('://')) {
      domain = new URL(domain).hostname.toLowerCase();
    }
  } catch {
    domain = domain.split('/')[0].split(':')[0];
  }

  return domain.replace(/\.$/, '');
}

function isValidIpv4Octets(ip: string): boolean {
  return ip.split('.').every((oct) => {
    const n = Number(oct);
    return Number.isInteger(n) && n >= 0 && n <= 255;
  });
}

export function isValidIpOrCidr(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;

  if (!trimmed.includes('/')) {
    return IPV4_PATTERN.test(trimmed) && isValidIpv4Octets(trimmed);
  }

  const [network, bitsStr] = trimmed.split('/');
  const bits = Number(bitsStr);
  return (
    IPV4_PATTERN.test(network) &&
    isValidIpv4Octets(network) &&
    Number.isInteger(bits) &&
    bits >= 0 &&
    bits <= 32
  );
}

export function isValidDomainPattern(value: string): boolean {
  const domain = normalizeDomain(value);
  if (!domain) return false;
  return DOMAIN_PATTERN.test(domain);
}

export function normalizeNetworkAccessInput(
  input?: Partial<NetworkAccessRules> | null
): NetworkAccessRules {
  const allowedDomains = (input?.allowedDomains || [])
    .map(normalizeDomain)
    .filter(Boolean)
    .filter((domain, index, list) => list.indexOf(domain) === index);

  const allowedIpRanges = (input?.allowedIpRanges || [])
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, list) => list.indexOf(item) === index);

  return {
    enabled: Boolean(input?.enabled),
    allowedDomains,
    allowedIpRanges,
  };
}

export function validateNetworkAccessInput(input?: Partial<NetworkAccessRules> | null): string[] {
  const errors: string[] = [];

  for (const domain of input?.allowedDomains || []) {
    if (!isValidDomainPattern(domain)) {
      errors.push(`Invalid domain pattern: "${domain}"`);
    }
  }

  for (const range of input?.allowedIpRanges || []) {
    if (!isValidIpOrCidr(range)) {
      errors.push(`Invalid IP or CIDR range: "${range}"`);
    }
  }

  return errors;
}

function ipv4ToLong(ip: string): number {
  return ip.split('.').reduce((acc, oct) => ((acc << 8) + Number(oct)) >>> 0, 0);
}

export function matchIpRange(ip: string, range: string): boolean {
  const normalizedIp = ip.trim();
  const normalizedRange = range.trim();

  if (!IPV4_PATTERN.test(normalizedIp) || !isValidIpv4Octets(normalizedIp)) {
    return normalizedIp === normalizedRange;
  }

  if (!normalizedRange.includes('/')) {
    return normalizedIp === normalizedRange;
  }

  const [network, bitsStr] = normalizedRange.split('/');
  const bits = Number(bitsStr);
  if (!IPV4_PATTERN.test(network) || !isValidIpv4Octets(network)) return false;

  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipv4ToLong(normalizedIp) & mask) === (ipv4ToLong(network) & mask);
}

export function matchDomain(hostname: string, pattern: string): boolean {
  const host = normalizeDomain(hostname);
  const rule = normalizeDomain(pattern);
  if (!host || !rule) return false;
  if (host === rule) return true;

  if (rule.startsWith('*.')) {
    const suffix = rule.slice(2);
    return host === suffix || host.endsWith(`.${suffix}`);
  }

  return false;
}

export function extractRequestDomain(
  headers?: Record<string, string | string[] | undefined>
): string | null {
  if (!headers) return null;

  const readHeader = (name: string): string | null => {
    const value = headers[name];
    if (!value) return null;
    const raw = Array.isArray(value) ? value[0] : value;
    return raw?.trim() || null;
  };

  for (const headerName of ['origin', 'referer', 'host']) {
    const raw = readHeader(headerName);
    if (!raw) continue;

    if (headerName === 'host') {
      const host = raw.split(':')[0];
      return host ? normalizeDomain(host) : null;
    }

    try {
      return normalizeDomain(new URL(raw).hostname);
    } catch {
      const host = raw.split('/')[0].split(':')[0];
      if (host) return normalizeDomain(host);
    }
  }

  return null;
}

export function resolveEffectiveNetworkAccess(
  endpoint: {
    networkAccess?: NetworkAccessRules;
    inheritGroupNetworkAccess?: boolean;
  },
  group?: { networkAccess?: NetworkAccessRules } | null
): NetworkAccessRules | null {
  const endpointRules = endpoint.networkAccess;
  const groupRules = group?.networkAccess;
  const inheritFromGroup = endpoint.inheritGroupNetworkAccess !== false;

  if (endpointRules?.enabled) {
    if (inheritFromGroup && groupRules?.enabled) {
      return {
        enabled: true,
        allowedDomains: [...new Set([...groupRules.allowedDomains, ...endpointRules.allowedDomains])],
        allowedIpRanges: [...new Set([...groupRules.allowedIpRanges, ...endpointRules.allowedIpRanges])],
      };
    }
    return endpointRules;
  }

  if (inheritFromGroup && groupRules?.enabled) {
    return groupRules;
  }

  return null;
}

export function checkNetworkAccess(
  rules: NetworkAccessRules,
  context: { ip?: string; headers?: Record<string, string | string[] | undefined> }
): { allowed: boolean; reason?: string } {
  if (!rules.enabled) {
    return { allowed: true };
  }

  const hasDomains = rules.allowedDomains.length > 0;
  const hasIps = rules.allowedIpRanges.length > 0;

  if (!hasDomains && !hasIps) {
    return { allowed: true };
  }

  let domainAllowed = !hasDomains;
  let ipAllowed = !hasIps;

  if (hasDomains) {
    const domain = extractRequestDomain(context.headers);
    if (domain && rules.allowedDomains.some((pattern) => matchDomain(domain, pattern))) {
      domainAllowed = true;
    }
  }

  if (hasIps) {
    const ip = context.ip?.trim();
    if (ip && ip !== 'unknown' && rules.allowedIpRanges.some((range) => matchIpRange(ip, range))) {
      ipAllowed = true;
    }
  }

  if (hasDomains && hasIps) {
    if (domainAllowed || ipAllowed) return { allowed: true };
  } else if (hasDomains && domainAllowed) {
    return { allowed: true };
  } else if (hasIps && ipAllowed) {
    return { allowed: true };
  }

  return { allowed: false, reason: 'Forbidden: network access denied' };
}

import { NetworkAccessRules } from '../types';

export const DEFAULT_NETWORK_ACCESS: NetworkAccessRules = {
  enabled: false,
  allowedDomains: [],
  allowedIpRanges: [],
};

interface NetworkAccessEditorProps {
  value: NetworkAccessRules;
  onChange: (value: NetworkAccessRules) => void;
  showInheritOption?: boolean;
  inheritFromGroup?: boolean;
  onInheritFromGroupChange?: (value: boolean) => void;
}

function linesToList(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function listToLines(values: string[]): string {
  return values.join('\n');
}

export default function NetworkAccessEditor({
  value,
  onChange,
  showInheritOption = false,
  inheritFromGroup = true,
  onInheritFromGroupChange,
}: NetworkAccessEditorProps) {
  return (
    <div className="space-y-4">
      <div className="card p-4 border border-cyan-500/30 bg-cyan-500/5">
        <p className="text-sm text-dark-muted">
          Restrict who can call this API by client domain (<code className="text-accent">Origin</code> /{' '}
          <code className="text-accent">Referer</code>) or IP address / CIDR pool. When both lists are set,
          a request is allowed if it matches <span className="text-dark-text">either</span> a domain or an IP rule.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(e) => onChange({ ...value, enabled: e.target.checked })}
        />
        Enable network access restrictions
      </label>

      {showInheritOption && onInheritFromGroupChange && (
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={inheritFromGroup}
            onChange={(e) => onInheritFromGroupChange(e.target.checked)}
          />
          Inherit rules from endpoint group (merged with endpoint rules)
        </label>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Allowed domains</label>
        <textarea
          className="input min-h-[120px] resize-y font-mono text-xs"
          value={listToLines(value.allowedDomains)}
          onChange={(e) => onChange({ ...value, allowedDomains: linesToList(e.target.value) })}
          placeholder={'app.example.com\n*.example.com\nlocalhost'}
          disabled={!value.enabled}
        />
        <p className="text-xs text-dark-muted mt-1">
          One domain per line. Use <code className="text-accent">*.example.com</code> for subdomains.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Allowed IP addresses and pools</label>
        <textarea
          className="input min-h-[120px] resize-y font-mono text-xs"
          value={listToLines(value.allowedIpRanges)}
          onChange={(e) => onChange({ ...value, allowedIpRanges: linesToList(e.target.value) })}
          placeholder={'192.168.1.10\n10.0.0.0/8\n203.0.113.0/24'}
          disabled={!value.enabled}
        />
        <p className="text-xs text-dark-muted mt-1">
          One IPv4 address or CIDR block per line (e.g. <code className="text-accent">10.0.0.0/8</code>).
        </p>
      </div>
    </div>
  );
}

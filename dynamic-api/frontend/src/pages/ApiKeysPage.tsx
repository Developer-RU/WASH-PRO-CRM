import { useEffect, useState } from 'react';
import { Plus, Trash2, Key } from 'lucide-react';
import { api } from '../services/api';
import { PageHeader, LoadingSpinner, Modal } from '../components/UI';

const ALL_PERMISSIONS = ['view', 'create', 'update', 'delete', 'manage_users', 'manage_api', 'view_logs'];

type ApiKeyItem = {
  _id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  enabled: boolean;
  lastUsedAt?: string;
  createdAt: string;
};

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [permissions, setPermissions] = useState<string[]>(['view', 'manage_api']);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api.getApiKeys().then((data) => setKeys(data as ApiKeyItem[])).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    try {
      const res = await api.createApiKey({ name, permissions });
      setCreatedKey(res.apiKey);
      setName('');
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed');
    }
  };

  const revoke = async (id: string) => {
    if (!confirm('Revoke this API key?')) return;
    await api.deleteApiKey(id);
    load();
  };

  const togglePerm = (perm: string) => {
    setPermissions((prev) => prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="API Keys"
        subtitle="Machine-to-machine authentication via X-API-Key header"
        action={
          <button className="btn-primary" onClick={() => { setModalOpen(true); setCreatedKey(null); }}>
            <Plus className="w-4 h-4" /> New key
          </button>
        }
      />

      <div className="card mb-4 p-4 text-sm text-dark-muted border border-brand-500/20 bg-brand-500/5">
        Use header <code className="text-accent">X-API-Key: dap_...</code> or <code className="text-accent">Authorization: ApiKey dap_...</code>
      </div>

      <div className="card overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Prefix</th>
              <th>Permissions</th>
              <th>Last used</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {keys.length === 0 ? (
              <tr><td colSpan={5} className="text-center text-dark-muted py-8">No API keys</td></tr>
            ) : keys.map((key) => (
              <tr key={key._id}>
                <td className="font-medium">{key.name}</td>
                <td className="font-mono text-sm">{key.keyPrefix}…</td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    {key.permissions.map((p) => <span key={p} className="badge-blue text-xs">{p}</span>)}
                  </div>
                </td>
                <td className="text-sm text-dark-muted">{key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : '—'}</td>
                <td className="text-right">
                  <button className="btn-danger !px-2 !py-1" onClick={() => revoke(key._id)}><Trash2 className="w-3 h-3" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New API key">
        {createdKey ? (
          <div className="space-y-4">
            <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">Copy this key now — it won&apos;t be shown again.</p>
            <pre className="code-block-success break-all text-sm">{createdKey}</pre>
            <button className="btn-primary w-full" onClick={() => setModalOpen(false)}>Done</button>
          </div>
        ) : (
          <div className="space-y-4">
            <input className="input" placeholder="Key name" value={name} onChange={(e) => setName(e.target.value)} />
            <div>
              <div className="text-sm font-medium mb-2">Permissions</div>
              <div className="grid grid-cols-2 gap-2">
                {ALL_PERMISSIONS.map((perm) => (
                  <label key={perm} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={permissions.includes(perm)} onChange={() => togglePerm(perm)} />
                    {perm}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn-primary" onClick={create}><Key className="w-4 h-4" /> Create</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

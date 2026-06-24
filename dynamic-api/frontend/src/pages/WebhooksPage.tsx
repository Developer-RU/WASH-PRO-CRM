import { useEffect, useState } from 'react';
import { Plus, Trash2, Send, Webhook } from 'lucide-react';
import { api } from '../services/api';
import { PageHeader, LoadingSpinner, Modal } from '../components/UI';

const ALL_EVENTS = [
  'user.created', 'user.updated', 'user.deleted',
  'endpoint.created', 'endpoint.updated', 'endpoint.deleted',
  'endpoint.called', 'api.error',
];

type WebhookItem = {
  _id: string;
  name: string;
  url: string;
  events: string[];
  enabled: boolean;
  lastTriggeredAt?: string;
  lastStatus?: string;
};

const emptyForm = { name: '', url: '', events: ['endpoint.called'] as string[], secret: '', enabled: true };

export default function WebhooksPage() {
  const [hooks, setHooks] = useState<WebhookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = () => {
    setLoading(true);
    api.getWebhooks().then((data) => setHooks(data as WebhookItem[])).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    try {
      await api.createWebhook(form);
      setModalOpen(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed');
    }
  };

  const test = async (id: string) => {
    try {
      await api.testWebhook(id);
      alert('Test webhook sent');
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed');
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete webhook?')) return;
    await api.deleteWebhook(id);
    load();
  };

  const toggleEvent = (event: string) => {
    setForm((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }));
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Webhooks"
        subtitle="POST platform events to external URLs with optional HMAC signature"
        action={
          <button className="btn-primary" onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4" /> New webhook
          </button>
        }
      />

      <div className="space-y-3">
        {hooks.length === 0 ? (
          <div className="card text-center text-dark-muted py-8">No webhooks configured</div>
        ) : hooks.map((hook) => (
          <div key={hook._id} className="card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="font-medium flex items-center gap-2">
                <Webhook className="w-4 h-4 text-brand-600" />
                {hook.name}
                {!hook.enabled && <span className="badge-yellow">disabled</span>}
              </div>
              <div className="text-sm font-mono text-dark-muted mt-1">{hook.url}</div>
              <div className="flex flex-wrap gap-1 mt-2">
                {hook.events.map((e) => <span key={e} className="badge-blue text-xs">{e}</span>)}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button className="btn-secondary" onClick={() => test(hook._id)}><Send className="w-4 h-4" /> Test</button>
              <button className="btn-danger" onClick={() => remove(hook._id)}><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New webhook" wide>
        <div className="space-y-4">
          <input className="input" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input font-mono" placeholder="https://example.com/webhook" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
          <input className="input font-mono" placeholder="Secret (optional, for HMAC)" value={form.secret} onChange={(e) => setForm({ ...form, secret: e.target.value })} />
          <div>
            <div className="text-sm font-medium mb-2">Events</div>
            <div className="grid grid-cols-2 gap-2">
              {ALL_EVENTS.map((event) => (
                <label key={event} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.events.includes(event)} onChange={() => toggleEvent(event)} />
                  {event}
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={create}>Create</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

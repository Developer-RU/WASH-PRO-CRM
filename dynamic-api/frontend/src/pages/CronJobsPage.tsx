import { useEffect, useState } from 'react';
import { Plus, Play, Trash2, Clock } from 'lucide-react';
import { api } from '../services/api';
import { PageHeader, LoadingSpinner, Modal } from '../components/UI';

type CronJob = {
  _id: string;
  name: string;
  description?: string;
  schedule: string;
  actionType: 'javascript' | 'http' | 'endpoint';
  javascriptCode?: string;
  httpUrl?: string;
  httpMethod?: string;
  httpBody?: string;
  endpointPath?: string;
  endpointMethod?: string;
  enabled: boolean;
  lastRunAt?: string;
  lastRunStatus?: string;
  lastRunMessage?: string;
};

const emptyForm: {
  name: string;
  description: string;
  schedule: string;
  actionType: 'javascript' | 'http' | 'endpoint';
  javascriptCode: string;
  httpUrl: string;
  httpMethod: string;
  httpBody: string;
  endpointPath: string;
  endpointMethod: string;
  enabled: boolean;
} = {
  name: '',
  description: '',
  schedule: '0 * * * *',
  actionType: 'javascript',
  javascriptCode: 'async function run() {\n  return "ok";\n}',
  httpUrl: '',
  httpMethod: 'GET',
  httpBody: '',
  endpointPath: '/api/health',
  endpointMethod: 'GET',
  enabled: true,
};

export default function CronJobsPage() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.getCronJobs().then((data) => setJobs(data as CronJob[])).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    setSaving(true);
    try {
      await api.createCronJob(form);
      setModalOpen(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const runNow = async (id: string) => {
    try {
      const res = await api.runCronJob(id);
      alert(res.message || 'Job executed');
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed');
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this cron job?')) return;
    await api.deleteCronJob(id);
    load();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Cron Scheduler"
        subtitle="Run JavaScript, HTTP requests, or API endpoints on a schedule"
        action={
          <button className="btn-primary" onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4" /> New job
          </button>
        }
      />

      <div className="card overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Schedule</th>
              <th>Action</th>
              <th>Last run</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 ? (
              <tr><td colSpan={6} className="text-center text-dark-muted py-8">No cron jobs yet</td></tr>
            ) : jobs.map((job) => (
              <tr key={job._id}>
                <td>
                  <div className="font-medium">{job.name}</div>
                  {job.description && <div className="text-xs text-dark-muted">{job.description}</div>}
                </td>
                <td className="font-mono text-sm">{job.schedule}</td>
                <td><span className="badge-blue">{job.actionType}</span></td>
                <td className="text-sm text-dark-muted">{job.lastRunAt ? new Date(job.lastRunAt).toLocaleString() : '—'}</td>
                <td>
                  {job.lastRunStatus ? (
                    <span className={job.lastRunStatus === 'success' ? 'badge-green' : 'badge-red'}>{job.lastRunStatus}</span>
                  ) : '—'}
                </td>
                <td className="text-right space-x-1">
                  <button className="btn-secondary !px-2 !py-1" onClick={() => runNow(job._id)} title="Run now">
                    <Play className="w-3 h-3" />
                  </button>
                  <button className="btn-danger !px-2 !py-1" onClick={() => remove(job._id)}>
                    <Trash2 className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New cron job" wide>
        <div className="space-y-4">
          <input className="input" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <input className="input font-mono" placeholder="Cron schedule (e.g. */5 * * * *)" value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} />
          <select className="select" value={form.actionType} onChange={(e) => setForm({ ...form, actionType: e.target.value as typeof form.actionType })}>
            <option value="javascript">JavaScript</option>
            <option value="http">HTTP request</option>
            <option value="endpoint">Call endpoint</option>
          </select>
          {form.actionType === 'javascript' && (
            <textarea className="input font-mono text-sm min-h-[160px]" value={form.javascriptCode} onChange={(e) => setForm({ ...form, javascriptCode: e.target.value })} />
          )}
          {form.actionType === 'http' && (
            <>
              <input className="input" placeholder="URL" value={form.httpUrl} onChange={(e) => setForm({ ...form, httpUrl: e.target.value })} />
              <input className="input" placeholder="Method" value={form.httpMethod} onChange={(e) => setForm({ ...form, httpMethod: e.target.value })} />
              <textarea className="input font-mono text-sm" placeholder="Body (JSON)" value={form.httpBody} onChange={(e) => setForm({ ...form, httpBody: e.target.value })} />
            </>
          )}
          {form.actionType === 'endpoint' && (
            <>
              <input className="input font-mono" placeholder="Path e.g. /api/products" value={form.endpointPath} onChange={(e) => setForm({ ...form, endpointPath: e.target.value })} />
              <input className="input" placeholder="Method" value={form.endpointMethod} onChange={(e) => setForm({ ...form, endpointMethod: e.target.value })} />
            </>
          )}
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={create} disabled={saving}>
              <Clock className="w-4 h-4" /> {saving ? 'Saving...' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

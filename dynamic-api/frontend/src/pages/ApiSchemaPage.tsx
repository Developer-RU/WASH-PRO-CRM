import { useEffect, useMemo, useState } from 'react';
import { Pencil, FlaskConical } from 'lucide-react';
import { api } from '../services/api';
import { Endpoint, EndpointGroup } from '../types';
import { ApiSchemaDiagram } from '../components/ApiSchemaDiagram';
import { PageHeader, LoadingSpinner, EmptyState } from '../components/UI';
import { buildApiSchemaGraph } from '../utils/apiSchema';

async function fetchAllEndpoints(): Promise<Endpoint[]> {
  const limit = 200;
  const first = await api.getEndpoints(1, limit);
  const all = [...first.data];
  for (let page = 2; page <= first.totalPages; page++) {
    const res = await api.getEndpoints(page, limit);
    all.push(...res.data);
  }
  return all;
}

export default function ApiSchemaPage() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [groups, setGroups] = useState<EndpointGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSystem, setShowSystem] = useState(true);
  const [showReferences, setShowReferences] = useState(true);

  useEffect(() => {
    Promise.all([fetchAllEndpoints(), api.getEndpointGroups()])
      .then(([eps, gr]) => {
        setEndpoints(eps);
        setGroups(gr);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => (showSystem ? endpoints : endpoints.filter((ep) => !ep.isSystem)),
    [endpoints, showSystem]
  );

  const graph = useMemo(
    () => (filtered.length ? buildApiSchemaGraph(filtered, groups) : null),
    [filtered, groups]
  );

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="API Schema"
        subtitle="Read-only map of endpoint groups, resources, fields, and reference links (ER-style)"
      />

      <div className="mb-4 flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
          <input
            type="checkbox"
            className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            checked={showReferences}
            onChange={(e) => setShowReferences(e.target.checked)}
          />
          Show reference links
        </label>
        <label className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
          <input
            type="checkbox"
            className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            checked={showSystem}
            onChange={(e) => setShowSystem(e.target.checked)}
          />
          Include system APIs
        </label>
        {graph && (
          <span className="text-slate-500">
            {graph.nodes.length} resources · {graph.edges.length} references · {graph.lanes.length} groups
          </span>
        )}
      </div>

      {!graph || graph.nodes.length === 0 ? (
        <EmptyState message="No endpoints to display. Create endpoint groups and APIs first." />
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-6 rounded bg-amber-200 dark:bg-amber-800" /> PK — primary key
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-6 rounded bg-violet-200 dark:bg-violet-800" /> FK — foreign key (reference)
            </span>
            <span className="flex items-center gap-1.5">
              <Pencil className="h-3.5 w-3.5" /> Editor
            </span>
            <span className="flex items-center gap-1.5">
              <FlaskConical className="h-3.5 w-3.5" /> API tester (per method too)
            </span>
            <span>Dashed frames = endpoint groups · violet arrows = references</span>
          </div>
          <ApiSchemaDiagram graph={graph} showReferences={showReferences} />
        </>
      )}
    </div>
  );
}

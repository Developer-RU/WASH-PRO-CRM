import { Link } from 'react-router-dom';
import { FlaskConical, Pencil, Lock, KeyRound } from 'lucide-react';
import type { ApiSchemaGraph, SchemaEdge, SchemaNode } from '../utils/apiSchema';
import {
  SCHEMA_LAYOUT,
  buildEdgeGeometry,
  fieldKeyLabel,
  fieldTooltip,
  getPrimaryEndpointId,
} from '../utils/apiSchema';
import { MethodBadge } from './UI';

interface ApiSchemaDiagramProps {
  graph: ApiSchemaGraph;
  showReferences: boolean;
}

export function ApiSchemaDiagram({ graph, showReferences }: ApiSchemaDiagramProps) {
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));

  return (
    <div className="card !overflow-hidden !p-0">
      <div
        className="overflow-auto bg-[radial-gradient(circle,_rgb(148_163_184/0.12)_1px,_transparent_1px)] [background-size:20px_20px] dark:bg-[radial-gradient(circle,_rgb(51_65_85/0.35)_1px,_transparent_1px)]"
      >
        <div
          className="relative"
          style={{ width: graph.width, height: graph.height, minWidth: '100%' }}
        >
          {/* Lanes (group backgrounds) */}
          {graph.lanes.map((lane) => (
            <div
              key={lane.id}
              className="pointer-events-none absolute rounded-2xl border-2 border-dashed border-slate-200/90 bg-white/50 dark:border-slate-700/80 dark:bg-slate-900/30"
              style={{
                left: 16,
                top: lane.y,
                width: graph.width - 32,
                height: lane.height,
              }}
            >
              <div
                className="flex items-center gap-2 px-4 py-2"
                style={{ borderLeft: `4px solid ${lane.color}` }}
              >
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{lane.name}</span>
                {lane.description && (
                  <span className="truncate text-xs text-slate-500">{lane.description}</span>
                )}
              </div>
            </div>
          ))}

          {/* Relationship lines */}
          <svg
            className="pointer-events-none absolute inset-0 z-[5]"
            width={graph.width}
            height={graph.height}
            aria-hidden={!showReferences}
          >
            <defs>
              <marker
                id="schema-arrow-fk"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="5"
                orient="auto"
              >
                <path d="M0,0 L10,5 L0,10 Z" className="fill-violet-500 dark:fill-violet-400" />
              </marker>
            </defs>
            {showReferences && graph.edges.map((edge) => {
              const from = nodeMap.get(edge.fromNodeId);
              const to = nodeMap.get(edge.toNodeId);
              if (!from || !to) return null;
              const geom = buildEdgeGeometry(from, to, edge.fromFieldIndex);
              return (
                <g key={edge.id}>
                  <path
                    d={geom.path}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    className="text-violet-500/80 dark:text-violet-400/70"
                    markerEnd="url(#schema-arrow-fk)"
                  />
                  <g transform={`translate(${geom.labelX}, ${geom.labelY})`}>
                    <rect
                      x="-36"
                      y="-10"
                      width="72"
                      height="20"
                      rx="4"
                      className="fill-white stroke-violet-300 dark:fill-slate-900 dark:stroke-violet-700"
                    />
                    <text
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-violet-700 text-[10px] font-mono font-semibold dark:fill-violet-300"
                    >
                      {edge.label}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>

          {/* Tables */}
          {graph.nodes.map((node) => (
            <SchemaTable
              key={node.id}
              node={node}
              edges={graph.edges.filter((e) => e.fromNodeId === node.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function SchemaTable({
  node,
  edges,
}: {
  node: SchemaNode;
  edges: SchemaEdge[];
}) {
  const primaryId = getPrimaryEndpointId(node);
  const visible = node.displayFields.slice(0, SCHEMA_LAYOUT.MAX_FIELDS);
  const hidden = node.displayFields.length - visible.length;

  const edgeByField = new Map(edges.map((e) => [e.fromField, e]));

  return (
    <div
      className="absolute z-10 overflow-hidden rounded-lg border-2 border-slate-300 bg-white shadow-md dark:border-slate-600 dark:bg-slate-900"
      style={{ left: node.x, top: node.y, width: node.width }}
    >
      {/* Table title bar */}
      <div
        className="flex items-start justify-between gap-2 px-3 py-2 text-white"
        style={{ backgroundColor: node.groupColor }}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {node.isSystem && <Lock className="h-3.5 w-3.5 shrink-0 opacity-90" />}
            <h3 className="truncate text-sm font-bold" title={node.title}>
              {node.title}
            </h3>
          </div>
          <p className="mt-0.5 truncate font-mono text-[10px] opacity-90" title={node.path}>
            {node.path}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Link
            to={`/endpoints/${primaryId}`}
            className="rounded bg-white/20 p-1 hover:bg-white/30"
            title="Open editor"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Link>
          <Link
            to={`/endpoints/${primaryId}?tab=test`}
            className="rounded bg-white/20 p-1 hover:bg-white/30"
            title="Open API tester"
          >
            <FlaskConical className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* HTTP methods */}
      <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-800/80">
        {node.methods.map((m) => (
          <Link
            key={m.endpointId}
            to={`/endpoints/${m.endpointId}?tab=test`}
            title={`Test ${m.method}`}
            className="hover:opacity-80"
          >
            <MethodBadge method={m.method} />
          </Link>
        ))}
      </div>

      {/* Columns table */}
      <table className="w-full border-collapse text-left text-[11px]">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
            <th className="px-2 py-1.5 font-semibold">Field</th>
            <th className="px-2 py-1.5 font-semibold">Type</th>
            <th className="w-16 px-2 py-1.5 text-center font-semibold">Key</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((field, index) => {
            const edge = edgeByField.get(field.name);
            const targetTitle = edge?.toTitle;
            const isFk = field.type === 'reference';
            const isPk = field.name === '_id' || field.name === 'id';
            const keyLabel = fieldKeyLabel(field, targetTitle);

            return (
              <tr
                key={`${field.name}-${index}`}
                className={`border-b border-slate-100 dark:border-slate-800 ${
                  isFk
                    ? 'bg-violet-50/80 dark:bg-violet-950/30'
                    : index % 2 === 0
                      ? 'bg-white dark:bg-slate-900'
                      : 'bg-slate-50/50 dark:bg-slate-900/70'
                }`}
                title={fieldTooltip(field, edge?.toPath)}
              >
                <td className="px-2 py-1 font-mono font-medium text-slate-800 dark:text-slate-200">
                  {isFk && <KeyRound className="mr-1 inline h-3 w-3 text-violet-500" />}
                  {field.name}
                </td>
                <td className="px-2 py-1 text-slate-600 dark:text-slate-400">{field.type}</td>
                <td className="px-2 py-1 text-center">
                  {keyLabel && (
                    <span
                      className={`inline-block rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                        isPk
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200'
                          : isFk
                            ? 'bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200'
                            : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {keyLabel}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
          {hidden > 0 && (
            <tr>
              <td colSpan={3} className="px-2 py-1 text-center italic text-slate-400">
                +{hidden} more columns
              </td>
            </tr>
          )}
          {visible.length === 0 && (
            <tr>
              <td colSpan={3} className="px-2 py-2 text-center italic text-slate-400">
                No schema fields
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

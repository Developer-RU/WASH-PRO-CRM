import { useEffect, useMemo, useState } from 'react';
import { Bot, Copy, Check } from 'lucide-react';
import { api } from '../services/api';
import { PageHeader, LoadingSpinner } from '../components/UI';

type McpTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button type="button" onClick={copy} className="btn-secondary !px-2 !py-1.5 text-xs" title="Copy">
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100 dark:bg-slate-950">
        <code>{code}</code>
      </pre>
      <div className="absolute right-2 top-2">
        <CopyButton text={code} />
      </div>
    </div>
  );
}

export default function McpPage() {
  const [tools, setTools] = useState<McpTool[]>([]);
  const [loading, setLoading] = useState(true);

  const mcpUrl = useMemo(() => `${window.location.origin}/api/mcp`, []);

  useEffect(() => {
    api.getMcpTools()
      .then((data) => setTools(data as McpTool[]))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const listToolsExample = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
  }, null, 2);

  const callToolExample = JSON.stringify({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: tools[0]?.name || 'get_api_products',
      arguments: { query: {}, body: {}, params: {} },
    },
  }, null, 2);

  const curlExample = `curl -X POST ${mcpUrl} \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' })}'`;

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="MCP Server"
        subtitle="Model Context Protocol — expose dynamic API endpoints as AI agent tools"
      />

      <div className="card mb-4 flex items-start gap-3 border border-brand-500/20 bg-brand-500/5 p-4 text-sm">
        <Bot className="mt-0.5 h-5 w-5 shrink-0 text-brand-600 dark:text-brand-400" />
        <div>
          <p className="font-medium text-slate-800 dark:text-slate-100">JSON-RPC 2.0 endpoint</p>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Each enabled dynamic endpoint is registered as an MCP tool. Supports{' '}
            <code className="text-accent">initialize</code>,{' '}
            <code className="text-accent">tools/list</code>,{' '}
            <code className="text-accent">tools/call</code>, and OpenAPI resource at{' '}
            <code className="text-accent">openapi://spec</code>.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="rounded bg-slate-100 px-2 py-1 text-xs dark:bg-slate-800">{mcpUrl}</code>
            <CopyButton text={mcpUrl} />
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <h3 className="mb-2 text-sm font-semibold">List tools</h3>
          <CodeBlock code={listToolsExample} />
        </div>
        <div className="card p-4">
          <h3 className="mb-2 text-sm font-semibold">Call a tool</h3>
          <CodeBlock code={callToolExample} />
        </div>
      </div>

      <div className="card mb-6 p-4">
        <h3 className="mb-2 text-sm font-semibold">curl</h3>
        <CodeBlock code={curlExample} />
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <h3 className="text-sm font-semibold">
            Registered tools ({tools.length})
          </h3>
          <p className="text-xs text-slate-500">From enabled non-system endpoints</p>
        </div>
        {tools.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No tools yet. Create and enable endpoints to expose them via MCP.
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Tool name</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {tools.map((tool) => (
                <tr key={tool.name}>
                  <td>
                    <code className="text-xs">{tool.name}</code>
                  </td>
                  <td className="text-sm text-slate-600 dark:text-slate-400">{tool.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

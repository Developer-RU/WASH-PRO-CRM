import { ExternalLink } from 'lucide-react';
import { PageHeader } from '../components/UI';

export default function ApiDocsPage() {
  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <PageHeader
        title="API Documentation"
        subtitle="Interactive OpenAPI (Swagger) docs for all enabled dynamic endpoints"
        action={
          <a
            href="/api/swagger"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary inline-flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Open in new tab
          </a>
        }
      />
      <div className="card flex-1 overflow-hidden p-0">
        <iframe
          title="Swagger UI"
          src="/api/swagger"
          className="h-full w-full border-0"
        />
      </div>
    </div>
  );
}

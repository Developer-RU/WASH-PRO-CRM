import { IEndpoint, IEndpointGroup } from '../models';
import { SchemaField } from '../types';
import { endpointRepository, endpointGroupRepository } from '../repositories';
import { generateExampleFromSchema } from '../utils';
import { getEndpointMatchPaths } from '../utils';

function toOpenApiPath(path: string): string {
  return path.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
}

function extractPathParams(path: string): string[] {
  const matches = path.matchAll(/:([A-Za-z0-9_]+)/g);
  return [...matches].map((m) => m[1]);
}

function fieldToSchema(field: SchemaField): Record<string, unknown> {
  const base: Record<string, unknown> = {};
  if (field.description) base.description = field.description;

  switch (field.type) {
    case 'string':
      return { ...base, type: 'string' };
    case 'number':
      return { ...base, type: 'number' };
    case 'boolean':
      return { ...base, type: 'boolean' };
    case 'datetime':
      return { ...base, type: 'string', format: 'date-time' };
    case 'json':
      return { ...base, type: 'object', additionalProperties: true };
    case 'array':
      return { ...base, type: 'array', items: { type: 'string' } };
    case 'object':
      return {
        ...base,
        type: 'object',
        properties: fieldsToProperties(field.children || []),
      };
    case 'reference':
      return {
        ...base,
        type: 'string',
        description: field.description || 'Referenced record ID',
      };
    default:
      return { ...base, type: 'string' };
  }
}

function fieldsToProperties(fields: SchemaField[]): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const field of fields) {
    properties[field.name] = fieldToSchema(field);
    if (field.required) required.push(field.name);
  }

  const schema: Record<string, unknown> = { type: 'object', properties };
  if (required.length) schema.required = required;
  return properties;
}

function bodySchema(fields: SchemaField[]): Record<string, unknown> {
  const properties = fieldsToProperties(fields);
  const required = fields.filter((f) => f.required).map((f) => f.name);
  const schema: Record<string, unknown> = {
    type: 'object',
    properties,
  };
  if (required.length) schema.required = required;
  return schema;
}

function successEnvelope(dataSchema: Record<string, unknown>): Record<string, unknown> {
  return {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      data: dataSchema,
    },
  };
}

function listResponseSchema(itemFields: SchemaField[]): Record<string, unknown> {
  const example = generateExampleFromSchema(itemFields);
  return {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      data: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            ...Object.fromEntries(
              itemFields.map((f) => [f.name, fieldToSchema(f)])
            ),
          },
        },
      },
      pagination: {
        type: 'object',
        properties: {
          total: { type: 'integer' },
          page: { type: 'integer' },
          limit: { type: 'integer' },
          totalPages: { type: 'integer' },
        },
      },
    },
    example: {
      success: true,
      data: [{ id: '507f1f77bcf86cd799439011', ...example }],
      pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
    },
  };
}

function securityForEndpoint(endpoint: IEndpoint): Record<string, string[]>[] | undefined {
  if (endpoint.accessType === 'public') return undefined;
  return [{ bearerAuth: [] }];
}

function groupTag(endpoint: IEndpoint, groupsById: Map<string, IEndpointGroup>): string {
  const groupId =
    typeof endpoint.groupId === 'object' && endpoint.groupId !== null && '_id' in endpoint.groupId
      ? String((endpoint.groupId as { _id: unknown })._id)
      : endpoint.groupId
        ? String(endpoint.groupId)
        : null;
  if (groupId && groupsById.has(groupId)) return groupsById.get(groupId)!.name;
  return 'Dynamic API';
}

export class OpenApiService {
  async generateSpec(serverUrl = '/api'): Promise<Record<string, unknown>> {
    const [endpoints, groups] = await Promise.all([
      endpointRepository.findAll({ isSystem: false, enabled: true }),
      endpointGroupRepository.findAll(),
    ]);

    const groupsById = new Map(groups.map((g) => [g._id.toString(), g]));
    const paths: Record<string, Record<string, unknown>> = {};

    for (const endpoint of endpoints) {
      const openApiPaths = getEndpointMatchPaths(endpoint.path, endpoint.apiVersion);
      for (const epPath of openApiPaths) {
      const openApiPath = toOpenApiPath(epPath);
      const method = endpoint.method.toLowerCase();
      const pathParams = extractPathParams(epPath);
      const hasIdParam = pathParams.length > 0;
      const tag = groupTag(endpoint, groupsById);

      const parameters: Record<string, unknown>[] = pathParams.map((name) => ({
        name,
        in: 'path',
        required: true,
        schema: { type: 'string' },
      }));

      if (endpoint.method === 'GET' && !hasIdParam) {
        parameters.push(
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'populate', in: 'query', schema: { type: 'string' }, description: 'Embed reference fields (?populate=true or field names)' }
        );
      } else if (endpoint.method === 'GET' && hasIdParam) {
        parameters.push({
          name: 'populate',
          in: 'query',
          schema: { type: 'string' },
          description: 'Embed reference fields',
        });
      }

      const operation: Record<string, unknown> = {
        tags: [tag],
        summary: endpoint.name,
        description: endpoint.description || undefined,
        operationId: `${method}_${endpoint.slug || endpoint.path.replace(/[^a-zA-Z0-9]/g, '_')}`,
        parameters: parameters.length ? parameters : undefined,
        security: securityForEndpoint(endpoint),
        responses: {
          '200': { description: 'Success' },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Not found' },
        },
      };

      if (['POST', 'PUT', 'PATCH'].includes(endpoint.method) && endpoint.fields.length) {
        operation.requestBody = {
          required: endpoint.method !== 'PATCH',
          content: {
            'application/json': {
              schema: bodySchema(endpoint.fields),
              example: generateExampleFromSchema(endpoint.fields),
            },
          },
        };
      }

      const itemSchema = {
        type: 'object',
        properties: {
          id: { type: 'string' },
          ...Object.fromEntries(endpoint.fields.map((f) => [f.name, fieldToSchema(f)])),
        },
      };

      if (endpoint.method === 'GET' && !hasIdParam) {
        operation.responses = {
          '200': {
            description: 'List of records',
            content: { 'application/json': { schema: listResponseSchema(endpoint.fields) } },
          },
        };
      } else if (endpoint.method === 'GET') {
        operation.responses = {
          '200': {
            description: 'Single record',
            content: {
              'application/json': {
                schema: successEnvelope(itemSchema),
              },
            },
          },
        };
      } else if (endpoint.method === 'DELETE') {
        operation.responses = {
          '200': {
            description: 'Deleted',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
        };
      } else {
        operation.responses = {
          '200': {
            description: 'Created or updated record',
            content: {
              'application/json': {
                schema: successEnvelope(itemSchema),
              },
            },
          },
        };
      }

      if (!paths[openApiPath]) paths[openApiPath] = {};
      paths[openApiPath][method] = operation;
      }
    }

    return {
      openapi: '3.0.3',
      info: {
        title: 'Dynamic API Platform',
        description: 'Auto-generated OpenAPI specification for dynamic REST endpoints.',
        version: '1.4.0',
      },
      servers: [{ url: serverUrl }],
      tags: groups.map((g) => ({ name: g.name, description: g.description })),
      paths,
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT from POST /api/auth/login',
          },
          apiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key',
            description: 'API key from Admin → API Keys',
          },
        },
      },
    };
  }

  swaggerHtml(specUrl: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>API Documentation — Dynamic API Platform</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: ${JSON.stringify(specUrl)},
      dom_id: '#swagger-ui',
      deepLinking: true,
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
      layout: 'StandaloneLayout',
    });
  </script>
</body>
</html>`;
  }
}

export const openApiService = new OpenApiService();

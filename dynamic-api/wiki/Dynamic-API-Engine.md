Full guide: [Dynamic API Engine](https://dynamic-api-platform.github.io/Dynamic-API-Platform/dynamic-api-engine/)

Endpoints defined in MongoDB are served **at runtime without restart or redeploy**.

## Schema types

`string`, `number`, `boolean`, `object`, `array`, `datetime`, `json`, **`reference`**

## References (foreign keys)

- Field type **`reference`** + **Linked endpoint** in schema editor
- Value = record `id` from the target endpoint's data
- Validated on POST/PUT/PATCH
- GET with `?populate=true` or `?populate=fieldName` embeds linked records

Example: `categoryId` → `GET /api/categories`

## Data sharing

GET and POST on same path share `EndpointData` via `resourcePath`.

Paths with `:id` (e.g. `/api/products/:id`) share the same collection base path as `/api/products`.

## Features

- Schema validation on write
- Path parameters (`:id`)
- Cross-endpoint references
- **Network access** (domains, IP/CIDR pools) on groups and endpoints
- Auto docs and examples
- Built-in API tester (system endpoints use real management API + RBAC)

## Recent fixes

- JWT refresh preserves permissions after token rotation
- Session expiry redirects to login in the admin panel
- System endpoint tests (`/api/users`, etc.) no longer return false "insufficient group permissions"

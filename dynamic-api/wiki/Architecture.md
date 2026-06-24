See full documentation: [Architecture](https://dynamic-api-platform.github.io/Dynamic-API-Platform/architecture/)

## Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS
- **Backend:** Node.js, Express, TypeScript, Mongoose
- **Database:** MongoDB 7 (single node, replica set, or Atlas)
- **Deploy:** Docker Compose, Docker replica set, or Kubernetes (`k8s/`)

## Layers

```
Routes → Services → Repositories → MongoDB
```

Dynamic requests: `dynamic.routes` → DynamicEngine → EndpointData

System management routes (`/api/users`, `/api/groups`, …) are registered **before** the dynamic catch-all.

## Key collections

- `users`, `groups` — RBAC
- `endpoints`, `endpointgroups` — API definitions (including `networkAccess` rules)
- `endpointdatas` — runtime data (cross-linked via `reference` schema fields)
- `logs` — audit trail
- `systemsettings` — platform config

## Data relationships

```
Endpoint ──optional──▶ EndpointGroup (network access defaults)
Endpoint / EndpointGroup ──networkAccess──▶ allowed domains + IP/CIDR
EndpointData ──reference field──▶ EndpointData (validated foreign keys)
```

## Database routes

`GET/POST/PUT/DELETE /api/database/collections/:name` — raw MongoDB access (`manage_users`).

## Runtime behavior

- Endpoint definitions read from MongoDB on each request — **no restart** when routes change
- JWT refresh re-issues access tokens with full permission set from user groups

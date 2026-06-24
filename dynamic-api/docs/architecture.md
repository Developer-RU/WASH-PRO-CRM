---
layout: default
redirect_from:
  - /architecture.html

title: Architecture
---

## High-level overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client (Browser)                        │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTP
┌───────────────────────────────▼─────────────────────────────────┐
│  Frontend (React + Vite + Nginx)          Port 8080           │
│  - Admin panel UI                                               │
│  - Proxies /api/* to backend in Docker                          │
└───────────────────────────────┬─────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│  Backend (Express + TypeScript)             Port 3001           │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────┐ │
│  │   Routes    │→ │   Services   │→ │     Repositories        │ │
│  └─────────────┘  └──────────────┘  └───────────┬─────────────┘ │
│  ┌─────────────────────────────────────────────┐ │               │
│  │  Middleware: Auth, RBAC, RateLimit, Error   │ │               │
│  └─────────────────────────────────────────────┘ │               │
│  ┌─────────────────────────────────────────────┐ │               │
│  │  Dynamic Engine (runtime API handler)       │ │               │
│  └─────────────────────────────────────────────┘ │               │
└──────────────────────────────────────────────────┼───────────────┘
                                                   │
┌──────────────────────────────────────────────────▼───────────────┐
│  MongoDB 7                                    Port 27017         │
│  Collections: users, groups, endpoints, endpointgroups,          │
│               endpointdata, logs, systemsettings                 │
└──────────────────────────────────────────────────────────────────┘
```

## Request flow

### Management API request

```
Client → Express Route → authenticate → requirePermission → Service → Repository → MongoDB
```

### Dynamic API request

```
Client → /api/* (dynamic.routes) → DynamicEngine
  → Load endpoint definition from MongoDB (path + method)
  → Check access (public / JWT / group)
  → Validate body against schema (POST/PUT/PATCH)
  → Read/write EndpointData collection
  → Log api_call → Return JSON response
```

## Backend layers

### Routes (`backend/src/routes/`)

Thin HTTP handlers. Parse query/body, call services, return JSON.

| Route prefix | Purpose |
|--------------|---------|
| `/api/auth` | Login, logout, refresh, register |
| `/api/users` | User CRUD |
| `/api/groups` | RBAC group CRUD |
| `/api/profile` | Current user profile |
| `/api/endpoints` | Endpoint & endpoint group management |
| `/api/dashboard` | Stats, logs, system info |
| `/api/database` | Raw MongoDB explorer (manage_users only) |
| `/api/settings` | Platform settings |
| `/api/*` | Dynamic engine (catch-all) |

### Services (`backend/src/services/`)

Business logic, validation, audit logging.

| Service | Responsibility |
|---------|---------------|
| `authService` | Authentication, tokens |
| `userService` | Users and groups |
| `endpointService` | Endpoint CRUD, testing, docs |
| `dashboardService` | Statistics aggregation |
| `logService` | Audit log queries |
| `systemService` | OS/CPU/memory/disk info |
| `settingsService` | Cached settings, rate limit config |

### Repositories (`backend/src/repositories/`)

MongoDB access only. No business logic.

### Models (`backend/src/models/`)

| Model | Description |
|-------|-------------|
| `User` | Accounts with group assignments |
| `Group` | RBAC groups with permissions |
| `Endpoint` | API definition (path, method, schema, access) |
| `EndpointGroup` | UI organization for endpoints |
| `EndpointData` | Stored records for dynamic endpoints |
| `Log` | Audit trail |
| `SystemSettings` | Key-value platform settings |

> **Note:** The endpoint schema is stored in field `fields` on the model (not `schema`) due to Mongoose `Document.schema` naming conflict. API DTOs still accept `schema` in requests.

## Frontend architecture

```
App.tsx
  └── AuthProvider
        └── Layout (sidebar navigation)
              └── Pages (Dashboard, Endpoints, Users…)
                    └── components/UI.tsx (shared components)
                    └── services/api.ts (HTTP client)
```

### Key frontend patterns

- **JWT stored in localStorage** with automatic refresh on 401
- **SearchInput** + `matchesSearch` / `useDebouncedValue` for list filtering
- **Pagination** component with server-side (Users, Logs) and client-side (Endpoint Groups) modes
- **Grouped endpoint tables** — one collapsible section per endpoint group

## Data model relationships

```
User ──many-to-many──▶ Group
Endpoint ──optional──▶ EndpointGroup
Endpoint / EndpointGroup ──networkAccess──▶ allowed domains + IP/CIDR rules
Endpoint ──one-to-many──▶ EndpointData (via endpointId + resourcePath)
EndpointData ──reference fields──▶ EndpointData (cross-endpoint links via `reference` schema fields)
Log ──optional──▶ User, Endpoint
```

## Security architecture

```
Request
  → Helmet headers
  → CORS check
  → Rate limit (dynamic from settings)
  → JWT verification (if required)
  → Dynamic engine: network access (domains / IP pools)
  → Dynamic engine: endpoint access type (public / authenticated / group)
  → Permission check (RBAC, management API)
  → Handler
  → Audit log (on significant actions)
```

## Docker architecture (Variant 1)

| Container | Image | Role |
|-----------|-------|------|
| `dap-mongodb` | mongo:7 | Database |
| `dap-backend` | Custom Node build | API server |
| `dap-frontend` | Custom Nginx build | Static SPA + API proxy |

Volumes:
- `dap_mongodb_data` — persistent database
- `dap_backend_logs` — application logs

## Deployment variants

| Variant | File / path | MongoDB |
|---------|-------------|---------|
| 1 — Docker single | `docker-compose.yml` | 1 node |
| 2 — Docker replica set | `docker-compose.replica.yml` | 3 nodes, `rs0` |
| 3 — Kubernetes | `k8s/` | StatefulSet ×3, `rs0` |

Guides: [Deployment Variants]({{ '/deployment-variants/' | relative_url }}) · [MongoDB Replica Set]({{ '/mongodb-replica-set/' | relative_url }}) · [Kubernetes]({{ '/kubernetes/' | relative_url }})

## Seed data

On first startup, `seedDatabase()` creates:
- 5 system RBAC groups
- Admin user (Super Admin group)
- 7 system endpoints (auth, users, groups, profile)
- 3 default endpoint groups (CRM, SHOP, DEVICES)
- Default system settings

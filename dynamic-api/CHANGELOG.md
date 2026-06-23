# Changelog

All notable changes to **Dynamic API Platform** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **`reference` schema field type** — link records between endpoints (foreign keys)
  - Target endpoint selector in the schema editor (**Linked endpoint**)
  - Validation on create/update: referenced record must exist in the target collection
  - **`?populate=true`** or **`?populate=fieldName`** on GET requests to embed linked records
- **Database Explorer** — admin UI (`/database`) and REST API (`/api/database/*`) for raw MongoDB access
  - Whitelisted collections: users, groups, endpoints, endpointgroups, endpointdatas, logs, systemsettings
  - View, create, edit, delete documents as JSON; search and pagination
  - Requires `manage_users`; sensitive user fields redacted; changes audit-logged
- **Network access rules** — restrict dynamic endpoints by allowed **domains** and **IP/CIDR pools**
  - Configurable on **endpoint groups** and individual **endpoints** (Network Access tab/section)
  - Group inheritance with merged rules; enforced at runtime before JWT access-type checks
  - Admin tester can simulate client IP and `Origin` header
- Documentation: zero-downtime API creation (no server restart on new routes), comparison with Strapi/Directus
- Session handling: centralized `UnauthorizedError` and auth state sync on token expiry

### Fixed

- **Session expiry UX** — expired or invalid tokens redirect to `/login` instead of showing "Failed to load dashboard"
- **JWT refresh bug** — access tokens issued after refresh had empty `permissions` when user groups were populated from MongoDB
- **System endpoint tester** — built-in test for `/api/users`, `/api/groups`, `/api/profile` now calls real management APIs with RBAC (was incorrectly routed through the dynamic engine with `Forbidden: insufficient group permissions`)
- **Dynamic engine** — GET/PUT/DELETE on paths with parameters (e.g. `/api/products/:id`) now resolve records using the collection base path
- Broken images in `docs/screenshots.md` on GitHub (use raw.githubusercontent.com URLs)

### Changed

- License changed from MIT to **Apache License 2.0**
- System endpoints **List Users** and **List Groups**: `accessType` set to `authenticated` (documented as management API; RBAC enforced on the real route)
- Seed migration: existing system endpoints get updated `accessType` and descriptions on backend startup

### Planned

- OpenAPI/Swagger export for dynamic endpoints
- Webhook notifications on endpoint events
- Multi-tenant workspace support
- Endpoint versioning

## [1.0.0] - 2026-06-18

### Added

#### Platform core
- Full-stack Dynamic API Platform deployable via `docker compose up -d`
- Node.js / Express / TypeScript backend with MongoDB persistence
- React / TypeScript / Tailwind CSS admin panel with dark theme
- Dynamic REST API engine — endpoints stored in MongoDB and executed at runtime
- Repository + Service layer architecture on the backend
- Automatic database seeding (admin user, system groups, system endpoints, endpoint groups, default settings)

#### Authentication & security
- JWT access + refresh token authentication
- bcrypt password hashing
- Role-based access control (RBAC) with permission checks
- Login lockout after failed attempts (configurable in Settings)
- API rate limiting (configurable window and max requests)
- Helmet security headers, CORS, CSRF token endpoint
- Audit logging for auth, CRUD, and API calls

#### Dynamic API engine
- Create custom REST endpoints via UI (GET, POST, PUT, PATCH, DELETE)
- Schema builder with field types: `string`, `number`, `boolean`, `object`, `array`, `datetime`, `json`
- Nested object fields support
- Data validation against schema on write operations
- Shared `resourcePath` storage for CRUD on the same path
- Dynamic path parameters (`/api/users/:id`)
- Access types: `public`, `authenticated`, `group`
- Built-in API tester (Postman-like) in endpoint editor
- Auto-generated documentation and request/response examples

#### System endpoints (non-deletable)
- `/api/auth/login`, `/api/auth/logout`, `/api/auth/refresh`, `/api/auth/register`
- `/api/users`, `/api/groups`, `/api/profile`
- `/api/health`, `/api/csrf-token`

#### Admin UI pages
- **Dashboard** — users, endpoints, requests, errors, groups stats + charts
- **Endpoints** — grouped collapsible tables per endpoint group, quick edit, full editor
- **Endpoint Groups** — CRUD with name, description, color, display order
- **Users** — CRUD with groups assignment, server-side pagination and search
- **User Groups** — RBAC groups with permissions, system groups protected
- **Audit Logs** — filter by action, server-side pagination and text search
- **System** — OS, CPU, memory, disk, files, network interfaces with search
- **Settings** — auth lockout, JWT lifetimes, registration toggle, rate limits, log retention, pagination defaults

#### Search
- Unified `SearchInput` component across all dynamic data sections
- Client-side search: Endpoints, User Groups, Endpoint Groups, System network, Schema fields
- Server-side search: Users, Audit Logs

#### DevOps
- Docker Compose with health checks for MongoDB, backend, frontend
- Named volumes: `dap_mongodb_data`, `dap_backend_logs`
- Nginx frontend proxy to backend API in production container
- GitHub Actions CI workflow
- GitHub Pages documentation site (`/docs`)
- Wiki mirror in `/wiki` folder

### Default credentials (change after first login!)
- Login: `admin`
- Password: `Admin123!`

### Default RBAC groups
- Super Admin, Admin, Editor, Manager, User

### Default endpoint groups
- CRM, SHOP, DEVICES

[1.0.0]: https://github.com/Developer-RU/Dynamic-API-Platform/releases/tag/v1.0.0

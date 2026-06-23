<p align="center">
  <img src="docs/banner.png" alt="Dynamic API Platform" width="100%" />
</p>

# Dynamic API Platform

**Open-source platform for creating, managing, and testing REST APIs without writing backend code.**

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](docker-compose.yml)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)](backend/package.json)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](frontend/package.json)

[Documentation](https://developer-ru.github.io/Dynamic-API-Platform/) · [Quick Start](#quick-start) · [Screenshots](#screenshots) · [Features](#features) · [Issues](https://github.com/Developer-RU/Dynamic-API-Platform/issues)

---

## Overview

Dynamic API Platform lets you define REST endpoints through a web admin panel, attach JSON schemas, configure access control, and serve data instantly — powered by MongoDB and a runtime API engine.

**New endpoints go live the moment you save them** — no server restart, no process reload, and no redeploy. Route definitions are stored in MongoDB and resolved on every request, so the API surface can grow and change while the server keeps running.

Perfect for prototyping, internal tools, lightweight BaaS, and teams who need APIs fast without boilerplate.

### What makes it different

Unlike traditional headless CMS platforms (e.g. **Strapi**, **Directus**) or hand-written Express/Fastify apps, where new APIs often mean code changes, builds, or server restarts, Dynamic API Platform treats endpoints as **runtime configuration**:

| | Dynamic API Platform | Typical CMS / custom backend |
|--|----------------------|------------------------------|
| Add a REST endpoint | Save in admin UI → immediately callable | Edit code or content model → rebuild and/or restart |
| Change path or schema | Update in UI, takes effect instantly | Redeploy or restart workers |
| Server downtime | None for API changes | Often required |

This zero-downtime, database-driven routing is the platform’s core differentiator — a true dynamic API engine, not a static route table compiled at startup.

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│   Backend   │────▶│   MongoDB   │
│  React+TS   │     │ Express+TS  │     │             │
│  Port 8080  │     │  Port 3001  │     │  Port 27017 │
└─────────────┘     └─────────────┘     └─────────────┘
```

## Quick Start

```bash
git clone https://github.com/Developer-RU/Dynamic-API-Platform.git
cd Dynamic-API-Platform
docker compose up -d
```

| Service | URL |
|---------|-----|
| **Admin Panel** | http://localhost:8080 |
| **Backend API** | http://localhost:3001 |
| **Health Check** | http://localhost:3001/api/health |

**Default login:** `admin` / `Admin123!` — change immediately in production.

## Screenshots

<p align="center">
  <img src="docs/screenshots/dashboard.png" alt="Dashboard" width="720" />
</p>

<p align="center">
  <a href="docs/screenshots.md">View all screenshots</a> (login, endpoints, settings, system)
</p>

## Features

### Dynamic API Engine
- Create REST endpoints (GET/POST/PUT/PATCH/DELETE) via UI — **live immediately, no server restart or redeploy**
- **`reference` fields** — link records between endpoints (foreign keys) with validation and optional `?populate=`
- Schema builder: `string`, `number`, `boolean`, `object`, `array`, `datetime`, `json`, `reference`
- Path parameters (`/api/items/:id`), validation, default values
- **Network access** — restrict callers by allowed domains and IP/CIDR pools (group + endpoint level)
- Built-in API tester and auto-generated documentation

### Security
- JWT authentication with refresh tokens
- RBAC with 5 system groups + custom groups
- **Network access rules** for dynamic endpoints (domains, IP pools)
- Login lockout, API rate limiting, audit logs
- Helmet, CORS, CSRF token endpoint, bcrypt passwords

### Admin Panel
- Dashboard with charts (requests, errors, user activity)
- Grouped endpoint tables with search and filters
- Users & groups management with pagination
- **Database Explorer** — raw MongoDB JSON browser/editor (manage_users)
- System monitoring (CPU, memory, disk, network)
- Settings: auth, rate limits, log retention, pagination

### DevOps
- One-command Docker Compose deployment
- Health checks, persistent volumes, nginx API proxy
- GitHub Actions CI, GitHub Pages docs

## Example

```bash
# Get token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"admin","password":"Admin123!"}' | jq -r '.data.accessToken')

# Create product via dynamic API
curl -X POST http://localhost:3001/api/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Laptop","price":999}'

# List products
curl http://localhost:3001/api/products -H "Authorization: Bearer $TOKEN"
```

## Documentation

| Document | Description |
|----------|-------------|
| [Getting Started](docs/getting-started.md) | Installation and first endpoint |
| [Architecture](docs/architecture.md) | System design and data flow |
| [API Reference](docs/api-reference.md) | All management endpoints |
| [RBAC](docs/rbac.md) | Permissions and access control |
| [Dynamic Engine](docs/dynamic-api-engine.md) | How runtime APIs work |
| [Network Access](docs/network-access.md) | Domain and IP/CIDR restrictions |
| [Database Explorer](docs/database.md) | Raw MongoDB admin UI and API |
| [Deployment](docs/deployment.md) | Production setup |
| [Configuration](docs/configuration.md) | Environment variables |
| [FAQ](docs/faq.md) | Common questions |
| [Screenshots](docs/screenshots.md) | UI gallery |

**Online docs:** https://developer-ru.github.io/Dynamic-API-Platform/

## Project Structure

```
├── docker-compose.yml      # Docker orchestration
├── .env.example            # Environment template
├── docs/                   # GitHub Pages documentation
├── wiki/                   # GitHub Wiki mirror
├── backend/
│   └── src/
│       ├── models/         # Mongoose schemas
│       ├── repositories/   # Data access layer
│       ├── services/       # Business logic
│       ├── routes/         # Express routes
│       ├── middleware/     # Auth, RBAC, rate limit
│       └── seed/           # Initial data
└── frontend/
    └── src/
        ├── pages/          # Admin panel pages
        ├── components/     # UI components
        └── services/       # API client
```

## Local Development

```bash
# MongoDB
docker run -d -p 27017:27017 mongo:7

# Backend (port 3001)
cd backend && npm install && npm run dev

# Frontend (port 5173)
cd frontend && npm install && npm run dev
```

See [Development Guide](docs/development.md) for details.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | *(change me)* | JWT signing secret |
| `MONGODB_URI` | `mongodb://mongodb:27017/dynamic_api` | Database URL |
| `CORS_ORIGIN` | `http://localhost:8080` | Frontend origin |
| `ADMIN_LOGIN` | `admin` | Seed admin login |
| `ADMIN_PASSWORD` | `Admin123!` | Seed admin password |

Full list: [.env.example](.env.example) · [Configuration docs](docs/configuration.md)

## Contributing

Contributions welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Security

Report vulnerabilities privately — see [SECURITY.md](SECURITY.md).

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

### Recent updates (Unreleased)

- **`reference` schema fields** — foreign keys between endpoints, `?populate=` on GET
- **Network access** — allowed domains and IP/CIDR pools on endpoints and endpoint groups
- **Database Explorer** — raw MongoDB UI at `/database` and `/api/database/*` API
- **Zero-downtime routing** — new endpoints without server restart
- **Auth fixes** — session redirect to login, JWT refresh permissions
- **System endpoint tester** — correct RBAC for `/api/users`, `/api/groups`, `/api/profile`
- **License** — Apache 2.0

## License

[Apache License 2.0](LICENSE) © 2026 Developer-RU

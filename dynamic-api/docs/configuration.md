---
layout: default
redirect_from:
  - /configuration.html

title: Configuration
---

## Environment variables

Copy `.env.example` to `.env` for Docker Compose variable substitution.

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | `production` in Docker |
| `PORT` | `3001` | Backend HTTP port |
| `MONGODB_URI` | `mongodb://localhost:27017/dynamic_api` | MongoDB connection string |
| `JWT_SECRET` | *(dev default)* | Access token signing secret |
| `JWT_REFRESH_SECRET` | *(dev default)* | Refresh token signing secret |
| `JWT_EXPIRES_IN` | `15m` | Access token lifetime |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Refresh token lifetime |
| `CORS_ORIGIN` | `http://localhost:8080` | Allowed frontend origin |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate limit window (15 min) |
| `RATE_LIMIT_MAX` | `1000` | Max requests per window |
| `CSRF_SECRET` | *(dev default)* | CSRF cookie secret |
| `ADMIN_LOGIN` | `admin` | Seed admin login |
| `ADMIN_EMAIL` | `admin@dynamic-api.local` | Seed admin email |
| `ADMIN_PASSWORD` | `Admin123!` | Seed admin password |
| `VITE_API_URL` | `""` | Frontend API base (build-time) |
| `APP_VERSION` | `package.json` | Installed version for update checks |
| `UPDATE_EXECUTOR_ENABLED` | `false` | Enable in-app apply/rollback |
| `UPDATE_DEPLOY_MODE` | `docker` | `docker`, `docker-replica`, `native` |
| `UPDATE_COMPOSE_FILE` | `/deploy/docker-compose.yml` | Compose file in project mount |
| `UPDATE_PROJECT_ROOT` | `/deploy` | Host project path in container |
| `UPDATE_DATA_DIR` | `/app/data/updates` | Update job data directory |
| `UPDATE_HEALTH_URL` | `http://localhost:3001/api/health` | Post-update health probe |
| `UPDATE_RUNNER_IMAGE` | `docker:26-cli` | Detached updater container image |

See [Software Updates]({{ '/updates/' | relative_url }}) for auto-update setup.

> **Production:** Change all secrets and default admin password.

---

## Settings UI (`/settings`)

Runtime-configurable options stored in MongoDB `SystemSettings` collection.

### Authentication

| Setting | Description |
|---------|-------------|
| Max login attempts | Failed attempts before IP lockout |
| Lockout duration | Minutes blocked after max attempts |
| JWT access lifetime | Displayed/stored (env may apply on restart) |
| JWT refresh lifetime | Displayed/stored |
| Enable registration | Allow `POST /api/auth/register` |

### API rate limiting

| Setting | Description |
|---------|-------------|
| Rate limit enabled | Toggle dynamic rate limiter |
| Window (ms) | Time window for request counting |
| Max requests | Requests allowed per window per IP |

Rate limit middleware reads cached settings and updates without restart.

### Logs

| Setting | Description |
|---------|-------------|
| Log retention (days) | Auto-delete logs older than N days |
| Clear all logs | Button — deletes entire audit log |
| Clear old logs | Button — deletes by retention policy |

### Pagination defaults

| Setting | Description |
|---------|-------------|
| Logs per page | Default for Logs page |
| Users per page | Default for Users page |

### Software updates

Configured via separate API (`/api/updates/settings`). See [Software Updates]({{ '/updates/' | relative_url }}).

---

## Docker Compose overrides

Create `docker-compose.override.yml` (gitignored) for local customizations:

```yaml
services:
  frontend:
    ports:
      - "3000:80"
  backend:
    environment:
      NODE_ENV: development
```

---

## Frontend configuration

### Development proxy

`frontend/vite.config.ts` proxies `/api` to backend during `npm run dev`.

### Production nginx

`frontend/nginx.conf` proxies `/api/` to `http://backend:3001/api/`.

---

## MongoDB

Default database name: `dynamic_api`

Collections created automatically on first use:
- `users`, `groups`, `endpoints`, `endpointgroups`
- `endpointdatas`, `logs`, `systemsettings`

---

## Logging

- HTTP access logs via Morgan (`combined` in production)
- Audit logs in MongoDB `logs` collection
- Backend file logs in Docker volume `dap_backend_logs` at `/app/logs`

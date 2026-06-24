Full guide: [Troubleshooting](https://dynamic-api-platform.github.io/Dynamic-API-Platform/troubleshooting/)

## Port in use

Change ports in `docker-compose.yml`.

## API errors in frontend

Check `curl http://localhost:3001/api/health` and `CORS_ORIGIN`.

## Login returns "Endpoint not found" (port 8080)

Nginx may strip the API path. Use `proxy_pass http://backend:3001;` in `frontend/nginx.conf` (no URI suffix with variables). Rebuild frontend: `docker compose build frontend && docker compose up -d frontend`.

## "Failed to load dashboard" after idle

Session expired. Rebuild with latest images — app should redirect to `/login`:

```bash
docker compose build --no-cache && docker compose up -d
```

## Login fails

Default: `admin` / `Admin123!`. Check lockout in Settings.

## System endpoint test: Forbidden on `/api/users`

Use latest backend. System routes require RBAC (`manage_users` or `view`), not dynamic group access.

## Reference field rejected on POST

Target record must exist first. Create the linked endpoint's record and use its `id`.

## Database Explorer

Admin UI: `/database` — raw JSON for whitelisted collections. API: `/api/database/*`. Requires `manage_users`.

## Database menu missing

Requires `manage_users` permission (Admin / Super Admin group).

## Network access denied (403)

Endpoint or group has **Network access** enabled. Add your domain (`Origin`) and/or client IP to allowed lists. See [Network Access](Network-Access).

## Reset all data

```bash
docker compose down -v
docker compose up -d
```

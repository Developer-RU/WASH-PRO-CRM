---
layout: default
redirect_from:
  - /faq.html

title: FAQ
---

## General

### What is Dynamic API Platform?

An open-source platform for creating REST APIs through a web interface. Define endpoints, schemas, and access rules — the platform serves them at runtime without writing backend code.

### Who is it for?

- Prototyping APIs quickly
- Internal tools and admin backends
- Teams needing a lightweight BaaS alternative
- Learning full-stack TypeScript architecture

### Is it production-ready?

Version 1.0 is functional for small-to-medium deployments. For production:
- Change all default secrets
- Use HTTPS
- Don't expose MongoDB publicly
- Review [Security Policy](https://github.com/Dynamic-API-Platform/Dynamic-API-Platform/blob/main/SECURITY.md)

---

## Endpoints

### Can I use the same path for GET and POST?

Yes. Data is shared via `resourcePath`. Classic REST pattern works out of the box.

### Can I delete system endpoints?

No. Endpoints like `/api/auth/login` are marked `isSystem: true` and protected.

### What HTTP methods are supported?

GET, POST, PUT, PATCH, DELETE.

### Can I add custom business logic?

Not in v1.0. The engine handles CRUD with schema validation only. For custom logic, extend the backend service layer.

### Can I link records between endpoints (foreign keys)?

Yes. Add a schema field with type **`reference`**, then select the **target endpoint** in the editor. The value stored is a record ID from that endpoint's collection. On create/update the platform validates the link. On GET use `?populate=true` or `?populate=fieldName` to embed linked data.

Example: `categoryId` (reference → `GET /api/categories`) on `/api/products`.

See [Dynamic API Engine — References]({{ '/dynamic-api-engine/' | relative_url }}#references-foreign-keys-between-endpoints).

---

## Authentication

### How do tokens work?

- **Access token** — short-lived JWT in `Authorization: Bearer` header
- **Refresh token** — long-lived, used to get new access tokens via `/api/auth/refresh`

### Can I disable self-registration?

Yes. Settings → Authentication → Disable registration.

### What happens after too many failed logins?

IP is temporarily locked out (configurable attempts and duration in Settings).

### Why was I stuck on "Failed to load dashboard" after idle time?

Fixed in recent builds: expired sessions now redirect to `/login`. If you still see the error, hard-refresh the page (`Ctrl+F5`) or clear `localStorage` tokens and log in again.

---

## Data

### Where is endpoint data stored?

MongoDB `endpointdatas` collection, linked by `endpointId` and `resourcePath`. Admins with `manage_users` can inspect raw documents in **Database → Endpoint Data**.

### Can I browse MongoDB from the admin panel?

Yes. **Administration → Database** (`/database`) shows whitelisted collections as raw JSON. Requires `manage_users`. See [Database Explorer]({{ '/database/' | relative_url }}).

### Can I restrict an endpoint to specific domains or IP addresses?

Yes. Use **Network Access** on endpoint groups or the **Network Access** tab on an endpoint. Allow callers by domain (`Origin` / `Referer`) and/or IPv4 address/CIDR pool. See [Network Access]({{ '/network-access/' | relative_url }}).

### What happens if I change the schema?

Existing records are **not** automatically migrated. New validation applies on write.

---

## Deployment

### Which deployment should I use?

See [Deployment Variants]({{ '/deployment-variants/' | relative_url }}): Docker single (default), Docker replica set (HA DB), or Kubernetes (scaled backend).

### Why is frontend on port 8080?

Default Docker mapping `8080:80`. Change in `docker-compose.yml` if port 8080 is occupied.

### Why does login return "Endpoint not found" through port 8080?

Usually a misconfigured nginx `proxy_pass` that forwards `POST /api/` instead of the full path. Rebuild the frontend image from the latest `frontend/nginx.conf` or use `proxy_pass http://backend:3001;` without a URI suffix when using variables.

### Can I use external MongoDB?

Yes. Set `MONGODB_URI` to your MongoDB Atlas or managed instance URL. For HA, use a replica set connection string with `?replicaSet=`.

### How do I run tests?

```bash
cd backend && npm test
```

See [Testing]({{ '/testing/' | relative_url }}).

### Does it work on ARM (Apple Silicon)?

Yes. All Docker images support multi-arch.

---

## UI

### How does endpoint grouping work?

Create groups in **Endpoint Groups**, assign endpoints to groups. The **Endpoints** page shows collapsible sections per group.

### Is there a visual map of all endpoints?

Yes. **API → API Schema** (`/api-schema`) shows a read-only ER-style diagram: endpoint groups, resource tables, field columns, and `reference` links with arrows. See [API Schema]({{ '/api-schema/' | relative_url }}).

### Is there a light theme?

Yes. Use the **sun/moon** button in the top header (or the link on the login page) to switch between **light** (slate + cyan, CRM-style) and **dark** themes. Preference is saved in `localStorage`.

---

## Open source

### What license?

Apache License 2.0 — free for commercial and personal use.

### How to contribute?

See [CONTRIBUTING.md](https://github.com/Dynamic-API-Platform/Dynamic-API-Platform/blob/main/CONTRIBUTING.md).

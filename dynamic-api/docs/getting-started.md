---
layout: default
redirect_from:
  - /getting-started.html

title: Getting Started
---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) 24+ and Docker Compose v2
- **Or** for local development: Node.js 20+, npm, MongoDB 7+

## Installation

Three deployment options are available — see [Deployment Variants]({{ '/deployment-variants/' | relative_url }}) for a full comparison.

| Variant | Command | When |
|---------|---------|------|
| **1. Docker (single)** | `docker compose up -d` | Default — fastest start |
| **2. Docker replica set** | `docker compose -f docker-compose.replica.yml up -d` | HA MongoDB on Docker |
| **3. Kubernetes** | `./k8s/scripts/deploy.sh` | K8s cluster |

### Variant 1 — Docker (recommended for first run)

```bash
# Clone repository
git clone https://github.com/Dynamic-API-Platform/Dynamic-API-Platform.git
cd Dynamic-API-Platform

# Optional: copy and edit environment variables
cp .env.example .env

# Start all services
docker compose up -d

# Check status
docker compose ps
```

Wait until all three containers are healthy (`dap-mongodb`, `dap-backend`, `dap-frontend`).

### Access the platform

1. Open **http://localhost:8080**
2. Log in with:
   - Login: `admin`
   - Password: `Admin123!`
3. Go to **Settings** and change the admin password
4. Open **Settings → Software Updates** to check for new releases or click **Update now**
5. Update JWT secrets in `.env` before any production use

## Create your first dynamic endpoint

### Via Admin UI

1. Navigate to **Endpoint Groups** → create a group (e.g. `SHOP`)
2. Go to **Endpoints** → **New Endpoint**
3. Fill in:
   - Name: `List Products`
   - Path: `/api/products`
   - Method: `GET`
4. Open the full editor → **Schema** tab → add fields:
   - `name` — string, required
   - `price` — number, required
5. Save and test on the **Test** tab

### Via API (curl)

```bash
# 1. Get access token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"admin","password":"Admin123!"}' \
  | jq -r '.data.accessToken')

# 2. Create endpoint
curl -X POST http://localhost:3001/api/endpoints \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Products",
    "description": "Product catalog",
    "slug": "products",
    "path": "/api/products",
    "method": "GET",
    "accessType": "authenticated",
    "schema": [
      {"name": "name", "type": "string", "required": true, "order": 0},
      {"name": "price", "type": "number", "required": true, "order": 1}
    ]
  }'

# 3. Create a POST endpoint on the same path for writing data
curl -X POST http://localhost:3001/api/endpoints \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Create Product",
    "path": "/api/products",
    "method": "POST",
    "accessType": "authenticated",
    "schema": [
      {"name": "name", "type": "string", "required": true, "order": 0},
      {"name": "price", "type": "number", "required": true, "order": 1}
    ]
  }'

# 4. Add data
curl -X POST http://localhost:3001/api/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Laptop", "price": 999}'

# 5. Read data
curl http://localhost:3001/api/products \
  -H "Authorization: Bearer $TOKEN"
```

## Link endpoints (reference fields)

Use type **`reference`** to connect records across endpoints (like a foreign key):

1. Create the **target** endpoint first (e.g. `GET/POST /api/categories` with a `name` field)
2. POST a category and note its `id` from the response
3. On **Products**, open **Schema** → add field `categoryId`, type **`reference`**
4. Select **Linked endpoint**: `GET /api/categories — List Categories`
5. Save. When creating a product, pass `"categoryId": "<category-record-id>"`

**Read with embedded category:**

```bash
curl "http://localhost:3001/api/products?populate=categoryId" \
  -H "Authorization: Bearer $TOKEN"
```

Details: [Dynamic API Engine — References]({{ '/dynamic-api-engine/' | relative_url }}#references-foreign-keys-between-endpoints).

## Restrict API access by domain or IP

Network access is separate from JWT/RBAC. Use it to allow only specific frontends or server subnets.

### Via Admin UI

1. **Endpoint Groups** → edit group → **Network Access** section  
   - Enable rules, add domains (`app.example.com`, `*.example.com`) and/or IP-CIDR (`10.0.0.0/8`)
2. **Endpoints** → edit endpoint → **Network Access** tab  
   - Toggle **Inherit rules from endpoint group** or define endpoint-only rules

### Example: partner webhook (IP only)

1. Create `POST /api/webhooks/partner` with access type `public` or `authenticated`
2. **Network Access** tab → disable inherit → enable rules
3. Add IP range: `203.0.113.0/24`
4. Save — calls from other IPs return `403 Forbidden: network access denied`

Full guide: [Network Access]({{ '/network-access/' | relative_url }}).

## Navigation overview

| Section | Path | Description |
|---------|------|-------------|
| Dashboard | `/` | KPI cards, automation health, 7-day charts (requests, webhooks, cron, traffic by source) |
| Endpoints | `/endpoints` | Manage APIs (grouped tables) |
| Endpoint Groups | `/endpoint-groups` | Organize endpoints |
| API Schema | `/api-schema` | Read-only ER diagram (groups, fields, FK arrows) |
| API Docs | `/api-docs` | Embedded OpenAPI / Swagger UI |
| Cron Jobs | `/cron` | Scheduled tasks |
| Webhooks | `/webhooks` | Outbound event subscriptions |
| API Keys | `/api-keys` | Machine-to-machine authentication |
| MCP Server | `/mcp` | AI agent tools and JSON-RPC endpoint |
| Users | `/users` | User management |
| User Groups | `/groups` | RBAC permissions |
| Audit Logs | `/logs` | API calls, webhooks, cron, MCP, auth events |
| Database | `/database` | Raw MongoDB collections (JSON; requires `manage_users`) |
| System | `/system` | Server resources |
| Settings | `/settings` | Platform configuration |

Network access is configured under **Endpoint Groups** and the **Network Access** tab on each endpoint — not in Settings.

## Interface preview

![Login page]({{ '/screenshots/login.png' | relative_url }})

![Dashboard]({{ '/screenshots/dashboard.png' | relative_url }})

[Full screenshot gallery →]({{ '/screenshots/' | relative_url }})

## Next steps

- Read [Architecture](architecture.md) to understand the system design
- Review [RBAC](rbac.md) before adding team members
- Follow [Deployment](deployment.md) for production setup

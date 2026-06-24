## 1. Start platform

```bash
docker compose up -d
```

## 2. Login

- URL: http://localhost:8080
- Login: `admin` / Password: `Admin123!`

## 3. Create endpoint group

**Endpoint Groups** → **New Group** → Name: `SHOP`

## 4. Create endpoint

**Endpoints** → **New Endpoint**:
- Name: Products
- Path: `/api/products`
- Method: GET
- Group: SHOP

## 5. Add schema

Open full editor → **Schema** → Add fields:
- `name` (string, required)
- `price` (number, required)

## 6. Create POST endpoint

Same path `/api/products`, method POST, same schema.

## 7. Link another endpoint (optional)

1. Create `GET/POST /api/categories` with field `name`
2. POST a category, copy its `id`
3. On Products schema add `categoryId` — type **`reference`**, linked endpoint **Categories**
4. POST product with `"categoryId": "<id>"`
5. GET `/api/products?populate=categoryId` to see embedded category

## 8. Browse raw data (optional)

**Administration → Database** — view/edit MongoDB collections as JSON. Requires `manage_users`.

## 10. Automation (optional)

- **Cron Jobs** (`/cron`) — scheduled tasks
- **Webhooks** (`/webhooks`) — outbound events
- **API Keys** (`/api-keys`) — M2M auth
- **MCP Server** (`/mcp`) — AI agent tools via JSON-RPC

## 11. Test

**Test** tab → Send request with JSON body.

Or via curl — see [Getting Started](https://dynamic-api-platform.github.io/Dynamic-API-Platform/getting-started/).

**Note:** New endpoints work immediately — no Docker restart required.

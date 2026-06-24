---
layout: default
redirect_from:
  - /api-schema.html

title: API Schema
description: Read-only ER diagram of endpoints, groups, fields, and reference links
---

The **API Schema** page (`/api-schema`) is a read-only visual map of your dynamic API — similar to an ER diagram in MySQL Workbench. It helps you see how endpoint groups, resources, fields, and `reference` (foreign key) links fit together.

Open it from the admin panel: **API → API Schema**.

## What you see

| Element | Description |
|---------|-------------|
| **Dashed frames** | Endpoint groups (CRM, SHOP, etc.) with group color |
| **Tables** | One table per API path — all HTTP methods on that path share one resource |
| **Table header** | Resource name + path, colored by group |
| **Method row** | GET, POST, PUT… badges — click to open the **Test** tab for that method |
| **Columns** | `Field`, `Type`, `Key` — like database columns |
| **`_id` row** | Primary key (PK) — MongoDB document ID |
| **`reference` rows** | Foreign keys (FK) — highlighted in violet |
| **Violet arrows** | Links from FK field to the target resource table |
| **Arrow labels** | Name of the referencing field |

## Quick actions

On each table header:

| Button | Action |
|--------|--------|
| Pencil | Open full endpoint editor |
| Flask | Open **Test** tab for the primary endpoint |

Click any **method badge** in the methods row to jump directly to **Test** for that specific HTTP method.

## Filters

| Toggle | Effect |
|--------|--------|
| **Show reference links** | Draw FK arrows between tables (default: on) |
| **Include system APIs** | Show `/api/auth/*`, `/api/users`, etc. (default: on) |

Counter at the top: `N resources · M references · K groups`.

## How tables are built

1. Endpoints with the **same path** are merged into **one table** (e.g. `GET /api/products` + `POST /api/products`).
2. Schema fields are taken from the write-oriented method (POST → PUT → PATCH → GET).
3. If `_id` is not in the schema, it is shown automatically as **PK**.
4. Fields with type **`reference`** and a linked target endpoint produce **FK** badges and arrows.

## Example: products → categories

1. Create `GET/POST /api/categories` with field `name`
2. Create `GET/POST /api/products` with fields `name`, `price`, `categoryId` (type **`reference`** → categories)
3. Open **API Schema** — you see two tables and a violet arrow from `categoryId` to categories

Details on reference fields: [Dynamic API Engine — References]({{ '/dynamic-api-engine/' | relative_url }}#references-foreign-keys-between-endpoints).

## Read-only

The schema view does **not** edit data or endpoints. Use **Endpoints** or the pencil icon on a table to make changes.

## Requirements

- Permission to view endpoints (`view` or `manage_api`)
- Endpoints and groups must exist — empty platform shows “No endpoints to display”

## Related

- [Getting Started — Navigation]({{ '/getting-started/' | relative_url }}#navigation-overview)
- [Dynamic API Engine]({{ '/dynamic-api-engine/' | relative_url }})
- [Endpoint Groups]({{ '/getting-started/' | relative_url }}) — organize tables inside group frames

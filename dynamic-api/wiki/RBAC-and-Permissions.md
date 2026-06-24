Full guide: [RBAC](https://dynamic-api-platform.github.io/Dynamic-API-Platform/rbac/)

## Permissions

`view`, `create`, `update`, `delete`, `manage_users`, `manage_api`, `view_logs`

## System groups

| Group | Access |
|-------|--------|
| Super Admin | Full |
| Admin | Full |
| Editor | API management |
| Manager | API + logs |
| User | View only |

## Endpoint access types (dynamic CRUD)

- `public` — no auth
- `authenticated` — any logged-in user
- `group` — user must belong to `allowedGroupIds`

## Network access (dynamic endpoints)

Separate from RBAC — restrict callers by **allowed domains** and **IP/CIDR pools** on endpoint groups and endpoints. See [Network Access](Network-Access).

## Database Explorer

**Administration → Database** — raw JSON editor for whitelisted MongoDB collections. Requires **`manage_users`**.

## System endpoints in the UI

Entries like **List Users** (`GET /api/users`) document the **management API**. They use RBAC on real Express routes (`manage_users` / `view`), not dynamic engine group checks. The built-in **Test** tab invokes those routes directly.

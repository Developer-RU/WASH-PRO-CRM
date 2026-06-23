Full guide: [Network Access](https://developer-ru.github.io/Dynamic-API-Platform/network-access/)

Restrict **dynamic API** calls by **allowed domains** and **IP/CIDR pools** — separate from JWT/RBAC access types.

## Configure

| Level | UI |
|-------|-----|
| Group | **Endpoint Groups** → edit → Network Access |
| Endpoint | **Endpoints** → edit → **Network Access** tab |

## Rules

- **Domains:** `app.example.com`, `*.example.com` (from `Origin` / `Referer` / `Host`)
- **IPs:** `192.168.1.1`, `10.0.0.0/8` (from client IP / `X-Forwarded-For`)

When both lists are set, a request passes if **domain OR IP** matches.

## Inheritance

Endpoints default to **inherit from group** — group rules merge with endpoint rules.

Turn off inherit to use endpoint-only rules.

## Response

Blocked: `403 Forbidden: network access denied`

## Admin tester

**Test** tab → enable **Apply network access rules during test** + optional simulated IP / Origin.

## Notes

- Management API routes (`/api/users`, etc.) are not filtered
- IPv4 CIDR supported; IPv6 CIDR not supported

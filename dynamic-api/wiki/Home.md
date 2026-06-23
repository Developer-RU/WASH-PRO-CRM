Welcome to the **Dynamic API Platform** wiki.

Create, manage, and test REST APIs without writing backend code.

## About

Endpoints are stored in MongoDB and served **at runtime** — add or change a route in the admin UI and it is callable immediately, with **no server restart or redeploy**. This is the main difference from Strapi, Directus, and typical custom backends where new APIs usually require code changes and a rebuild or restart.

## What's new (recent)

| Update | Summary |
|--------|---------|
| **`reference` fields** | Foreign keys between endpoints; `?populate=` on GET |
| **Network access** | Restrict dynamic APIs by domain and IP/CIDR (group + endpoint) |
| **Database Explorer** | Raw MongoDB UI + API (`/database`, `/api/database/*`) |
| **Zero-downtime routes** | Endpoints live immediately after save |
| **Auth fixes** | Session redirect, JWT refresh permissions |
| **System endpoint tests** | Real RBAC routes for `/api/users`, etc. |

Full list: [CHANGELOG.md](https://github.com/Developer-RU/Dynamic-API-Platform/blob/main/CHANGELOG.md)

## Quick links

- [Installation](Installation)
- [Quick Start Guide](Quick-Start-Guide)
- [Dynamic API Engine](Dynamic-API-Engine)
- [Network Access](Network-Access)
- [Database Explorer](Database-Explorer)
- [Screenshots](Screenshots)
- [API Reference](API-Reference)
- [RBAC & Permissions](RBAC-and-Permissions)
- [Deployment](Deployment)
- [FAQ](FAQ)
- [Troubleshooting](Troubleshooting)

## Online documentation

Full docs with search: **https://developer-ru.github.io/Dynamic-API-Platform/**

## Repository

https://github.com/Developer-RU/Dynamic-API-Platform

## Default credentials (development)

| Field | Value |
|-------|-------|
| Login | `admin` |
| Password | `Admin123!` |

Change immediately after first login in production.

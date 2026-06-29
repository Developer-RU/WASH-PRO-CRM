---
layout: default
redirect_from:
  - /live-ui.html

title: Live UI Indicator
---

The admin header shows a **Live** badge on every authenticated page (since **v1.5.12**). It tells you whether the current page auto-refreshes or loads data once.

## Badge states

| State | Pages | Text |
|-------|-------|------|
| **Live polling** | Dashboard (`/`), System (`/system`) | `Live · каждые N сек · HH:MM:SS` |
| **Static data** | All other admin pages | `Live · статические данные` |

The green dot **pulses** on polling pages and is **steady** on static pages.

## Polling intervals

| Page | Interval | Data |
|------|----------|------|
| **Dashboard** | 15 seconds | KPI cards, charts, automation health |
| **System** | 10 seconds | CPU, memory, disk, network, app version |

Intervals are defined in `frontend/src/constants/live.ts`.

## Static pages

Endpoints, users, settings, logs, cron, webhooks, API keys, MCP, database explorer, and similar pages load data when you open them (or when you click **Refresh**). The header shows **статические данные** so you know there is no background polling.

## Implementation

- `LiveModeContext` — current page registers its mode in the header
- `usePolling` hook — fetch + interval + live badge registration
- `StaticDataRegistrar` in `Layout` — registers static mode for non-polling routes

See also: [UI Themes]({{ '/themes/' | relative_url }}) (palette button in the same header).

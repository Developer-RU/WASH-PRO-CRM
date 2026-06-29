# Live UI indicator (wiki)

**v1.5.12+** — full guide: [Live UI Indicator](https://dynamic-api-platform.github.io/Dynamic-API-Platform/live-ui/)

## Header badge

Every admin page shows a green **Live** badge in the header:

| Mode | Pages | Label |
|------|-------|-------|
| Auto-refresh | Dashboard, System | `каждые N сек · time` |
| Static | All others | `статические данные` |

## Intervals

- **Dashboard** — 15 s (KPIs, charts)
- **System** — 10 s (resources, version)

Other pages load on open or manual **Refresh** only.

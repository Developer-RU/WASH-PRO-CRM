---
layout: default
redirect_from:
  - /themes.html

title: UI Themes
---

The admin panel supports **four color themes**. Your choice is saved in the browser (`localStorage`) and applies instantly — no reload required.

## Switching themes

| Where | How |
|-------|-----|
| **Header** | Click the **palette** icon — cycles Dark → Light → Ocean → Forest |
| **Login page** | Link below the sign-in form |
| **Settings → Display** | Pick **Default theme** for new deployments (per-user override still applies) |

## Available themes

### Dark (default)

Slate background with **cyan** accents. Balanced contrast for long admin sessions — the classic Dynamic API Platform look.

### Light

Bright surfaces for **daytime** or well-lit offices. Same layout, higher background luminance.

### Ocean

**Deep navy** panels with **teal** highlights. Calm, technical aesthetic — suited to monitoring dashboards and API ops.

### Forest

**Charcoal green** surfaces with **emerald** accents. Reduced eye strain in low-light environments; distinct from the default cyan palette.

## Technical notes

- Themes use CSS variables (`--dap-bg`, `--dap-card`, `--dap-brand-*`) on `html[data-theme="…"]`
- **Light** disables Tailwind `dark:` mode; **Dark**, **Ocean**, and **Forest** use dark-mode component styles
- Dashboard charts adapt grid and tooltip colors per theme
- Default theme in **Settings** is stored server-side; active theme is per browser

## Related

- [Configuration]({{ '/configuration/' | relative_url }}) — `default_theme` in Settings UI
- [Screenshots]({{ '/screenshots/' | relative_url }}) — UI gallery

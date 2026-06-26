# Software Updates (wiki)

**v1.5+** includes an in-app update system for Docker deployments.

## Features

- Check [GitHub Releases](https://github.com/Dynamic-API-Platform/Dynamic-API-Platform/releases) for new versions
- Notification banner when an update is available
- **Update now** in Settings → Software Updates
- Optional scheduled auto-update
- Progress steps: snapshot → fetch → deploy → health
- **Cancel** active jobs from Settings
- Stale jobs (target older than installed version) auto-failed on startup
- **Up to date** / **Update available** status with correct GitHub latest (v1.5.8+)
- Automatic rollback if health check fails after deploy

## Out of the box

```bash
git clone https://github.com/Dynamic-API-Platform/Dynamic-API-Platform.git
cd Dynamic-API-Platform
docker compose up -d --build
```

Auto-update is **enabled by default** — Docker socket and project directory are mounted automatically.

Open **Settings → Software Updates** — status should show **Auto-update: Ready**.

## System page

**System** shows installed version (`APP_VERSION`), deploy mode, and auto-update readiness.

## Full documentation

https://dynamic-api-platform.github.io/Dynamic-API-Platform/updates/

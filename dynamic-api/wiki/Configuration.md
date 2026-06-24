Full guide: [Configuration](https://dynamic-api-platform.github.io/Dynamic-API-Platform/configuration/)

Copy `.env.example` to `.env`.

## Key variables

| Variable | Default (Docker) | Notes |
|----------|------------------|-------|
| `MONGODB_URI` | `mongodb://mongodb:27017/dynamic_api` | See replica set / K8s URIs in [Deployment](Deployment) |
| `JWT_SECRET` | — | **Change in production** |
| `JWT_REFRESH_SECRET` | — | **Change in production** |
| `CSRF_SECRET` | — | **Change in production** |
| `CORS_ORIGIN` | `http://localhost:8080` | Your frontend URL |
| `ADMIN_PASSWORD` | `Admin123!` | Seeded on first run |
| `RATE_LIMIT_MAX` | `1000` | Raise for load testing |

## MongoDB URI by deployment

```env
# Variant 1 — single node
MONGODB_URI=mongodb://mongodb:27017/dynamic_api

# Variant 2 — Docker replica set
MONGODB_URI=mongodb://mongo1:27017,mongo2:27017,mongo3:27017/dynamic_api?replicaSet=rs0

# Managed (Atlas)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dynamic_api
```

Runtime settings in admin panel: **Settings** page.

Full guide: [Deployment](https://dynamic-api-platform.github.io/Dynamic-API-Platform/deployment/)

## Deployment variants

| # | Stack | File / path |
|---|--------|-------------|
| 1 | 1× MongoDB + backend + frontend | `docker-compose.yml` |
| 2 | 3× MongoDB replica set + backend + frontend | `docker-compose.replica.yml` |
| 3 | K8s StatefulSet + Deployments | `k8s/` |

See [Deployment Variants](Deployment-Variants) for ports, URIs, and when to choose each.

## Production checklist

1. Change `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CSRF_SECRET`
2. Change admin password in Settings
3. Set `CORS_ORIGIN` to your domain
4. Use HTTPS (reverse proxy)
5. Don't expose MongoDB publicly
6. Use replica set or managed MongoDB (Atlas) for HA
7. Pin Docker image tags in production

## Commands

**Variant 1:**
```bash
docker compose up -d --build
docker compose logs -f backend
docker compose down        # keep data
docker compose down -v     # removes data!
```

**Variant 2:**
```bash
docker compose -f docker-compose.replica.yml up -d --build
docker compose -f docker-compose.replica.yml down -v
```

**Variant 3:**
```bash
npm run k8s:deploy
npm run k8s:status
npm run k8s:teardown
```

## MongoDB connection strings

| Variant | `MONGODB_URI` |
|---------|----------------|
| Docker single | `mongodb://mongodb:27017/dynamic_api` |
| Docker replica | `mongodb://mongo1:27017,mongo2:27017,mongo3:27017/dynamic_api?replicaSet=rs0` |
| Kubernetes | `mongodb://mongo-0.mongo-headless:27017,...?replicaSet=rs0` (in `k8s/backend/configmap.yaml`) |
| Atlas | `mongodb+srv://user:pass@cluster.mongodb.net/dynamic_api` |

## Upgrading

```bash
git pull origin main
docker compose up -d --build
# Variant 2: docker-compose.replica.yml
# Variant 3: npm run k8s:build && kubectl rollout restart deployment/backend deployment/frontend -n dap
```

Review [CHANGELOG](https://github.com/Dynamic-API-Platform/Dynamic-API-Platform/blob/main/CHANGELOG.md) before upgrading.

# MongoDB replica set (Docker)

**Deployment variant 2** — three MongoDB nodes with automatic replication.

Full guide: [GitHub Pages — MongoDB Replica Set](https://dynamic-api-platform.github.io/Dynamic-API-Platform/mongodb-replica-set/)

## Start

```bash
docker compose down   # if Variant 1 uses ports 3001/8080
docker compose -f docker-compose.replica.yml up -d --build
```

## Verify

```bash
npm run docker:replica:status
curl http://localhost:3001/api/health
```

Expected replica set members: one `PRIMARY`, two `SECONDARY`.

## Files

| File | Role |
|------|------|
| `docker-compose.replica.yml` | Full stack (project name `dap-replica`) |
| `docker/mongo/replica-init.sh` | `rs.initiate()` job |

## Connection string

```
mongodb://mongo1:27017,mongo2:27017,mongo3:27017/dynamic_api?replicaSet=rs0
```

Host ports: **27017**, **27018**, **27019**.

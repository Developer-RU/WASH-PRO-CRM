---
layout: default
redirect_from:
  - /mongodb-replica-set.html

title: MongoDB Replica Set
description: Horizontal MongoDB scaling with a 3-node replica set in Docker Compose
---

Dynamic API Platform supports a **3-node MongoDB replica set** for high availability and horizontal database scaling. This is **deployment Variant 2** — see [Deployment Variants]({{ '/deployment-variants/' | relative_url }}) for all options.

Data is automatically replicated between nodes; if the primary fails, a secondary is elected as the new primary.

## Architecture

```
                    ┌─────────────┐
                    │   backend   │
                    └──────┬──────┘
                           │ replicaSet=rs0
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
   ┌──────────┐     ┌──────────┐     ┌──────────┐
   │  mongo1  │◄───►│  mongo2  │◄───►│  mongo3  │
   │ PRIMARY  │     │SECONDARY │     │SECONDARY │
   │ :27017   │     │ :27018   │     │ :27019   │
   └──────────┘     └──────────┘     └──────────┘
         └──────────────── replica-network ────────────────┘
```

| File | Purpose |
|------|---------|
| `docker-compose.replica.yml` | 3× MongoDB + init job + backend + frontend |
| `docker/mongo/replica-init.sh` | Waits for nodes, runs `rs.initiate()`, verifies PRIMARY |

Single-node development uses **Variant 1** (`docker-compose.yml`). For Variant 1 vs 3, see [Deployment Variants]({{ '/deployment-variants/' | relative_url }}).

---

## Quick start

### 1. Start the replica set stack

```bash
docker compose -f docker-compose.replica.yml up -d --build
```

Uses project name `dap-replica` so it does not replace containers from the default `docker-compose.yml`. Stop the single-node stack first if ports **3001** / **8080** are already in use:

```bash
docker compose down
```

First boot takes ~30–60 seconds: MongoDB nodes start → `mongo-init` configures the replica set → backend seeds and serves API.

### 2. Check container status

```bash
docker compose -f docker-compose.replica.yml ps
```

Expected:

| Container | Status |
|-----------|--------|
| `dap-mongo1`, `dap-mongo2`, `dap-mongo3` | `healthy` |
| `dap-mongo-init` | `exited (0)` — runs once |
| `dap-backend-replica` | `healthy` |
| `dap-frontend-replica` | `running` |

### 3. Verify replica set

```bash
docker exec dap-mongo1 mongosh --quiet --eval "rs.status().members.map(m => m.name + ' -> ' + m.stateStr).join('\n')"
```

Example output:

```
mongo1:27017 -> PRIMARY
mongo2:27017 -> SECONDARY
mongo3:27017 -> SECONDARY
```

### 4. Verify application

| Check | Command |
|-------|---------|
| API health | `curl http://localhost:3001/api/health` |
| Admin UI | http://localhost:8080 (`admin` / `Admin123!`) |
| Replica set name | `docker exec dap-mongo1 mongosh --quiet --eval "rs.conf()._id"` → `rs0` |

---

## Connection string

Inside Docker (backend):

```
mongodb://mongo1:27017,mongo2:27017,mongo3:27017/dynamic_api?replicaSet=rs0
```

From the host (e.g. MongoDB Compass):

```
mongodb://localhost:27017,localhost:27018,localhost:27019/dynamic_api?replicaSet=rs0
```

Set in `.env`:

```env
MONGODB_URI=mongodb://mongo1:27017,mongo2:27017,mongo3:27017/dynamic_api?replicaSet=rs0
```

Mongoose discovers the primary automatically and fails over when elections occur.

---

## Replication sync check

Write through the replica set URI (driver routes to PRIMARY), then read from a secondary:

```bash
# Write (any member — mongosh uses replica set discovery)
docker exec dap-mongo1 mongosh \
  'mongodb://mongo1:27017,mongo2:27017,mongo3:27017/dynamic_api?replicaSet=rs0' \
  --quiet --eval 'db.replica_check.insertOne({ ts: new Date(), node: "replica-write" })'

# Read from secondary
docker exec dap-mongo3 mongosh dynamic_api --quiet --eval \
  'db.getMongo().setReadPref("secondary"); db.replica_check.find().toArray()'
```

If the document appears on `mongo2`, replication is working.

---

## Logs and troubleshooting

```bash
# Init job output
docker compose -f docker-compose.replica.yml logs mongo-init

# MongoDB logs
docker compose -f docker-compose.replica.yml logs mongo1 mongo2 mongo3

# Backend connection errors
docker compose -f docker-compose.replica.yml logs backend
```

| Problem | Solution |
|---------|----------|
| `mongo-init` failed | `docker compose -f docker-compose.replica.yml up mongo-init` (re-run after nodes are healthy) |
| Backend `MongoServerSelectionError` | Wait for PRIMARY; check `rs.status()` |
| Replica set already exists with wrong config | `docker compose -f docker-compose.replica.yml down -v` (wipes data) and start fresh |
| Port 27017 in use | Stop single-node stack: `docker compose down` |

---

## Stop and remove

```bash
# Stop containers (keep data volumes)
docker compose -f docker-compose.replica.yml down

# Stop and delete replica volumes (full reset)
docker compose -f docker-compose.replica.yml down -v
```

Volumes: `dap_mongo1_data`, `dap_mongo2_data`, `dap_mongo3_data`.

---

## Production notes

- Enable **authentication** and a **keyFile** for replica set internal auth
- Use odd number of nodes (3 minimum for production HA)
- Place nodes in different availability zones when on cloud VMs
- For read scaling, configure Mongoose `readPreference: 'secondaryPreferred'` (optional)
- Backups: `mongodump` against PRIMARY or use MongoDB Atlas / Ops Manager

See also [Deployment]({{ '/deployment/' | relative_url }}).

[← Back to home]({{ '/' | relative_url }})

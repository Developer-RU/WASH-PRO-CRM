---
layout: default
redirect_from:
  - /deployment-variants.html

title: Deployment Variants
description: Three ways to run Dynamic API Platform — Docker single-node, Docker replica set, Kubernetes
---

Dynamic API Platform supports **three deployment variants**. Pick based on your environment: local dev, HA on a single host, or a production Kubernetes cluster.

## Comparison

| | **1. Docker (single)** | **2. Docker + replica set** | **3. Kubernetes** |
|--|------------------------|-----------------------------|-------------------|
| **Best for** | Local dev, demos, small prod | HA DB on one machine / VM | Production cluster, auto-scaling |
| **Compose / manifests** | `docker-compose.yml` | `docker-compose.replica.yml` | `k8s/` (Kustomize) |
| **MongoDB** | 1 node | 3 nodes, replica set `rs0` | StatefulSet ×3, replica set `rs0` |
| **Backend** | 1 container | 1 container | Deployment ×2 (scalable) |
| **Frontend** | 1 container | 1 container | Deployment ×2 |
| **DB failover** | No | Yes (automatic election) | Yes |
| **Horizontal API scale** | No | No (1 backend) | Yes (`kubectl scale`) |
| **RAM (minimum)** | ~2 GB | ~4 GB | ~8 GB cluster |
| **Complexity** | Low | Medium | High |

```
Variant 1                    Variant 2                         Variant 3
─────────                    ─────────                         ─────────

 frontend                    frontend                          Ingress / NodePort
    │                           │                                    │
 backend                     backend                         frontend ×2
    │                           │                                    │
 mongodb              mongo1 ◄─► mongo2 ◄─► mongo3            backend ×2
 (1 node)              (replica set rs0)                    mongo-0..2 (StatefulSet)
```

---

## Variant 1 — Docker Compose (single MongoDB)

**Default stack.** One MongoDB, one backend, one frontend — same as the original project setup.

### When to use

- First run and local development
- Demos and PoC
- Small production on a single VM when HA is not required

### Files

| File | Role |
|------|------|
| `docker-compose.yml` | Full stack |
| `.env.example` | Environment template |

### Start

```bash
git clone https://github.com/Dynamic-API-Platform/Dynamic-API-Platform.git
cd Dynamic-API-Platform
cp .env.example .env   # optional

docker compose up -d --build
# or: npm run docker:up
```

### Verify

```bash
docker compose ps
curl http://localhost:3001/api/health
```

Open **http://localhost:8080** — login `admin` / `Admin123!`.

### Ports

| Service | Host port |
|---------|-----------|
| Frontend | 8080 |
| Backend | 3001 |
| MongoDB | 27017 |

### MongoDB URI

```
mongodb://mongodb:27017/dynamic_api
```

### Volumes

| Volume | Data |
|--------|------|
| `dap_mongodb_data` | Database |
| `dap_backend_logs` | Application logs |

### Stop

```bash
docker compose down        # keep data
docker compose down -v     # delete volumes (data loss!)
```

---

## Variant 2 — Docker Compose + MongoDB replica set

**Three MongoDB nodes** in a replica set with automatic replication and primary failover. Backend connects via `replicaSet=rs0`.

### When to use

- Production on Docker without Kubernetes
- Database high availability on a single host
- Testing replica set behaviour before K8s migration

### Files

| File | Role |
|------|------|
| `docker-compose.replica.yml` | 3× MongoDB + init + backend + frontend |
| `docker/mongo/replica-init.sh` | `rs.initiate()` (idempotent) |

Project name: `dap-replica` (does not overwrite Variant 1 containers).

### Start

```bash
# Free ports 3001 / 8080 if Variant 1 is running
docker compose down

docker compose -f docker-compose.replica.yml up -d --build
# or: npm run docker:replica:up
```

### Verify

```bash
docker compose -f docker-compose.replica.yml ps

# Replica set members (PRIMARY + SECONDARY)
npm run docker:replica:status

curl http://localhost:3001/api/health
```

### Ports

| Service | Host port |
|---------|-----------|
| Frontend | 8080 |
| Backend | 3001 |
| mongo1 | 27017 |
| mongo2 | 27018 |
| mongo3 | 27019 |

### MongoDB URI (backend)

```
mongodb://mongo1:27017,mongo2:27017,mongo3:27017/dynamic_api?replicaSet=rs0
```

From host (Compass, mongosh):

```
mongodb://localhost:27017,localhost:27018,localhost:27019/dynamic_api?replicaSet=rs0
```

### Volumes

| Volume | Data |
|--------|------|
| `dap_mongo1_data`, `dap_mongo2_data`, `dap_mongo3_data` | Replica set nodes |
| `dap_backend_logs_replica` | Backend logs |

### Stop

```bash
docker compose -f docker-compose.replica.yml down
docker compose -f docker-compose.replica.yml down -v   # wipe all replica data
```

Detailed guide: [MongoDB Replica Set (Docker)]({{ '/mongodb-replica-set/' | relative_url }}).

---

## Variant 3 — Kubernetes

**Full cluster deployment:** MongoDB StatefulSet (3 pods), backend and frontend Deployments (2 replicas each), optional Ingress.

### When to use

- Existing Kubernetes infrastructure (EKS, GKE, AKS, k3s, Minikube)
- Horizontal scaling of API layer
- Rolling updates and pod restarts managed by the orchestrator

### Files

| Path | Role |
|------|------|
| `k8s/kustomization.yaml` | Main manifest bundle |
| `k8s/mongo/` | StatefulSet, Services, init Job |
| `k8s/backend/` | Deployment, ConfigMap, Secrets |
| `k8s/frontend/` | Deployment, Services |
| `k8s/scripts/deploy.sh` | Build images + ordered deploy |

Namespace: `dap`.

### Start (Minikube example)

```bash
minikube start --cpus=4 --memory=8192

USE_MINIKUBE_DOCKER=1 ./k8s/scripts/deploy.sh
# or: npm run k8s:deploy
```

### Start (existing cluster)

```bash
npm run k8s:build
# Push images to your registry and update image: in k8s/backend/deployment.yaml

cp k8s/backend/secrets.example.yaml k8s/backend/secrets.yaml
# Edit secrets, then:
kubectl apply -f k8s/backend/secrets.yaml

./k8s/scripts/deploy.sh
```

### Verify

```bash
npm run k8s:status

# Replica set
kubectl exec -n dap mongo-0 -- mongosh --quiet --eval \
  "rs.status().members.map(m => m.name + ' -> ' + m.stateStr).join('\n')"

# API
kubectl port-forward -n dap svc/backend 3001:3001
curl http://localhost:3001/api/health

# UI
kubectl port-forward -n dap svc/frontend 8080:80
# or: minikube service frontend-nodeport -n dap --url
```

### Access

| Method | URL |
|--------|-----|
| Port-forward UI | http://localhost:8080 |
| NodePort | `http://<node-ip>:30080` |
| Ingress (optional) | http://dap.local |

### MongoDB URI (backend ConfigMap)

```
mongodb://mongo-0.mongo-headless:27017,mongo-1.mongo-headless:27017,mongo-2.mongo-headless:27017/dynamic_api?replicaSet=rs0
```

### Scale backend

```bash
kubectl scale deployment/backend -n dap --replicas=4
```

### Teardown

```bash
npm run k8s:teardown
kubectl delete pvc -n dap -l app.kubernetes.io/name=mongo   # optional: wipe DB
```

Detailed guide: [Kubernetes]({{ '/kubernetes/' | relative_url }}).

---

## npm scripts reference

| Script | Variant | Action |
|--------|---------|--------|
| `npm run docker:up` | 1 | Start single-node stack |
| `npm run docker:down` | 1 | Stop single-node stack |
| `npm run docker:replica:up` | 2 | Start replica set stack |
| `npm run docker:replica:down` | 2 | Stop replica set stack |
| `npm run docker:replica:status` | 2 | Show `rs.status()` |
| `npm run k8s:build` | 3 | Build `dap/backend` and `dap/frontend` images |
| `npm run k8s:deploy` | 3 | Deploy to cluster |
| `npm run k8s:status` | 3 | `kubectl get pods,svc -n dap` |
| `npm run k8s:teardown` | 3 | Remove K8s resources |

---

## How to choose

| Your goal | Recommended variant |
|-----------|---------------------|
| Try the platform in 5 minutes | **1 — Docker single** |
| Single server, need DB redundancy | **2 — Docker replica set** |
| K8s cluster, multiple API instances | **3 — Kubernetes** |
| Managed MongoDB (Atlas) | **1** — set `MONGODB_URI` in `.env`, remove `mongodb` service from compose |

Variants **2** and **3** are not interchangeable at runtime — each uses its own volumes/PVCs. Migrate data with `mongodump` / `mongorestore` if switching.

---

## Shared configuration

All variants use the same application secrets (change before production):

| Variable | Purpose |
|----------|---------|
| `JWT_SECRET` | Access token signing |
| `JWT_REFRESH_SECRET` | Refresh token signing |
| `CSRF_SECRET` | CSRF protection |
| `ADMIN_PASSWORD` | Default admin (first seed) |
| `CORS_ORIGIN` | Allowed frontend origin |
| `APP_VERSION` | Installed version (shown in System page and update checks) |
| `UPDATE_EXECUTOR_ENABLED` | In-app updates (`true` by default in Docker Compose) |

**Software updates:** Variants **1** and **2** support in-app updates from GitHub Releases when deployed via Docker Compose — see [Software Updates]({{ '/updates/' | relative_url }}).

See [Configuration]({{ '/configuration/' | relative_url }}) and [Deployment]({{ '/deployment/' | relative_url }}) for reverse proxy, cloud, and upgrade notes.

[← Back to home]({{ '/' | relative_url }})

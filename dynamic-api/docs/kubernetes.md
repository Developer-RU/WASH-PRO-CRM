---
layout: default
redirect_from:
  - /kubernetes.html

title: Kubernetes
description: Deploy Dynamic API Platform on Kubernetes with MongoDB replica set and backend integration
---

Run Dynamic API Platform on Kubernetes with a **3-node MongoDB replica set**, horizontally scaled **backend**, and **frontend** UI. This is **deployment Variant 3** — see [Deployment Variants]({{ '/deployment-variants/' | relative_url }}) for comparison with Docker options.

## Architecture

```
                    ┌─────────────────────────────────────┐
                    │  Ingress / NodePort :30080          │
                    └──────────────┬──────────────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              ▼                    ▼                    │
        ┌──────────┐         ┌──────────┐               │
        │ frontend │         │ frontend │  (2 replicas) │
        │  :80     │         │  :80     │               │
        └────┬─────┘         └────┬─────┘               │
             │  /api proxy        │                     │
             └──────────┬─────────┘                     │
                        ▼                               │
                 ┌─────────────┐                        │
                 │   backend   │ ×2                   │
                 │   :3001     │                        │
                 └──────┬──────┘                        │
                        │ replicaSet=rs0                 │
     ┌──────────────────┼──────────────────┐            │
     ▼                  ▼                  ▼            │
┌─────────┐       ┌─────────┐       ┌─────────┐         │
│ mongo-0 │◄─────►│ mongo-1 │◄─────►│ mongo-2 │         │
│StatefulSet      │ headless DNS     │ PVC 5Gi each     │
└─────────┘       └─────────┘       └─────────┘         │
         namespace: dap                                  │
```

| Component | Kind | Replicas | Notes |
|-----------|------|----------|-------|
| MongoDB | StatefulSet | 3 | Replica set `rs0`, PVC per pod |
| mongo-init | Job | 1 | `rs.initiate()` (idempotent) |
| backend | Deployment | 2 | Init container waits for replica set |
| frontend | Deployment | 2 | nginx proxies `/api` → `backend:3001` |

Manifests live in [`k8s/`](https://github.com/Dynamic-API-Platform/Dynamic-API-Platform/tree/main/k8s).

---

## Prerequisites

- Kubernetes 1.25+ cluster (Minikube, kind, k3s, EKS, GKE, AKS, …)
- `kubectl` configured for your cluster
- Docker (to build images)

Optional:

- [Minikube](https://minikube.sigs.k8s.io/) for local testing
- NGINX Ingress Controller (only if using `k8s/ingress.yaml`)

---

## Quick start (Minikube)

```bash
minikube start --cpus=4 --memory=8192

# Build images inside Minikube Docker
USE_MINIKUBE_DOCKER=1 ./k8s/scripts/deploy.sh
```

Access UI:

```bash
# Port-forward
kubectl port-forward -n dap svc/frontend 8080:80

# Or NodePort (Minikube)
minikube service frontend-nodeport -n dap --url
```

Login: `admin` / `Admin123!` (change `k8s/backend/secrets.example.yaml` before production).

---

## Manual deploy

### 1. Build container images

```bash
docker build -t dap/backend:latest ./backend
docker build -t dap/frontend:latest --build-arg VITE_API_URL="" ./frontend
```

Push to your registry for remote clusters:

```bash
docker tag dap/backend:latest registry.example.com/dap/backend:1.4.0
docker push registry.example.com/dap/backend:1.4.0
# Update image: in k8s/backend/deployment.yaml and k8s/frontend/deployment.yaml
```

### 2. Configure secrets

```bash
cp k8s/backend/secrets.example.yaml k8s/backend/secrets.yaml
# Edit JWT_SECRET, JWT_REFRESH_SECRET, CSRF_SECRET, ADMIN_PASSWORD

kubectl apply -f k8s/backend/secrets.yaml
```

For dev you can use the example file as-is (included in kustomize).

### 3. Apply stack

```bash
kubectl apply -k k8s

# Wait for MongoDB pods
kubectl rollout status statefulset/mongo -n dap --timeout=600s

# Initialize replica set
kubectl delete job mongo-init -n dap --ignore-not-found
kubectl apply -f k8s/mongo/job-init.yaml
kubectl wait --for=condition=complete job/mongo-init -n dap --timeout=600s

# Wait for application
kubectl rollout status deployment/backend -n dap
kubectl rollout status deployment/frontend -n dap
```

Or use the helper script:

```bash
./k8s/scripts/deploy.sh
```

---

## Verify MongoDB replica set

```bash
kubectl exec -n dap mongo-0 -- mongosh --quiet --eval \
  "rs.status().members.map(m => m.name + ' -> ' + m.stateStr).join('\n')"
```

Expected: one `PRIMARY`, two `SECONDARY`.

Replication test:

```bash
kubectl exec -n dap mongo-0 -- mongosh \
  'mongodb://mongo-0.mongo-headless:27017,mongo-1.mongo-headless:27017,mongo-2.mongo-headless:27017/dynamic_api?replicaSet=rs0' \
  --quiet --eval 'db.k8s_check.insertOne({ ts: new Date() })'

kubectl exec -n dap mongo-2 -- mongosh dynamic_api --quiet --eval \
  'db.getMongo().setReadPref("secondary"); db.k8s_check.find().toArray()'
```

---

## Verify backend integration

```bash
kubectl port-forward -n dap svc/backend 3001:3001 &
curl http://localhost:3001/api/health

kubectl logs -n dap -l app.kubernetes.io/name=backend --tail=50
```

Backend connection string (in `k8s/backend/configmap.yaml`):

```
mongodb://mongo-0.mongo-headless:27017,mongo-1.mongo-headless:27017,mongo-2.mongo-headless:27017/dynamic_api?replicaSet=rs0
```

Each backend pod runs an **init container** that ensures the replica set is initialized before the API starts.

---

## Ingress (optional)

Requires an Ingress controller (e.g. `minikube addons enable ingress`):

```bash
echo "$(minikube ip) dap.local" | sudo tee -a /etc/hosts
kubectl apply -f k8s/ingress.yaml
```

| URL | Service |
|-----|---------|
| http://dap.local/ | frontend |
| http://dap.local/api/ | backend |

Update `CORS_ORIGIN` in `k8s/backend/configmap.yaml` to match your public URL.

---

## Scale backend

```bash
kubectl scale deployment/backend -n dap --replicas=4
```

All pods share the same MongoDB replica set URI and StatelessSet-style logs (`emptyDir`).

---

## Troubleshooting

| Issue | Action |
|-------|--------|
| `mongo-init` job failed | `kubectl logs -n dap job/mongo-init` — often Mongo pods not ready yet; re-run job |
| Backend `CrashLoopBackOff` | `kubectl logs -n dap deploy/backend -c wait-mongo-replica` |
| `ImagePullBackOff` | Build/push images or set `imagePullPolicy: Never` on local clusters |
| PVC pending | Install a StorageClass / enable default provisioner |
| Frontend 502 on `/api` | Check `kubectl get endpoints backend -n dap` |

```bash
kubectl get all -n dap
kubectl describe pod -n dap -l app.kubernetes.io/name=backend
```

---

## Teardown

```bash
kubectl delete -k k8s
# PVCs are retained by default — delete manually if needed:
kubectl delete pvc -n dap -l app.kubernetes.io/name=mongo
```

---

## Production checklist

- Replace secrets in `backend-secrets` (never commit real values)
- Push images to a private registry and pin tags
- Enable MongoDB authentication + keyFile
- Set resource limits appropriate for your workload
- Configure backups (`mongodump` from PRIMARY or Atlas)
- Use cert-manager + TLS on Ingress
- Set `CORS_ORIGIN` to your domain

See also [Deployment]({{ '/deployment/' | relative_url }}) and [MongoDB Replica Set]({{ '/mongodb-replica-set/' | relative_url }}).

[← Back to home]({{ '/' | relative_url }})

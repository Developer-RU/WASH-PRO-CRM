# Kubernetes

**Deployment variant 3** — MongoDB StatefulSet + scaled backend/frontend.

Full guide: [GitHub Pages — Kubernetes](https://dynamic-api-platform.github.io/Dynamic-API-Platform/kubernetes/)

## Quick start (Docker Desktop / local cluster)

```bash
npm run k8s:build
./k8s/scripts/deploy.sh
```

Access UI:
```bash
kubectl port-forward -n dap svc/frontend 8080:80
# or http://localhost:30080 (NodePort)
```

## Components

| Resource | Replicas | Notes |
|----------|----------|-------|
| `mongo` StatefulSet | 3 | Replica set `rs0`, PVC 5Gi each |
| `mongo-init` Job | 1 | Configures `rs.initiate()` |
| `backend` Deployment | 2 | Waits for PRIMARY via init container |
| `frontend` Deployment | 2 | nginx proxies `/api` → backend |

Namespace: `dap`

## Verify

```bash
npm run k8s:status
kubectl exec -n dap mongo-0 -- mongosh --quiet --eval "rs.status().members.map(m => m.name + ' -> ' + m.stateStr).join('\n')"
```

## Scale backend

```bash
kubectl scale deployment/backend -n dap --replicas=4
```

## Teardown

```bash
npm run k8s:teardown
```

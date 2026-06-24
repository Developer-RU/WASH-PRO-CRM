# Kubernetes manifests for Dynamic API Platform

**Deployment Variant 3** — see [docs/deployment-variants.md](../docs/deployment-variants.md) for comparison with Docker options (Variants 1 and 2).

## Layout

```
k8s/
├── kustomization.yaml
├── namespace.yaml
├── ingress.yaml              # optional — requires Ingress controller
├── mongo/
│   ├── statefulset.yaml      # 3-node replica set
│   ├── service.yaml          # headless + ClusterIP
│   ├── configmap-init.yaml   # rs.initiate script
│   └── job-init.yaml         # one-shot replica set setup
├── backend/
│   ├── deployment.yaml       # 2 replicas + mongo init container
│   ├── service.yaml
│   ├── configmap.yaml
│   └── secrets.example.yaml  # copy to secrets.yaml for production
├── frontend/
│   ├── deployment.yaml
│   ├── service.yaml
│   └── service-nodeport.yaml # NodePort 30080
└── scripts/
    └── deploy.sh
```

## One-command deploy

```bash
# Minikube
USE_MINIKUBE_DOCKER=1 ./k8s/scripts/deploy.sh

# Existing cluster (images must be available to nodes)
./k8s/scripts/deploy.sh
```

## npm scripts

```bash
npm run k8s:deploy
npm run k8s:status
npm run k8s:teardown
```

Full documentation: [docs/kubernetes.md](../docs/kubernetes.md)

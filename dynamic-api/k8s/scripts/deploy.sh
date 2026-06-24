#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
NAMESPACE="${NAMESPACE:-dap}"
BUILD_IMAGES="${BUILD_IMAGES:-1}"
USE_MINIKUBE_DOCKER="${USE_MINIKUBE_DOCKER:-0}"
WITH_INGRESS="${WITH_INGRESS:-0}"

echo "==> Dynamic API Platform — Kubernetes deploy"
echo "    namespace: $NAMESPACE"

if [ "$USE_MINIKUBE_DOCKER" = "1" ] && command -v minikube >/dev/null 2>&1; then
  echo "==> Using Minikube Docker daemon"
  eval "$(minikube docker-env)"
fi

if [ "$BUILD_IMAGES" = "1" ]; then
  echo "==> Building images"
  docker build -t dap/backend:latest -f "$ROOT/backend/Dockerfile" "$ROOT"
  docker build -t dap/frontend:latest --build-arg VITE_API_URL="" "$ROOT/frontend"
fi

echo "==> Applying manifests (kustomize)"
kubectl apply -k "$ROOT/k8s"

echo "==> Waiting for MongoDB StatefulSet"
kubectl rollout status statefulset/mongo -n "$NAMESPACE" --timeout=600s
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=mongo -n "$NAMESPACE" --timeout=600s

echo "==> Running MongoDB replica set init job"
kubectl delete job mongo-init -n "$NAMESPACE" --ignore-not-found
kubectl apply -f "$ROOT/k8s/mongo/job-init.yaml"
kubectl wait --for=condition=complete job/mongo-init -n "$NAMESPACE" --timeout=600s

echo "==> Waiting for backend and frontend"
kubectl rollout status deployment/backend -n "$NAMESPACE" --timeout=600s
kubectl rollout status deployment/frontend -n "$NAMESPACE" --timeout=300s

if [ "$WITH_INGRESS" = "1" ]; then
  echo "==> Applying Ingress"
  kubectl apply -f "$ROOT/k8s/ingress.yaml"
fi

echo ""
echo "Deploy complete."
echo ""
kubectl get pods,svc -n "$NAMESPACE"
echo ""
echo "Quick checks:"
echo "  kubectl exec -n $NAMESPACE mongo-0 -- mongosh --quiet --eval \"rs.status().members.map(m => m.name + ' -> ' + m.stateStr).join('\\n')\""
echo "  kubectl port-forward -n $NAMESPACE svc/backend 3001:3001"
echo "  kubectl port-forward -n $NAMESPACE svc/frontend 8080:80"
echo "  # or NodePort: http://<node-ip>:30080"

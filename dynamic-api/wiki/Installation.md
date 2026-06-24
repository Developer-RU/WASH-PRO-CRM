Three ways to run the platform — full comparison: [Deployment Variants](https://dynamic-api-platform.github.io/Dynamic-API-Platform/deployment-variants/) (GitHub Pages).

| Variant | Command | Best for |
|---------|---------|----------|
| **1. Docker (single)** | `docker compose up -d` | Dev, demos, simple prod |
| **2. Docker + replica set** | `docker compose -f docker-compose.replica.yml up -d` | HA MongoDB on Docker |
| **3. Kubernetes** | `./k8s/scripts/deploy.sh` | K8s cluster, scaled backend |

---

## Variant 1 — Docker (recommended for first run)

```bash
git clone https://github.com/Dynamic-API-Platform/Dynamic-API-Platform.git
cd Dynamic-API-Platform
cp .env.example .env   # optional
docker compose up -d --build
```

Open **http://localhost:8080** — login `admin` / `Admin123!`

## Variant 2 — Docker + MongoDB replica set

```bash
docker compose down   # free ports if Variant 1 is running
docker compose -f docker-compose.replica.yml up -d --build
npm run docker:replica:status
```

MongoDB on host ports **27017**, **27018**, **27019**.

Details: [MongoDB Replica Set](MongoDB-Replica-Set)

## Variant 3 — Kubernetes

```bash
npm run k8s:build
./k8s/scripts/deploy.sh
kubectl port-forward -n dap svc/frontend 8080:80
# or NodePort: http://localhost:30080
```

Details: [Kubernetes](Kubernetes)

---

## Requirements

- **Docker:** Docker 24+ & Docker Compose v2
- **Kubernetes:** cluster 1.25+, kubectl, Docker for images
- **Local dev:** Node.js 20+, MongoDB 7+

## Verify

```bash
curl http://localhost:3001/api/health
docker compose ps
```

## Local development (no Docker app stack)

```bash
docker run -d -p 27017:27017 mongo:7
cd backend && npm install && npm run dev
cd frontend && npm install && npm run dev
```

Full guide: [Getting Started](https://dynamic-api-platform.github.io/Dynamic-API-Platform/getting-started/)

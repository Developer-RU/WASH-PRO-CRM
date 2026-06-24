---
layout: default
redirect_from:
  - /deployment.html

title: Deployment
---

Choose a deployment variant based on your needs. The platform ships **three options**:

| Variant | Guide | One-liner |
|---------|-------|-----------|
| **1. Docker (single MongoDB)** | [below](#variant-1-docker-compose-single-mongodb) | `docker compose up -d --build` |
| **2. Docker + MongoDB replica set** | [MongoDB Replica Set]({{ '/mongodb-replica-set/' | relative_url }}) | `docker compose -f docker-compose.replica.yml up -d --build` |
| **3. Kubernetes** | [Kubernetes]({{ '/kubernetes/' | relative_url }}) | `./k8s/scripts/deploy.sh` |

**Full comparison, ports, URIs, and when to choose:** [Deployment Variants]({{ '/deployment-variants/' | relative_url }}).

---

## Variant 1 — Docker Compose (single MongoDB)

Default stack for development and simple production: **1 MongoDB + 1 backend + 1 frontend**.

### Production checklist

```bash
# 1. Clone and configure
git clone https://github.com/Dynamic-API-Platform/Dynamic-API-Platform.git
cd Dynamic-API-Platform
cp .env.example .env

# 2. Edit .env — CRITICAL for production:
#    JWT_SECRET, JWT_REFRESH_SECRET, CSRF_SECRET
#    ADMIN_PASSWORD
#    CORS_ORIGIN=https://your-domain.com

# 3. Start
docker compose up -d --build

# 4. Verify health
docker compose ps
curl http://localhost:3001/api/health
```

### Ports

| Service | Container port | Host port |
|---------|---------------|-----------|
| Frontend | 80 | 8080 |
| Backend | 3001 | 3001 |
| MongoDB | 27017 | 27017 |

Change host ports in `docker-compose.yml` if needed.

### Volumes

Named volume **`dap_mongodb_data`** stores all platform data (users, endpoints, endpoint data, logs metadata). **Do not run `docker compose down -v`** unless you intend to wipe the database.

```bash
# List volumes
docker volume ls | grep dap

# Backup MongoDB
docker exec dap-mongodb mongodump --out=/data/backup
docker cp dap-mongodb:/data/backup ./mongodb-backup-$(date +%Y%m%d)
```

### Frontend nginx proxy

The production frontend container proxies `/api/*` to the backend. Use a **direct upstream** without URI rewriting:

```nginx
location /api/ {
    proxy_pass http://backend:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Using `proxy_pass` with variables and a path suffix can strip the request path and break login (`Endpoint not found`).

### Stop and remove

```bash
docker compose down        # stop containers
docker compose down -v     # stop + delete volumes (DATA LOSS!)
```

---

## Variant 2 — Docker + MongoDB replica set

Three MongoDB nodes with automatic replication and failover. See [Deployment Variants — Variant 2]({{ '/deployment-variants/' | relative_url }}#variant-2--docker-compose--mongodb-replica-set) and [MongoDB Replica Set]({{ '/mongodb-replica-set/' | relative_url }}).

```bash
docker compose down   # if Variant 1 uses the same ports
npm run docker:replica:up
npm run docker:replica:status
```

---

## Variant 3 — Kubernetes

MongoDB StatefulSet + scaled backend/frontend. See [Deployment Variants — Variant 3]({{ '/deployment-variants/' | relative_url }}#variant-3--kubernetes) and [Kubernetes]({{ '/kubernetes/' | relative_url }}).

```bash
USE_MINIKUBE_DOCKER=1 ./k8s/scripts/deploy.sh
```

---

## Reverse proxy (nginx)

Example nginx config for `api.example.com` + `app.example.com`:

```nginx
# Frontend
server {
    listen 443 ssl http2;
    server_name app.example.com;

    ssl_certificate     /etc/letsencrypt/live/app.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Backend (optional direct API access)
server {
    listen 443 ssl http2;
    server_name api.example.com;
    # ... ssl ...

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Update `CORS_ORIGIN=https://app.example.com` in backend environment.

---

## Cloud deployment

### General steps

1. Provision VM or container service (AWS EC2, DigitalOcean, Hetzner, etc.)
2. Install Docker + Docker Compose
3. Clone repo, configure `.env`
4. **Do not expose MongoDB** to public internet
5. Use managed MongoDB (Atlas) by setting `MONGODB_URI`
6. Set up SSL via Let's Encrypt
7. Configure firewall: allow 80/443 only

### MongoDB Atlas

```yaml
# docker-compose.yml — remove mongodb service, update backend:
environment:
  MONGODB_URI: mongodb+srv://user:pass@cluster.mongodb.net/dynamic_api
```

---

## Environment-specific builds

### Frontend API URL

In Docker, `VITE_API_URL: ""` makes frontend use relative `/api` paths proxied by nginx.

For separate frontend hosting:

```bash
cd frontend
VITE_API_URL=https://api.example.com npm run build
```

### Backend only

```bash
cd backend
npm ci
npm run build
NODE_ENV=production node dist/index.js
```

---

## Monitoring

- Health endpoint: `GET /api/health`
- Docker healthchecks configured in `docker-compose.yml`
- Audit logs: `/logs` in admin panel
- Backend logs volume: `dap_backend_logs`

---

## Upgrading

**Variant 1:**

```bash
git pull origin main
docker compose up -d --build
```

**Variant 2:**

```bash
git pull origin main
docker compose -f docker-compose.replica.yml up -d --build
```

**Variant 3:**

```bash
git pull origin main
npm run k8s:build
kubectl rollout restart deployment/backend deployment/frontend -n dap
```

Database migrations are not required for v1.x — Mongoose handles schema flexibly. Review CHANGELOG before upgrading.

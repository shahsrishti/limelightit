# ManufactureIQ Production Operations & Deployment Guide

This documentation outlines production deployment, clustering, monitoring, backup procedures, and scaling recommendations for the ManufactureIQ MES Admin Platform.

---

## 🐋 Docker & Container Deployment

### 1. Development Mode
To build and run all services (API, Next.js UI, PostgreSQL, Redis) locally in development container mode:
```bash
npm run docker:dev
```
This mounts local directories for hot-reloads.

### 2. Production Mode
Production configurations use multi-stage optimized builds, an Nginx reverse-proxy carrying SSL termination configurations, and production network bridges:
```bash
npm run docker:prod
```
The production environment uses named Docker volumes (`pgdata_prod` and `redisdata_prod`) for state persistence.

---

## 🚀 PM2 Clustered Deployment (Bare Metal / VM)

PM2 is configured to run the API and Background worker processes separately:

```bash
# Install PM2 globally
npm install -g pm2

# Build the TypeScript resources
npm run build

# Start processes
pm2 start ecosystem.config.js
```

### Process Allocation
*   **mfg-backend-api**: Runs in `cluster` mode scaling across all available CPU threads (`instances: 'max'`). Handles HTTP request/responses and Socket.IO.
*   **mfg-backend-worker**: Runs in `fork` mode as a single instance (`instances: 1`). Subscribes to VerneMQ MQTT broker streams, registers telemetry writes, runs Node-cron tasks, and runs heartbeat checks.

---

## ⚙️ Environment Variables Documentation

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | Number | `5000` | Port Express API runs on. |
| `NODE_ENV` | String | `development` | Deployment environment context. |
| `DATABASE_URL` | String | -- | PostgreSQL JDBC/Prisma connection link. |
| `REDIS_HOST` | String | `localhost` | Redis host for BullMQ queues and socket syncs. |
| `REDIS_PORT` | Number | `6379` | Redis port. |
| `MQTT_HOST` | String | `localhost` | VerneMQ broker IP/Hostname. |
| `MQTT_PORT` | Number | `1883` | VerneMQ broker port. |
| `OFFLINE_TIMEOUT_SECONDS` | Number | `60` | Edge device silent threshold before triggering offline status. |
| `TELEMETRY_RETENTION_DAYS` | Number | `30` | Number of days of telemetry records retained before purging. |
| `JWT_SECRET` | String | -- | Security token signature key. |

---

## 💾 Database Backup & Restore Procedures

### 1. Automated PostgreSQL Dump
Execute a PG Dump from the docker container to backup database state:
```bash
docker exec -t mfg-postgres-prod pg_dumpall -c -U postgres > backup_$(date +%F).sql
```

### 2. Restore Database State
Inject backup scripts back to the active production container instance:
```bash
cat backup_YYYY-MM-DD.sql | docker exec -i mfg-postgres-prod psql -U postgres -d manufacturing_db
```

---

## 📊 Health Probes & Monitoring Guide

### 1. Liveness & Readiness Probe (`GET /api/v1/health`)
*   Returns `200 OK` if both PostgreSQL and Redis connections are responsive.
*   Returns `503 Service Unavailable` if connections are severed.

### 2. Metrics & Observability (`GET /api/v1/monitoring`)
*   Secured by JWT Token validation.
*   **Metrics returned**:
    *   System CPU & Memory usage profiles.
    *   Connected Socket.IO clients count.
    *   VerneMQ MQTT messages per minute throughput.
    *   BullMQ active & waiting jobs statistics.
    *   Database connection states.

---

## 🛠️ Troubleshooting & Scaling

### Clustered VerneMQ Disconnects
*   **Problem**: Clustered APIs keep disconnecting each other from VerneMQ.
*   **Fix**: Ensure `MQTT_ENABLED=false` is set on the Express API cluster instances (`mfg-backend-api`), allowing only the single `mfg-backend-worker` process to connect to VerneMQ.

### Redis Memory Overflow
*   **Problem**: High frequency BullMQ telemetry queues consume too much memory.
*   **Fix**: Adjust BullMQ retention parameters inside [queue.service.ts](file:///c:/Users/LENOVO/OneDrive/Documents/GitHub/limelightit/backend/src/services/queue.service.ts) or upgrade Redis to run eviction policies (`maxmemory-policy volatile-lru`).

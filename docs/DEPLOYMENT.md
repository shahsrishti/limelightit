# Deployment Guide

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `5000` | HTTP server port |
| `NODE_ENV` | No | `development` | `development`, `production`, or `test` |
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string (Supabase/direct) |
| `JWT_SECRET` | **Yes** | — | JWT signing secret (min 10 chars) |
| `JWT_REFRESH_SECRET` | No | *(default)* | Refresh token secret |
| `MQTT_HOST` | No | `localhost` | MQTT broker hostname |
| `MQTT_PORT` | No | `1883` | MQTT broker port |
| `MQTT_USERNAME` | No | — | MQTT auth username |
| `MQTT_PASSWORD` | No | — | MQTT auth password |
| `MQTT_CLIENT_ID` | No | `admin-backend` | MQTT client ID prefix |
| `REDIS_HOST` | No | `localhost` | Redis host |
| `REDIS_PORT` | No | `6379` | Redis port |
| `CORS_ORIGIN` | No | `*` | Allowed CORS origin |
| `OFFLINE_TIMEOUT_SECONDS` | No | `60` | Seconds before machine marked offline |
| `TELEMETRY_RETENTION_DAYS` | No | `30` | Days of telemetry data to keep |

> **Supabase Connection String:**  
> Must use the transaction pooler port `6543` with `pgbouncer=true&statement_cache_size=0`:
> ```
> DATABASE_URL="postgresql://postgres.xxxx:password@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true&statement_cache_size=0&connection_limit=10"
> ```

### Frontend (`frontend/.env.local`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:5000/api/v1` | Backend API base URL |
| `NEXT_PUBLIC_SOCKET_URL` | No | `http://localhost:5000` | Socket.IO server URL |

---

## Docker Deployment

### Development

```bash
# Start all services (Postgres, Redis, MQTT, backend, frontend)
docker-compose up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Production

```bash
# Build and start production containers
docker-compose -f docker-compose.prod.yml up -d --build

# Scale backend instances
docker-compose -f docker-compose.prod.yml up -d --scale backend=3
```

---

## PM2 Production Deployment

```bash
# Install PM2 globally
npm install -g pm2

# Start backend in cluster mode
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# View logs
pm2 logs

# Restart
pm2 restart all

# Save process list for reboot
pm2 save
pm2 startup
```

`ecosystem.config.js` runs:
- **API server** in cluster mode (1 process per CPU core)
- **Worker** process (BullMQ jobs: cleanup, reports, alerts)

---

## Database Migration (Production)

```bash
cd backend

# Generate Prisma client from schema
npx prisma generate

# Push schema changes (no migration files — for Supabase)
npx prisma db push

# Or, for tracked migrations:
npx prisma migrate deploy

# Seed initial data (run once)
npx prisma db seed
```

---

## Health Check Endpoints

| Endpoint | Auth | Description |
|---|---|---|
| `GET /api/v1/health` | None | Public health check |
| `GET /api/v1/monitoring` | JWT | Extended metrics + queue depths |

Use `/api/v1/health` as the Docker/K8s liveness probe:
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:5000/api/v1/health"]
  interval: 30s
  timeout: 10s
  retries: 3
```

---

## Production Checklist

- [ ] Set strong `JWT_SECRET` (≥ 32 random chars)
- [ ] Set `NODE_ENV=production`
- [ ] Set `CORS_ORIGIN` to your frontend domain (not `*`)
- [ ] Use Supabase pooler URL with `pgbouncer=true`
- [ ] Ensure Redis is running for Socket.IO multi-instance support
- [ ] Configure MQTT credentials (`MQTT_USERNAME`, `MQTT_PASSWORD`)
- [ ] Set `TELEMETRY_RETENTION_DAYS` to control disk usage
- [ ] Run `npx prisma generate` before starting the server
- [ ] Enable PM2 startup script for auto-restart on reboot

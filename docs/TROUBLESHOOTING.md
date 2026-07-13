# Troubleshooting Guide

## Backend Issues

### `EADDRINUSE: address already in use :::5000`

Another process is using port 5000. Find and kill it:

**Windows:**
```powershell
netstat -ano | findstr ":5000"
# Note the PID in the last column, then:
taskkill /PID <PID> /F
```

**Linux/macOS:**
```bash
lsof -i :5000
kill -9 <PID>
```

---

### `P2024: Timed out fetching a new connection from the connection pool`

**Cause:** Prisma connection pool exhausted — too many concurrent queries or `connection_limit` too low.

**Fix:**
1. Ensure only ONE `PrismaClient` instance exists (use the singleton in `src/prisma/client.ts`)
2. Increase `connection_limit` in your `DATABASE_URL`:
   ```
   ?pgbouncer=true&statement_cache_size=0&connection_limit=10
   ```

---

### `42P05: prepared statement "s1" already exists`

**Cause:** PgBouncer transaction mode doesn't support prepared statements.

**Fix:** Add these params to `DATABASE_URL`:
```
?pgbouncer=true&statement_cache_size=0
```

---

### `P1017: Server has closed the connection`

**Cause:** Database server dropped the connection. Common during `prisma db push` against Supabase pooler.

**Fix:** Use port `6543` (pooler) instead of `5432` (direct). Direct connections work for migrations but the pooler is required for app traffic.

---

### `ECONNREFUSED 127.0.0.1:6379` (Redis error)

**Cause:** Redis is not running locally.

**Impact:** Non-critical. The app degrades gracefully:
- Dashboard cache is skipped (data fetched from DB on every request)
- Socket.IO works locally (no multi-instance broadcasting)
- BullMQ queues are disabled

**Fix (optional):** Start Redis:
```bash
# Docker
docker run -d -p 6379:6379 redis:7-alpine

# Windows (WSL)
wsl -e redis-server
```

---

### Dashboard returns 500 after login

**Checklist:**
1. Check backend logs: `npm run dev` in the backend terminal
2. Confirm `DATABASE_URL` uses port `6543` with `pgbouncer=true`
3. Test DB connectivity: `npx ts-node scratch/test_queries.ts`
4. Verify schema is in sync: `npx prisma db push`

---

### Backend starts but MQTT messages are ignored

**Checklist:**
1. Confirm MQTT broker is running (`MQTT_HOST` and `MQTT_PORT` correct)
2. Check topic format matches `mfg/{machineId}/{type}` or `Limelight/Factory/{machineId}/{type}`
3. Verify `MQTT_ENABLED` is not set to `false`
4. Look for `MQTT message received with invalid JSON` warnings in logs

---

## Frontend Issues

### Login fails with "Invalid credentials"

1. Confirm backend is running on `http://localhost:5000`
2. Check `NEXT_PUBLIC_API_URL` in `frontend/.env.local`
3. Default credentials: `admin@limelightit.com` / `Admin@123!`
4. Re-seed if needed: `cd backend && npx prisma db seed`

---

### Dashboard shows no data / stuck loading

1. Open browser DevTools → Network tab
2. Check for 401 (token expired — log out and back in)
3. Check for 500 (backend error — see backend logs)
4. Confirm Socket.IO is connected (🟢 indicator in dashboard header)

---

### Socket.IO connection fails (CORS error)

**Fix:** Ensure `CORS_ORIGIN` in `backend/.env` matches your frontend URL exactly:
```
CORS_ORIGIN=http://localhost:3000
```

---

## Database Issues

### `prisma db push` times out

This can happen against Supabase when using the pooler. Use the **direct connection** for schema operations:
```
# Temporary — use for migrations only, not for app runtime
DATABASE_URL="postgresql://postgres.xxxx:password@aws-0-region.supabase.com:5432/postgres"
```

Switch back to pooler URL (`6543`) for running the app.

---

### Missing tables after `prisma db push`

Run in this order:
```bash
npx prisma generate   # Generate the Prisma client
npx prisma db push    # Push schema to database
npx prisma db seed    # Seed initial data
```

---

## Docker Issues

### Containers start but backend can't reach database

1. Ensure `DATABASE_URL` uses the container service name, not `localhost`:
   ```
   DATABASE_URL="postgresql://postgres:password@postgres:5432/limelightit"
   ```
2. Check Docker network: `docker network inspect limelightit_default`

---

### Port conflicts in Docker Compose

Stop any locally running instances first:
```bash
npm run stop   # or kill the terminal processes
docker-compose down
docker-compose up -d
```

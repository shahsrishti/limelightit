# REST API Reference

Base URL: `http://localhost:5000/api/v1`

All authenticated endpoints require the header:
```
Authorization: Bearer <accessToken>
```

---

## Authentication

### POST /auth/login
Login with email and password.

**Rate limit:** 10 requests per 15 minutes (production)

**Request:**
```json
{ "email": "admin@limelightit.com", "password": "Admin@123!" }
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "user": { "id": "...", "email": "...", "role": "SUPER_ADMIN" }
  }
}
```

**Response 401:** Invalid credentials  
**Response 429:** Too many login attempts

---

### POST /auth/refresh
Refresh access token using the HTTP-only refresh cookie.

**Response 200:**
```json
{ "success": true, "data": { "accessToken": "eyJ..." } }
```

---

### POST /auth/logout
Invalidate the current session.

**Auth required:** Yes  
**Response 200:** `{ "success": true, "message": "Logged out" }`

---

### GET /auth/me
Get the currently authenticated user.

**Auth required:** Yes  
**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "...", "email": "...", "firstName": "Admin",
    "role": { "name": "SUPER_ADMIN" }
  }
}
```

---

## Dashboard

### GET /dashboard
Returns high-level KPI stats for the overview panel.

**Auth required:** Yes  
**Cache:** Redis, 15-second TTL

**Response 200:**
```json
{
  "success": true,
  "data": {
    "totalMachines": 37,
    "onlineMachines": 32,
    "offlineMachines": 5,
    "activeAlerts": 3,
    "activeDowntimes": 1,
    "todayProduction": 15213270,
    "averagePower": 5947.33,
    "overallOEE": 0.79
  }
}
```

---

## Machines

### GET /machines
Returns a paginated, filterable list of machines.

**Auth required:** Yes

**Query parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Results per page (max 100) |
| `search` | string | — | Name search (case-insensitive) |
| `factoryId` | string | — | Filter by factory |
| `sortBy` | string | `createdAt` | Field: `name`, `createdAt`, `updatedAt` |
| `sortOrder` | string | `desc` | `asc` or `desc` |

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "DM-001",
      "name": "Machine DM-001",
      "factory": "Main Assembly Plant",
      "currentStatus": "RUNNING",
      "lastSeen": "2026-07-10T07:00:00Z",
      "power": 5200,
      "temperature": 72.4,
      "deviceCount": 1
    }
  ],
  "pagination": {
    "page": 1, "limit": 20, "total": 37, "totalPages": 2
  }
}
```

---

### GET /machines/:id
Get a single machine with full detail.

**Auth required:** Yes

**Response 200:** Machine object with latest status, metrics, alerts, OEE history.

---

## Alerts

### GET /alerts
Returns paginated alert list.

**Query params:** `page`, `limit`, `resolved` (boolean), `machineId`, `type`

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...", "machineId": "DM-001", "type": "CRITICAL",
      "message": "Temperature exceeded threshold",
      "resolved": false, "timestamp": "2026-07-10T07:00:00Z"
    }
  ]
}
```

---

### PATCH /alerts/:id/resolve
Mark an alert as resolved.

**Auth required:** Yes  
**Response 200:** Updated alert object.

---

## Health

### GET /health
Public health check endpoint.

**Response 200 (all OK):**
```json
{
  "success": true,
  "data": {
    "status": "OK",
    "database": "Connected",
    "redis": "Connected",
    "mqtt": "Connected",
    "uptime": 3600,
    "version": "1.0.0"
  }
}
```

**Response 200 (degraded — Redis offline, non-critical):**
```json
{ "success": false, "data": { "status": "DEGRADED", "redis": "Error" } }
```

---

### GET /monitoring
Extended monitoring metrics (auth required).

Returns queue depths, memory usage, uptime, and MQTT message throughput.

---

## Error Responses

All errors follow this format:
```json
{
  "success": false,
  "message": "Human-readable error description",
  "errors": null,
  "timestamp": "2026-07-10T07:00:00Z"
}
```

| Status | Meaning |
|---|---|
| 400 | Bad request / validation error |
| 401 | Unauthorized (no/expired token) |
| 403 | Forbidden (insufficient role) |
| 404 | Resource not found |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

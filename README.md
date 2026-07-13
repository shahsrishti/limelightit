# LimelightIT – Industrial IoT Admin Dashboard

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue)](https://www.postgresql.org/)
[![MQTT](https://img.shields.io/badge/MQTT-VerneMQ-orange)](https://vernemq.com/)

A production-grade **Industry 4.0 Manufacturing Monitoring Admin Dashboard** for real-time machine telemetry, OEE analytics, and fleet management.

---

## Features

| Module | Description |
|---|---|
| **Admin Auth** | JWT access/refresh tokens, bcrypt hashing, role-based access |
| **Machine Monitoring** | Real-time status, metrics (temperature, vibration, speed, power) |
| **MQTT Integration** | VerneMQ broker, ESP32 device telemetry, auto-provisioning |
| **Live Dashboard** | Socket.IO real-time KPIs, machine status grid |
| **OEE Analytics** | Availability, Performance, Quality metrics with daily snapshots |
| **Alerts** | CRITICAL/WARNING alerts with auto-resolve on device resume |
| **Heartbeat** | Offline detection with configurable timeout |
| **BullMQ Jobs** | Report generation, alert processing, telemetry cleanup |
| **Logging** | Structured pino logging with log levels |
| **Health Checks** | `/api/v1/health` and `/api/v1/monitoring` endpoints |
| **Docker** | Full Docker Compose with Redis, MQTT, PostgreSQL |
| **PM2** | Cluster mode production process management |

---

## Tech Stack

### Backend
- **Runtime:** Node.js 20 + TypeScript 5
- **Framework:** Express 5
- **ORM:** Prisma 5 + PostgreSQL (Supabase)
- **Messaging:** MQTT (VerneMQ), Socket.IO
- **Queue:** BullMQ + Redis
- **Auth:** JWT (jsonwebtoken), bcrypt
- **Validation:** Zod
- **Logging:** Pino

### Frontend
- **Framework:** Next.js 15 (App Router)
- **State:** Zustand + TanStack Query (React Query)
- **Real-time:** Socket.IO Client
- **Charts:** Recharts
- **UI:** Custom CSS + Radix UI

---

## Quick Start

### Prerequisites

| Tool | Version |
|---|---|
| Node.js | ≥ 20 |
| npm | ≥ 10 |
| PostgreSQL | ≥ 15 (or Supabase) |
| Redis | ≥ 7 (optional, graceful degradation) |
| MQTT Broker | VerneMQ or Mosquitto |

### 1. Clone and Install

```bash
git clone https://github.com/your-org/limelightit.git
cd limelightit

# Install root dependencies
npm install

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Configure Environment

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your values (see docs/DEPLOYMENT.md)

# Frontend
cp frontend/.env.local.example frontend/.env.local
```

### 3. Setup Database

```bash
cd backend

# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Seed initial admin user and factory data
npx prisma db seed
```

Default credentials after seeding:
- **Email:** `admin@limelightit.com`
- **Password:** `Admin@123!`

### 4. Start Development Servers

```bash
# Backend (http://localhost:5000)
cd backend && npm run dev

# Frontend (http://localhost:3000)
cd frontend && npm run dev
```

---

## Project Structure

```
limelightit/
├── backend/
│   ├── src/
│   │   ├── app.ts              # Express app configuration
│   │   ├── server.ts           # HTTP server + Socket.IO bootstrap
│   │   ├── config/             # Zod-validated environment config
│   │   ├── controllers/        # Route handlers (auth, admin, health)
│   │   ├── handlers/           # MQTT message handlers
│   │   ├── jobs/               # Cron scheduler (OEE, heartbeat)
│   │   ├── middleware/         # Auth (JWT), error handler
│   │   ├── mqtt/               # MQTT client connection
│   │   ├── prisma/             # Prisma client singleton + schema
│   │   ├── repositories/       # Data access layer
│   │   ├── routes/             # Express route definitions
│   │   ├── services/           # Business logic
│   │   ├── socket/             # Socket.IO emitter + Redis adapter
│   │   ├── types/              # Shared TypeScript types
│   │   ├── utils/              # Logger, AppError, stats
│   │   ├── validators/         # Zod MQTT payload schemas
│   │   └── worker.ts           # Standalone BullMQ worker entrypoint
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema
│   │   └── seed.ts             # Initial data seed
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── app/                # Next.js App Router pages
│   │   ├── components/         # Shared UI components
│   │   ├── features/           # Feature-scoped components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── providers/          # React context providers
│   │   ├── services/           # API service functions
│   │   ├── store/              # Zustand global state stores
│   │   ├── types/              # TypeScript interfaces
│   │   └── utils/              # Helper utilities
│   └── .env.local.example
│
├── docker/                     # Dockerfiles
├── docs/                       # Project documentation
├── docker-compose.yml          # Development Docker Compose
├── docker-compose.prod.yml     # Production Docker Compose
└── ecosystem.config.js         # PM2 configuration
```

---

## Documentation

- [API Reference](docs/API.md)
- [MQTT Topic Schema](docs/MQTT.md)
- [Socket.IO Events](docs/SOCKET_EVENTS.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

---

## Default Ports

| Service | Port |
|---|---|
| Backend API | 5000 |
| Frontend | 3000 |
| PostgreSQL | 5432 |
| Redis | 6379 |
| MQTT | 1883 |
| MQTT WebSocket | 8083 |
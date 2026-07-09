# Industry 4.0 Manufacturing Monitoring Admin Platform

A production-ready monorepo for an IoT monitoring dashboard.

## Architecture

- **Frontend:** Next.js 15, React 19, Tailwind CSS, shadcn/ui, Socket.IO Client, Zustand, React Query
- **Backend:** Node.js, Express, TypeScript, Prisma, PostgreSQL, MQTT.js, Socket.IO, Pino, BullMQ, Redis
- **DevOps:** Docker, Docker Compose, GitHub Actions, PM2, Nginx

## Prerequisites

- Docker and Docker Compose
- Node.js (v20+)
- npm (v10+)

## Getting Started

### 1. Install Dependencies

\`\`\`bash
npm install
\`\`\`

### 2. Environment Variables

Copy the example env file in the backend:

\`\`\`bash
cp backend/.env.example backend/.env
\`\`\`

Update the `.env` file with your local configurations (DB, Redis, MQTT broker).

### 3. Running with Docker Compose (Recommended for Dev)

This will start PostgreSQL, Redis, Backend, and Frontend.

\`\`\`bash
npm run docker:dev
\`\`\`

### 4. Running locally (without Docker for Apps)

If you just want to run Postgres and Redis via Docker, and apps locally:

\`\`\`bash
docker-compose up -d postgres redis
npm run dev
\`\`\`

## Workspaces

- `frontend`: The Next.js application (Port 3000)
- `backend`: The Express application (Port 5000)

## Code Standards

- Run `npm run lint` to check for linting errors.
- Run `npm run format` to format code using Prettier.
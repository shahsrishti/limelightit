FROM node:20-alpine AS builder

WORKDIR /app

# Copy root config
COPY package.json package-lock.json* ./
COPY backend/package.json backend/

# Install dependencies
RUN npm install

# Copy backend code
COPY backend/ ./backend/

WORKDIR /app/backend

# Generate Prisma Client
RUN npx prisma generate

# Build the app
RUN npm run build

# Production Image
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV production

COPY --from=builder /app/package.json /app/package-lock.json* ./
COPY --from=builder /app/backend/package.json ./backend/
RUN npm install --omit=dev

COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/node_modules/@prisma/client ./backend/node_modules/@prisma/client

WORKDIR /app/backend

EXPOSE 5000

CMD ["node", "dist/server.js"]

# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY src/prisma ./src/prisma
RUN npx prisma generate --schema=src/prisma/schema.prisma
COPY . .
RUN npm run build

# Production runner stage
FROM node:20-alpine AS runner
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src/prisma ./src/prisma
RUN npx prisma generate --schema=src/prisma/schema.prisma
COPY --from=builder /app/dist ./dist
EXPOSE 5000
CMD ["node", "dist/server.js"]

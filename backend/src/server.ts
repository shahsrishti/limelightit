import app from './app';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { env } from './config/env';
import { logger } from './utils/logger';
import { mqttClient } from './mqtt/client';
import { initSocketEmitter } from './socket/emitter';
import { initRedisSocketAdapter } from './socket/socket.adapter';
import { startCronScheduler } from './jobs/scheduler';
import { startQueueWorkers } from './services/queue.service';

const PORT = env.PORT || 5000;

// Create HTTP server
const httpServer = createServer(app);

// Setup Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: env.CORS_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);

  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

// Initialize the global Socket.IO emitter so services can emit events
initSocketEmitter(io);
initRedisSocketAdapter(io);

// Start MQTT Client
if (process.env.MQTT_ENABLED !== 'false') {
  mqttClient.connect();
}

// Start cron jobs (heartbeat, OEE, cleanup scheduling)
startCronScheduler();

// Start BullMQ background workers (report generation, alerts, cleanup)
startQueueWorkers();

// Start Server
httpServer.listen(PORT, () => {
  logger.info(`Server is running in ${env.NODE_ENV} mode on port ${PORT}`);
});

// Graceful Shutdown
const gracefulShutdown = (signal: string) => {
  logger.info(`${signal} received. Shutting down gracefully.`);
  mqttClient.disconnect();
  httpServer.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));


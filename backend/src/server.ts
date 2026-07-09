import app from './app';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { env } from './config/env';
import { logger } from './utils/logger';
import { mqttClient } from './mqtt/client';
import { initSocketEmitter } from './socket/emitter';

const PORT = process.env.PORT || 5000;

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

// Start MQTT Client
mqttClient.connect();

// Start Server
httpServer.listen(env.PORT, () => {
  logger.info(`Server is running in ${env.NODE_ENV} mode on port ${env.PORT}`);
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully.');
  mqttClient.disconnect();
  httpServer.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });
});

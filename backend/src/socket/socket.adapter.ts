import { Server } from 'socket.io';
import Redis from 'ioredis';
import { logger } from '../utils/logger';
import { env } from '../config/env';

let pubClient: Redis | null = null;
let subClient: Redis | null = null;

export const initRedisSocketAdapter = (io: Server) => {
  const redisUrl = `redis://${env.REDIS_HOST}:${env.REDIS_PORT}`;
  
  logger.info(`Initializing Socket.IO Redis pub/sub sync at ${redisUrl}...`);

  pubClient = new Redis(redisUrl, { maxRetriesPerRequest: 1, enableOfflineQueue: false });
  subClient = new Redis(redisUrl, { maxRetriesPerRequest: 1, enableOfflineQueue: false });

  pubClient.on('error', (err) => logger.error({ err }, 'Socket Redis Pub Client Error'));
  subClient.on('error', (err) => logger.error({ err }, 'Socket Redis Sub Client Error'));

  // Subscribe to broadcast events only when connected
  subClient.on('connect', () => {
    logger.info('🔌 Redis Socket.IO adapter client connected. Subscribing...');
    subClient?.subscribe('socket:broadcast', (err) => {
      if (err) {
        logger.error({ err }, 'Failed to subscribe to socket:broadcast channel');
      } else {
        logger.info('✅ Subscribed to Redis socket:broadcast channel');
      }
    });
  });

  subClient.on('message', (channel, message) => {
    if (channel === 'socket:broadcast') {
      try {
        const { event, data } = JSON.parse(message);
        logger.debug(`Clustered Socket sync received event: ${event}`);
        io.emit(event, data);
      } catch (err) {
        logger.error({ err, message }, 'Failed to process Clustered Redis broadcast payload');
      }
    }
  });
};

export const broadcastSocketEvent = (event: string, data: any) => {
  if (pubClient && pubClient.status === 'ready') {
    pubClient.publish('socket:broadcast', JSON.stringify({ event, data }))
      .catch((err) => logger.error({ err }, `Failed to publish Redis socket broadcast for: ${event}`));
  }
};

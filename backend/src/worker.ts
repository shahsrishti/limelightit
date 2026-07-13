import { env } from './config/env';
import { logger } from './utils/logger';
import { mqttClient } from './mqtt/client';
import { startQueueWorkers } from './services/queue.service';
import { startCronScheduler } from './jobs/scheduler';
import { prisma } from './prisma/client';

logger.info(`Starting background manufacturing monitoring worker in ${env.NODE_ENV} mode...`);

async function main() {
  try {
    // 1. Verify DB connection
    await prisma.$queryRaw`SELECT 1`;
    logger.info('✅ Successfully connected to database');

    // 2. Start background BullMQ queue workers
    startQueueWorkers();

    // 3. Start cron scheduling engine
    startCronScheduler();

    // 4. Start MQTT message router connection to VerneMQ broker
    mqttClient.connect();

    logger.info('🚀 Background worker successfully initialized and running');
  } catch (err) {
    logger.error({ err }, '💥 Background worker failed to start');
    process.exit(1);
  }
}

main();

// Graceful Shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down background worker gracefully.');
  mqttClient.disconnect();
  prisma.$disconnect().then(() => {
    logger.info('Database disconnected. Worker shutdown complete.');
    process.exit(0);
  });
});

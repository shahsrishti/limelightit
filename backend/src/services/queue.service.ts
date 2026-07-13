import { Queue, Worker } from 'bullmq';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { prisma } from '../prisma/client';
import { emit, SocketEvents } from '../socket/emitter';

const redisConnection = {
  host: env.REDIS_HOST,
  port: Number(env.REDIS_PORT),
};

// Initialize Queues — gracefully degrade if Redis is offline at startup
let reportQueue: Queue;
let alertQueue: Queue;
let cleanupQueue: Queue;
let notificationQueue: Queue;

try {
  reportQueue = new Queue('ReportQueue', { connection: redisConnection });
  alertQueue = new Queue('AlertQueue', { connection: redisConnection });
  cleanupQueue = new Queue('CleanupQueue', { connection: redisConnection });
  notificationQueue = new Queue('NotificationQueue', { connection: redisConnection });
  logger.info('✅ BullMQ queues initialized');
} catch (err) {
  logger.warn({ err }, '⚠️ BullMQ queues could not be initialized (Redis may be offline). Queue features disabled.');
  // Cast to Queue so the rest of the module compiles — queue.add() calls are guarded at runtime
  reportQueue = null as unknown as Queue;
  alertQueue = null as unknown as Queue;
  cleanupQueue = null as unknown as Queue;
  notificationQueue = null as unknown as Queue;
}

export { reportQueue, alertQueue, cleanupQueue, notificationQueue };

// Queue Worker Definitions
export const startQueueWorkers = () => {
  logger.info('🚀 Starting BullMQ Background Workers...');

  // 1. Report Worker
  const reportWorker = new Worker('ReportQueue', async (job) => {
    logger.info({ jobId: job.id, data: job.data }, 'Processing report generation job');
    const { title, format } = job.data;
    
    // Simulate generation delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    logger.info({ jobId: job.id }, `Report "${title}" generated successfully in ${format} format`);
    return { status: 'COMPLETED', generatedAt: new Date().toISOString() };
  }, { connection: redisConnection });

  // 2. Alert Processing Worker
  const alertWorker = new Worker('AlertQueue', async (job) => {
    logger.info({ jobId: job.id, data: job.data }, 'Processing alert event');
    const { machineId, type, message } = job.data;

    // Create the alert in database
    const alert = await prisma.alert.create({
      data: {
        machineId,
        type,
        message,
        resolved: false,
        timestamp: new Date(),
      },
      include: {
        machine: {
          select: { name: true }
        }
      }
    });

    // Notify connected browser clients via Socket.IO
    emit(SocketEvents.NEW_ALERT, {
      id: alert.id,
      machineId: alert.machineId,
      type: alert.type,
      message: alert.message,
      resolved: alert.resolved,
      timestamp: alert.timestamp,
      machine: { name: alert.machine.name }
    });

    logger.info({ alertId: alert.id }, 'Alert processed and socket event dispatched');
    return alert;
  }, { connection: redisConnection });

  // 3. Cleanup Tasks Worker
  const cleanupWorker = new Worker('CleanupQueue', async (job) => {
    logger.info({ jobId: job.id }, 'Running database telemetry cleanup worker');
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - env.TELEMETRY_RETENTION_DAYS);

    try {
      const [metricClean, statusClean, healthClean] = await Promise.all([
        prisma.machineMetric.deleteMany({
          where: { timestamp: { lt: retentionDate } },
        }),
        prisma.machineStatus.deleteMany({
          where: { timestamp: { lt: retentionDate } },
        }),
        prisma.deviceHealth.deleteMany({
          where: { timestamp: { lt: retentionDate } },
        }),
      ]);

      const totalDeleted = metricClean.count + statusClean.count + healthClean.count;
      logger.info({ totalDeleted }, 'Database telemetry metrics cleanup finished');
      return { totalDeleted };
    } catch (err) {
      logger.error({ err }, 'Error cleaning database telemetry records');
      throw err;
    }
  }, { connection: redisConnection });

  // 4. Notification Tasks Worker
  const notificationWorker = new Worker('NotificationQueue', async (job) => {
    logger.info({ jobId: job.id, data: job.data }, 'Dispatching notification message');
    const { recipient, title, body } = job.data;
    
    // Simulate notification relay
    await new Promise((resolve) => setTimeout(resolve, 300));
    
    logger.info({ recipient, title }, 'Operator notified successfully');
    return { status: 'SENT' };
  }, { connection: redisConnection });

  // Error listeners
  [reportWorker, alertWorker, cleanupWorker, notificationWorker].forEach((w) => {
    w.on('failed', (job, err) => {
      logger.error({ jobId: job?.id, queueName: w.name, err }, 'Queue job execution failed');
    });
  });
};

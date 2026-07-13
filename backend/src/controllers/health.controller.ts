import { Request, Response } from 'express';
import { prisma } from '../prisma/client';
import { mqttClient } from '../mqtt/client';
import { getActiveClientsCount } from '../socket/emitter';
import { telemetryStats } from '../utils/stats';
import { reportQueue, alertQueue, cleanupQueue, notificationQueue } from '../services/queue.service';
import Redis from 'ioredis';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const redisClient = new Redis(`redis://${env.REDIS_HOST}:${env.REDIS_PORT}`, {
  maxRetriesPerRequest: 1,
  lazyConnect: true,
  enableOfflineQueue: false
});
redisClient.on('error', (err) => logger.error({ err }, 'Health Check Redis Connection Error'));

export class HealthController {
  /**
   * Public health endpoint (suitable for Kubernetes liveness/readiness probes).
   */
  public async getHealth(req: Request, res: Response) {
    let dbStatus = 'Disconnected';
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'Connected';
    } catch (e) {
      dbStatus = 'Error';
    }

    let redisStatus = 'Disconnected';
    try {
      // Lazy connect or ping
      if (redisClient.status === 'wait' || redisClient.status === 'close') {
        await redisClient.connect();
      }
      const pingRes = await redisClient.ping();
      redisStatus = pingRes === 'PONG' ? 'Connected' : 'Error';
    } catch (e) {
      redisStatus = 'Error';
    }

    const healthData = {
      status: dbStatus === 'Connected' && redisStatus === 'Connected' ? 'UP' : 'DEGRADED',
      database: dbStatus,
      redis: redisStatus,
      mqtt: mqttClient.getStatus(),
      uptime: process.uptime(),
      version: '1.0.0',
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    };

    const isHealthy = dbStatus === 'Connected' && redisStatus === 'Connected';
    res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      message: isHealthy ? 'System Healthy' : 'System Degraded',
      data: healthData,
    });
  }

  /**
   * Secure Monitoring stats endpoint.
   */
  public async getMonitoring(req: Request, res: Response) {
    let dbStatus = 'Connected';
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (e) {
      dbStatus = 'Disconnected';
    }

    let redisStatus = 'Connected';
    try {
      if (redisClient.status === 'wait' || redisClient.status === 'close') {
        await redisClient.connect();
      }
      await redisClient.ping();
    } catch (e) {
      redisStatus = 'Disconnected';
    }

    // Process stats
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    // Database counters
    let totalMachines = 0;
    let onlineMachines = 0;
    try {
      totalMachines = await prisma.machine.count();
      const activeStates = await prisma.machineStatus.findMany({
        distinct: ['machineId'],
        orderBy: { timestamp: 'desc' },
      });
      onlineMachines = activeStates.filter((s) => s.status === 'RUNNING' || s.status === 'IDLE').length;
    } catch (err) {
      logger.error({ err }, 'Error counting machine databases for monitoring metrics');
    }

    // Queue jobs count
    let queueStats = { reportQueue: {}, alertQueue: {}, cleanupQueue: {}, notificationQueue: {} };
    try {
      queueStats = {
        reportQueue: await reportQueue.getJobCounts(),
        alertQueue: await alertQueue.getJobCounts(),
        cleanupQueue: await cleanupQueue.getJobCounts(),
        notificationQueue: await notificationQueue.getJobCounts(),
      };
    } catch (err) {
      logger.error({ err }, 'Error retrieving BullMQ statistics');
    }

    const monitoringData = {
      uptimeSeconds: telemetryStats.getUptimeSeconds(),
      memory: {
        rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
      connections: {
        database: dbStatus,
        redis: redisStatus,
        mqtt: mqttClient.getStatus(),
        socketClientsCount: getActiveClientsCount(),
      },
      fleet: {
        totalMachines,
        onlineMachines,
      },
      queues: queueStats,
      throughput: {
        messagesProcessedPerMinute: telemetryStats.getMessagesPerMinute(),
      },
      timestamp: new Date().toISOString(),
    };

    res.status(200).json({
      success: true,
      message: 'Monitoring metrics compiled',
      data: monitoringData,
    });
  }
}

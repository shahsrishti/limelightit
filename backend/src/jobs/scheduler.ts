import cron from 'node-cron';
import { prisma } from '../prisma/client';
import { logger } from '../utils/logger';
import { heartbeatService } from '../services/heartbeat.service';
import { cleanupQueue } from '../services/queue.service';

/**
 * Recalculate and archive OEE snapshots for all machines.
 * Uses a single aggregated query per machine to avoid N+1 problems.
 */
async function generateDailyOEESummaries() {
  logger.info('Running scheduled job: Recalculate Daily OEE Summaries...');
  try {
    const machines = await prisma.machine.findMany({ select: { id: true, name: true } });
    if (machines.length === 0) return;

    const now = new Date();
    const past24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const machineIds = machines.map((m) => m.id);

    // Batch-fetch aggregated status counts for all machines in one query
    const statusCounts = await prisma.machineStatus.groupBy({
      by: ['machineId', 'status'],
      where: {
        machineId: { in: machineIds },
        timestamp: { gte: past24h },
      },
      _count: { status: true },
    });

    // Batch-fetch aggregated speed metrics for all machines in one query
    const speedAggs = await prisma.machineMetric.groupBy({
      by: ['machineId'],
      where: {
        machineId: { in: machineIds },
        timestamp: { gte: past24h },
        speed: { not: null },
      },
      _avg: { speed: true },
      _count: { speed: true },
    });

    const speedMap = new Map(speedAggs.map((a) => [a.machineId, a._avg.speed ?? 85]));

    // Build per-machine status maps
    const statusMap = new Map<string, Map<string, number>>();
    for (const row of statusCounts) {
      if (!statusMap.has(row.machineId)) statusMap.set(row.machineId, new Map());
      statusMap.get(row.machineId)!.set(row.status, row._count.status);
    }

    // Compute OEE snapshots for all machines
    const snapshots = machines.map((machine) => {
      const statusData = statusMap.get(machine.id) ?? new Map<string, number>();
      const totalStatuses = Array.from(statusData.values()).reduce((a, b) => a + b, 0);
      const runningCount =
        (statusData.get('RUNNING') ?? 0) + (statusData.get('IDLE') ?? 0);
      const availability = totalStatuses > 0 ? runningCount / totalStatuses : 0.92;

      const avgSpeed = speedMap.get(machine.id) ?? 85;
      const performance = Math.min(1, avgSpeed / 100);

      const quality = 0.99;
      const oee = availability * performance * quality;

      logger.info(
        { machineId: machine.id, oee: oee.toFixed(2), availability: availability.toFixed(2) },
        'Computed OEE snapshot'
      );

      return {
        machineId: machine.id,
        availability,
        performance,
        quality,
        oee,
        timestamp: now,
      };
    });

    // Batch-insert all snapshots
    await prisma.oEESnapshot.createMany({ data: snapshots });
    logger.info({ count: snapshots.length }, '✅ Daily OEE snapshots saved');
  } catch (err) {
    logger.error({ err }, 'Failed to recalculate daily OEE summaries');
  }
}

/**
 * Database health check ping job.
 */
async function databaseHealthCheck() {
  logger.debug('Running database connectivity verify ping...');
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.debug('Database connectivity OK');
  } catch (err) {
    logger.error({ err }, '🚨 Database connectivity check FAILED!');
  }
}

/**
 * Initialize all scheduled cron jobs and loops.
 */
export const startCronScheduler = () => {
  logger.info('🚀 Initializing scheduled jobs node-cron engine...');

  // 1. Remove old telemetry data from database (Runs daily at 2:00 AM)
  cron.schedule('0 2 * * *', async () => {
    logger.info('Scheduled Cron: Triggering database telemetry retention cleanup');
    await cleanupQueue.add('cleanup-telemetry-retention', {});
  });

  // 2. Recalculate daily OEE summaries (Runs daily at 12:05 AM)
  cron.schedule('5 0 * * *', async () => {
    await generateDailyOEESummaries();
  });

  // 3. Database connectivity verify ping (Runs every minute)
  cron.schedule('* * * * *', async () => {
    await databaseHealthCheck();
  });

  // 4. Edge presence heartbeat check (Runs every 10 seconds)
  setInterval(async () => {
    await heartbeatService.checkDeviceHeartbeats();
  }, 10000);

  // Run initial OEE calculations on startup to populate dashboard snapshots
  generateDailyOEESummaries().catch((err) => logger.error({ err }, 'Initial OEE calc failed'));
};

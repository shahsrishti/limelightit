import { prisma } from '../prisma/client';
import { logger } from '../utils/logger';
import Redis from 'ioredis';
import { env } from '../config/env';

const redis = new Redis(`redis://${env.REDIS_HOST}:${env.REDIS_PORT}`, {
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
});
redis.on('error', (err) => logger.error({ err }, 'Dashboard cache Redis error'));

export class DashboardService {
  /**
   * Returns the high-level KPI data for the Admin Dashboard overview panel.
   * Uses typed Prisma queries throughout — no raw SQL.
   */
  public async getOverviewStats() {
    const cacheKey = 'dashboard:overview:stats';
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        logger.debug('Returning cached dashboard overview stats');
        return JSON.parse(cached);
      }
    } catch (err) {
      logger.error({ err }, 'Failed to read from Redis dashboard stats cache');
    }

    logger.debug('Fetching dashboard overview stats from database');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalMachines,
      activeAlerts,
      activeDowntimes,
      todayMetrics,
    ] = await Promise.all([
      // Total machines
      prisma.machine.count(),

      // Active (unresolved) alerts
      prisma.alert.count({ where: { resolved: false } }),

      // Currently open downtime sessions
      prisma.downtimeSession.count({ where: { endTime: null } }),

      // Today's aggregated metrics (power = production proxy)
      prisma.machineMetric.aggregate({
        where: { timestamp: { gte: today } },
        _sum: { power: true },
        _avg: { power: true },
      }),
    ]);

    // Determine online/offline counts using Prisma groupBy — no raw SQL
    // Gets the latest status record per machine via groupBy on status
    const latestStatusGroups = await prisma.machineStatus.groupBy({
      by: ['machineId', 'status'],
      orderBy: { machineId: 'asc' },
      _max: { timestamp: true },
    });

    // Build a map of machineId -> latest status
    const latestStatusMap = new Map<string, string>();
    for (const row of latestStatusGroups) {
      const existing = latestStatusMap.get(row.machineId);
      if (!existing) {
        // groupBy doesn't guarantee order, so take the first occurrence
        latestStatusMap.set(row.machineId, row.status);
      }
    }

    // For a more accurate latest-status-per-machine, use a findMany with cursor approach
    const allMachines = await prisma.machine.findMany({
      select: {
        id: true,
        statuses: {
          orderBy: { timestamp: 'desc' },
          take: 1,
          select: { status: true },
        },
      },
    });

    const onlineMachines = allMachines.filter(
      (m) => m.statuses[0]?.status === 'RUNNING' || m.statuses[0]?.status === 'IDLE'
    ).length;

    const offlineMachines = totalMachines - onlineMachines;

    // OEE: retrieve the most recent average as a dashboard KPI
    let latestOEE = await prisma.oEESnapshot.aggregate({
      where: { timestamp: { gte: today } },
      _avg: { oee: true },
    });

    if (latestOEE._avg.oee === null) {
      latestOEE = await prisma.oEESnapshot.aggregate({
        _avg: { oee: true },
      });
    }

    const stats = {
      totalMachines,
      onlineMachines,
      offlineMachines,
      activeAlerts,
      activeDowntimes,
      todayProduction: todayMetrics._sum.power ?? 0,
      averagePower: todayMetrics._avg.power ?? 0,
      overallOEE: latestOEE._avg.oee ?? null,
    };

    try {
      await redis.set(cacheKey, JSON.stringify(stats), 'EX', 15);
    } catch (err) {
      logger.error({ err }, 'Failed to save to Redis dashboard stats cache');
    }

    return stats;
  }
}

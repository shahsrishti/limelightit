import { prisma } from '../prisma/client';
import { logger } from '../utils/logger';

export class DashboardService {
  /**
   * Returns the high-level KPI data for the Admin Dashboard overview panel.
   */
  public async getOverviewStats() {
    logger.debug('Fetching dashboard overview stats');

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

    // Determine online/offline counts based on most recent status per machine
    // We fetch the latest status for every machine efficiently
    const latestStatuses = await prisma.$queryRaw<{ machineId: string; status: string }[]>`
      SELECT DISTINCT ON ("machineId") "machineId", status
      FROM machine_statuses
      ORDER BY "machineId", timestamp DESC
    `;

    const onlineMachines = latestStatuses.filter(
      (s) => s.status === 'RUNNING' || s.status === 'IDLE'
    ).length;

    const offlineMachines = totalMachines - onlineMachines;

    // OEE: For a real factory, OEE comes from OEESnapshot. 
    // Here we retrieve the most recent average as a dashboard KPI.
    // Fall back to all-time average if there are no snapshots today.
    let latestOEE = await prisma.oEESnapshot.aggregate({
      where: { timestamp: { gte: today } },
      _avg: { oee: true },
    });

    if (latestOEE._avg.oee === null) {
      latestOEE = await prisma.oEESnapshot.aggregate({
        _avg: { oee: true },
      });
    }

    return {
      totalMachines,
      onlineMachines,
      offlineMachines,
      activeAlerts,
      activeDowntimes,
      todayProduction: todayMetrics._sum.power ?? 0,
      averagePower: todayMetrics._avg.power ?? 0,
      overallOEE: latestOEE._avg.oee ?? null,
    };
  }
}

import { prisma } from '../prisma/client';
import { logger } from '../utils/logger';

export interface OEEQuery {
  machineId?: string;
  from?: string;
  to?: string;
}

export class OEEService {
  public async getOEE(query: OEEQuery) {
    const { machineId, from, to } = query;

    const where = {
      ...(machineId && { machineId }),
      ...((from || to) && {
        timestamp: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to) }),
        },
      }),
    };

    const [snapshots, aggregate] = await Promise.all([
      prisma.oEESnapshot.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        include: { machine: { select: { name: true } } },
        take: 200,
      }),
      prisma.oEESnapshot.aggregate({
        where,
        _avg: {
          availability: true,
          performance: true,
          quality: true,
          oee: true,
        },
      }),
    ]);

    logger.debug({ count: snapshots.length }, 'OEE snapshots fetched');

    return {
      summary: {
        averageAvailability: aggregate._avg.availability ?? null,
        averagePerformance: aggregate._avg.performance ?? null,
        averageQuality: aggregate._avg.quality ?? null,
        overallOEE: aggregate._avg.oee ?? null,
      },
      snapshots,
    };
  }
}

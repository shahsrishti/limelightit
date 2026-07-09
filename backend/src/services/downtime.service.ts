import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface DowntimeQuery {
  page?: number;
  limit?: number;
  machineId?: string;
  from?: string;
  to?: string;
  active?: boolean;
}

export class DowntimeService {
  public async getDowntimes(query: DowntimeQuery) {
    const { page = 1, limit = 20, machineId, from, to, active } = query;
    const skip = (page - 1) * limit;

    const where = {
      ...(machineId && { machineId }),
      ...(active !== undefined && active ? { endTime: null } : {}),
      ...(from && to && {
        startTime: { gte: new Date(from), lte: new Date(to) },
      }),
    };

    const [downtimes, total] = await Promise.all([
      prisma.downtimeSession.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startTime: 'desc' },
        include: { machine: { select: { name: true } } },
      }),
      prisma.downtimeSession.count({ where }),
    ]);

    logger.debug({ count: downtimes.length }, 'Downtime sessions fetched');

    const enriched = downtimes.map((d) => ({
      ...d,
      durationMs: d.endTime
        ? d.endTime.getTime() - d.startTime.getTime()
        : Date.now() - d.startTime.getTime(),
      active: d.endTime === null,
    }));

    return {
      data: enriched,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}

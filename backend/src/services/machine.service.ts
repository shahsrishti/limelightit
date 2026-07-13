import { prisma } from '../prisma/client';
import { Prisma } from '@prisma/client';
import { logger } from '../utils/logger';
import { AppError } from '../utils/AppError';

// Whitelist of allowed sort fields to prevent raw user input from crashing Prisma
const ALLOWED_SORT_FIELDS = ['name', 'createdAt', 'updatedAt'] as const;
type AllowedSortField = typeof ALLOWED_SORT_FIELDS[number];

export interface MachineListQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  factoryId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class MachineService {
  /**
   * Returns a paginated, filterable list of machines for the Admin Dashboard.
   */
  public async getMachines(query: MachineListQuery) {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      factoryId,
      sortOrder = 'desc',
    } = query;

    // Validate and sanitize sortBy to prevent raw user input from crashing Prisma
    const safeSortBy: AllowedSortField = ALLOWED_SORT_FIELDS.includes(query.sortBy as AllowedSortField)
      ? (query.sortBy as AllowedSortField)
      : 'createdAt';

    const skip = (page - 1) * limit;

    const where: Prisma.MachineWhereInput = {
      ...(factoryId && { factoryId }),
      ...(search && {
        name: { contains: search, mode: 'insensitive' },
      }),
    };

    const [machines, total] = await Promise.all([
      prisma.machine.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [safeSortBy]: sortOrder },
        include: {
          factory: { select: { name: true } },
          devices: { select: { id: true, macAddress: true } },
          // Latest status via a nested findFirst
          statuses: {
            orderBy: { timestamp: 'desc' },
            take: 1,
          },
          // Latest metric for power/temperature display
          metrics: {
            orderBy: { timestamp: 'desc' },
            take: 1,
          },
        },
      }),
      prisma.machine.count({ where }),
    ]);

    logger.debug({ count: machines.length, total }, 'Machine list fetched');

    return {
      data: machines.map((m) => ({
        id: m.id,
        name: m.name,
        factory: m.factory.name,
        currentStatus: m.statuses[0]?.status ?? 'UNKNOWN',
        lastSeen: m.statuses[0]?.timestamp ?? null,
        power: m.metrics[0]?.power ?? null,
        temperature: m.metrics[0]?.temperature ?? null,
        deviceCount: m.devices.length,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Returns full machine details including live metrics and device info.
   */
  public async getMachineById(id: string) {
    const machine = await prisma.machine.findUnique({
      where: { id },
      include: {
        factory: true,
        devices: {
          include: {
            healthRecords: {
              orderBy: { timestamp: 'desc' },
              take: 1,
            },
          },
        },
        statuses: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
        metrics: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
        alerts: {
          where: { resolved: false },
          orderBy: { timestamp: 'desc' },
          take: 5,
        },
      },
    });

    if (!machine) {
      throw new AppError('Machine not found', 404);
    }

    return {
      ...machine,
      currentStatus: machine.statuses[0]?.status ?? 'UNKNOWN',
      latestMetrics: machine.metrics[0] ?? null,
      activeAlerts: machine.alerts,
    };
  }

  /**
   * Returns historical metrics for a machine with optional aggregation.
   */
  public async getMachineHistory(
    machineId: string,
    from: string,
    to: string,
    metrics: string[] = ['temperature', 'vibration', 'speed', 'power']
  ) {
    const machine = await prisma.machine.findUnique({ where: { id: machineId } });
    if (!machine) throw new AppError('Machine not found', 404);

    const fromDate = new Date(from);
    const toDate = new Date(to);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      throw new AppError('Invalid date range provided', 400);
    }

    const records = await prisma.machineMetric.findMany({
      where: {
        machineId,
        timestamp: { gte: fromDate, lte: toDate },
      },
      orderBy: { timestamp: 'asc' },
      // Only select requested metrics columns
      select: {
        timestamp: true,
        temperature: metrics.includes('temperature'),
        vibration: metrics.includes('vibration'),
        speed: metrics.includes('speed'),
        power: metrics.includes('power'),
      },
    });

    logger.debug({ machineId, count: records.length }, 'Machine history fetched');

    return { machineId, from, to, records };
  }
}

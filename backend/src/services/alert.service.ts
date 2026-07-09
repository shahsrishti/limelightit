import { prisma } from '../prisma/client';
import { logger } from '../utils/logger';

export interface AlertQuery {
  page?: number;
  limit?: number;
  resolved?: boolean;
  type?: string;
  machineId?: string;
}

export class AlertService {
  public async getAlerts(query: AlertQuery) {
    const { page = 1, limit = 20, resolved, type, machineId } = query;
    const skip = (page - 1) * limit;

    const where = {
      ...(resolved !== undefined && { resolved }),
      ...(type && { type }),
      ...(machineId && { machineId }),
    };

    const [alerts, total] = await Promise.all([
      prisma.alert.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
        include: { machine: { select: { name: true, factory: { select: { name: true } } } } },
      }),
      prisma.alert.count({ where }),
    ]);

    logger.debug({ count: alerts.length, total }, 'Alerts fetched');

    return {
      data: alerts,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  public async resolveAlert(alertId: string) {
    const alert = await prisma.alert.update({
      where: { id: alertId },
      data: { resolved: true },
    });
    logger.info({ alertId }, 'Alert resolved');
    return alert;
  }
}

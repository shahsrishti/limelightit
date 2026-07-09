import { prisma } from '../prisma/client';
import { logger } from '../utils/logger';

export class DeviceHealthService {
  public async getLatestDeviceHealth(factoryId?: string) {
    // Get the latest health record for every device using Prisma query builder
    const devices = await prisma.device.findMany({
      where: factoryId ? { machine: { factoryId } } : {},
      include: {
        machine: { select: { name: true, id: true } },
        healthRecords: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    });

    const healthRecords = devices.map((d) => ({
      deviceId: d.id,
      macAddress: d.macAddress,
      machineName: d.machine.name,
      machineId: d.machineId,
      battery: d.healthRecords[0]?.battery ?? null,
      signal: d.healthRecords[0]?.signal ?? null,
      uptime: d.healthRecords[0]?.uptime ?? null,
      lastSeen: d.healthRecords[0]?.timestamp ?? null,
    }));

    logger.debug({ count: healthRecords.length }, 'Device health records fetched');

    return healthRecords;
  }
}

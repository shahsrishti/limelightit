import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export class DeviceHealthService {
  public async getLatestDeviceHealth(factoryId?: string) {
    // Get the latest health record for every device
    // We use a raw query for the DISTINCT ON pattern (most efficient in Postgres)
    const healthRecords = await prisma.$queryRaw<
      {
        deviceId: string;
        macAddress: string;
        machineName: string;
        battery: number | null;
        signal: number | null;
        uptime: number | null;
        timestamp: Date;
      }[]
    >`
      SELECT DISTINCT ON (dh."deviceId")
        dh."deviceId",
        d."macAddress",
        m.name AS "machineName",
        dh.battery,
        dh.signal,
        dh.uptime,
        dh.timestamp
      FROM device_health dh
      INNER JOIN devices d ON dh."deviceId" = d.id
      INNER JOIN machines m ON d."machineId" = m.id
      ${factoryId ? prisma.$queryRaw`WHERE m."factoryId" = ${factoryId}` : prisma.$queryRaw``}
      ORDER BY dh."deviceId", dh.timestamp DESC
    `;

    logger.debug({ count: healthRecords.length }, 'Device health records fetched');

    return healthRecords;
  }
}

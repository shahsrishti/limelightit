import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { HealthPayloadSchema } from '../validators/mqtt.validator';
import { emit, SocketEvents } from '../socket/emitter';

const prisma = new PrismaClient();

export const handleHealth = async (topic: string, raw: unknown): Promise<void> => {
  const result = HealthPayloadSchema.safeParse(raw);
  if (!result.success) {
    logger.warn({ topic, errors: result.error.flatten() }, 'Invalid health payload. Discarding.');
    return;
  }

  const payload = result.data;
  const now = payload.timestamp ? new Date(payload.timestamp) : new Date();

  logger.debug({ deviceId: payload.deviceId }, 'Processing device health check-in');

  try {
    // Verify device exists
    const device = await prisma.device.findUnique({ where: { id: payload.deviceId } });
    if (!device) {
      logger.warn({ deviceId: payload.deviceId }, 'Health check from unknown device. Discarding.');
      return;
    }

    await prisma.deviceHealth.create({
      data: {
        deviceId: payload.deviceId,
        battery: payload.battery ?? null,
        signal: payload.signal ?? null,
        uptime: payload.uptime ?? null,
        timestamp: now,
      },
    });

    logger.info({ deviceId: payload.deviceId }, 'Device health recorded');

    emit(SocketEvents.DEVICE_HEALTH_UPDATE, {
      deviceId: payload.deviceId,
      machineId: payload.machineId,
      battery: payload.battery,
      signal: payload.signal,
      uptime: payload.uptime,
      firmware: payload.firmware,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    logger.error({ deviceId: payload.deviceId, error }, 'Failed to process device health');
    throw error;
  }
};

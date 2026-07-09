import { prisma } from '../prisma/client';
import { logger } from '../utils/logger';
import { LwtPayloadSchema } from '../validators/mqtt.validator';
import { emit, SocketEvents } from '../socket/emitter';

/**
 * LWT (Last Will and Testament) handler.
 * Triggered automatically by VerneMQ when a device disconnects unexpectedly.
 */
export const handleLwt = async (topic: string, raw: unknown): Promise<void> => {
  const result = LwtPayloadSchema.safeParse(raw);
  if (!result.success) {
    logger.warn({ topic, errors: result.error.flatten() }, 'Invalid LWT payload. Discarding.');
    return;
  }

  const payload = result.data;
  const now = payload.timestamp ? new Date(payload.timestamp) : new Date();

  logger.warn({ machineId: payload.machineId, deviceId: payload.deviceId }, '⚠️ LWT received — device went offline unexpectedly');

  try {
    // Record machine going offline
    await prisma.machineStatus.create({
      data: {
        machineId: payload.machineId,
        status: 'STOPPED',
        timestamp: now,
      },
    });

    // Create an alert for unexpected offline event
    const alert = await prisma.alert.create({
      data: {
        machineId: payload.machineId,
        type: 'CRITICAL',
        message: `Device ${payload.deviceId} lost connection unexpectedly (LWT triggered)`,
        timestamp: now,
      },
    });

    emit(SocketEvents.MACHINE_STATUS_CHANGE, {
      machineId: payload.machineId,
      status: 'OFFLINE',
      timestamp: now.toISOString(),
    });

    emit(SocketEvents.NEW_ALERT, {
      alertId: alert.id,
      machineId: payload.machineId,
      type: 'CRITICAL',
      message: alert.message,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    logger.error({ machineId: payload.machineId, error }, 'Failed to process LWT event');
    throw error;
  }
};

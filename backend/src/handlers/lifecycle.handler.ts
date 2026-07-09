import { prisma } from '../prisma/client';
import { logger } from '../utils/logger';
import { LifecyclePayloadSchema } from '../validators/mqtt.validator';
import { emit, SocketEvents } from '../socket/emitter';

export const handleLifecycle = async (topic: string, raw: unknown): Promise<void> => {
  const result = LifecyclePayloadSchema.safeParse(raw);
  if (!result.success) {
    logger.warn({ topic, errors: result.error.flatten() }, 'Invalid lifecycle payload. Discarding.');
    return;
  }

  const payload = result.data;
  const now = payload.timestamp ? new Date(payload.timestamp) : new Date();

  logger.info({ machineId: payload.machineId, event: payload.event }, 'Processing device lifecycle event');

  try {
    const statusMap: Record<string, string> = {
      BOOT: 'IDLE',
      SHUTDOWN: 'STOPPED',
      REBOOT: 'STOPPED',
    };

    const newStatus = statusMap[payload.event] || 'STOPPED';

    await prisma.machineStatus.create({
      data: {
        machineId: payload.machineId,
        status: newStatus,
        timestamp: now,
      },
    });

    emit(SocketEvents.MACHINE_STATUS_CHANGE, {
      machineId: payload.machineId,
      status: newStatus,
      lifecycleEvent: payload.event,
      timestamp: now.toISOString(),
    });

    logger.info({ machineId: payload.machineId, lifecycleEvent: payload.event }, 'Lifecycle event recorded');
  } catch (error) {
    logger.error({ machineId: payload.machineId, error }, 'Failed to process lifecycle event');
    throw error;
  }
};

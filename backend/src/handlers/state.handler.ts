import { prisma } from '../prisma/client';
import { logger } from '../utils/logger';
import { StatePayloadSchema } from '../validators/mqtt.validator';
import { emit, SocketEvents } from '../socket/emitter';

export const handleState = async (topic: string, raw: unknown): Promise<void> => {
  const result = StatePayloadSchema.safeParse(raw);
  if (!result.success) {
    logger.warn({ topic, errors: result.error.flatten() }, 'Invalid state payload. Discarding.');
    return;
  }

  const payload = result.data;
  const now = payload.timestamp ? new Date(payload.timestamp) : new Date();

  logger.info({ machineId: payload.machineId, status: payload.status }, 'Processing machine state change');

  try {
    const machine = await prisma.machine.findUnique({ where: { id: payload.machineId } });
    if (!machine) {
      logger.warn({ machineId: payload.machineId }, 'State change for unknown machine. Discarding.');
      return;
    }

    await prisma.machineStatus.create({
      data: {
        machineId: payload.machineId,
        status: payload.status,
        timestamp: now,
      },
    });

    logger.info({ machineId: payload.machineId, status: payload.status }, 'Machine status updated');

    // Emit status change to Admin Dashboard in real-time
    emit(SocketEvents.MACHINE_STATUS_CHANGE, {
      machineId: payload.machineId,
      status: payload.status,
      timestamp: now.toISOString(),
    });

    // If the machine goes into ERROR state, create an automatic alert
    if (payload.status === 'ERROR') {
      const alert = await prisma.alert.create({
        data: {
          machineId: payload.machineId,
          type: 'CRITICAL',
          message: `Machine ${payload.machineId} reported an ERROR state`,
          timestamp: now,
        },
      });

      emit(SocketEvents.NEW_ALERT, {
        alertId: alert.id,
        machineId: payload.machineId,
        type: 'CRITICAL',
        message: alert.message,
        timestamp: now.toISOString(),
      });
    }
  } catch (error) {
    logger.error({ machineId: payload.machineId, error }, 'Failed to process state change');
    throw error;
  }
};

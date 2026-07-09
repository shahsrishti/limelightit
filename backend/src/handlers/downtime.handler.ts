import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { DowntimePayloadSchema } from '../validators/mqtt.validator';
import { emit, SocketEvents } from '../socket/emitter';

const prisma = new PrismaClient();

export const handleDowntime = async (topic: string, raw: unknown): Promise<void> => {
  const result = DowntimePayloadSchema.safeParse(raw);
  if (!result.success) {
    logger.warn({ topic, errors: result.error.flatten() }, 'Invalid downtime payload. Discarding.');
    return;
  }

  const payload = result.data;
  const now = payload.timestamp ? new Date(payload.timestamp) : new Date();

  logger.info({ machineId: payload.machineId, event: payload.event }, 'Processing downtime event');

  try {
    if (payload.event === 'START') {
      const session = await prisma.downtimeSession.create({
        data: {
          machineId: payload.machineId,
          startTime: now,
          reason: payload.reason ?? null,
        },
      });

      emit(SocketEvents.DOWNTIME_START, {
        sessionId: session.id,
        machineId: payload.machineId,
        reason: payload.reason,
        startTime: now.toISOString(),
      });

      logger.info({ sessionId: session.id, machineId: payload.machineId }, 'Downtime session started');
    } else if (payload.event === 'END') {
      // Find the most recent open downtime session for this machine
      const openSession = await prisma.downtimeSession.findFirst({
        where: {
          machineId: payload.machineId,
          endTime: null,
        },
        orderBy: { startTime: 'desc' },
      });

      if (!openSession) {
        logger.warn({ machineId: payload.machineId }, 'Downtime END received but no open session found');
        return;
      }

      const updated = await prisma.downtimeSession.update({
        where: { id: openSession.id },
        data: { endTime: now },
      });

      emit(SocketEvents.DOWNTIME_END, {
        sessionId: updated.id,
        machineId: payload.machineId,
        startTime: updated.startTime.toISOString(),
        endTime: now.toISOString(),
        durationMs: now.getTime() - updated.startTime.getTime(),
      });

      logger.info({ sessionId: updated.id, machineId: payload.machineId }, 'Downtime session closed');
    }
  } catch (error) {
    logger.error({ machineId: payload.machineId, error }, 'Failed to process downtime event');
    throw error;
  }
};

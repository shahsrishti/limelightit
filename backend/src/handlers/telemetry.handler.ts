import { prisma } from '../prisma/client';
import { logger } from '../utils/logger';
import { TelemetryPayloadSchema } from '../validators/mqtt.validator';
import { emit, SocketEvents } from '../socket/emitter';
import { heartbeatService } from '../services/heartbeat.service';

export const handleTelemetry = async (topic: string, raw: unknown): Promise<void> => {
  // Step 1: Validate payload strictly
  const result = TelemetryPayloadSchema.safeParse(raw);
  if (!result.success) {
    logger.warn({ topic, errors: result.error.flatten() }, 'Invalid telemetry payload. Discarding.');
    return;
  }

  const payload = result.data;
  const now = payload.timestamp ? new Date(payload.timestamp) : new Date();

  logger.debug({ machineId: payload.machineId, deviceId: payload.deviceId }, 'Processing telemetry');

  try {
    // Step 2: Verify machine exists
    const machine = await prisma.machine.findUnique({ where: { id: payload.machineId } });
    if (!machine) {
      logger.warn({ machineId: payload.machineId }, 'Telemetry received for unknown machine. Discarding.');
      return;
    }

    // Step 3: Store metric in DB (non-blocking batch: create record, update status)
    const [metric] = await prisma.$transaction([
      prisma.machineMetric.create({
        data: {
          machineId: payload.machineId,
          temperature: payload.temperature ?? null,
          vibration: payload.vibration ?? null,
          speed: payload.speed ?? null,
          power: payload.power ?? null,
          timestamp: now,
        },
      }),
      // Step 4: Upsert latest machine status — update "last seen" timestamp
      prisma.machineStatus.create({
        data: {
          machineId: payload.machineId,
          status: 'RUNNING',
          timestamp: now,
        },
      }),
    ]);

    logger.info(
      { machineId: payload.machineId, metricId: metric.id },
      'Telemetry stored successfully'
    );

    // Resolve offline alert if active
    heartbeatService.handleDeviceResume(payload.machineId).catch((err: any) =>
      logger.error({ machineId: payload.machineId, err }, 'Failed to process heartbeat resume')
    );

    // Step 5: Emit real-time update to admin dashboard
    emit(SocketEvents.TELEMETRY_UPDATE, {
      machineId: payload.machineId,
      deviceId: payload.deviceId,
      metrics: {
        temperature: payload.temperature,
        vibration: payload.vibration,
        speed: payload.speed,
        power: payload.power,
      },
      timestamp: now.toISOString(),
    });
  } catch (error) {
    logger.error({ machineId: payload.machineId, error }, 'Failed to persist telemetry');
    throw error; // Re-throw for the router to catch and log
  }
};

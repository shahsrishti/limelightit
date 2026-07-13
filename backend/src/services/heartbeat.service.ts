import { prisma } from '../prisma/client';
import { logger } from '../utils/logger';
import { env } from '../config/env';
import { emit, SocketEvents } from '../socket/emitter';

// Status values that mean the machine is already offline — skip heartbeat check for these
const OFFLINE_STATUSES = new Set(['STOPPED', 'FAULT', 'ERROR']);

/**
 * Service to manage edge device heartbeats and connection states.
 */
export class HeartbeatService {
  /**
   * Run device check loop.
   * Compares the latest metric timestamp against OFFLINE_TIMEOUT_SECONDS.
   * Skips machines that are already STOPPED, FAULT, or ERROR.
   */
  public async checkDeviceHeartbeats(): Promise<void> {
    logger.debug('Running heartbeat device presence verification...');

    try {
      const machines = await prisma.machine.findMany({
        include: {
          devices: true,
          metrics: {
            orderBy: { timestamp: 'desc' },
            take: 1,
          },
          statuses: {
            orderBy: { timestamp: 'desc' },
            take: 1,
          },
        },
      });

      const now = new Date();
      const timeoutMs = env.OFFLINE_TIMEOUT_SECONDS * 1000;

      for (const machine of machines) {
        const lastMetric = machine.metrics[0];
        const currentStatus = machine.statuses[0]?.status;

        // Skip if machine has no telemetry history, or is already offline/fault
        if (!lastMetric || (currentStatus && OFFLINE_STATUSES.has(currentStatus))) {
          continue;
        }

        const elapsedMs = now.getTime() - new Date(lastMetric.timestamp).getTime();

        if (elapsedMs > timeoutMs) {
          logger.warn(
            { machineId: machine.id, elapsedMs, lastSeen: lastMetric.timestamp },
            `⚠️ Device offline heartbeat check failed for machine: ${machine.name}`
          );

          // Check for an existing open downtime session to prevent duplicates
          const existingDowntime = await prisma.downtimeSession.findFirst({
            where: { machineId: machine.id, endTime: null },
          });

          await prisma.$transaction([
            prisma.machineStatus.create({
              data: {
                machineId: machine.id,
                status: 'STOPPED',
                timestamp: now,
              },
            }),
            // Only create downtime if one isn't already open
            ...(existingDowntime
              ? []
              : [
                  prisma.downtimeSession.create({
                    data: {
                      machineId: machine.id,
                      startTime: now,
                      reason: 'Heartbeat Timeout (No telemetry received)',
                    },
                  }),
                ]),
            prisma.alert.create({
              data: {
                machineId: machine.id,
                type: 'CRITICAL',
                message: `Device heartbeat timeout: Machine "${machine.name}" lost communication`,
                timestamp: now,
                resolved: false,
              },
            }),
          ]);

          // Emit Socket.IO events to browser dashboard
          emit(SocketEvents.MACHINE_STATUS_CHANGE, {
            machineId: machine.id,
            status: 'STOPPED',
            timestamp: now.toISOString(),
          });

          emit(SocketEvents.NEW_ALERT, {
            machineId: machine.id,
            type: 'CRITICAL',
            message: `Device heartbeat timeout: Machine "${machine.name}" lost communication`,
            timestamp: now.toISOString(),
            resolved: false,
          });
        }
      }
    } catch (err) {
      logger.error({ err }, 'Error during heartbeat checks');
    }
  }

  /**
   * Handle device activity resume.
   * Resolves any offline alerts and closes active downtime sessions.
   */
  public async handleDeviceResume(machineId: string): Promise<void> {
    const now = new Date();
    try {
      // Find unresolved heartbeat alerts
      const activeOfflineAlerts = await prisma.alert.findMany({
        where: {
          machineId,
          resolved: false,
          message: { contains: 'lost communication' },
        },
      });

      if (activeOfflineAlerts.length > 0) {
        logger.info({ machineId }, `✅ Device resumed communication. Clearing offline status and alerts.`);

        await prisma.$transaction([
          // Resolve heartbeat alert
          prisma.alert.updateMany({
            where: {
              machineId,
              resolved: false,
              message: { contains: 'lost communication' },
            },
            data: { resolved: true },
          }),
          // Close active downtime sessions
          prisma.downtimeSession.updateMany({
            where: {
              machineId,
              endTime: null,
            },
            data: { endTime: now },
          }),
        ]);

        // Notify client side
        emit(SocketEvents.ALERT_RESOLVED, {
          machineId,
          timestamp: now.toISOString(),
        });
      }
    } catch (err) {
      logger.error({ machineId, err }, 'Error handling device resume state');
    }
  }
}

export const heartbeatService = new HeartbeatService();

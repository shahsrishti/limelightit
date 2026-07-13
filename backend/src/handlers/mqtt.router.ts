import { logger } from '../utils/logger';
import { handleTelemetry } from './telemetry.handler';
import { handleState } from './state.handler';
import { handleHealth } from './health.handler';
import { handleDowntime } from './downtime.handler';
import { handleLwt } from './lwt.handler';
import { handleLifecycle } from './lifecycle.handler';
import { telemetryStats } from '../utils/stats';
import { prisma } from '../prisma/client'; // Use the shared singleton — NOT new PrismaClient()

/**
 * Auto-provision factory, machine, and device if they don't exist.
 * Uses the global shared Prisma singleton to avoid pool exhaustion.
 */
const ensureMachineExists = async (machineId: string, deviceId: string, macAddress: string) => {
  try {
    // 1. Ensure factory exists
    await prisma.factory.upsert({
      where: { id: 'factory-01' },
      update: {},
      create: {
        id: 'factory-01',
        name: 'Main Assembly Plant',
        location: 'Building A, Floor 1',
      },
    });

    // 2. Ensure machine exists
    await prisma.machine.upsert({
      where: { id: machineId },
      update: {},
      create: {
        id: machineId,
        name: `Machine ${machineId}`,
        factoryId: 'factory-01',
      },
    });

    // 3. Ensure device exists
    const existingDevice = await prisma.device.findUnique({ where: { id: deviceId } });
    if (!existingDevice) {
      // Avoid unique constraint error on MAC address
      const existingMac = await prisma.device.findUnique({ where: { macAddress } });
      const useMac = existingMac
        ? `00:1A:2B:3C:4D:${Math.random().toString(16).substring(2, 4).toUpperCase()}`
        : macAddress;

      await prisma.device.create({
        data: {
          id: deviceId,
          macAddress: useMac,
          machineId,
        },
      });
      logger.info({ machineId, deviceId, macAddress: useMac }, 'Auto-registered new device & machine');
    }
  } catch (err) {
    logger.error({ machineId, deviceId, err }, 'Failed to auto-provision machine/device');
  }
};

/**
 * Routes an incoming MQTT message to the correct handler.
 * Supports both legacy mfg/ and production Limelight/factory/ topics.
 */
export const routeMqttMessage = async (topic: string, payload: Buffer): Promise<void> => {
  telemetryStats.incrementMessageCounter();
  let rawPayload: any;

  // Safe JSON parse
  try {
    const payloadStr = payload.toString().trim();
    if (!payloadStr) {
      rawPayload = {};
    } else {
      rawPayload = JSON.parse(payloadStr);
    }
  } catch {
    logger.warn({ topic }, 'MQTT message received with invalid JSON. Discarding.');
    return;
  }

  const parts = topic.split('/');
  let machineId = '';
  let deviceId = '';
  let macAddress = '';
  let topicType = '';
  let isRealBroker = false;

  // Decompose topic based on broker type
  if (topic.toLowerCase().startsWith('limelight/factory/')) {
    machineId = parts[2];
    deviceId = `device-${machineId}`;
    macAddress = rawPayload.mac_id || `00:1A:2B:3C:4D:${machineId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 2).toUpperCase()}`;
    topicType = parts[3]?.toLowerCase();
    isRealBroker = true;
  } else if (topic.startsWith('mfg/')) {
    machineId = parts[1];
    deviceId = rawPayload.deviceId || `device-${machineId}`;
    macAddress = rawPayload.macAddress || `00:1A:2B:3C:4D:${machineId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 2).toUpperCase()}`;
    topicType = parts[2]?.toLowerCase();
  } else {
    // Ignore other message topics (like adr, flow, etc.)
    return;
  }

  // Normalize topic type (livedata maps to telemetry)
  if (topicType === 'livedata') {
    topicType = 'telemetry';
  }

  if (!machineId || !topicType) {
    logger.warn({ topic }, 'Could not parse machineId or topicType from topic. Discarding.');
    return;
  }

  // Auto-provision entities dynamically so incoming hardware works out of the box
  await ensureMachineExists(machineId, deviceId, macAddress);

  // Normalize payloads to match internal validation schemas
  let normalizedPayload: any = { ...rawPayload };

  if (isRealBroker) {
    if (topicType === 'telemetry') {
      normalizedPayload = {
        deviceId,
        machineId,
        timestamp: rawPayload.timestamp || new Date().toISOString(),
        temperature: rawPayload.temp || rawPayload.temperature || 35.0,
        vibration: rawPayload.vib_vel_ || rawPayload.vib_v || rawPayload.vibration || 1.2,
        speed: rawPayload.encoder_rpm !== undefined ? Math.abs(rawPayload.encoder_rpm) : (rawPayload.speed || 0),
        power: rawPayload.kw !== undefined ? Math.round(rawPayload.kw * 1000) : (rawPayload.power || 0),
      };
    } else if (topicType === 'health') {
      normalizedPayload = {
        deviceId,
        machineId,
        battery: rawPayload.battery !== undefined ? rawPayload.battery : 100,
        signal: rawPayload.signal || -60,
        uptime: rawPayload.uptime || 3600,
        firmware: rawPayload.fw || 'v1.0.0',
        timestamp: rawPayload.timestamp || new Date().toISOString(),
      };
    } else if (topicType === 'lwt') {
      normalizedPayload = {
        deviceId,
        machineId,
        status: 'OFFLINE',
        timestamp: rawPayload.timestamp || new Date().toISOString(),
      };
    }
  } else {
    normalizedPayload.deviceId = normalizedPayload.deviceId || deviceId;
    normalizedPayload.machineId = normalizedPayload.machineId || machineId;
  }

  // Route payload to handler
  try {
    switch (topicType) {
      case 'telemetry':
        await handleTelemetry(topic, normalizedPayload);
        break;
      case 'state':
        // If state is parsed from livedata payload, map status
        if (normalizedPayload.state && !normalizedPayload.status) {
          if (normalizedPayload.state === 'RUN') normalizedPayload.status = 'RUNNING';
          else if (normalizedPayload.state === 'IDLE') normalizedPayload.status = 'IDLE';
          else if (normalizedPayload.state === 'STP') normalizedPayload.status = 'STOPPED';
          else normalizedPayload.status = 'ERROR';
        }
        await handleState(topic, normalizedPayload);
        break;
      case 'health':
        await handleHealth(topic, normalizedPayload);
        break;
      case 'downtime':
        await handleDowntime(topic, normalizedPayload);
        break;
      case 'lwt':
        await handleLwt(topic, normalizedPayload);
        break;
      case 'lifecycle':
        await handleLifecycle(topic, normalizedPayload);
        break;
      default:
        logger.debug({ topic, topicType }, 'Ignored unknown topic type');
    }
  } catch (error) {
    logger.error({ topic, error }, 'Unhandled error in MQTT message router');
  }
};

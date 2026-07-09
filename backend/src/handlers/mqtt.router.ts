import { logger } from '../utils/logger';
import { handleTelemetry } from './telemetry.handler';
import { handleState } from './state.handler';
import { handleHealth } from './health.handler';
import { handleDowntime } from './downtime.handler';
import { handleLwt } from './lwt.handler';
import { handleLifecycle } from './lifecycle.handler';

/**
 * Routes an incoming MQTT message to the correct handler.
 *
 * Expected topic format: mfg/{machineId}/{type}
 * e.g.: mfg/machine-abc123/telemetry
 *
 * Falls back to reading machineId from the payload if not in topic.
 */
export const routeMqttMessage = async (topic: string, payload: Buffer): Promise<void> => {
  let rawPayload: unknown;

  // Step 1: Safe JSON parse — never crash on invalid data
  try {
    rawPayload = JSON.parse(payload.toString());
  } catch {
    logger.warn({ topic }, 'MQTT message received with invalid JSON. Discarding.');
    return;
  }

  // Step 2: Decompose topic
  const parts = topic.split('/');
  const topicType = parts[parts.length - 1]?.toLowerCase();

  logger.debug({ topic, topicType }, 'Routing MQTT message');

  // Step 3: Route to correct handler
  try {
    switch (topicType) {
      case 'telemetry':
        await handleTelemetry(topic, rawPayload);
        break;
      case 'state':
        await handleState(topic, rawPayload);
        break;
      case 'health':
        await handleHealth(topic, rawPayload);
        break;
      case 'downtime':
        await handleDowntime(topic, rawPayload);
        break;
      case 'lwt':
        await handleLwt(topic, rawPayload);
        break;
      case 'lifecycle':
        await handleLifecycle(topic, rawPayload);
        break;
      case 'config_ack':
        logger.info({ topic }, 'Config acknowledgement received (no-op in this phase)');
        break;
      default:
        logger.warn({ topic, topicType }, 'Received message on unknown topic type. Ignoring.');
    }
  } catch (error) {
    // Handler-level errors are caught here to prevent crashing the MQTT client
    logger.error({ topic, error }, 'Unhandled error in MQTT message router');
  }
};

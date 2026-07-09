import mqtt from 'mqtt';
import { logger } from '../utils/logger';
import { env } from '../config/env';
import { routeMqttMessage } from '../handlers/mqtt.router';

// Topic hierarchy: mfg/{machineId}/{messageType}
const SUBSCRIBE_TOPIC = 'mfg/#';

export class MQTTClient {
  private client: mqtt.MqttClient | null = null;
  public isConnected = false;

  public connect() {
    const brokerUrl = `mqtt://${env.MQTT_HOST}:${env.MQTT_PORT}`;

    logger.info(`Attempting to connect to MQTT broker at ${brokerUrl}...`);

    this.client = mqtt.connect(brokerUrl, {
      clientId: `${env.MQTT_CLIENT_ID}_${Math.random().toString(16).substring(2, 8)}`,
      username: env.MQTT_USERNAME,
      password: env.MQTT_PASSWORD,
      clean: true,
      reconnectPeriod: 5000,
    });

    this.client.on('connect', () => {
      this.isConnected = true;
      logger.info('✅ Successfully connected to VerneMQ MQTT Broker');

      // Subscribe to all manufacturing telemetry topics
      this.client!.subscribe(SUBSCRIBE_TOPIC, { qos: 1 }, (err) => {
        if (err) {
          logger.error({ err }, `Failed to subscribe to topic: ${SUBSCRIBE_TOPIC}`);
        } else {
          logger.info(`✅ Subscribed to MQTT topic: ${SUBSCRIBE_TOPIC}`);
        }
      });
    });

    // Route all incoming messages through the centralized router
    this.client.on('message', (topic: string, payload: Buffer) => {
      logger.debug({ topic }, 'MQTT message received');
      routeMqttMessage(topic, payload).catch((err) => {
        logger.error({ topic, err }, 'Uncaught error routing MQTT message');
      });
    });

    this.client.on('reconnect', () => {
      logger.warn('⚠️ Reconnecting to MQTT Broker...');
    });

    this.client.on('offline', () => {
      this.isConnected = false;
      logger.warn('❌ MQTT Client went offline');
    });

    this.client.on('error', (error) => {
      this.isConnected = false;
      logger.error({ error }, '💥 MQTT Connection Error');
    });
  }

  public disconnect() {
    if (this.client) {
      this.client.end(false, () => {
        logger.info('Gracefully disconnected from MQTT broker');
      });
    }
  }

  public getStatus() {
    return this.isConnected ? 'Connected' : 'Disconnected';
  }
}

export const mqttClient = new MQTTClient();

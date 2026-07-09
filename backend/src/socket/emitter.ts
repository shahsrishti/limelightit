import { Server } from 'socket.io';
import { logger } from '../utils/logger';

let _io: Server | null = null;

/**
 * Initialize the global Socket.IO emitter with the server instance.
 * Must be called once from server.ts at startup.
 */
export const initSocketEmitter = (io: Server): void => {
  _io = io;
  logger.info('Socket.IO emitter initialized');
};

/**
 * Emit a Socket.IO event globally to all connected clients.
 * Safe to call from any layer (services, handlers, etc.)
 */
export const emit = (event: string, data: unknown): void => {
  if (!_io) {
    logger.warn(`Socket.IO not initialized — cannot emit event: ${event}`);
    return;
  }
  _io.emit(event, data);
};

/**
 * Emit a Socket.IO event to a specific room.
 */
export const emitToRoom = (room: string, event: string, data: unknown): void => {
  if (!_io) {
    logger.warn(`Socket.IO not initialized — cannot emit to room: ${room}`);
    return;
  }
  _io.to(room).emit(event, data);
};

// Named socket events for type safety
export const SocketEvents = {
  TELEMETRY_UPDATE: 'telemetry:update',
  MACHINE_STATUS_CHANGE: 'machine:status',
  NEW_ALERT: 'alert:new',
  ALERT_RESOLVED: 'alert:resolved',
  DOWNTIME_START: 'downtime:start',
  DOWNTIME_END: 'downtime:end',
  DEVICE_HEALTH_UPDATE: 'device:health',
  DASHBOARD_STATS: 'dashboard:stats',
} as const;

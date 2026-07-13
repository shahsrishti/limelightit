import { Server } from 'socket.io';
import { logger } from '../utils/logger';
import { broadcastSocketEvent } from './socket.adapter';

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
  if (_io) {
    _io.emit(event, data);
  }
  broadcastSocketEvent(event, data);
};

/**
 * Emit a Socket.IO event to a specific room.
 */
export const emitToRoom = (room: string, event: string, data: unknown): void => {
  if (_io) {
    _io.to(room).emit(event, data);
  }
  broadcastSocketEvent(event, data);
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

export const getActiveClientsCount = (): number => {
  return _io ? _io.engine.clientsCount : 0;
};

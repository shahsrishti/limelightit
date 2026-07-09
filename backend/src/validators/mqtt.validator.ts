import { z } from 'zod';

// ==========================================
// TELEMETRY PAYLOAD
// Emitted by ESP32 at regular intervals
// Topic: mfg/{machineId}/telemetry
// ==========================================
export const TelemetryPayloadSchema = z.object({
  deviceId: z.string(),
  machineId: z.string(),
  timestamp: z.string().datetime().optional(),
  temperature: z.number().optional(),
  vibration: z.number().optional(),
  speed: z.number().optional(),
  power: z.number().optional(),
});

export type TelemetryPayload = z.infer<typeof TelemetryPayloadSchema>;

// ==========================================
// STATE PAYLOAD
// Emitted when machine state changes
// Topic: mfg/{machineId}/state
// ==========================================
export const StatePayloadSchema = z.object({
  deviceId: z.string(),
  machineId: z.string(),
  status: z.enum(['RUNNING', 'IDLE', 'STOPPED', 'ERROR']),
  timestamp: z.string().datetime().optional(),
});

export type StatePayload = z.infer<typeof StatePayloadSchema>;

// ==========================================
// HEALTH PAYLOAD
// Emitted by ESP32 for device health
// Topic: mfg/{machineId}/health
// ==========================================
export const HealthPayloadSchema = z.object({
  deviceId: z.string(),
  machineId: z.string(),
  battery: z.number().min(0).max(100).optional(),
  signal: z.number().optional(),
  uptime: z.number().int().optional(),
  firmware: z.string().optional(),
  timestamp: z.string().datetime().optional(),
});

export type HealthPayload = z.infer<typeof HealthPayloadSchema>;

// ==========================================
// DOWNTIME PAYLOAD
// Emitted to signal start or end of downtime
// Topic: mfg/{machineId}/downtime
// ==========================================
export const DowntimePayloadSchema = z.object({
  deviceId: z.string(),
  machineId: z.string(),
  event: z.enum(['START', 'END']),
  reason: z.string().optional(),
  timestamp: z.string().datetime().optional(),
});

export type DowntimePayload = z.infer<typeof DowntimePayloadSchema>;

// ==========================================
// LIFECYCLE PAYLOAD
// Topic: mfg/{machineId}/lifecycle
// ==========================================
export const LifecyclePayloadSchema = z.object({
  deviceId: z.string(),
  machineId: z.string(),
  event: z.enum(['BOOT', 'SHUTDOWN', 'REBOOT']),
  timestamp: z.string().datetime().optional(),
});

export type LifecyclePayload = z.infer<typeof LifecyclePayloadSchema>;

// ==========================================
// LWT (Last Will & Testament) PAYLOAD
// Automatically emitted by broker on disconnect
// Topic: mfg/{machineId}/lwt
// ==========================================
export const LwtPayloadSchema = z.object({
  deviceId: z.string(),
  machineId: z.string(),
  status: z.literal('OFFLINE'),
  timestamp: z.string().datetime().optional(),
});

export type LwtPayload = z.infer<typeof LwtPayloadSchema>;
